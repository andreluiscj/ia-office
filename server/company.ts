// Visão de "empresa": cada funcionário é um tipo de subagente (empresa-*),
// o Diretor é a sessão principal do Claude Code, independente do projeto.
import { db, getMeta, modelFamily, type Agent } from "./db";
import { agentDocs, empresa, fill, variables } from "./agentes";

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

export type Member = { id: string; nome: string; cargo: string; setor: string; cor: string; cabelo: string; pele: string; resumo: string };
export type Roster = { empresa: string; diretor: any; setores: { id: string; nome: string }[]; funcionarios: Member[] };

/** Quadro da empresa montado a partir de company/empresa.json e company/agents/*.md (um arquivo por agente). */
export function roster(): Roster {
  const e = empresa(), docs = agentDocs(), vars = variables(docs, e);
  const toMember = (d: (typeof docs)[number]): Member => ({
    id: d.id, nome: fill(d.meta.nome || d.id, vars), cargo: fill(d.meta.cargo || "", vars), setor: d.meta.setor || "",
    cor: d.meta.cor || "#888888", cabelo: d.meta.cabelo || "#333333", pele: d.meta.pele || "#d9a57b",
    resumo: fill(d.meta.resumo || d.meta.description || "", vars),
  });
  const lider = docs.find(d => d.id === "empresa-lider");
  const diretor = lider ? toMember(lider) : { id: "empresa-lider", nome: e.usuario, cargo: "Líder", setor: "diretoria", cor: "#d97757", cabelo: "#3b2a20", pele: "#f1c7a5", resumo: "" };
  return { empresa: e.empresa, diretor, setores: e.setores, funcionarios: docs.filter(d => d !== lider).map(toMember) };
}

/** "plugin:empresa-qa" ou "empresa-qa" -> membro do quadro. */
export function memberFor(name: string, r: Roster): Member | undefined {
  return r.funcionarios.find(m => name === m.id || name.endsWith(":" + m.id));
}

function isLive(a: Agent, now: number) {
  if (a.status === "ended" || a.status === "done") return false;
  const age = now - a.last_seen;
  if (age > 3 * HOUR) return false;
  if (a.status === "working" && age > 15 * MIN) return false;
  return true;
}

function liveStatus(a: Agent, now: number) {
  if (!isLive(a, now)) return a.status === "done" ? "done" : "idle";
  return a.status;
}

function topBy(column: "skill" | "tool", type: string, names: string[], since: number, limit = 5) {
  if (!names.length) return [];
  return db.query<{ k: string; c: number }, any[]>(
    `SELECT e.${column} k, COUNT(*) c FROM events e JOIN agents a ON a.id = e.agent_id
     WHERE e.type ${type} AND e.ts >= ? AND a.kind='subagent' AND a.name IN (${names.map(() => "?").join(",")})
     GROUP BY k ORDER BY c DESC LIMIT ${limit}`).all(since, ...names).map(r => ({ name: r.k, count: r.c }));
}

