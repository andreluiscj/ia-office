// Banco SQLite e regras de ingestão de eventos (hooks ao vivo e importação de histórico).
import { Database } from "bun:sqlite";
import { closeSync, existsSync, fstatSync, mkdirSync, openSync, readdirSync, readSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";

// O banco fica em ~/.escritorio-virtual, fora da pasta do projeto (assim pastas sincronizadas, como OneDrive ou Dropbox, não travam o arquivo).
export const DATA_DIR = join(homedir(), ".escritorio-virtual");
mkdirSync(DATA_DIR, { recursive: true });
const DEMO = process.argv.includes("--demo");

export const DB_PATH = process.env.ESCRITORIO_DB ?? join(DATA_DIR, DEMO ? "demo.db" : "escritorio.db");
export const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec(`
CREATE TABLE IF NOT EXISTS agents (
  id           TEXT PRIMARY KEY,         -- session_id ou 'sub:<tool_use_id>'
  session_id   TEXT NOT NULL,
  parent_id    TEXT,                     -- quem criou este agente (null = sessão principal)
  kind         TEXT NOT NULL,            -- 'session' | 'subagent'
  name         TEXT NOT NULL,            -- projeto (sessões) ou tipo do subagente
  project      TEXT NOT NULL,
  cwd          TEXT,
  status       TEXT NOT NULL,            -- working | waiting | idle | done | ended
  task         TEXT,
  current_tool TEXT,
  agent_ref    TEXT,                     -- agent_id interno do Claude Code (subagentes)
  started_at   INTEGER NOT NULL,
  last_seen    INTEGER NOT NULL,
  ended_at     INTEGER
);
CREATE INDEX IF NOT EXISTS agents_session ON agents(session_id);
CREATE INDEX IF NOT EXISTS agents_seen ON agents(last_seen);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  uid        TEXT UNIQUE,                -- evita contar duas vezes (hook + importação)
  ts         INTEGER NOT NULL,
  agent_id   TEXT NOT NULL,
  session_id TEXT NOT NULL,
  type       TEXT NOT NULL,              -- tool | skill | prompt | spawn | notification | stop | start | end
  tool       TEXT,
  skill      TEXT,
  detail     TEXT
);
CREATE INDEX IF NOT EXISTS events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS events_agent ON events(agent_id);
CREATE INDEX IF NOT EXISTS events_skill ON events(skill);

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
`);
// Colunas novas (bancos antigos ganham sem perder dados).
for (const sql of [
  "ALTER TABLE agents ADD COLUMN model TEXT",   // modelo em uso (ex.: claude-opus-...)
  "ALTER TABLE agents ADD COLUMN alias TEXT",   // nome dado pelo Líder ao chamar (ex.: joaquim)
  "ALTER TABLE events ADD COLUMN model TEXT",   // modelo do agente quando o evento aconteceu
]) { try { db.exec(sql); } catch { /* já existe */ } }

export const getMeta = (key: string) => db.query<{ value: string }, [string]>("SELECT value FROM meta WHERE key=?").get(key)?.value ?? null;
export const setMeta = (key: string, value: string) => db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(key, value);

// Comandos internos do Claude Code: não são skills, não entram na contagem.
export const BUILTIN_COMMANDS = new Set([
  "add-dir", "agents", "artifacts", "bashes", "bug", "clear", "compact", "config", "context", "cost", "doctor",
  "effort", "exit", "export", "fast", "feedback", "help", "hooks", "ide", "init", "install-github-app", "login",
  "logout", "mcp", "memory", "migrate-installer", "model", "output-style", "permissions", "plugin", "plugins",
  "pr-comments", "privacy-settings", "quit", "release-notes", "reload-plugins", "resume", "rewind", "sandbox",
  "status", "statusline", "tasks", "terminal-setup", "theme", "todos", "upgrade", "usage", "vim", "workflows",
  "remote-control", "rename", "skills", "stats", "teleport", "keybindings", "login", "copy", "btw",
]);
// Limpa contagens antigas de comandos internos (versões anteriores contavam).
db.query(`DELETE FROM events WHERE type='skill' AND detail LIKE 'comando /%' AND skill IN (${[...BUILTIN_COMMANDS].map(() => "?").join(",")})`)
  .run(...BUILTIN_COMMANDS);

export type Agent = {
  id: string; session_id: string; parent_id: string | null; kind: string; name: string;
  project: string; cwd: string | null; status: string; task: string | null;
  current_tool: string | null; agent_ref: string | null;
  started_at: number; last_seen: number; ended_at: number | null;
  model?: string | null; alias?: string | null;
};

const SPAWN_TOOLS = new Set(["Task", "Agent"]);
const MESSAGE_TOOLS = new Set(["SendMessage"]);

/** "claude-opus-4-..." -> "opus" | "sonnet" | "haiku" | "fable" | o próprio id. */
export function modelFamily(model?: string | null): string | null {
  if (!model) return null;
  const m = model.toLowerCase().match(/opus|sonnet|haiku|fable/);
  return m ? m[0] : model;
}

/** Lê o fim de um transcript (.jsonl) e devolve o último modelo usado. */
function lastModelIn(file: string): string | null {
  let fd: number | null = null;
  try {
    fd = openSync(file, "r");
    const size = fstatSync(fd).size, len = Math.min(size, 256 * 1024);
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, size - len);
    const found = [...buf.toString("utf8").matchAll(/"model"\s*:\s*"(claude-[^"]+)"/g)].map(m => m[1]);
    return found.at(-1) ?? null;
  } catch { return null; } finally { if (fd !== null) try { closeSync(fd); } catch {} }
}

