// Graphify dentro do Office: usa o próprio Graphify (pacote oficial `graphifyy`, https://github.com/Graphify-Labs/graphify)
// para mapear cada projeto num grafo de conhecimento e responder perguntas sobre ele.
// O Office não reescreve nada do Graphify: chama o mesmo programa que o /graphify usa, na pasta do projeto,
// e mostra os arquivos que ele gera (graphify-out/graph.html, GRAPH_REPORT.md e graph.json).
import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { db, getMeta, setMeta } from "./db";

const OUT = "graphify-out";
const win = process.platform === "win32";
const ENV = { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", NO_COLOR: "1" };

// ---------------------------------------------------------------- achar o programa
/** Caminho do executável do Graphify, procurando no PATH e nos lugares onde uv, pipx e pip instalam. */
export function graphifyBin(): string | null {
  if (process.env.GRAPHIFY_BIN && existsSync(process.env.GRAPHIFY_BIN)) return process.env.GRAPHIFY_BIN;
  const onPath = Bun.which("graphify");
  if (onPath) return onPath;
  const exe = win ? "graphify.exe" : "graphify";
  const dirs = [join(homedir(), ".local", "bin")];
  if (win) {
    const appdata = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
    const py = join(appdata, "Python");
    try { for (const d of readdirSync(py)) dirs.push(join(py, d, "Scripts")); } catch {}
    const local = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    try { for (const d of readdirSync(join(local, "Programs", "Python"))) dirs.push(join(local, "Programs", "Python", d, "Scripts")); } catch {}
  }
  for (const d of dirs) if (existsSync(join(d, exe))) return join(d, exe);
  return null;
}

function run(args: string[], cwd: string, timeoutMs = 120_000) {
  const bin = graphifyBin();
  if (!bin) return { ok: false, code: -1, out: "O Graphify não está instalado." };
  const r = Bun.spawnSync([bin, ...args], { cwd, env: ENV, stdout: "pipe", stderr: "pipe", timeout: timeoutMs });
  const out = (r.stdout.toString() + (r.stderr.length ? "\n" + r.stderr.toString() : "")).trim();
  return { ok: r.exitCode === 0, code: r.exitCode ?? -1, out: out.slice(0, 200_000) };
}

let versionCache: { at: number; v: string | null } | null = null;
export function status() {
  const bin = graphifyBin();
  if (!versionCache || Date.now() - versionCache.at > 60_000) {
    let v: string | null = null;
    if (bin) { const r = run(["--version"], homedir(), 20_000); v = r.ok ? r.out.replace(/^graphify\s*/i, "").trim() : null; }
    versionCache = { at: Date.now(), v };
  }
  const installer = Bun.which("uv") ? "uv" : Bun.which("pipx") ? "pipx" : (Bun.which("py") || Bun.which("python") || Bun.which("python3")) ? "pip" : null;
  const skillDir = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "skills", "graphify");
  return { installed: !!bin && !!versionCache.v, bin, version: versionCache.v, installer, claudeSkill: existsSync(join(skillDir, "SKILL.md")), jobs: jobList() };
}

// ---------------------------------------------------------------- tarefas demoradas (instalar, gerar grafo)
type Job = { id: string; kind: string; project: string | null; started: number; ended: number | null; ok: boolean | null; log: string };
const jobs = new Map<string, Job>();
let onChange: () => void = () => {};
export const setGraphifyNotify = (fn: () => void) => { onChange = fn; };
const jobList = () => [...jobs.values()].sort((a, b) => b.started - a.started).slice(0, 20);

