// Lista as skills instaladas no Claude Code deste computador.
// Procura SKILL.md em ~/.claude/skills (pessoais) e em ~/.claude/plugins (de plugins),
// e comandos personalizados em ~/.claude/commands. Também conta quantas vezes cada uma foi usada.
import { readdirSync, readFileSync, statSync, existsSync, realpathSync } from "node:fs";
import { join, sep, basename } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { db } from "./db";

const CLAUDE = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");

export type Skill = {
  id: string; name: string; full: string; kind: "skill" | "comando";
  source: string; plugin: string | null; enabled: boolean;
  description: string; path: string; mtime: number; uses: number; lastUsed: number | null;
};

/** Lê o cabeçalho YAML simples (name, description) e devolve o corpo. */
function parse(text: string) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta: Record<string, string> = {};
  if (!m) return { meta, body: text };
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v === "|" || v === ">" || v === "|-" || v === ">-") {        // bloco de várias linhas
      const parts: string[] = [];
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) parts.push(lines[++i].trim());
      v = parts.join(v.startsWith("|") ? "\n" : " ");
    } else if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      try { v = v.startsWith('"') ? JSON.parse(v) : v.slice(1, -1).replace(/''/g, "'"); } catch { v = v.slice(1, -1); }
    }
    meta[kv[1].toLowerCase()] = v;
  }
  return { meta, body: m[2] };
}

/** Percorre pastas seguindo atalhos (symlinks e junções do Windows, usados por `npx skills add`). */
function walk(dir: string, depth: number, found: string[], match: (name: string, full: string) => boolean, seen = new Set<string>()) {
  if (depth < 0 || !existsSync(dir)) return;
  let real = dir;
  try { real = realpathSync(dir); } catch {}
  if (seen.has(real)) return;
  seen.add(real);
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const full = join(dir, e.name);
    let isDir = e.isDirectory(), isFile = e.isFile();
    if (e.isSymbolicLink() || (!isDir && !isFile)) {
      try { const st = statSync(full); isDir = st.isDirectory(); isFile = st.isFile(); } catch { continue; }
    }
    if (isDir) walk(full, depth - 1, found, match, seen);
    else if (isFile && match(e.name, full)) found.push(full);
  }
}
const isSkillFile = (n: string) => n.toLowerCase() === "skill.md";

/** Plugins desativados no settings.json (enabledPlugins: { "nome@marketplace": false }). */
function disabledPlugins() {
  const out = new Set<string>();
  try {
    const s = JSON.parse(readFileSync(join(CLAUDE, "settings.json"), "utf8"));
    for (const [k, v] of Object.entries(s.enabledPlugins ?? {})) if (v === false) out.add(k.split("@")[0]);
  } catch {}
  return out;
}

/** Nome do plugin a partir do caminho: .../<plugin>/[<versão>/]skills/<skill>/SKILL.md */
function pluginOf(path: string) {
  const parts = path.split(sep);
  const i = parts.lastIndexOf("skills");
  if (i < 1) return null;
  let p = parts[i - 1];
  if (/^\d+\.\d+/.test(p) || /^[0-9a-f]{7,}$/.test(p)) p = parts[i - 2] ?? p;   // pasta de versão no cache
  // pasta com manifesto .claude-plugin/plugin.json tem o nome oficial
  for (const up of [parts.slice(0, i).join(sep)]) {
    try { const j = JSON.parse(readFileSync(join(up, ".claude-plugin", "plugin.json"), "utf8")); if (j.name) return j.name as string; } catch {}
  }
  return p;
}

let cache: { at: number; list: Skill[] } | null = null;
let roots: { path: string; exists: boolean; files: number; added: number }[] = [];
export const skillRoots = () => roots;

