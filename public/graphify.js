// Graphify dentro do Office: gera o grafo de conhecimento de cada projeto com o próprio Graphify
// e mostra o grafo interativo, o relatório e as perguntas (query, explain, path, affected, god-nodes).
import { ago, esc, live, mountUsage, t } from "./common.js";
mountUsage();
import { md } from "./markdown.js";

const $ = id => document.getElementById(id);
let st = null, list = [], hiddenList = [], current = null, tab = "grafo", lastBuilt = {};
const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-office": "1" }, body: JSON.stringify(body ?? {}) }).then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

async function refresh() {
  try {
    [st, list, hiddenList] = await Promise.all([fetch("/api/graphify/status").then(r => r.json()), fetch("/api/graphify/projetos").then(r => r.json()), fetch("/api/graphify/ocultos").then(r => r.json())]);
  } catch (err) {
    $("status").innerHTML = `<p>${t("Could not reach the Office server. If you just updated the files, run <code>bun run office:parar</code> and <code>bun run office:ligar</code>.")}</p>`;
    return;
  }
  renderStatus(); renderList();
  if (!current && location.hash.length > 1) current = location.hash.slice(1);
  if (current) renderDetail();
}

function renderStatus() {
  const job = st.jobs.find(j => j.kind === "instalar" || j.kind === "skill");
  const runningJob = job && !job.ended;
  let html;
  if (st.installed) {
    html = `<div class="gf-row"><div>${t("<b class=\"ok\">Graphify {v}</b> installed.", { v: esc(st.version) })}</div>
      <div class="gf-actions">${st.claudeSkill ? `<span class="tag">${t("/graphify active in Claude Code")}</span>`
        : `<button class="btn" id="skillBtn" ${runningJob ? "disabled" : ""} title="${t("Runs graphify install: copies the skill to ~/.claude/skills/graphify and adds a section to your CLAUDE.md")}">${t("Enable /graphify in Claude Code")}</button>`}
      <button class="btn ghost" id="updBtn" ${runningJob ? "disabled" : ""}>${t("Update Graphify")}</button></div></div>`;
  } else if (st.installer) {
    html = `<div class="gf-row"><div><b class="warn">${t("Graphify is not installed yet.")}</b>
      <span class="muted">${t("I will install the official <code>graphifyy</code> package with {x}.", { x: esc(st.installer) })}</span></div>
      <div class="gf-actions"><button class="btn" id="instBtn" ${runningJob ? "disabled" : ""}>${runningJob ? t("Installing...") : t("Install Graphify")}</button></div></div>`;
  } else {
    html = `<p>${t("<b class=\"warn\">Graphify needs Python.</b> Install <b>uv</b> (it brings Python along) in PowerShell, then reload this page:")}</p>
      <pre class="gf-out">powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"</pre>
      <p class="muted">${t("After installing, restart the Office server (<code>bun run office:parar</code> and <code>bun run office:ligar</code>).")}</p>`;
  }
  if (job) html += `<details class="gf-log" ${runningJob || job.ok === false ? "open" : ""}><summary>${job.kind === "skill" ? t("/graphify activation") : t("Installation")}: ${!job.ended ? t("running...") : job.ok ? t("finished") : t("failed")}</summary><pre class="gf-out">${esc(job.log)}</pre></details>`;
  $("status").innerHTML = html;
  $("instBtn")?.addEventListener("click", () => post("/api/graphify/instalar").then(refresh));
  $("updBtn")?.addEventListener("click", () => post("/api/graphify/instalar").then(refresh));
  $("skillBtn")?.addEventListener("click", () => post("/api/graphify/skill").then(refresh));
}

function renderList() {
  const del = (path, name) => `<button class="gf-del" data-del="${esc(path)}" data-name="${esc(name)}" title="${t("Delete this project from the list (deletes no files)")}" aria-label="${t("Delete {x}", { x: esc(name) })}">${t("delete")}</button>`;
  const open = $("hiddenBox")?.open;
  const hiddenHtml = hiddenList.length ? `<details class="gf-hidden" id="hiddenBox" ${open ? "open" : ""}><summary class="skill-group">${t("Hidden projects ({n})", { n: hiddenList.length })}</summary>
    ${hiddenList.map(h => `<div class="skill-item gf-item gf-off" title="${esc(h.path)}">
      <span class="skill-name">${esc(h.name)}</span>
      <span class="skill-desc">${esc(h.path)}</span>
      <span class="gf-btns"><button class="gf-hide" data-show="${esc(h.path)}">${t("Show")}</button>${del(h.path, h.name)}</span></div>`).join("")}</details>` : "";
  if (!list.length) { $("projects").innerHTML = `<p class="muted">${t("No project in the list. Add a folder above.")}</p>${hiddenHtml}`; return; }
  $("projects").innerHTML = list.map(p => `<div class="skill-item gf-item ${current === p.id ? "on" : ""}" data-id="${p.id}" role="button" tabindex="0">
    <span class="skill-name">${esc(p.name)}</span>
    <span class="skill-uses">${p.building ? `<span class="warn">${t("building...")}</span>` : p.graph ? t("{n} nodes", { n: p.graph.nodes }) : `<span class="muted">${t("no graph")}</span>`}</span>
    <span class="skill-desc">${esc(p.path)}${p.graph ? " · " + t("updated {t} ago", { t: ago(p.graph.builtAt) }) : ""}</span>
    <span class="gf-btns"><button class="gf-hide" data-hide="${p.id}" title="${t("Hide this project from the list (deletes nothing)")}" aria-label="${t("Hide {x}", { x: esc(p.name) })}">${t("hide")}</button>${del(p.path, p.name)}</span>
  </div>`).join("") + hiddenHtml;
}

