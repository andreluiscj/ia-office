// "Tasks" page data: the Office work queue as the Lead keeps it in the Obsidian vault.
//   00-Pedidos/*.md            requests you wrote (the executor's inbox)
//   10-Tarefas/<slug>/_Pedido.md + T<n> - <title>.md   each request and its delegations
// Reading is free. Writing is limited to cancelTask (status of one request and its open tasks); resumeTask opens a terminal.
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { now, PROJECTS, readNote, setMeta, VAULT } from "../scripts/office-runner";

const title = (body: string, fallback: string) => body.match(/^#\s+(.+)$/m)?.[1].trim() ?? fallback;
const section = (body: string, name: string) => body.match(new RegExp(`^##\\s+${name}\\s*\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, "m"))?.[1].trim() ?? "";
const mtime = (p: string) => { try { return statSync(p).mtimeMs; } catch { return 0; } };
const mdFiles = (d: string) => { try { return readdirSync(d).filter(f => f.endsWith(".md") && !f.startsWith("_Modelo")); } catch { return []; } };

export function tasks() {
  if (!VAULT || !existsSync(VAULT)) return { vault: VAULT || null, inbox: [], requests: [] };
  const inbox = mdFiles(join(VAULT, "00-Pedidos")).map(f => {
    const p = join(VAULT, "00-Pedidos", f), n = readNote(p);
    return n && { file: `00-Pedidos/${f}`, title: title(n.body, f.slice(0, -3)), meta: n.meta, body: n.body.trim(), updated: mtime(p) };
  }).filter(Boolean);

  const root = join(VAULT, "10-Tarefas");
  let slugs: string[] = [];
  try { slugs = readdirSync(root).filter(s => { try { return statSync(join(root, s)).isDirectory(); } catch { return false; } }); } catch {}
  const requests = slugs.map(slug => {
    const dir = join(root, slug), head = existsSync(join(dir, "_Pedido.md")) ? readNote(join(dir, "_Pedido.md")) : null;
    const items = mdFiles(dir).filter(f => f !== "_Pedido.md").map(f => {
      const n = readNote(join(dir, f));
      if (!n) return null;
      const result = section(n.body, "Resultado");
      return { file: f, title: title(n.body, f.slice(0, -3)), meta: n.meta, brief: n.body.replace(/^##\s+Resultado[\s\S]*$/m, "").replace(/^#\s+.+$/m, "").trim(), result, updated: mtime(join(dir, f)) };
    }).filter(Boolean).sort((a: any, b: any) => a.file.localeCompare(b.file, undefined, { numeric: true }));
    return {
      slug, title: head ? title(head.body, slug) : slug, meta: head?.meta ?? {},
      request: head ? section(head.body, "Pedido") : "", decisions: head ? section(head.body, "Decisões") : "",
      tasks: items, updated: Math.max(mtime(join(dir, "_Pedido.md")), ...items.map((t: any) => t.updated)),
    };
  }).sort((a, b) => b.updated - a.updated);
  return { vault: VAULT, inbox, requests };
}

// ---- actions (the page sends a slug; it is only ever looked up in the listing, never used as a path)
const DONE = new Set(["concluida", "concluido"]);
type Found = { slug: string; title: string; meta: Record<string, string>; inbox: boolean; files: string[] };

function find(slug: string): Found | null {
  const t = tasks();
  const q = t.requests.find(r => r.slug === slug);
  if (q) {
    const dir = join(VAULT, "10-Tarefas", q.slug);
    return { slug, title: q.title, meta: q.meta, inbox: false, files: [join(dir, "_Pedido.md"), ...q.tasks.map((x: any) => join(dir, x.file))] };
  }
  const n: any = t.inbox.find((i: any) => i.file === slug);
  return n ? { slug, title: n.title, meta: n.meta, inbox: true, files: [join(VAULT, n.file)] } : null;
}

/** Marks a request cancelled in the vault. A session that is already running is not interrupted. */
export function cancelTask(slug: string): { ok: true } | { error: string } {
  const f = find(slug);
  if (!f) return { error: "task not found" };
  for (const [i, file] of f.files.entries()) {
    const n = readNote(file); if (!n) continue;
    const isRequest = i === 0;
    if (!isRequest && DONE.has(n.meta.status ?? "")) continue;   // finished tasks keep their result
    setMeta(file, { status: isRequest ? "cancelado" : "cancelada", atualizado: now() });
  }
  return { ok: true };
}

const projectDir = (name: string) => {
  const n = name.replace(/\\/g, "/").replace(/^\[\[|\]\]$/g, "").trim();
  if (!n) return null;
  const direct = isAbsolute(n) ? n : join(PROJECTS, n);
  if (existsSync(direct)) return direct;
  const sibling = join(dirname(PROJECTS), n);   // a project next to the projects root (C:/CertameFlow)
  if (existsSync(sibling) && statSync(sibling).isDirectory()) return sibling;
  try {   // projects grouped in a folder (C:/Projetos/1. Sites/site-x): look one level down
    for (const g of readdirSync(PROJECTS)) { const d = join(PROJECTS, g, n); if (existsSync(d) && statSync(d).isDirectory()) return d; }
  } catch {}
  return null;
};

/** What to run to resume a request: the project folder and a PowerShell script (the `claude --office` launcher is a PowerShell function). */
export function resumeScript(slug: string): { dir: string; script: string } | { error: string } {
  const f = find(slug);
  if (!f) return { error: "task not found" };
  const dir = projectDir(f.meta.projeto ?? "");
  if (!dir) return { error: `project folder not found: ${f.meta.projeto || "(none)"}` };
  const note = (f.inbox ? join(VAULT, f.slug) : join(VAULT, "10-Tarefas", f.slug, "_Pedido.md")).replace(/\\/g, "/");
  const prompt = `Retome o pedido "${f.title}" do cofre do Obsidian: leia ${note}${f.inbox ? "" : " e as notas T* da mesma pasta"}, veja o que já está concluído e continue de onde parou, atualizando as notas. Não refaça o que já está concluído.`;
  const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
  const sess = /^[0-9a-f-]{36}$/.test(f.meta.sessao ?? "") ? ` --resume ${f.meta.sessao}` : "";
  return { dir, script: `$Host.UI.RawUI.WindowTitle = ${q("Office: " + f.title.slice(0, 60))}; Set-Location -LiteralPath ${q(dir)}; claude --office${sess} ${q(prompt)}` };
}

/** Opens a PowerShell window in the project folder running `claude --office` for the request. */
export function resumeTask(slug: string): { ok: true; dir: string; dry?: string } | { error: string } {
  const r = resumeScript(slug);
  if ("error" in r) return r;
  const f = find(slug)!;
  if (/^cancelad[oa]$/.test(f.meta.status ?? "")) {   // restarting a cancelled request reopens it, so the Lead does not read "cancelado" in its notes
    for (const [i, file] of f.files.entries()) { const n = readNote(file); if (n && /^cancelad[oa]$/.test(n.meta.status ?? "")) setMeta(file, { status: i === 0 ? "em andamento" : "pendente", atualizado: now() }); }
  }
  if (process.env.OFFICE_DRY_LAUNCH) return { ok: true, dir: r.dir, dry: r.script };   // tests: show the command, open nothing
  if (process.platform !== "win32") return { error: "opening a terminal is only implemented for Windows" };
  const enc = Buffer.from(r.script, "utf16le").toString("base64");
  // Start-Process opens a real window (cmd /c start mis-reads the title argument); no -NoProfile, so the profile's `claude --office` function exists
  Bun.spawn(["powershell.exe", "-NoProfile", "-Command", `Start-Process powershell.exe -ArgumentList "-NoExit","-NoLogo","-EncodedCommand","${enc}"`], { stdin: "ignore", stdout: "ignore", stderr: "ignore" }).unref();
  return { ok: true, dir: r.dir };
}

if (import.meta.main) {
  console.assert(section("# T\n## Pedido\nabc\n## Plano\nx", "Pedido") === "abc", "section middle");
  console.assert(section("# T\n## Resultado\nok\nfim", "Resultado") === "ok\nfim", "section last");
  const r = tasks();
  console.log(r.vault, r.inbox.length, r.requests.map(q => `${q.slug}: ${q.tasks.length} tarefas`));
}