export function listSkills(): Skill[] {
  if (cache && Date.now() - cache.at < 15_000) return cache.list;
  const usage = new Map<string, { c: number; last: number }>();
  for (const r of db.query<{ skill: string; c: number; last: number }, []>(
    "SELECT skill, COUNT(*) c, MAX(ts) last FROM events WHERE type='skill' GROUP BY skill").all())
    usage.set(r.skill, { c: r.c, last: r.last });
  const off = disabledPlugins();
  const byKey = new Map<string, Skill>();

  const add = (path: string, kind: "skill" | "comando", source: string, plugin: string | null) => {
    let text = "", mtime = 0;
    try { text = readFileSync(path, "utf8"); mtime = statSync(path).mtimeMs; } catch { return; }
    const { meta } = parse(text);
    const name = meta.name || (kind === "skill" ? basename(join(path, "..")) : basename(path, ".md"));
    const full = plugin ? `${plugin}:${name}` : name;
    let description = meta.description ?? "";
    if (!description) description = text.replace(/^---[\s\S]*?---/, "").split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith("#")) ?? "";
    const u = usage.get(full) ?? usage.get(name) ?? (kind === "comando" ? usage.get("/" + name) : undefined);
    const s: Skill = {
      id: createHash("sha1").update(path).digest("hex").slice(0, 12), name, full, kind, source, plugin,
      enabled: !plugin || !off.has(plugin), description, path, mtime, uses: u?.c ?? 0, lastUsed: u?.last ?? null,
    };
    const key = `${kind}:${full}`;
    const prev = byKey.get(key);
    if (!prev || prev.mtime < s.mtime) byKey.set(key, s);   // mesma skill em várias versões: fica a mais nova
  };

  roots = [];
  const scan = (dir: string, depth: number, match: (n: string, f: string) => boolean, each: (p: string) => void) => {
    const found: string[] = [];
    walk(dir, depth, found, match);
    const before = byKey.size;
    for (const p of found) each(p);
    roots.push({ path: dir, exists: existsSync(dir), files: found.length, added: byKey.size - before });
  };
  // pessoais
  scan(join(CLAUDE, "skills"), 4, isSkillFile, p => add(p, "skill", "Pessoal", null));
  scan(join(homedir(), ".agents", "skills"), 4, isSkillFile, p => add(p, "skill", "Pessoal", null));
  // de plugins
  scan(join(CLAUDE, "plugins"), 9, (n, f) => isSkillFile(n) && f.includes(`${sep}skills${sep}`), p => {
    const pl = pluginOf(p); add(p, "skill", pl ? `Plugin ${pl}` : "Plugin", pl);
  });
  // comandos personalizados (/comando)
  scan(join(CLAUDE, "commands"), 3, n => n.endsWith(".md"), p => add(p, "comando", "Comando pessoal", null));
  // skills e comandos dos projetos onde o Claude Code já rodou
  const cwds = db.query<{ cwd: string }, []>("SELECT cwd, MAX(last_seen) l FROM agents WHERE cwd IS NOT NULL GROUP BY cwd ORDER BY l DESC LIMIT 60").all();
  for (const { cwd } of cwds) {
    const proj = basename(cwd.replace(/[\\/]+$/, ""));
    for (const [sub, kind] of [["skills", "skill"], ["commands", "comando"]] as const) {
      const dir = join(cwd, ".claude", sub);
      if (!existsSync(dir)) continue;
      scan(dir, kind === "skill" ? 4 : 3, kind === "skill" ? isSkillFile : (n: string) => n.endsWith(".md"),
        p => add(p, kind, `Projeto ${proj}`, null));
    }
  }

  const list = [...byKey.values()].sort((a, b) => b.uses - a.uses || a.full.localeCompare(b.full));
  cache = { at: Date.now(), list };
  return list;
}

export function skillDetail(id: string) {
  const s = listSkills().find(x => x.id === id);
  if (!s) return null;
  let body = "";
  try { body = parse(readFileSync(s.path, "utf8")).body; } catch {}
  // outros arquivos da skill (referências, scripts)
  const files: string[] = [];
  if (s.kind === "skill") walk(join(s.path, ".."), 2, files, () => true);
  const dir = join(s.path, "..");
  return { ...s, body: body.slice(0, 60_000), files: files.filter(f => f !== s.path).map(f => f.slice(dir.length + 1)).slice(0, 40) };
}