/** Transcript do agente: o da sessão, ou o do subagente/teammate (pasta subagents da sessão). */
function transcriptFor(p: any, isSub: boolean): string | null {
  if (!isSub) return p.transcript_path ?? null;
  if (p.agent_transcript_path) return p.agent_transcript_path;
  if (!p.transcript_path || !p.agent_id) return null;
  const dir = join(dirname(p.transcript_path), String(p.session_id), "subagents");
  const direct = join(dir, `agent-${p.agent_id}.jsonl`);
  if (existsSync(direct)) return direct;
  try { const f = readdirSync(dir).find(n => n.includes(String(p.agent_id)) && n.endsWith(".jsonl")); return f ? join(dir, f) : null; }
  catch { return null; }
}

const modelChecked = new Map<string, number>();
/** Atualiza o modelo do agente a partir do transcript (no máximo a cada 10 s por agente). */
function refreshModel(agentId: string, p: any, isSub: boolean, ts: number, force = false) {
  const last = modelChecked.get(agentId) ?? 0;
  if (!force && ts - last < 10_000) return;
  modelChecked.set(agentId, ts);
  const file = transcriptFor(p, isSub);
  const model = file ? lastModelIn(file) : null;
  if (model) db.query("UPDATE agents SET model=? WHERE id=?").run(model, agentId);
}
const modelOf = (agentId: string) => db.query<{ model: string | null }, [string]>("SELECT model FROM agents WHERE id=?").get(agentId)?.model ?? null;

export function projectFromCwd(cwd?: string | null): string {
  if (!cwd) return "sem-projeto";
  const clean = cwd.replace(/[\\/]+$/, "");
  return basename(clean.replace(/\\/g, "/")) || clean;
}

