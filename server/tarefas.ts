// "Tasks" page data: the Office work queue as the Lead keeps it in the Obsidian vault.
//   00-Pedidos/*.md            requests you wrote (the executor's inbox)
//   10-Tarefas/<slug>/_Pedido.md + T<n> - <title>.md   each request and its delegations
// Read-only: the page never writes the vault.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readNote, VAULT } from "../scripts/office-runner";

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

if (import.meta.main) {
  console.assert(section("# T\n## Pedido\nabc\n## Plano\nx", "Pedido") === "abc", "section middle");
  console.assert(section("# T\n## Resultado\nok\nfim", "Resultado") === "ok\nfim", "section last");
  const r = tasks();
  console.log(r.vault, r.inbox.length, r.requests.map(q => `${q.slug}: ${q.tasks.length} tarefas`));
}
