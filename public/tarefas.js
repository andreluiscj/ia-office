// Fila de trabalho do Office: pedidos e tarefas que o Líder registra no cofre do Obsidian.
// Ações: recomeçar (abre o claude --office numa janela do PowerShell) e cancelar (marca no cofre). Concluídas ficam recolhidas.
import { ago, esc, live, mountUsage, t } from "./common.js";
import { md } from "./markdown.js";
mountUsage();

const $ = id => document.getElementById(id);
let data = { inbox: [], requests: [] }, current = null, pending = null;

// Status words come from the notes (Portuguese); group them so the colors and counters work in any language.
const KIND = {
  concluido: "done", concluida: "done",
  cancelado: "cancel", cancelada: "cancel",
  "em andamento": "run", revisao: "run", pronto: "run", aprovado: "run",
  perguntas: "wait", "aguardando aprovacao": "wait", pendente: "wait", novo: "wait", pausado: "wait",
  bloqueado: "block", bloqueada: "block",
};
const kind = s => KIND[String(s ?? "").toLowerCase()] ?? "wait";
const pill = s => s ? `<span class="tk-pill s-${kind(s)}">${esc(s)}</span>` : "";
const finished = r => ["done", "cancel"].includes(kind(r.meta.status));   // concluído ou cancelado: vai para a área recolhida
// Progress of a request: average of its tasks' status weights (an estimate from the vault notes, not a measurement).
const WEIGHT = { concluida: 1, concluido: 1, revisao: .75, "em andamento": .4 };
function progress(r) {
  if (kind(r.meta.status) === "done") return 100;
  const ts = r.tasks.filter(x => kind(x.meta.status) !== "cancel");
  if (!ts.length) return 0;
  return Math.round(ts.reduce((a, x) => a + (WEIGHT[String(x.meta.status ?? "").toLowerCase()] ?? 0), 0) / ts.length * 100);
}
const bar = r => { const p = progress(r); return `<span class="tk-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}" aria-label="${esc(t("Progress"))}" title="${esc(t("Estimated from the status of each task"))}"><i style="width:${p}%"></i><b>${p}%</b></span>`; };
const when = ms => ms ? t("updated {t}", { t: ago(ms) }) : "";