function renderDetail() {
  const p = list.find(x => x.id === current);
  if (!p) { $("detail").innerHTML = `<p class="muted">${t("Pick a project to see the graph.")}</p>`; return; }
  const job = st.jobs.find(j => j.kind === "grafo" && j.project === p.path);
  const canBuild = st.installed && !p.building;
  // não recarrega o grafo (iframe) se nada mudou, para não perder o zoom
  const sig = `${p.id}:${p.graph?.builtAt ?? 0}:${tab}:${p.building}:${st.installed}:${job?.id}:${job?.ended}`;
  if ($("detail").dataset.sig === sig) { const lg = $("buildLog"); if (lg && job) lg.textContent = job.log; return; }
  $("detail").dataset.sig = sig;
  const file = n => `/api/graphify/arquivo/${p.id}/${n}`;
  $("detail").innerHTML = `
    <div class="gf-head">
      <div><h2>${esc(p.name)}</h2><div class="muted gf-path">${esc(p.path)}</div></div>
      <div class="gf-actions">
        <button class="btn" id="buildBtn" ${canBuild ? "" : "disabled"}>${p.building ? t("Building...") : p.graph ? t("Update graph") : t("Build graph")}</button>
        ${p.graph ? `<a class="btn ghost" href="${file("graph.html")}" target="_blank" rel="noopener">${t("Open full screen")}</a>` : ""}
        <button class="btn ghost" id="rmBtn" title="${t("Removes it from the list (deletes nothing). To bring it back: Hidden projects, below the list")}">${t("Hide project")}</button>
      </div>
    </div>
    ${p.graph ? `<div class="chips gf-stats"><span class="chip"><b>${p.graph.nodes}</b> ${t("nodes")}</span><span class="chip"><b>${p.graph.edges}</b> ${t("links")}</span><span class="chip"><b>${p.graph.communities}</b> ${t("groups")}</span><span class="chip">${t("built {t} ago", { t: ago(p.graph.builtAt) })}</span></div>` : ""}
    ${job ? `<details class="gf-log" ${!job.ended || job.ok === false ? "open" : ""}><summary>${t("Last build")}: ${!job.ended ? t("running...") : job.ok ? t("finished") : t("failed")}</summary><pre class="gf-out" id="buildLog">${esc(job.log)}</pre></details>` : ""}
    ${!p.graph ? `<p class="muted">${t("This project has no graph yet. Click <b>Build graph</b>: Graphify reads the folder's code and creates <code>graphify-out/</code> inside it. It takes a few seconds and uses no AI.")}</p>` : `
    <div class="seg gf-tabs" id="tabs">
      <button data-t="grafo" class="${tab === "grafo" ? "on" : ""}">${t("Graph")}</button>
      <button data-t="relatorio" class="${tab === "relatorio" ? "on" : ""}">${t("Report")}</button>
      <button data-t="perguntar" class="${tab === "perguntar" ? "on" : ""}">${t("Ask")}</button>
    </div>
    <div id="tabBody"></div>`}`;
  $("buildBtn")?.addEventListener("click", () => post("/api/graphify/gerar", { id: p.id }).then(refresh));
  $("rmBtn")?.addEventListener("click", () => hide(p.id));
  $("tabs")?.addEventListener("click", e => { const b = e.target.closest("button"); if (b) { tab = b.dataset.t; renderDetail(); } });
  if (!p.graph) return;
  const body = $("tabBody");
  if (tab === "grafo") body.innerHTML = `<iframe class="gf-frame" src="${file("graph.html")}?t=${Math.round(p.graph.builtAt)}" title="${t("Graph of {x}", { x: esc(p.name) })}"></iframe>`;
  else if (tab === "relatorio") {
    body.innerHTML = `<p class="muted">Carregando...</p>`;
    fetch(file("GRAPH_REPORT.md")).then(r => r.text()).then(t => { body.innerHTML = `<div class="md gf-report">${md(t)}</div>`; });
  } else renderAsk(body, p);
}