function startJob(kind: string, project: string | null, cmd: string[], cwd: string) {
  const running = [...jobs.values()].find(j => !j.ended && j.kind === kind && j.project === project);
  if (running) return running;
  const job: Job = { id: crypto.randomUUID().slice(0, 8), kind, project, started: Date.now(), ended: null, ok: null, log: `$ ${cmd.map(c => (c.includes(" ") ? `"${c}"` : c)).join(" ")}\n` };
  jobs.set(job.id, job);
  onChange();
  (async () => {
    try {
      const p = Bun.spawn(cmd, { cwd, env: ENV, stdout: "pipe", stderr: "pipe" });
      const pump = async (s: ReadableStream<Uint8Array>) => {
        const dec = new TextDecoder();
        for await (const chunk of s) { job.log = (job.log + dec.decode(chunk)).slice(-60_000); }
      };
      await Promise.all([pump(p.stdout), pump(p.stderr)]);
      const code = await p.exited;
      job.ok = code === 0;
    } catch (err) { job.log += `\n${String(err)}`; job.ok = false; }
    job.ended = Date.now();
    if (kind === "instalar") versionCache = null;
    onChange();
  })();
  return job;
}

/** Instala o pacote oficial do Graphify (uv > pipx > pip). */
export function install() {
  const uv = Bun.which("uv"), pipx = Bun.which("pipx"), py = Bun.which("py") ?? Bun.which("python") ?? Bun.which("python3");
  if (uv) return startJob("instalar", null, [uv, "tool", "install", "--upgrade", "graphifyy"], homedir());
  if (pipx) return startJob("instalar", null, [pipx, "install", "graphifyy"], homedir());
  if (py) return startJob("instalar", null, [py, "-m", "pip", "install", "--user", "--upgrade", "graphifyy"], homedir());
  return null;
}

/** Registra o /graphify também como skill do Claude Code (o mesmo `graphify install` da documentação). */
export function installClaudeSkill() {
  const bin = graphifyBin();
  if (!bin) return null;
  return startJob("skill", null, [bin, "install", "--platform", win ? "windows" : "claude"], homedir());
}

// ---------------------------------------------------------------- projetos
const idOf = (p: string) => createHash("sha1").update(p.toLowerCase()).digest("hex").slice(0, 12);
const extra = (): string[] => { try { return JSON.parse(getMeta("graphify_projects") ?? "[]"); } catch { return []; } };
const hidden = (): string[] => { try { return JSON.parse(getMeta("graphify_hidden") ?? "[]"); } catch { return []; } };

const countCache = new Map<string, { mtime: number; nodes: number; edges: number; communities: number }>();
function graphInfo(dir: string) {
  const f = join(dir, OUT, "graph.json");
  if (!existsSync(f)) return null;
  const mtime = statSync(f).mtimeMs;
  const c = countCache.get(f);
  if (c && c.mtime === mtime) return { builtAt: mtime, ...c };
  let nodes = 0, edges = 0, communities = 0;
  try {
    const g = JSON.parse(readFileSync(f, "utf8"));
    nodes = g.nodes?.length ?? 0; edges = (g.links ?? g.edges)?.length ?? 0;
    communities = new Set((g.nodes ?? []).map((n: any) => n.community)).size;
  } catch {}
  countCache.set(f, { mtime, nodes, edges, communities });
  return { builtAt: mtime, nodes, edges, communities };
}

export function projects() {
  const seen = new Map<string, any>();
  const hide = new Set(hidden().map(p => p.toLowerCase()));
  const add = (path: string, source: string, lastUsed: number | null) => {
    const key = path.toLowerCase();
    if (seen.has(key) || hide.has(key)) return;
    try { if (!statSync(path).isDirectory()) return; } catch { return; }
    seen.set(key, { id: idOf(path), name: basename(path.replace(/[\\/]+$/, "")) || path, path, source, lastUsed, graph: graphInfo(path),
      building: [...jobs.values()].some(j => !j.ended && j.kind === "grafo" && j.project === path) });
  };
  for (const p of extra()) add(p, "adicionado", null);
  const rows = db.query<{ cwd: string; l: number }, []>(
    "SELECT cwd, MAX(last_seen) l FROM agents WHERE cwd IS NOT NULL AND cwd <> '' GROUP BY cwd ORDER BY l DESC LIMIT 80").all();
  for (const r of rows) add(r.cwd, "Claude Code", r.l);
  return [...seen.values()];
}

const find = (id: string) => projects().find(p => p.id === id) ?? null;

