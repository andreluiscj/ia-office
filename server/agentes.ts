// A equipe do Office vem de arquivos fáceis de editar:
//  - company/empresa.json         nome da empresa, seu nome e os setores
//  - company/agents/<id>.md       um arquivo por agente: nome, cargo, aparência e todo o conhecimento (prompt)
// Nos textos dá para usar {{usuario}}, {{empresa}}, {{lider}}, {{arquiteto}}, {{dev}},
// {{seguranca}} e {{revisor}}: viram o nome atual de cada um ao instalar no Claude Code.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const COMPANY_DIR = join(import.meta.dir, "..", "company");
export const AGENTS_SRC = join(COMPANY_DIR, "agents");
const CLAUDE = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
export const AGENTS_DEST = join(CLAUDE, "agents");
export const SKILLS_SRC = join(COMPANY_DIR, "skills");
export const SKILLS_DEST = join(CLAUDE, "skills");

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
  const ORDER = ["office-ceo", "office-architect", "office-dev", "office-security", "office-reviewer"];
  const rank = (f: string) => { const i = ORDER.indexOf(f.slice(0, -3)); return i < 0 ? 99 : i; };
  return readdirSync(AGENTS_SRC).filter(f => f.endsWith(".md")).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map(f => {
    const file = join(AGENTS_SRC, f);
    const text = readFileSync(file, "utf8");
    return { id: f.slice(0, -3), file, meta: readFrontmatter(text), text };
  });
}

/** Valores dos {{marcadores}}: {{arquiteto}} = nome do agente office-architect, e assim por diante. */
export function variables(docs = agentDocs(), e = empresa()) {
  const vars: Record<string, string> = { usuario: e.usuario, empresa: e.empresa };
  const ALIAS: Record<string, string> = { ceo: "lider", architect: "arquiteto", dev: "dev", security: "seguranca", reviewer: "revisor" };   // {{lider}} = office-ceo etc.
  const key = (id: string) => { const k = id.replace(/^(empresa|office)-/, ""); return ALIAS[k] ?? k; };
  for (const d of docs) vars[key(d.id)] = d.meta.nome || d.id;
  for (const d of docs) vars[key(d.id)] = fill(vars[key(d.id)], vars);
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
  // agentes antigos do Office (empresa-* / office-*) que não existem mais em company/agents saem do Claude Code
  const ids = new Set(docs.map(d => d.id));
  for (const f of readdirSync(AGENTS_DEST)) if (/^(empresa|office)-.*\.md$/.test(f) && !ids.has(f.slice(0, -3))) rmSync(join(AGENTS_DEST, f));
  syncSkills();
  return docs.map(d => d.id);
}

/** Conectores (MCP) que a equipe usa. Os outros ficam fora das sessões do Office: cada um custa contexto em todo agente. */
export const OFFICE_MCP = ["graphify", "context7", "21st"];
export const OFFICE_MCP_FILE = join(homedir(), ".escritorio-virtual", "office-mcp.json");

/** Grava a lista enxuta de conectores, lida do ~/.claude.json, para o `claude --office` usar com --strict-mcp-config. */
export function writeOfficeMcp() {
  const all = JSON.parse(readFileSync(join(homedir(), ".claude.json"), "utf8")).mcpServers ?? {};
  const mcpServers = Object.fromEntries(OFFICE_MCP.filter(k => all[k]).map(k => [k, all[k]]));
  mkdirSync(join(homedir(), ".escritorio-virtual"), { recursive: true });
  writeFileSync(OFFICE_MCP_FILE, JSON.stringify({ mcpServers }));
  return OFFICE_MCP_FILE;
}

/** Plugins desligados só nas sessões do Office: o ponytail injeta "faça o mínimo, pule o que der" em todo agente,
 *  e nos testes isso fez agentes pularem a checagem de tela. As outras sessões do Claude continuam com ele. */
export const OFFICE_DISABLED_PLUGINS = ["ponytail@ponytail"];
export const OFFICE_SETTINGS_FILE = join(homedir(), ".escritorio-virtual", "office-settings.json");
export function writeOfficeSettings() {
  mkdirSync(join(homedir(), ".escritorio-virtual"), { recursive: true });
  writeFileSync(OFFICE_SETTINGS_FILE, JSON.stringify({ enabledPlugins: Object.fromEntries(OFFICE_DISABLED_PLUGINS.map(p => [p, false])) }));
  return OFFICE_SETTINGS_FILE;
}

/** Copia os playbooks do Office (company/skills/office-*) para ~/.claude/skills, trocando a versão anterior. */
export function syncSkills() {
  if (!existsSync(SKILLS_SRC)) return [];
  const names = readdirSync(SKILLS_SRC).filter(n => n.startsWith("office-"));
  for (const n of names) {
    rmSync(join(SKILLS_DEST, n), { recursive: true, force: true });
    cpSync(join(SKILLS_SRC, n), join(SKILLS_DEST, n), { recursive: true });
  }
  return names;
}
