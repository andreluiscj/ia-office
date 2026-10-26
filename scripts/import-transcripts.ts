// Importa o histórico das sessões do Claude Code (~/.claude/projects/**/*.jsonl).
// Pode rodar quantas vezes quiser: eventos repetidos são ignorados.
import { readdirSync, statSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { db, upsertAgent, addEvent, projectFromCwd, skillFromToolInput, slashCommand, type Agent } from "../server/db";

const root = process.argv[2] ?? join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "projects");
const SPAWN_TOOLS = new Set(["Task", "Agent"]);
const LIVE_WINDOW = 30 * 60_000;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    let st; try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

function readLines(file: string): any[] {
  const out: any[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* linha incompleta */ }
  }
  return out;
}

const isSubFile = (f: string) => /[\\/]subagents[\\/]/.test(f) || basename(f).startsWith("agent-");
const files = walk(root).sort((a, b) => Number(isSubFile(a)) - Number(isSubFile(b)));
const getAgent = db.query<Agent, [string]>("SELECT * FROM agents WHERE id = ?");
const byRef = db.query<Agent, [string]>("SELECT * FROM agents WHERE agent_ref = ? LIMIT 1");

let nSessions = 0, nSubs = 0, nSkills = 0;
const total = () => db.query<{ s: number; k: number }, []>("SELECT (SELECT COUNT(*) FROM agents WHERE kind='session') s, (SELECT COUNT(*) FROM events WHERE type='skill') k").get()!;
const now = Date.now();

const importAll = db.transaction(() => {
  for (const file of files) {
    const lines = readLines(file);
    const withSession = lines.filter(l => l.sessionId && l.timestamp);
    if (!withSession.length) continue;
    const sessionId: string = withSession[0].sessionId;
    const cwd: string | undefined = lines.find(l => l.cwd)?.cwd;
    const times = withSession.map(l => Date.parse(l.timestamp)).filter(Number.isFinite);
    const first = Math.min(...times), last = Math.max(...times);

    // Dono dos eventos deste arquivo: a sessão, ou o subagente (arquivos subagents/agent-*.jsonl).
    let owner = sessionId;
    if (isSubFile(file)) {
      const agentId: string = lines.find(l => l.agentId)?.agentId ?? basename(file, ".jsonl").replace(/^agent-/, "");
      const known = byRef.get(agentId);
      owner = known?.id ?? `agent:${agentId}`;
      if (!known) {
        upsertAgent({ id: owner, session_id: sessionId, parent_id: sessionId, kind: "subagent", name: "subagente",
          cwd, ts: last, started_at: first, status: "done", ended_at: last, agent_ref: agentId });
        nSubs++;
      }
      if (!getAgent.get(sessionId)) upsertAgent({ id: sessionId, session_id: sessionId, kind: "session", cwd, ts: last, started_at: first, status: "ended", ended_at: last });
    } else {
      const existed = getAgent.get(sessionId);
      const recent = now - last < LIVE_WINDOW;
      upsertAgent({
        id: sessionId, session_id: sessionId, kind: "session", cwd, ts: last, started_at: first,
        ...(existed ? {} : { status: recent ? "idle" : "ended", ended_at: recent ? null : last }),
      });
      if (!existed) nSessions++;
    }

    for (const l of lines) {
      const ts = Date.parse(l.timestamp);
      if (!Number.isFinite(ts)) continue;
      const content = l.message?.content;

      if (l.type === "assistant" && Array.isArray(content)) {
        for (const c of content) {
          if (c?.type !== "tool_use") continue;
          const uid = `tool:${c.id}`;
          if (c.name === "Skill") {
            nSkills += addEvent({ uid, ts, agent_id: owner, session_id: sessionId, type: "skill", tool: "Skill", skill: skillFromToolInput(c.input) ?? "?" });
          } else if (SPAWN_TOOLS.has(c.name)) {
            const input = c.input ?? {};
            if (!getAgent.get(`sub:${c.id}`)) nSubs++;
            upsertAgent({ id: `sub:${c.id}`, session_id: sessionId, parent_id: owner, kind: "subagent",
              name: input.subagent_type || "subagente", cwd, project: projectFromCwd(cwd), ts, started_at: ts,
              status: "done", ended_at: ts, task: String(input.description ?? input.prompt ?? "").slice(0, 140) });
            addEvent({ uid, ts, agent_id: owner, session_id: sessionId, type: "spawn", tool: c.name, detail: input.description });
          } else {
            addEvent({ uid, ts, agent_id: owner, session_id: sessionId, type: "tool", tool: c.name });
          }
        }
      }

      if (l.type === "user") {
        // Fim de um subagente + id interno dele (para ligar o arquivo subagents/agent-*.jsonl).
        if (Array.isArray(content)) {
          for (const c of content) {
            if (c?.type !== "tool_result") continue;
            const sub = getAgent.get(`sub:${c.tool_use_id}`);
            if (sub) {
              const agentId = l.toolUseResult?.agentId;
              upsertAgent({ id: sub.id, session_id: sessionId, ts, ended_at: ts, ...(agentId ? { agent_ref: String(agentId) } : {}) });
            }
          }
        }
        const text = typeof content === "string" ? content
          : Array.isArray(content) ? content.filter((c: any) => c?.type === "text").map((c: any) => c.text).join("\n") : "";
        const cmd = text.includes("<command-name>") ? slashCommand(text) : null;
        if (cmd && l.uuid) {
          nSkills += addEvent({ uid: `cmd:${l.uuid}`, ts, agent_id: owner, session_id: sessionId, type: "skill", skill: cmd, detail: "comando /" + cmd });
        }
      }
    }
  }
});

console.log(`Lendo ${files.length} arquivos de ${root} ...`);
importAll();
const t = total();
console.log(`Pronto: ${nSessions} sessões novas, ${nSubs} subagentes novos, ${nSkills} usos de skill novos.`);
console.log(`No banco agora: ${t.s} sessões e ${t.k} usos de skill. Veja em http://localhost:7777/dashboard`);