/** % de uso por família de modelo (opus, sonnet...) nos eventos dos agentes informados. */
function modelShare(agentFilter: string, args: any[]) {
  const rows = db.query<{ model: string; c: number }, any[]>(
    `SELECT e.model model, COUNT(*) c FROM events e JOIN agents a ON a.id = e.agent_id
     WHERE e.model IS NOT NULL AND ${agentFilter} GROUP BY e.model`).all(...args);
  const fam = new Map<string, number>();
  for (const r of rows) { const f = modelFamily(r.model)!; fam.set(f, (fam.get(f) ?? 0) + r.c); }
  const total = [...fam.values()].reduce((a, b) => a + b, 0);
  return [...fam.entries()].map(([model, c]) => ({ model, count: c, pct: total ? Math.round((c / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Para quem foi a mensagem: "joaquim", "empresa-arquiteto", "arquiteto", "main"... -> id do membro ou "diretor". */
function resolveRecipient(to: string, sessionId: string, r: Roster): string | null {
  const n = norm(to);
  if (!n) return null;
  if (["main", "lead", "team lead", "leader", "lider", "diretor", "empresa lider"].includes(n) || n === norm(r.diretor.nome)) return "diretor";
  const byAlias = db.query<Agent, [string]>("SELECT * FROM agents WHERE session_id=? AND alias IS NOT NULL ORDER BY started_at DESC").all(sessionId)
    .find(a => norm(a.alias ?? "") === n);
  if (byAlias) return memberFor(byAlias.name, r)?.id ?? null;
  const m = r.funcionarios.find(f => norm(f.id) === n || norm(f.id.replace(/^empresa-/, "")) === n || norm(f.nome) === n
    || n.startsWith(norm(f.nome)) || norm(f.cargo).split(" ").includes(n));
  return m?.id ?? null;
}

export function company(health: unknown) {
  const now = Date.now();
  const r = roster();
  const subs = db.query<Agent, [number]>(
    "SELECT * FROM agents WHERE kind='subagent' AND last_seen >= ? ORDER BY started_at").all(now - 12 * HOUR);
  const sessions = db.query<Agent, [number]>(
    "SELECT * FROM agents WHERE kind='session' AND status != 'ended' AND last_seen >= ? ORDER BY last_seen DESC").all(now - 3 * HOUR);
  const liveSessions = sessions.filter(s => isLive(s, now));

  // Nomes reais (com prefixo de plugin, se houver) de cada membro, vistos no banco.
  const allNames = db.query<{ name: string }, []>("SELECT DISTINCT name FROM agents WHERE kind='subagent'").all().map(x => x.name);

  const funcionarios = r.funcionarios.map(m => {
    const names = allNames.filter(n => memberFor(n, r)?.id === m.id);
    const mine = subs.filter(s => names.includes(s.name));
    const active = mine.filter(s => isLive(s, now)).map(s => ({
      id: s.id, project: s.project, task: s.task, current_tool: s.current_tool, parent_id: s.parent_id, started_at: s.started_at,
    }));
    const last = names.length ? db.query<Agent, any[]>(
      `SELECT * FROM agents WHERE kind='subagent' AND name IN (${names.map(() => "?").join(",")}) ORDER BY last_seen DESC LIMIT 1`).get(...names) : null;
    const done7 = names.length ? db.query<{ c: number }, any[]>(
      `SELECT COUNT(*) c FROM agents WHERE kind='subagent' AND started_at >= ? AND name IN (${names.map(() => "?").join(",")})`).get(now - 7 * DAY, ...names)!.c : 0;
    return {
      ...m,
      status: active.length ? "working" : "idle",
      active,
      last: last ? { ts: last.last_seen, project: last.project, task: last.task } : null,
      tasks7d: done7,
      skills: topBy("skill", "= 'skill'", names, 0),
      tools: topBy("tool", "IN ('tool','spawn')", names, 0),
    };
  });

  // Subagentes que não são do quadro (Explore, general-purpose...): terceirizados.
  const freelancers = subs
    .filter(s => !memberFor(s.name, r) && (isLive(s, now) || (s.status === "done" && now - (s.ended_at ?? s.last_seen) < 10 * MIN)))
    .map(s => ({ id: s.id, name: s.name, project: s.project, task: s.task, current_tool: s.current_tool, status: liveStatus(s, now), parent_id: s.parent_id, last_seen: s.last_seen }));

  const dStatus = liveSessions.some(s => s.status === "working") ? "working"
    : liveSessions.some(s => s.status === "waiting") ? "waiting" : "idle";

  // Mensagens entre agentes nos últimos 60 s: viram linhas no escritório.
  const msgs = db.query<{ ts: number; agent_id: string; session_id: string; skill: string; detail: string | null; kind: string; name: string }, [number]>(
    `SELECT e.ts, e.agent_id, e.session_id, e.skill, e.detail, a.kind, a.name FROM events e JOIN agents a ON a.id = e.agent_id
     WHERE e.type='message' AND e.ts >= ? ORDER BY e.ts`).all(now - 60_000);
  const links = msgs.map(m => {
    const from = m.kind === "session" ? "diretor" : memberFor(m.name, r)?.id ?? null;
    const to = resolveRecipient(m.skill ?? "", m.session_id, r);
    return from && to && from !== to ? { from, to, ts: m.ts, text: m.detail } : null;
  }).filter(Boolean);

  // Uso de modelo por funcionário (% dos eventos) e modelo atual de quem está trabalhando.
  for (const f of funcionarios as any[]) {
    const names = allNames.filter(n => memberFor(n, r)?.id === f.id);
    f.models = names.length ? modelShare(`a.kind='subagent' AND a.name IN (${names.map(() => "?").join(",")})`, names) : [];
    const cur = names.length ? db.query<{ model: string | null }, any[]>(
      `SELECT model FROM agents WHERE kind='subagent' AND model IS NOT NULL AND name IN (${names.map(() => "?").join(",")}) ORDER BY last_seen DESC LIMIT 1`).get(...names) : null;
    f.model_now = f.status === "working" ? modelFamily(cur?.model) : null;
  }
  const liveModel = liveSessions.find(s => s.model)?.model;
  const usageRaw = getMeta("usage");

  return {
    now, empresa: r.empresa, setores: r.setores, health,
    diretor: {
      ...r.diretor, status: dStatus,
      sessions: liveSessions.map(s => ({ id: s.id, project: s.project, status: s.status, task: s.task, current_tool: s.current_tool, last_seen: s.last_seen, model: modelFamily(s.model) })),
      models: modelShare("a.kind='session'", []),
      model_now: dStatus === "idle" ? null : modelFamily(liveModel),
    },
    funcionarios, freelancers, links,
    usage: usageRaw ? JSON.parse(usageRaw) : null,
  };
}
