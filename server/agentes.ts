// A equipe do Office vem de arquivos fáceis de editar:
//  - company/empresa.json         nome da empresa, seu nome e os setores
//  - company/agents/<id>.md       um arquivo por agente: nome, cargo, aparência e todo o conhecimento (prompt)
// Nos textos dá para usar {{usuario}}, {{empresa}}, {{lider}}, {{arquiteto}}, {{backend}}, {{frontend}},
// {{qa}}, {{seguranca}} e {{revisor}}: viram o nome atual de cada um ao instalar no Claude Code.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const COMPANY_DIR = join(import.meta.dir, "..", "company");
export const AGENTS_SRC = join(COMPANY_DIR, "agents");
const CLAUDE = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
export const AGENTS_DEST = join(CLAUDE, "agents");

/** Campos usados só pelo Office (o Claude Code não precisa deles). */
const OFFICE_KEYS = ["nome", "cargo", "setor", "resumo", "cor", "cabelo", "pele"];

export type AgentDoc = { id: string; file: string; meta: Record<string, string>; text: string };
export type Empresa = { empresa: string; usuario: string; setores: { id: string; nome: string }[] };

function readFrontmatter(text: string) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta: Record<string, string> = {};
  if (!m) return meta;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) { try { v = JSON.parse(v); } catch { v = v.slice(1, -1); } }
    else if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1).replace(/''/g, "'");
    meta[kv[1]] = v;
  }
  return meta;
}

let gitName: string | null = null;
function gitUserName() {
  if (gitName !== null) return gitName;
  gitName = "";
  try {
    const p = Bun.spawnSync(["git", "config", "--global", "user.name"], { stdout: "pipe", stderr: "ignore" });
    gitName = p.stdout.toString().trim();
  } catch {}
  return gitName;
}

export function empresa(): Empresa {
  let e: Partial<Empresa> = {};
  try { e = JSON.parse(readFileSync(join(COMPANY_DIR, "empresa.json"), "utf8")); } catch {}
  return {
    empresa: e.empresa?.trim() || "Office",
    usuario: e.usuario?.trim() || gitUserName() || "Usuário",
    setores: e.setores ?? [],
  };
}

export function agentDocs(): AgentDoc[] {
  if (!existsSync(AGENTS_SRC)) return [];
  const ORDER = ["empresa-lider", "empresa-arquiteto", "empresa-backend", "empresa-frontend", "empresa-qa", "empresa-seguranca", "empresa-revisor"];
  const rank = (f: string) => { const i = ORDER.indexOf(f.slice(0, -3)); return i < 0 ? 99 : i; };
  return readdirSync(AGENTS_SRC).filter(f => f.endsWith(".md")).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map(f => {
    const file = join(AGENTS_SRC, f);
    const text = readFileSync(file, "utf8");
    return { id: f.slice(0, -3), file, meta: readFrontmatter(text), text };
  });
}

/** Valores dos {{marcadores}}: {{arquiteto}} = nome do agente empresa-arquiteto, e assim por diante. */
export function variables(docs = agentDocs(), e = empresa()) {
  const vars: Record<string, string> = { usuario: e.usuario, empresa: e.empresa };
  for (const d of docs) vars[d.id.replace(/^empresa-/, "")] = d.meta.nome || d.id;
  for (const d of docs) vars[d.id.replace(/^empresa-/, "")] = fill(vars[d.id.replace(/^empresa-/, "")], vars);
  return vars;
}

export function fill(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*([a-z_-]+)\s*\}\}/gi, (all, k) => vars[k.toLowerCase()] ?? all);
}

/** Arquivo do agente no formato do Claude Code: sem os campos do Office e com os nomes preenchidos. */
export function renderForClaude(doc: AgentDoc, vars: Record<string, string>) {
  const m = doc.text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return fill(doc.text, vars);
  const fm = m[1].split(/\r?\n/).filter(l => {
    if (/^\s*#/.test(l)) return false;
    const k = l.match(/^([A-Za-z_-]+):/)?.[1];
    return !k || !OFFICE_KEYS.includes(k);
  }).join("\n");
  return fill(`---\n${fm}\n---\n${doc.text.slice(m[0].length)}`, vars);
}

/** Copia os agentes (já preenchidos) para ~/.claude/agents. Devolve os ids instalados. */
export function syncAgents() {
  const docs = agentDocs(), vars = variables(docs);
  mkdirSync(AGENTS_DEST, { recursive: true });
  for (const d of docs) writeFileSync(join(AGENTS_DEST, `${d.id}.md`), renderForClaude(d, vars));
  return docs.map(d => d.id);
}
