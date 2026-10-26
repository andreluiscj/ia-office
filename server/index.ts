// Servidor local: recebe eventos dos hooks, guarda no SQLite e serve as telas.
import { join, normalize } from "node:path";
import { db, DB_PATH, ingestHook, getMeta, setMeta, type Agent } from "./db";
import { company, roster } from "./company";
import { listSkills, skillDetail, skillRoots } from "./skills";
import * as graphify from "./graphify";

const PORT = Number(process.env.PORT ?? 7777);
const PUBLIC = join(import.meta.dir, "..", "public");

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

/** Status mostrado na tela, considerando há quanto tempo o agente não dá sinal. */
function effectiveStatus(a: Agent, now: number): string {
  if (a.status === "ended") return "ended";
  if (a.status === "done") return "done";
  const age = now - a.last_seen;
  if (age > 3 * HOUR) return "offline";
  if (a.status === "working" && age > 15 * MIN) return "idle";
  return a.status;
}

function topSkillsFor(ids: string[], limit = 5) {
  const out: Record<string, { skill: string; count: number }[]> = {};
  if (!ids.length) return out;
  const rows = db.query<{ agent_id: string; skill: string; c: number }, string[]>(
    `SELECT agent_id, skill, COUNT(*) c FROM events WHERE type='skill' AND agent_id IN (${ids.map(() => "?").join(",")})
     GROUP BY agent_id, skill ORDER BY c DESC`).all(...ids);
  for (const r of rows) {
    const list = (out[r.agent_id] ??= []);
    if (list.length < limit) list.push({ skill: r.skill, count: r.c });
  }
  return out;
}

function state() {
  const now = Date.now();
  const agents = db.query<Agent, [number, number, number]>(
    `SELECT * FROM agents
     WHERE (status NOT IN ('ended','done') AND last_seen >= ?)
        OR (status = 'ended' AND IFNULL(ended_at, last_seen) >= ?)
        OR (status = 'done' AND IFNULL(ended_at, last_seen) >= ?)
     ORDER BY started_at LIMIT 300`).all(now - 12 * HOUR, now - 30 * MIN, now - 10 * MIN);
  // Inclui o pai de qualquer subagente visível, para a conexão sempre aparecer.
  const ids = new Set(agents.map(a => a.id));
  for (const a of [...agents]) {
    if (a.parent_id && !ids.has(a.parent_id)) {
      const p = db.query<Agent, [string]>("SELECT * FROM agents WHERE id=?").get(a.parent_id);
      if (p) { agents.push(p); ids.add(p.id); }
    }
  }
  // Ninguém ativo: mostra as últimas sessões (cadeiras vazias) para o escritório não ficar em branco.
  const anyLive = agents.some(a => !["ended", "done", "offline"].includes(effectiveStatus(a, now)));
  let mode = "live";
  if (!anyLive) {
    mode = "recent";
    const recent = db.query<Agent, []>("SELECT * FROM agents WHERE kind='session' ORDER BY last_seen DESC LIMIT 8").all();
    for (const r of recent) if (!ids.has(r.id)) { agents.push(r); ids.add(r.id); }
  }
  const skills = topSkillsFor([...ids]);
  return {
    now, mode, health: health(),
    agents: agents.map(a => ({ ...a, status: effectiveStatus(a, now), skills: skills[a.id] ?? [] })),
  };
}

function health() {
  const last = getMeta("last_hook");
  const c = db.query<{ s: number; e: number }, []>("SELECT (SELECT COUNT(*) FROM agents WHERE kind='session') s, (SELECT COUNT(*) FROM events) e").get()!;
  return { lastHook: last ? JSON.parse(last) : null, sessions: c.s, events: c.e };
}