export function addProject(path: string) {
  const p = resolve(String(path ?? "").trim().replace(/^"(.*)"$/, "$1"));
  try { if (!statSync(p).isDirectory()) return { error: "Isso não é uma pasta." }; } catch { return { error: "Pasta não encontrada." }; }
  const list = extra().filter(x => x.toLowerCase() !== p.toLowerCase());
  list.unshift(p);
  setMeta("graphify_projects", JSON.stringify(list.slice(0, 100)));
  setMeta("graphify_hidden", JSON.stringify(hidden().filter(x => x.toLowerCase() !== p.toLowerCase())));
  return { ok: true, id: idOf(p) };
}

/** Oculta o projeto da lista (não apaga nada; dá para mostrar de novo). */
export function hideProject(id: string) {
  const p = find(id);
  if (!p) return { error: "Projeto não encontrado." };
  setMeta("graphify_hidden", JSON.stringify([...hidden().filter(x => x.toLowerCase() !== p.path.toLowerCase()), p.path]));
  return { ok: true };
}

export function showProject(path: string) {
  const key = String(path ?? "").toLowerCase();
  setMeta("graphify_hidden", JSON.stringify(hidden().filter(x => x.toLowerCase() !== key)));
  return { ok: true, id: idOf(String(path)) };
}

export const hiddenProjects = () => hidden().map(path => ({ path, name: basename(path.replace(/[\\/]+$/, "")) || path }));

/** Gera ou atualiza o grafo do projeto (`graphify update <pasta>`: só código, local, sem IA). */
export function build(id: string, force = false) {
  const p = find(id);
  if (!p) return null;
  const bin = graphifyBin();
  if (!bin) return null;
  return startJob("grafo", p.path, [bin, "update", ".", ...(force ? ["--force"] : [])], p.path);
}

const ASK: Record<string, (a: string[]) => string[] | null> = {
  query: a => (a[0] ? ["query", a[0], "--budget", a[1] || "2000"] : null),
  explain: a => (a[0] ? ["explain", a[0]] : null),
  path: a => (a[0] && a[1] ? ["path", a[0], a[1], "--undirected"] : null),
  affected: a => (a[0] ? ["affected", a[0]] : null),
  "god-nodes": a => ["god-nodes", "--top", a[0] || "15"],
};

/** Pergunta ao grafo do projeto com os comandos do próprio Graphify (query, explain, path, affected, god-nodes). */
export function ask(id: string, kind: string, args: string[]) {
  const p = find(id);
  if (!p) return { error: "Projeto não encontrado." };
  if (!p.graph) return { error: "Gere o grafo primeiro." };
  const mk = ASK[kind];
  if (!mk) return { error: "Tipo de pergunta inválido." };
  const cmd = mk((args ?? []).map(x => String(x ?? "").slice(0, 500)));
  if (!cmd) return { error: "Preencha os campos da pergunta." };
  return run(cmd, p.path, 60_000);
}

/** Arquivos gerados que a tela pode mostrar. */
const FILES: Record<string, string> = { "graph.html": "text/html; charset=utf-8", "GRAPH_REPORT.md": "text/markdown; charset=utf-8", "GRAPH_TREE.html": "text/html; charset=utf-8", "graph.json": "application/json" };
export function outputFile(id: string, name: string) {
  const p = find(id);
  if (!p || !FILES[name]) return null;
  const f = join(p.path, OUT, name);
  if (!existsSync(f)) return null;
  if (name === "graph.html") {
    // Mesmo graph.html do Graphify; só a biblioteca do desenho (vis-network) vem do próprio Office, para abrir sem internet.
    const html = readFileSync(f, "utf8").replace(/https:\/\/unpkg\.com\/vis-network@[^"']*\/vis-network\.min\.js/g, "/vendor/vis-network.min.js");
    return new Response(html, { headers: { "content-type": FILES[name], "cache-control": "no-cache" } });
  }
  return new Response(Bun.file(f), { headers: { "content-type": FILES[name], "cache-control": "no-cache" } });
}

export function job(id: string) { return jobs.get(id) ?? null; }
