// Lista das skills instaladas no Claude Code, com busca e detalhes.
import { ago, esc, mountUsage } from "./common.js";
mountUsage();
import { md } from "./markdown.js";

const $ = id => document.getElementById(id);
let all = [], roots = [], current = null;

async function load() {
  let res;
  try {
    const r = await fetch("/api/skills", { cache: "no-store" });
    if (!r.ok) throw new Error(`o servidor respondeu ${r.status}`);
    res = await r.json();
  } catch (err) {
    $("list").innerHTML = `<p>Não consegui buscar as skills (${esc(err.message)}).</p>
      <p class="muted">Se você acabou de atualizar os arquivos, pare o servidor (Ctrl+C) e rode <code>bun run start</code> de novo.</p>`;
    return;
  }
  all = res.skills; roots = res.roots ?? [];
  const sources = [...new Set(all.map(s => s.source))].sort((a, b) => a.localeCompare(b));
  $("source").innerHTML = `<option value="">Todas</option>` + sources.map(s => `<option>${esc(s)}</option>`).join("");
  const used = all.filter(s => s.uses > 0).length, plugins = new Set(all.filter(s => s.plugin).map(s => s.plugin)).size;
  $("cards").innerHTML = [
    ["Skills instaladas", all.filter(s => s.kind === "skill").length],
    ["Comandos pessoais", all.filter(s => s.kind === "comando").length],
    ["Plugins com skills", plugins],
    ["Já usadas", `${used}`, "#5ee07a"],
  ].map(([l, n, c]) => `<div class="stat"><div class="l">${esc(l)}</div><div class="n" style="${c ? `color:${c}` : ""}">${n}</div></div>`).join("");
  render();
  const want = location.hash.slice(1);
  if (want) open(want);
}

function render() {
  const q = $("q").value.trim().toLowerCase(), src = $("source").value, onlyUsed = $("used").checked;
  const rows = all.filter(s => (!src || s.source === src) && (!onlyUsed || s.uses > 0)
    && (!q || s.full.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)));
  $("count").textContent = `${rows.length} de ${all.length}`;
  if (!rows.length) {
    $("list").innerHTML = all.length ? `<p class="muted">Nenhuma skill encontrada.</p>` : `<p>Nenhuma skill encontrada neste computador.</p>
      <p class="muted">Pastas verificadas:</p><ul class="roots">${roots.map(r => `<li><code>${esc(r.path)}</code> · ${r.exists ? `${r.files} arquivo(s)` : "não existe"}</li>`).join("")}</ul>`;
    return;
  }
  // agrupa por origem
  const groups = new Map();
  for (const s of rows) { if (!groups.has(s.source)) groups.set(s.source, []); groups.get(s.source).push(s); }
  const order = [...groups.keys()].sort((a, b) => (a === "Pessoal" ? -1 : b === "Pessoal" ? 1 : a.localeCompare(b)));
  $("list").innerHTML = order.map(g => `<div class="skill-group">${esc(g)} <span class="muted">(${groups.get(g).length})</span></div>` +
    groups.get(g).map(s => `<button class="skill-item ${current === s.id ? "on" : ""}" data-id="${s.id}">
      <span class="skill-name">${esc(s.kind === "comando" ? "/" + s.name : s.name)}${s.enabled ? "" : ' <span class="tag off">desativada</span>'}</span>
      ${s.uses ? `<span class="skill-uses">${s.uses}x</span>` : ""}
      <span class="skill-desc">${esc(s.description)}</span>
    </button>`).join("")).join("");
}

async function open(id) {
  current = id; render();
  history.replaceState(null, "", `#${id}`);
  const s = await (await fetch(`/api/skills/${id}`)).json();
  if (s.error) { $("detail").innerHTML = `<p class="muted">${esc(s.error)}</p>`; return; }
  const how = s.kind === "comando"
    ? `Digite <code>/${esc(s.name)}</code> no Claude Code.`
    : `O Claude usa sozinho quando o pedido combina com a descrição. Você também pode pedir: <code>use a skill ${esc(s.full)}</code>${s.plugin ? "" : ` ou digitar <code>/${esc(s.name)}</code>`}.`;
  $("detail").innerHTML = `
    <h2>${esc(s.kind === "comando" ? "/" + s.name : s.name)}</h2>
    <dl class="kv">
      <dt>Origem</dt><dd>${esc(s.source)}${s.enabled ? "" : ' · <span class="tag off">plugin desativado</span>'}</dd>
      ${s.plugin ? `<dt>Nome completo</dt><dd><code>${esc(s.full)}</code></dd>` : ""}
      <dt>Usos</dt><dd>${s.uses ? `${s.uses} vez(es), a última há ${ago(s.lastUsed)}` : "nunca usada"}</dd>
      <dt>Como usar</dt><dd>${how}</dd>
    </dl>
    <h3 class="skill-h">O que ela faz</h3>
    <p class="skill-what">${esc(s.description) || '<span class="muted">Sem descrição.</span>'}</p>
    ${s.files.length ? `<h3 class="skill-h">Arquivos de apoio</h3><div class="chips">${s.files.map(f => `<span class="chip">${esc(f)}</span>`).join("")}</div>` : ""}
    <details class="skill-body"><summary>Ver as instruções completas</summary><div class="md">${md(s.body)}</div></details>`;
  if (window.innerWidth < 900) $("detail").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("list").addEventListener("click", e => { const b = e.target.closest(".skill-item"); if (b) open(b.dataset.id); });
for (const id of ["q", "source", "used"]) $(id).addEventListener("input", render);
load();