function stats(rangeDays: number, project: string | null) {
  const now = Date.now();
  const since = rangeDays > 0 ? now - rangeDays * DAY : 0;
  const pj = project ? " AND a.project = ?" : "";
  const args = (project ? [since, project] : [since]) as any[];

  // Agrupa por "quem": o Diretor (todas as sessões principais) ou o tipo de subagente (funcionário).
  const WHO = "CASE a.kind WHEN 'session' THEN 'diretor' ELSE a.name END";
  type G = { agent: string; kind: string; total: number; tasks: number; skills: { skill: string; count: number }[]; tools: { tool: string; count: number }[] };
  const agentMap = new Map<string, G>();
  const group = (who: string) => {
    let g = agentMap.get(who);
    if (!g) { g = { agent: who, kind: who === "diretor" ? "session" : "subagent", total: 0, tasks: 0, skills: [], tools: [] }; agentMap.set(who, g); }
    return g;
  };
  for (const r of db.query<{ who: string; skill: string; c: number }, any[]>(
    `SELECT ${WHO} who, e.skill, COUNT(*) c FROM events e JOIN agents a ON a.id = e.agent_id
     WHERE e.type='skill' AND e.ts >= ?${pj} GROUP BY who, e.skill ORDER BY c DESC`).all(...args)) {
    const g = group(r.who); g.total += r.c; g.skills.push({ skill: r.skill, count: r.c });
  }
  for (const r of db.query<{ who: string; tool: string; c: number }, any[]>(
    `SELECT ${WHO} who, e.tool, COUNT(*) c FROM events e JOIN agents a ON a.id = e.agent_id
     WHERE e.type IN ('tool','spawn') AND e.ts >= ?${pj} GROUP BY who, e.tool ORDER BY c DESC`).all(...args)) {
    const g = group(r.who); if (g.tools.length < 6) g.tools.push({ tool: r.tool, count: r.c });
  }
  for (const r of db.query<{ who: string; c: number }, any[]>(
    `SELECT ${WHO} who, COUNT(*) c FROM agents a WHERE a.started_at >= ?${pj} GROUP BY who`).all(...args)) {
    group(r.who).tasks = r.c;
  }
  const byAgent = [...agentMap.values()].sort((a, b) => b.total - a.total || b.tasks - a.tasks);

  const topSkills = db.query<{ skill: string; c: number; agents: number }, any[]>(
    `SELECT e.skill, COUNT(*) c, COUNT(DISTINCT a.name) agents FROM events e JOIN agents a ON a.id = e.agent_id
     WHERE e.type='skill' AND e.ts >= ?${pj} GROUP BY e.skill ORDER BY c DESC LIMIT 15`).all(...args);
  const topTools = db.query<{ tool: string; c: number }, any[]>(
    `SELECT e.tool, COUNT(*) c FROM events e JOIN agents a ON a.id = e.agent_id
     WHERE e.type IN ('tool','spawn') AND e.ts >= ?${pj} GROUP BY e.tool ORDER BY c DESC LIMIT 12`).all(...args);
  const daily = db.query<{ day: string; c: number }, any[]>(
    `SELECT date(e.ts/1000, 'unixepoch', 'localtime') day, COUNT(*) c FROM events e JOIN agents a ON a.id = e.agent_id
     WHERE e.type='skill' AND e.ts >= ?${pj} GROUP BY day ORDER BY day`).all(...args);
  const sessions = db.query<{ c: number }, any[]>(
    `SELECT COUNT(*) c FROM agents a WHERE a.kind='session' AND a.last_seen >= ?${pj}`).get(...args)!.c;
  const subagents = db.query<{ c: number }, any[]>(
    `SELECT COUNT(*) c FROM agents a WHERE a.kind='subagent' AND a.started_at >= ?${pj}`).get(...args)!.c;
  const skillUses = topSkills.reduce((s, r) => s + r.c, 0);
  const projects = db.query<{ project: string }, []>("SELECT DISTINCT project FROM agents ORDER BY project").all().map(r => r.project);

  const live = state().agents.filter(a => (!project || a.project === project) && !["ended", "done", "offline"].includes(a.status));
  return {
    now, rangeDays, project, projects,
    cards: {
      working: live.filter(a => a.status === "working").length,
      waiting: live.filter(a => a.status === "waiting").length,
      sessions, subagents, skillUses,
    },
    active: live,
    byAgent, topSkills, topTools, daily,
  };
}

// Avisa as telas abertas (WebSocket) no máximo 4x por segundo.
let pending: Timer | null = null;
function notify() {
  if (pending) return;
  pending = setTimeout(() => { pending = null; server.publish("live", "changed"); }, 250);
}
graphify.setGraphifyNotify(notify);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

