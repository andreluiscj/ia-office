// Verificação independente da tarefa "feature" (ticket de desenvolvimento). Uso: node acceptance-feature.mjs <pasta>
// Sobe o servidor da pasta numa porta aleatória e testa contrato da API, validações, filtros, paginação,
// segurança da tela, testes automatizados, documentação e dependências.
import { spawn, execSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
const dir = process.argv[2];
const checks = []; const add = (name, ok) => checks.push({ name, ok: !!ok });
const port = 20000 + Math.floor(Math.random() * 20000);
const base = `http://localhost:${port}`;
const req = async (path, method = "GET", body) => {
  try {
    const r = await fetch(base + path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch {}
    return { status: r.status, body: j };
  } catch { return { status: 0, body: null }; }
};
const walk = (d, ext, out = []) => { if (!existsSync(d)) return out; for (const f of readdirSync(d, { withFileTypes: true })) { if (f.name === "node_modules") continue; const p = join(d, f.name); if (f.isDirectory()) walk(p, ext, out); else if (ext.test(f.name)) out.push(p); } return out; };

const srv = spawn("node", ["src/server.js"], { cwd: dir, env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
let up = false;
for (let i = 0; i < 40 && !up; i++) { await new Promise(r => setTimeout(r, 150)); up = (await req("/api/tasks")).status !== 0; }
add("servidor sobe com PORT", up);

if (up) {
  const mk = (b) => req("/api/tasks", "POST", b);
  // --- criação, tags e due
  const a = await mk({ title: "A", tags: [" Work ", "work", "Home"], due: "2099-12-31" });
  add("cria com tags e due (201)", a.status === 201 && a.body?.due === "2099-12-31");
  add("tags normalizadas (minúsculas, sem espaço, sem duplicata)", JSON.stringify(a.body?.tags) === JSON.stringify(["work", "home"]));
  const plain = await mk({ title: "Sem extras" });
  add("tarefa sem tags/due continua válida (tags = [], due = null)", plain.status === 201 && Array.isArray(plain.body?.tags) && plain.body.tags.length === 0 && plain.body.due === null);
  add("mais de 5 tags => 400", (await mk({ title: "x", tags: ["a", "b", "c", "d", "e", "f"] })).status === 400);
  add("tag vazia => 400", (await mk({ title: "x", tags: ["ok", "  "] })).status === 400);
  add("tag com mais de 20 caracteres => 400", (await mk({ title: "x", tags: ["a".repeat(21)] })).status === 400);
  add("tags que não é lista => 400", (await mk({ title: "x", tags: "work" })).status === 400);
  add("tag que não é texto => 400", (await mk({ title: "x", tags: [1] })).status === 400);
  add("due com data impossível (2026-02-30) => 400", (await mk({ title: "x", due: "2026-02-30" })).status === 400);
  add("due com formato errado => 400", (await mk({ title: "x", due: "31/12/2026" })).status === 400 && (await mk({ title: "x", due: "abc" })).status === 400);
  add("título com mais de 100 caracteres => 400", (await mk({ title: "t".repeat(101) })).status === 400);
  add("título de 100 caracteres => 201", (await mk({ title: "t".repeat(100) })).status === 201);
  add("título vazio continua 400", (await mk({ title: " " })).status === 400);

  // --- PATCH
  const p1 = await req(`/api/tasks/${plain.body?.id}`, "PATCH", { tags: ["Novo"], due: "2030-01-15" });
  add("PATCH altera tags e due", p1.status === 200 && JSON.stringify(p1.body?.tags) === '["novo"]' && p1.body?.due === "2030-01-15");
  const p2 = await req(`/api/tasks/${plain.body?.id}`, "PATCH", { due: null });
  add("PATCH com due null limpa a data", p2.status === 200 && p2.body?.due === null);
  add("PATCH com due inválido => 400", (await req(`/api/tasks/${plain.body?.id}`, "PATCH", { due: "2026-13-01" })).status === 400);
  add("PATCH com tags inválidas => 400", (await req(`/api/tasks/${plain.body?.id}`, "PATCH", { tags: [""] })).status === 400);
  add("PATCH done continua funcionando", (await req(`/api/tasks/${plain.body?.id}`, "PATCH", { done: true })).body?.done === true);
  add("404 em PATCH e DELETE de id inexistente", (await req("/api/tasks/99999", "PATCH", { done: true })).status === 404 && (await req("/api/tasks/99999", "DELETE")).status === 404);

  // --- massa para listagem
  for (let i = 0; i < 24; i++) await mk({ title: `massa ${i}`, tags: i % 2 ? ["par"] : ["impar", "Work"], due: i < 3 ? "2020-01-01" : undefined });
  const l1 = await req("/api/tasks");
  const total = l1.body?.total;
  add("listagem no formato { items, page, limit, total }", Array.isArray(l1.body?.items) && l1.body.page === 1 && l1.body.limit === 10 && typeof total === "number");
  add("padrão: página 1, 10 itens", l1.body?.items?.length === 10);
  const l3 = await req("/api/tasks?page=3&limit=10");
  add("terceira página traz o resto (total 27 => 7 itens)", total === 27 && l3.body?.items?.length === 7 && l3.body?.page === 3);
  const ids = []; for (let pg = 1; pg <= 3; pg++) ids.push(...((await req(`/api/tasks?page=${pg}&limit=10`)).body?.items ?? []).map(t => t.id));
  add("páginas em ordem crescente de id, sem repetir nem pular", ids.length === 27 && new Set(ids).size === 27 && ids.every((v, i) => i === 0 || v > ids[i - 1]));
  add("page=0, page=abc, limit=0, limit=51 => 400", [(await req("/api/tasks?page=0")).status, (await req("/api/tasks?page=abc")).status, (await req("/api/tasks?limit=0")).status, (await req("/api/tasks?limit=51")).status].every(s => s === 400));
  add("limit=50 aceito", (await req("/api/tasks?limit=50")).body?.items?.length === 27);
  const fw = await req("/api/tasks?tag=work&limit=50");
  add("filtro ?tag= (total filtrado correto: 1 + 12 = 13)", fw.body?.total === 13 && fw.body.items.every(t => t.tags.includes("work")));
  add("filtro ?tag= ignora maiúsculas", (await req("/api/tasks?tag=WORK&limit=50")).body?.total === 13);
  const fd = await req("/api/tasks?done=true&limit=50");
  add("filtro ?done=true (1 tarefa feita)", fd.body?.total === 1 && fd.body.items[0].done === true);
  add("filtro ?done=false", (await req("/api/tasks?done=false&limit=50")).body?.total === 26);
  add("?done=talvez => 400", (await req("/api/tasks?done=talvez")).status === 400);
  const fo = await req("/api/tasks?overdue=true&limit=50");
  add("?overdue=true traz só pendentes vencidas (3)", fo.body?.total === 3 && fo.body.items.every(t => !t.done && t.due < new Date().toISOString().slice(0, 10)));
  const fc = await req("/api/tasks?tag=impar&done=false&page=2&limit=5");
  add("filtros combinados + paginação (12 ímpares: página 2 de 5 => 5 itens, total 12)", fc.body?.total === 12 && fc.body?.items?.length === 5 && fc.body?.page === 2);
  const del = await req(`/api/tasks/${a.body?.id}`, "DELETE");
  add("DELETE continua 204 e reduz o total", del.status === 204 && (await req("/api/tasks")).body?.total === 26);
}
srv.kill();

// --- tela
const pub = walk(join(dir, "public"), /\.(html|js)$/);
const ui = pub.map(f => readFileSync(f, "utf8")).join("\n");
add("tela: sem innerHTML/insertAdjacentHTML/document.write (texto do usuário nunca vira HTML)", ui.length > 0 && !/innerHTML|insertAdjacentHTML|document\.write|outerHTML/.test(ui));
add("tela: filtro por tag (controle + parâmetro tag)", /id=["'][^"']*tag/i.test(ui) && /tag=|['"`]tag['"`]/.test(ui));
add("tela: filtro por situação (done)", /done=|['"`]done['"`]/.test(ui) && /<select|type=["']checkbox|id=["'][^"']*(done|status|situa)/i.test(ui));
add("tela: paginação (page, botões anterior/próxima)", /page=|['"`]page['"`]|\bpage\b/.test(ui) && /(anterior|próxim|prev|next)/i.test(ui));
add("tela: mostra tags e data (due)", /\.tags/.test(ui) && /\.due/.test(ui));
add("tela: destaca atrasadas (overdue/atrasad)", /overdue|atrasad/i.test(ui));

// --- testes automatizados, docs e dependências
let pass = false; try { execSync("npm test", { cwd: dir, stdio: "pipe", timeout: 120000 }); pass = true; } catch {}
add("npm test passa", pass);
let n = 0; for (const f of walk(join(dir, "test"), /\.js$/)) n += (readFileSync(f, "utf8").match(/\btest\(/g) || []).length;
add("pelo menos 10 testes no total (5 originais + 5 novos)", n >= 10);
const readme = existsSync(join(dir, "README.md")) ? readFileSync(join(dir, "README.md"), "utf8").toLowerCase() : "";
add("README documenta tags, due, overdue, page e limit", ["tags", "due", "overdue", "page", "limit"].every(k => readme.includes(k)));
let pj = {}; try { pj = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")); } catch {}
add("sem dependências novas", !pj.dependencies && !pj.devDependencies && !existsSync(join(dir, "node_modules")));
const score = checks.filter(c => c.ok).length;
console.log(JSON.stringify({ passed: score === checks.length, score, total: checks.length, checks }));
process.exit(0);