const KINDS = {
  query: { label: t("Free question"), hint: t("Answers with the part of the graph related to the question."), fields: [t("Question (e.g. how does login work?)")] },
  explain: { label: t("Explain an item"), hint: t("Shows where it comes from and what it connects to."), fields: [t("Name (function, class, file...)")] },
  path: { label: t("Path between two items"), hint: t("How one thing reaches the other."), fields: [t("From"), t("To")] },
  affected: { label: t("What is affected"), hint: t("What may break if this item changes."), fields: [t("Item name")] },
  "god-nodes": { label: t("Central pieces"), hint: t("The most connected items in the project."), fields: [] },
};
let askKind = "query";
function renderAsk(body, p) {
  const k = KINDS[askKind];
  body.innerHTML = `<form id="askForm" class="gf-ask">
      <select id="askKind">${Object.entries(KINDS).map(([v, x]) => `<option value="${v}" ${v === askKind ? "selected" : ""}>${x.label}</option>`).join("")}</select>
      ${k.fields.map((f, i) => `<input class="search" name="a${i}" placeholder="${esc(f)}" autocomplete="off" required>`).join("")}
      <button class="btn" type="submit">${t("Ask")}</button>
    </form>
    <p class="muted">${esc(k.hint)} ${t("Uses Graphify's own commands on <code>graph.json</code>.")}</p>
    <pre class="gf-out gf-answer" id="answer"></pre>`;
  $("askKind").addEventListener("change", e => { askKind = e.target.value; renderAsk(body, p); });
  $("askForm").addEventListener("submit", async e => {
    e.preventDefault();
    const args = [...e.target.querySelectorAll("input")].map(i => i.value.trim());
    $("answer").textContent = t("Querying the graph...");
    const r = await post("/api/graphify/perguntar", { id: p.id, kind: askKind, args });
    $("answer").textContent = (r.data.error && t(r.data.error)) ?? (r.data.out || t("(no answer)"));
  });
}

async function hide(id) {
  await post("/api/graphify/ocultar", { id });
  if (current === id) { current = null; history.replaceState(null, "", "#"); $("detail").dataset.sig = ""; $("detail").innerHTML = `<p class="muted">${t("Project hidden. To bring it back, open \"Hidden projects\" below the list.")}</p>`; }
  refresh();
}
$("projects").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.classList.contains("gf-item")) e.target.click(); });
$("projects").addEventListener("click", async e => {
  const h = e.target.closest("[data-hide]"); if (h) { e.stopPropagation(); hide(h.dataset.hide); return; }
  const d = e.target.closest("[data-del]");
  if (d) {
    e.stopPropagation();
    const name = d.dataset.name;
    if (!confirm(t("Delete \"{x}\" from the list? No files are deleted. To bring it back, add the folder again.", { x: name }))) return;
    const r = await post("/api/graphify/excluir", { path: d.dataset.del });
    if (!r.ok) { alert((r.data.error && t(r.data.error)) ?? t("Could not delete it.")); return; }
    if (list.some(p => p.path === d.dataset.del && p.id === current)) { current = null; history.replaceState(null, "", "#"); $("detail").dataset.sig = ""; $("detail").innerHTML = `<p class="muted">${t("Pick a project to see the graph.")}</p>`; }
    refresh(); return;
  }
  const s = e.target.closest("[data-show]");
  if (s) { const r = await post("/api/graphify/mostrar", { path: s.dataset.show }); current = r.data.id; history.replaceState(null, "", `#${current}`); $("detail").dataset.sig = ""; refresh(); return; }
  const b = e.target.closest(".skill-item"); if (!b || !b.dataset.id) return;
  current = b.dataset.id; tab = "grafo"; history.replaceState(null, "", `#${current}`);
  renderList(); renderDetail();
  if (window.innerWidth < 900) $("detail").scrollIntoView({ behavior: "smooth" });
});
$("addForm").addEventListener("submit", async e => {
  e.preventDefault();
  const r = await post("/api/graphify/projetos", { path: $("addPath").value });
  if (!r.ok) { alert((r.data.error && t(r.data.error)) ?? t("Could not add it.")); return; }
  $("addPath").value = ""; current = r.data.id; history.replaceState(null, "", `#${current}`); refresh();
});

const connEl = $("conn");
live(refresh, ok => { connEl.className = `conn ${ok ? "on" : "off"}`; connEl.textContent = ok ? t("live") : t("reconnecting"); });
// enquanto algo roda, atualiza a cada 1,5 s
setInterval(() => { if (st?.jobs.some(j => !j.ended) || list.some(p => p.building)) refresh(); }, 1500);