function short(text: unknown, max = 140): string | null {
  if (text == null) return null;
  const s = String(text).replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function skillFromToolInput(input: any): string | null {
  if (!input || typeof input !== "object") return null;
  return input.skill ?? input.command ?? input.name ?? null;
}

/** Comandos digitados como /nome também contam como uso de skill. */
export function slashCommand(prompt: unknown): string | null {
  if (typeof prompt !== "string") return null;
  const tag = prompt.match(/<command-name>\/?([^<\s]+)<\/command-name>/);
  const name = tag ? tag[1] : prompt.trim().match(/^\/([\w:.-]+)/)?.[1];
  return name && !BUILTIN_COMMANDS.has(name) ? name : null;
}

const q = {
  get: db.query<Agent, [string]>("SELECT * FROM agents WHERE id = ?"),
  byRef: db.query<Agent, [string]>("SELECT * FROM agents WHERE agent_ref = ? ORDER BY started_at DESC LIMIT 1"),
  openSubByTask: db.query<Agent, [string, string]>(
    "SELECT * FROM agents WHERE parent_id = ? AND kind='subagent' AND status='working' AND IFNULL(task,'') = ? ORDER BY started_at DESC LIMIT 1"),
  openSubUnref: db.query<Agent, [string, string]>(
    "SELECT * FROM agents WHERE session_id = ? AND kind='subagent' AND status='working' AND agent_ref IS NULL AND name = ? ORDER BY started_at DESC LIMIT 1"),
  recentSubUnref: db.query<Agent, [string, number]>(
    "SELECT * FROM agents WHERE kind='subagent' AND agent_ref IS NULL AND name = ? AND started_at >= ? ORDER BY started_at DESC LIMIT 1"),
  byAlias: db.query<Agent, [string]>("SELECT * FROM agents WHERE kind='subagent' AND alias = ? ORDER BY started_at DESC LIMIT 1"),
  openSubAnyUnref: db.query<Agent, [string]>(
    "SELECT * FROM agents WHERE session_id = ? AND kind='subagent' AND status='working' AND agent_ref IS NULL ORDER BY started_at DESC LIMIT 1"),
  insertEvent: db.query(
    "INSERT OR IGNORE INTO events (uid, ts, agent_id, session_id, type, tool, skill, detail, model) VALUES (?,?,?,?,?,?,?,?,?)"),
};

export function upsertAgent(a: Partial<Agent> & { id: string; session_id: string; ts: number }): Agent {
  const cur = q.get.get(a.id);
  if (!cur) {
    const project = a.project ?? projectFromCwd(a.cwd);
    db.query(`INSERT INTO agents (id, session_id, parent_id, kind, name, project, cwd, status, task, current_tool, agent_ref, started_at, last_seen, ended_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      a.id, a.session_id, a.parent_id ?? null, a.kind ?? "session", a.name ?? project, project, a.cwd ?? null,
      a.status ?? "idle", a.task ?? null, a.current_tool ?? null, a.agent_ref ?? null, a.started_at ?? a.ts, a.ts, a.ended_at ?? null);
    return q.get.get(a.id)!;
  }
  const next: Agent = { ...cur };
  for (const k of ["parent_id", "kind", "name", "project", "cwd", "status", "task", "current_tool", "agent_ref", "ended_at"] as const) {
    if (a[k] !== undefined) (next as any)[k] = a[k];
  }
  if (a.started_at !== undefined && a.started_at < next.started_at) next.started_at = a.started_at;
  next.last_seen = Math.max(cur.last_seen, a.ts);
  db.query(`UPDATE agents SET parent_id=?, kind=?, name=?, project=?, cwd=?, status=?, task=?, current_tool=?, agent_ref=?, started_at=?, last_seen=?, ended_at=? WHERE id=?`)
    .run(next.parent_id, next.kind, next.name, next.project, next.cwd, next.status, next.task, next.current_tool,
      next.agent_ref, next.started_at, next.last_seen, next.ended_at, next.id);
  return next;
}

/** Grava um evento; devolve 1 se entrou, 0 se já existia. */
export function addEvent(e: { uid?: string | null; ts: number; agent_id: string; session_id: string; type: string; tool?: string | null; skill?: string | null; detail?: string | null; model?: string | null }): number {
  return q.insertEvent.run(e.uid ?? null, e.ts, e.agent_id, e.session_id, e.type, e.tool ?? null, e.skill ?? null, short(e.detail, 300), e.model ?? modelOf(e.agent_id)).changes;
}

/** Agente dono do evento: o subagente (se o Claude Code mandou agent_id) ou a sessão. */
function ownerOf(p: any, sessionId: string, ts: number): string {
  if (p.agent_id) {
    const sub = q.byRef.get(String(p.agent_id));
    if (sub) return sub.id;
    // Primeiro evento de um subagente que ainda não foi ligado ao Task que o criou.
    // Teammates (equipes de agentes) voltam do Agent na hora, então o registro pode já estar "done": procura também esses.
    const open = (p.agent_type && (q.openSubUnref.get(sessionId, String(p.agent_type)) || q.recentSubUnref.get(String(p.agent_type), ts - 12 * 3600_000)))
      || q.openSubAnyUnref.get(sessionId);
    if (open) { upsertAgent({ id: open.id, session_id: open.session_id, ts, agent_ref: String(p.agent_id), status: "working", ended_at: null }); return open.id; }
    // Nenhum registro de criação (ex.: teammate que voltou depois): cria um agora para ele aparecer no escritório.
    const id = `tm:${p.agent_id}`;
    upsertAgent({ id, session_id: sessionId, parent_id: sessionId, kind: "subagent", ts, cwd: p.cwd,
      name: String(p.agent_type ?? "subagente"), status: "working", agent_ref: String(p.agent_id), project: projectFromCwd(p.cwd) });
    return id;
  }
  return sessionId;
}

/** Recebe o JSON de qualquer hook do Claude Code e atualiza agentes + eventos. */
export function ingestHook(p: any): { changed: boolean } {
  const ev: string = p.hook_event_name ?? p.event ?? "";
  const sessionId: string | undefined = p.session_id;
  if (!ev || !sessionId) return { changed: false };
  const ts = Number(p._ts) || Date.now();       // _ts só é usado pelo modo demonstração
  const cwd: string | undefined = p.cwd;

  // Garante que a sessão existe (hooks podem começar no meio de uma sessão).
  const session = upsertAgent({ id: sessionId, session_id: sessionId, ts, cwd, kind: "session" });
  if (session.status === "ended" && ev !== "SessionEnd") upsertAgent({ id: sessionId, session_id: sessionId, ts, status: "idle", ended_at: null });

  const owner = ownerOf(p, sessionId, ts);
  const toolUseId: string | undefined = p.tool_use_id;
  if (!p._ts) refreshModel(owner, p, owner !== sessionId, ts, ev === "SubagentStop" || ev === "Stop");
  if (ev === "SessionStart" && typeof p.model === "string") db.query("UPDATE agents SET model=? WHERE id=?").run(p.model, sessionId);
  if (p._ts && p._model) db.query("UPDATE agents SET model=? WHERE id=?").run(String(p._model), owner);   // modo demonstração

  switch (ev) {
    case "SessionStart":
      upsertAgent({ id: sessionId, session_id: sessionId, ts, status: "idle", ended_at: null });
      addEvent({ ts, agent_id: sessionId, session_id: sessionId, type: "start", detail: p.source });
      break;

    case "UserPromptSubmit": {
      upsertAgent({ id: sessionId, session_id: sessionId, ts, status: "working", task: short(p.prompt) });
      addEvent({ ts, agent_id: sessionId, session_id: sessionId, type: "prompt", detail: p.prompt });
      const cmd = slashCommand(p.prompt);
      if (cmd) addEvent({ ts, agent_id: sessionId, session_id: sessionId, type: "skill", skill: cmd, detail: "comando /" + cmd });
      break;
    }

    case "PreToolUse": {
      const tool: string = p.tool_name ?? "?";
      upsertAgent({ id: owner, session_id: sessionId, ts, status: "working", current_tool: tool });
      if (owner !== sessionId) upsertAgent({ id: sessionId, session_id: sessionId, ts, status: "working" });
      const uid = toolUseId ? `tool:${toolUseId}` : null;
      if (tool === "Skill") {
        const skill = skillFromToolInput(p.tool_input) ?? "?";
        addEvent({ uid, ts, agent_id: owner, session_id: sessionId, type: "skill", tool, skill });
      } else if (SPAWN_TOOLS.has(tool)) {
        const input = p.tool_input ?? {};
        const subId = `sub:${toolUseId ?? `${sessionId}:${ts}`}`;
        upsertAgent({
          id: subId, session_id: sessionId, parent_id: owner, kind: "subagent", ts, cwd,
          name: input.subagent_type || input.agent_type || "subagente", status: "working",
          task: short(input.description ?? input.prompt), project: projectFromCwd(cwd),
        });
        if (input.name) db.query("UPDATE agents SET alias=? WHERE id=?").run(String(input.name), subId);
        if (input.model) db.query("UPDATE agents SET model=? WHERE id=? AND model IS NULL").run(String(input.model), subId);
        addEvent({ uid, ts, agent_id: owner, session_id: sessionId, type: "spawn", tool, detail: input.description ?? input.prompt });
      } else if (MESSAGE_TOOLS.has(tool)) {
        // Conversa entre agentes (equipes de agentes): guarda para quem foi e um resumo.
        const input = p.tool_input ?? {};
        const to = input.to ?? input.recipient ?? input.target ?? input.agent ?? "";
        const text = typeof input.summary === "string" ? input.summary : typeof input.message === "string" ? input.message : typeof input.content === "string" ? input.content : "";
        addEvent({ uid, ts, agent_id: owner, session_id: sessionId, type: "message", tool, skill: String(to), detail: text });
      } else {
        addEvent({ uid, ts, agent_id: owner, session_id: sessionId, type: "tool", tool });
      }
      break;
    }

    case "PostToolUse":
    case "PostToolUseFailure": {
      const tool: string = p.tool_name ?? "?";
      if (SPAWN_TOOLS.has(tool)) {
        const input = p.tool_input ?? {};
        const sub = (toolUseId && q.get.get(`sub:${toolUseId}`)) || q.openSubByTask.get(owner, short(input.description ?? input.prompt) ?? "");
        // Com nome (teammate) ou em segundo plano, o Agent volta na hora mas o agente continua trabalhando.
        const background = !!(input.name || input.run_in_background || input.team_name);
        if (sub && !background) upsertAgent({ id: sub.id, session_id: sessionId, ts, status: "done", current_tool: null, ended_at: ts });
      }
      upsertAgent({ id: owner, session_id: sessionId, ts, current_tool: null, status: "working" });
      break;
    }

    case "SubagentStart": {
      // Liga o agent_id ao subagente criado pelo Task (já resolvido em ownerOf).
      break;
    }

    case "SubagentStop": {
      const sub = p.agent_id ? q.byRef.get(String(p.agent_id)) : q.openSubAnyUnref.get(sessionId);
      if (sub) upsertAgent({ id: sub.id, session_id: sessionId, ts, status: "done", current_tool: null, ended_at: ts });
      break;
    }

    case "Notification":
      upsertAgent({ id: sessionId, session_id: sessionId, ts, status: "waiting" });
      addEvent({ ts, agent_id: sessionId, session_id: sessionId, type: "notification", detail: p.message });
      break;

    case "TeammateIdle": {
      // Teammate terminou a vez dele: sai da mesa até receber trabalho de novo.
      const nm = p.teammate_name ?? p.agent_name ?? p.name;
      const sub = (p.agent_id && q.byRef.get(String(p.agent_id))) || (nm && q.byAlias.get(String(nm)));
      if (sub) upsertAgent({ id: sub.id, session_id: sub.session_id, ts, status: "done", current_tool: null, ended_at: ts });
      break;
    }

    case "Stop":
      if (owner !== sessionId) {   // Stop dentro de um teammate: só ele para, o Líder continua como está
        upsertAgent({ id: owner, session_id: sessionId, ts, status: "done", current_tool: null, ended_at: ts });
        break;
      }
      upsertAgent({ id: sessionId, session_id: sessionId, ts, status: "idle", current_tool: null });
      addEvent({ ts, agent_id: sessionId, session_id: sessionId, type: "stop" });
      break;

    case "SessionEnd":
      upsertAgent({ id: sessionId, session_id: sessionId, ts, status: "ended", current_tool: null, ended_at: ts });
      db.query("UPDATE agents SET status='done', ended_at=? WHERE session_id=? AND kind='subagent' AND status='working'").run(ts, sessionId);
      addEvent({ ts, agent_id: sessionId, session_id: sessionId, type: "end", detail: p.reason });
      break;

    default:
      upsertAgent({ id: owner, session_id: sessionId, ts });
  }
  return { changed: true };
}