const server = Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req, srv) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/ws") return srv.upgrade(req) ? undefined : new Response("ws esperado", { status: 400 });

    if (path === "/events" && req.method === "POST") {
      try {
        const body = await req.json();
        const list = Array.isArray(body) ? body : [body];
        let changed = false;
        for (const p of list) changed = ingestHook(p).changed || changed;
        const lastP = list.at(-1);
        if (lastP?.hook_event_name && !lastP._ts) setMeta("last_hook", JSON.stringify({ ts: Date.now(), event: lastP.hook_event_name, project: lastP.cwd ?? null }));
        if (changed) notify();
        return json({ ok: true });
      } catch (err) {
        return json({ ok: false, error: String(err) }, 400);
      }
    }
    // Barra de status do Claude Code: limites de uso (sessão de 5 h e semana) e modelo da sessão.
    if (path === "/statusline" && req.method === "POST") {
      try {
        const b: any = await req.json();
        const rl = b?.rate_limits;
        if (rl && (rl.five_hour || rl.seven_day)) setMeta("usage", JSON.stringify({ five_hour: rl.five_hour ?? null, seven_day: rl.seven_day ?? null, ts: Date.now() }));
        if (b?.session_id && b?.model?.id) db.query("UPDATE agents SET model=? WHERE id=?").run(String(b.model.id), String(b.session_id));
        notify();
        return json({ ok: true });
      } catch (err) { return json({ ok: false, error: String(err) }, 400); }
    }
    // Parar o servidor (bun run office:parar). O cabeçalho próprio impede que uma página da web chame isto.
    if (path === "/api/parar" && req.method === "POST") {
      if (req.headers.get("x-office") !== "parar") return json({ ok: false }, 403);
      setTimeout(() => process.exit(0), 100);
      return json({ ok: true });
    }
    if (path === "/api/state") return json(state());
    if (path === "/api/company") return json(company(health()));
    if (path === "/api/roster") return json(roster());
    if (path === "/api/usage") { const u = getMeta("usage"); return json({ now: Date.now(), usage: u ? JSON.parse(u) : null }); }
    if (path === "/api/skills") { const list = listSkills().map(({ path: _p, ...s }) => s); return json({ skills: list, roots: skillRoots() }); }
    if (path.startsWith("/api/skills/")) {
      const d = skillDetail(path.slice("/api/skills/".length));
      return d ? json(d) : json({ error: "skill não encontrada" }, 404);
    }
    // Graphify (grafo de conhecimento dos projetos). As ações exigem o cabeçalho x-office,
    // que uma página de outro site não consegue mandar: só a tela do Office dispara comandos.
    if (path.startsWith("/api/graphify")) {
      const sub = path.slice("/api/graphify".length);
      if (req.method === "POST") {
        if (req.headers.get("x-office") !== "1") return json({ error: "proibido" }, 403);
        const b: any = await req.json().catch(() => ({}));
        if (sub === "/instalar") { const j = graphify.install(); return j ? json(j) : json({ error: "Python/uv não encontrado" }, 400); }
        if (sub === "/skill") { const j = graphify.installClaudeSkill(); return j ? json(j) : json({ error: "Instale o Graphify primeiro" }, 400); }
        if (sub === "/projetos") { const r = graphify.addProject(b.path); return json(r, r.error ? 400 : 200); }
        if (sub === "/ocultar") { const r = graphify.hideProject(b.id); return json(r, r.error ? 400 : 200); }
        if (sub === "/mostrar") return json(graphify.showProject(b.path));
        if (sub === "/gerar") { const j = graphify.build(b.id, !!b.force); return j ? json(j) : json({ error: "Projeto não encontrado ou Graphify não instalado" }, 400); }
        if (sub === "/perguntar") { const r = graphify.ask(b.id, b.kind, b.args); return json(r, (r as any).error ? 400 : 200); }
        return json({ error: "não encontrado" }, 404);
      }
      if (sub === "" || sub === "/status") return json(graphify.status());
      if (sub === "/projetos") return json(graphify.projects());
      if (sub === "/ocultos") return json(graphify.hiddenProjects());
      if (sub.startsWith("/tarefa/")) { const j = graphify.job(sub.slice(8)); return j ? json(j) : json({ error: "não encontrada" }, 404); }
      const m = sub.match(/^\/arquivo\/([0-9a-f]{12})\/([A-Za-z_.]+)$/);
      if (m) return graphify.outputFile(m[1], m[2]) ?? new Response("Arquivo ainda não gerado.", { status: 404 });
      return json({ error: "não encontrado" }, 404);
    }
    if (path === "/api/health") return json({ ok: true, db: DB_PATH, ...health() });
    if (path === "/api/stats") {
      const range = Number(url.searchParams.get("range") ?? 7);
      return json(stats(Number.isFinite(range) ? range : 7, url.searchParams.get("project") || null));
    }

    // Arquivos estáticos
    const file = path === "/" ? "index.html" : path === "/dashboard" ? "dashboard.html" : path === "/skills" ? "skills.html" : path === "/graphify" ? "graphify.html" : path.slice(1);
    const full = normalize(join(PUBLIC, file));
    if (!full.startsWith(PUBLIC)) return new Response("não encontrado", { status: 404 });
    const f = Bun.file(full);
    // no-cache: o navegador sempre confere se há versão nova das telas
    return (await f.exists()) ? new Response(f, { headers: { "cache-control": "no-cache" } }) : new Response("não encontrado", { status: 404 });
  },
  websocket: {
    open(ws) { ws.subscribe("live"); },
    message() {},
  },
});

console.log(`\n  Office rodando em http://localhost:${server.port}`);
console.log(`  Dashboard:                   http://localhost:${server.port}/dashboard`);
console.log(`  Banco de dados:              ${DB_PATH}\n`);
