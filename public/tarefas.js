// Fila de trabalho do Office: pedidos e tarefas que o Líder registra no cofre do Obsidian (somente leitura).
import { ago, esc, live, mountUsage, t } from "./common.js";
import { md } from "./markdown.js";
mountUsage();

const $ = id => document.getElementById(id);
let data = { inbox: [], requests: [] }, current = null;

// Status words come from the notes (Portuguese); group them so the colors and counters work in any language.
const KIND = {
  concluido: "done", concluida: "done",
  "em andamento": "run", revisao: "run", pronto: "run", aprovado: "run",
  perguntas: "wait", "aguardando aprovacao": "wait", pendente: "wait", novo: "wait", pausado: "wait",
  bloqueado: "block", bloqueada: "block",
};
const kind = s => KIND[String(s ?? "").toLowerCase()] ?? "wait";
const pill = s => s ? `<span class="tk-pill s-${kind(s)}">${esc(s)}</span>` : "";
const isOpen = r => kind(r.meta.status) !== "done" || r.tasks.some(x => kind(x.meta.status) !== "done");
const when = ms => ms ? t("updated {t}", { t: ago(ms) }) : "";

// Inbox notes that already have a 10-Tarefas folder are shown there; the rest appear as requests without tasks.
function merged() {
  const known = new Set(data.requests.map(r => r.slug));
  const loose = data.inbox.filter(n => !known.has(n.file.replace(/^00-Pedidos\//, "").replace(/\.md$/, "")))
    .map(n => ({ slug: n.file, title: n.title, meta: n.meta, request: n.body.replace(/^#\s+.+$/m, "").trim(), decisions: "", tasks: [], updated: n.updated, inbox: true }));
  return [...data.requests, ...loose].sort((a, b) => b.updated - a.updated);
}

function filtered() {
  const q = $("q").value.trim().toLowerCase(), onlyOpen = $("open").checked;
  return merged().filter(r => (!onlyOpen || isOpen(r)) &&
    (!q || [r.title, r.meta.projeto, r.request, ...r.tasks.map(x => `${x.title} ${x.meta.dono ?? ""} ${x.brief}`)].join(" ").toLowerCase().includes(q)));
}

function renderCards() {
  const all = merged(), tasks = all.flatMap(r => r.tasks);
  const n = k => tasks.filter(x => kind(x.meta.status) === k).length;
  $("cards").innerHTML = [
    [t("Requests"), all.length], [t("Open tasks"), tasks.length - n("done")], [t("Finished"), n("done")], [t("Blocked"), n("block")],
  ].map(([l, v]) => `<div class="stat"><div class="l">${esc(l)}</div><div class="n">${v}</div></div>`).join("");
}

function renderList() {
  const rows = filtered();
  $("vault").textContent = data.vault ?? "";
  if (!data.vault) { $("list").innerHTML = `<p class="muted">${t("No Obsidian vault is set. Fill the cofre field in company/empresa.json.")}</p>`; return; }
  if (!rows.length) { $("list").innerHTML = `<p class="muted">${t("No requests yet. Write one in the vault's 00-Pedidos folder.")}</p>`; return; }
  $("list").innerHTML = rows.map(r => {
    const done = r.tasks.filter(x => kind(x.meta.status) === "done").length;
    const pct = r.tasks.length ? Math.round(done / r.tasks.length * 100) : (kind(r.meta.status) === "done" ? 100 : 0);
    return `<button type="button" class="tk-req${r.slug === current ? " on" : ""}" data-slug="${esc(r.slug)}" aria-pressed="${r.slug === current}">
      <span class="t">${esc(r.title)}</span>
      <span class="tk-meta">${pill(r.meta.status)}${r.meta.faixa ? `<span class="tk-pill">${esc(r.meta.faixa)}</span>` : ""}
        ${r.meta.projeto ? `<span>${esc(r.meta.projeto)}</span>` : ""}<span>${t("{n} tasks", { n: r.tasks.length })}</span><span>${esc(when(r.updated))}</span></span>
      <span class="tk-progress" aria-hidden="true"><i style="width:${pct}%"></i></span></button>`;
  }).join("");
}

function renderDetail() {
  const r = merged().find(x => x.slug === current);
  if (!r) { $("detail").innerHTML = `<p class="muted">${t("Click a request to see its tasks.")}</p>`; return; }
  const open = new Set([...document.querySelectorAll(".tk-task[open]")].map(d => d.dataset.file));
  $("detail").innerHTML = `<h2>${esc(r.title)}</h2>
    <div class="tk-meta">${pill(r.meta.status)}${r.meta.faixa ? `<span class="tk-pill">${esc(r.meta.faixa)}</span>` : ""}
      ${r.meta.projeto ? `<span>${t("Project")}: ${esc(r.meta.projeto)}</span>` : ""}<span>${esc(when(r.updated))}</span></div>
    ${r.request ? `<div class="tk-section"><h3>${t("Request")}</h3><div class="md">${md(r.request)}</div></div>` : ""}
    ${r.decisions ? `<div class="tk-section"><h3>${t("Decisions")}</h3><div class="md">${md(r.decisions)}</div></div>` : ""}
    <div class="tk-section"><h3>${t("Tasks")} (${r.tasks.length})</h3>
    ${r.tasks.map(x => `<details class="tk-task" data-file="${esc(x.file)}"${open.has(x.file) ? " open" : ""}>
      <summary><strong>${esc(x.title)}</strong>${pill(x.meta.status)}
        ${x.meta.dono ? `<span class="tk-meta">${t("Owner")}: ${esc(x.meta.dono)}</span>` : ""}
        ${x.meta.depende && x.meta.depende !== "[]" ? `<span class="tk-meta">${t("Depends on")}: ${esc(x.meta.depende)}</span>` : ""}
        <span class="tk-meta">${esc(when(x.updated))}</span></summary>
      <div class="body">
        ${x.brief ? `<h4>${t("Brief")}</h4><div class="md">${md(x.brief)}</div>` : ""}
        ${x.result ? `<h4>${t("Result")}</h4><div class="md">${md(x.result)}</div>` : ""}
      </div></details>`).join("")}</div>`;
}

function render() { renderCards(); renderList(); renderDetail(); }

async function load() {
  try {
    const r = await fetch("/api/tasks", { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    data = await r.json();
    if (!current) current = merged()[0]?.slug ?? null;
    render();
  } catch (err) {
    $("list").innerHTML = `<p>${t("Could not fetch the tasks ({e}).", { e: esc(err.message) })}</p>`;
  }
}

$("list").addEventListener("click", e => { const b = e.target.closest("[data-slug]"); if (!b) return; current = b.dataset.slug; renderList(); renderDetail(); });
$("q").addEventListener("input", renderList);
$("open").addEventListener("change", renderList);

// The vault changes while agents work: reload on every live update (live() also ticks every 10 s).
live(load, on => { const c = $("conn"); c.className = `conn ${on ? "on" : "off"}`; c.textContent = t(on ? "live" : "reconnecting"); });