// Inbox notes that already have a 10-Tarefas folder are shown there; the rest appear as requests without tasks.
function merged() {
  const known = new Set(data.requests.map(r => r.slug));
  const loose = data.inbox.filter(n => !known.has(n.file.replace(/^00-Pedidos\//, "").replace(/\.md$/, "")))
    .map(n => ({ slug: n.file, title: n.title, meta: n.meta, request: n.body.replace(/^#\s+.+$/m, "").trim(), decisions: "", tasks: [], updated: n.updated, inbox: true }));
  return [...data.requests, ...loose].sort((a, b) => b.updated - a.updated);
}

function filtered() {
  const q = $("q").value.trim().toLowerCase();
  return merged().filter(r => !q || [r.title, r.meta.projeto, r.request, ...r.tasks.map(x => `${x.title} ${x.meta.dono ?? ""} ${x.brief}`)].join(" ").toLowerCase().includes(q));
}

function renderCards() {
  const all = merged().filter(r => kind(r.meta.status) !== "cancel"), tasks = all.flatMap(r => r.tasks).filter(x => kind(x.meta.status) !== "cancel");
  const n = k => tasks.filter(x => kind(x.meta.status) === k).length;
  $("cards").innerHTML = [
    [t("Requests"), all.length], [t("Open tasks"), tasks.length - n("done")], [t("Finished"), n("done")], [t("Blocked"), n("block")],
  ].map(([l, v]) => `<div class="stat"><div class="l">${esc(l)}</div><div class="n">${v}</div></div>`).join("");
}

const row = r => {
  return `<button type="button" class="tk-req${r.slug === current ? " on" : ""}" data-slug="${esc(r.slug)}" aria-pressed="${r.slug === current}">
      <span class="t">${esc(r.title)}</span>
      <span class="tk-meta">${pill(r.meta.status)}${r.meta.faixa ? `<span class="tk-pill">${esc(r.meta.faixa)}</span>` : ""}
        ${r.meta.projeto ? `<span>${esc(r.meta.projeto)}</span>` : ""}<span>${t("{n} tasks", { n: r.tasks.length })}</span><span>${esc(when(r.updated))}</span></span>
      ${bar(r)}</button>`;
};

function renderList() {
  const rows = filtered(), active = rows.filter(r => !finished(r));
  const done = rows.filter(r => kind(r.meta.status) === "done"), cancelled = rows.filter(r => kind(r.meta.status) === "cancel");
  const was = id => $(id)?.open;
  $("vault").textContent = data.vault ?? "";
  if (!data.vault) { $("list").innerHTML = `<p class="muted">${t("No Obsidian vault is set. Fill the cofre field in company/empresa.json.")}</p>`; return; }
  const group = (id, label, list) => list.length ? `<details class="gf-hidden" id="${id}"${was(id) ? " open" : ""}><summary>${label}</summary><div class="tk-list tk-done">${list.map(row).join("")}</div></details>` : "";
  const hidden = group("doneBox", t("View finished tasks ({n})", { n: done.length }), done) + group("cancelBox", t("View cancelled tasks ({n})", { n: cancelled.length }), cancelled);
  const head = `<h3 class="tk-group">${t("In progress ({n})", { n: active.length })}</h3>`;
  if (!active.length) { $("list").innerHTML = `${head}<p class="muted">${merged().length ? t("Nothing in progress.") : t("No requests yet. Write one in the vault's 00-Pedidos folder.")}</p>${hidden}`; return; }
  $("list").innerHTML = head + `<div class="tk-list">${active.map(row).join("")}</div>` + hidden;
}

function renderDetail() {
  const r = merged().find(x => x.slug === current);
  if (!r) { $("detail").innerHTML = `<p class="muted">${t("Click a request to see its tasks.")}</p>`; return; }
  const open = new Set([...document.querySelectorAll(".tk-task[open]")].map(d => d.dataset.file));
  $("detail").innerHTML = `<h2>${esc(r.title)}</h2>
    <div class="tk-meta">${pill(r.meta.status)}${r.meta.faixa ? `<span class="tk-pill">${esc(r.meta.faixa)}</span>` : ""}
      ${r.meta.projeto ? `<span>${t("Project")}: ${esc(r.meta.projeto)}</span>` : ""}<span>${esc(when(r.updated))}</span></div>
    ${bar(r)}
    <div class="tk-actions">
      <button type="button" class="btn" data-act="resume">${t("Restart task")}</button>
      ${finished(r) ? "" : `<button type="button" class="btn ghost" data-act="cancel">${t("Cancel task")}</button>`}
    </div>
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
    if (!current) current = (merged().find(x => !finished(x)) ?? merged()[0])?.slug ?? null;
    render();
  } catch (err) {
    $("list").innerHTML = `<p>${t("Could not fetch the tasks ({e}).", { e: esc(err.message) })}</p>`;
  }
}

// ---- confirmation dialog (native <dialog>: focus trap, Esc to close)
const dlg = $("dlg");
function ask(act, r) {
  pending = { act, slug: r.slug };
  $("dlgTitle").textContent = act === "resume" ? t("Restart this task?") : t("Cancel this task?");
  $("dlgText").textContent = act === "resume"
    ? t("A PowerShell window opens in the project folder with claude --office and continues \"{x}\" from where it stopped.", { x: r.title })
    : t("\"{x}\" is marked as cancelled in the vault. A session already running is not interrupted.", { x: r.title });
  $("dlgErr").textContent = "";
  $("dlgOk").textContent = act === "resume" ? t("Open Office") : t("Cancel task");
  $("dlgOk").className = act === "resume" ? "btn" : "btn danger";
  dlg.showModal();
  $("dlgNo").focus();
}
async function confirm() {
  const { act, slug } = pending;
  $("dlgOk").disabled = true;
  try {
    const r = await fetch(`/api/tasks/${act}`, { method: "POST", headers: { "content-type": "application/json", "x-office": "1" }, body: JSON.stringify({ slug }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? String(r.status));
    dlg.close();
    $("msg").textContent = act === "resume" ? t("Opening the Office in {x}…", { x: j.dir }) : t("Task cancelled.");
    await load();
  } catch (err) {
    $("dlgErr").textContent = t(act === "resume" ? "Could not open the Office ({e})." : "Could not cancel the task ({e}).", { e: err.message });
  } finally { $("dlgOk").disabled = false; }
}
$("dlgOk").addEventListener("click", confirm);
$("dlgNo").addEventListener("click", () => dlg.close());
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });   // click on the backdrop

$("list").addEventListener("click", e => { const b = e.target.closest("[data-slug]"); if (!b) return; current = b.dataset.slug; renderList(); renderDetail(); });
$("detail").addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const r = merged().find(x => x.slug === current); if (r) ask(b.dataset.act, r);
});
$("q").addEventListener("input", renderList);

// The vault changes while agents work: reload on every live update (live() also ticks every 10 s).
setInterval(load, 5000);   // the vault changes while agents work; the server also pushes on every change
live(load, on => { const c = $("conn"); c.className = `conn ${on ? "on" : "off"}`; c.textContent = t(on ? "live" : "reconnecting"); });
