// Graphify dentro do Office: gera o grafo de conhecimento de cada projeto com o próprio Graphify
// e mostra o grafo interativo, o relatório e as perguntas (query, explain, path, affected, god-nodes).
import { ago, esc, live, mountUsage } from "./common.js";
mountUsage();
import { md } from "./markdown.js";

const $ = id => document.getElementById(id);
let st = null, list = [], hiddenList = [], current = null, tab = "grafo", lastBuilt = {};
const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-office": "1" }, body: JSON.stringify(body ?? {}) }).then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

async function refresh() {
  try {
    [st, list, hiddenList] = await Promise.all([fetch("/api/graphify/status").then(r => r.json()), fetch("/api/graphify/projetos").then(r => r.json()), fetch("/api/graphify/ocultos").then(r => r.json())]);
  } catch (err) {
    $("status").innerHTML = `<p>Não consegui falar com o servidor do Office. Se você acabou de atualizar os arquivos, rode <code>bun run office:parar</code> e <code>bun run office:ligar</code>.</p>`;
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
    html = `<div class="gf-row"><div><b class="ok">Graphify ${esc(st.version)}</b> instalado.</div>
      <div class="gf-actions">${st.claudeSkill ? '<span class="tag">/graphify ativo no Claude Code</span>'
        : `<button class="btn" id="skillBtn" ${runningJob ? "disabled" : ""} title="Roda graphify install: copia a skill para ~/.claude/skills/graphify e adiciona uma seção no seu CLAUDE.md">Ativar /graphify no Claude Code</button>`}
      <button class="btn ghost" id="updBtn" ${runningJob ? "disabled" : ""}>Atualizar Graphify</button></div></div>`;
  } else if (st.installer) {
    html = `<div class="gf-row"><div><b class="warn">O Graphify ainda não está instalado.</b>
      <span class="muted">Vou instalar o pacote oficial <code>graphifyy</code> com ${esc(st.installer)}.</span></div>
      <div class="gf-actions"><button class="btn" id="instBtn" ${runningJob ? "disabled" : ""}>${runningJob ? "Instalando..." : "Instalar Graphify"}</button></div></div>`;
  } else {
    html = `<p><b class="warn">O Graphify precisa de Python.</b> Instale o <b>uv</b> (ele traz o Python junto) no PowerShell e depois recarregue esta página:</p>
      <pre class="gf-out">powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"</pre>
      <p class="muted">Depois de instalar, feche e abra o servidor do Office (<code>bun run office:parar</code> e <code>bun run office:ligar</code>).</p>`;
  }
  if (job) html += `<details class="gf-log" ${runningJob || job.ok === false ? "open" : ""}><summary>${job.kind === "skill" ? "Ativação do /graphify" : "Instalação"}: ${!job.ended ? "rodando..." : job.ok ? "concluída" : "falhou"}</summary><pre class="gf-out">${esc(job.log)}</pre></details>`;
  $("status").innerHTML = html;
  $("instBtn")?.addEventListener("click", () => post("/api/graphify/instalar").then(refresh));
  $("updBtn")?.addEventListener("click", () => post("/api/graphify/instalar").then(refresh));
  $("skillBtn")?.addEventListener("click", () => post("/api/graphify/skill").then(refresh));
}

function renderList() {
  const open = $("hiddenBox")?.open;
  const hiddenHtml = hiddenList.length ? `<details class="gf-hidden" id="hiddenBox" ${open ? "open" : ""}><summary>Projetos ocultos (${hiddenList.length})</summary>
    ${hiddenList.map(h => `<div class="gf-hidden-row"><span title="${esc(h.path)}">${esc(h.name)} <span class="muted">${esc(h.path)}</span></span>
      <button class="btn ghost small" data-show="${esc(h.path)}">Mostrar</button></div>`).join("")}</details>` : "";
  if (!list.length) { $("projects").innerHTML = `<p class="muted">Nenhum projeto na lista. Adicione uma pasta acima.</p>${hiddenHtml}`; return; }
  $("projects").innerHTML = list.map(p => `<div class="skill-item gf-item ${current === p.id ? "on" : ""}" data-id="${p.id}" role="button" tabindex="0">
    <span class="skill-name">${esc(p.name)}</span>
    <span class="skill-uses">${p.building ? '<span class="warn">gerando...</span>' : p.graph ? `${p.graph.nodes} nós` : '<span class="muted">sem grafo</span>'}</span>
    <span class="skill-desc">${esc(p.path)}${p.graph ? ` · atualizado há ${ago(p.graph.builtAt)}` : ""}</span>
    <button class="gf-hide" data-hide="${p.id}" title="Ocultar este projeto da lista (não apaga nada)" aria-label="Ocultar ${esc(p.name)}">ocultar</button>
  </div>`).join("") + hiddenHtml;
}

function renderDetail() {
  const p = list.find(x => x.id === current);
  if (!p) { $("detail").innerHTML = `<p class="muted">Escolha um projeto para ver o grafo.</p>`; return; }
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
        <button class="btn" id="buildBtn" ${canBuild ? "" : "disabled"}>${p.building ? "Gerando..." : p.graph ? "Atualizar grafo" : "Gerar grafo"}</button>
        ${p.graph ? `<a class="btn ghost" href="${file("graph.html")}" target="_blank" rel="noopener">Abrir em tela cheia</a>` : ""}
        <button class="btn ghost" id="rmBtn" title="Tira da lista (não apaga nada). Para voltar: Projetos ocultos, embaixo da lista">Ocultar projeto</button>
      </div>
    </div>
    ${p.graph ? `<div class="chips gf-stats"><span class="chip"><b>${p.graph.nodes}</b> nós</span><span class="chip"><b>${p.graph.edges}</b> ligações</span><span class="chip"><b>${p.graph.communities}</b> grupos</span><span class="chip">gerado há ${ago(p.graph.builtAt)}</span></div>` : ""}
    ${job ? `<details class="gf-log" ${!job.ended || job.ok === false ? "open" : ""}><summary>Última geração: ${!job.ended ? "rodando..." : job.ok ? "concluída" : "falhou"}</summary><pre class="gf-out" id="buildLog">${esc(job.log)}</pre></details>` : ""}
    ${!p.graph ? `<p class="muted">Este projeto ainda não tem grafo. Clique em <b>Gerar grafo</b>: o Graphify lê o código da pasta e cria <code>graphify-out/</code> dentro dela. Leva poucos segundos e não usa IA.</p>` : `
    <div class="seg gf-tabs" id="tabs">
      <button data-t="grafo" class="${tab === "grafo" ? "on" : ""}">Grafo</button>
      <button data-t="relatorio" class="${tab === "relatorio" ? "on" : ""}">Relatório</button>
      <button data-t="perguntar" class="${tab === "perguntar" ? "on" : ""}">Perguntar</button>
    </div>
    <div id="tabBody"></div>`}`;
  $("buildBtn")?.addEventListener("click", () => post("/api/graphify/gerar", { id: p.id }).then(refresh));
  $("rmBtn")?.addEventListener("click", () => hide(p.id));
  $("tabs")?.addEventListener("click", e => { const b = e.target.closest("button"); if (b) { tab = b.dataset.t; renderDetail(); } });
  if (!p.graph) return;
  const body = $("tabBody");
  if (tab === "grafo") body.innerHTML = `<iframe class="gf-frame" src="${file("graph.html")}?t=${Math.round(p.graph.builtAt)}" title="Grafo de ${esc(p.name)}"></iframe>`;
  else if (tab === "relatorio") {
    body.innerHTML = `<p class="muted">Carregando...</p>`;
    fetch(file("GRAPH_REPORT.md")).then(r => r.text()).then(t => { body.innerHTML = `<div class="md gf-report">${md(t)}</div>`; });
  } else renderAsk(body, p);
}

const KINDS = {
  query: { label: "Pergunta livre", hint: "Responde com a parte do grafo ligada à pergunta.", fields: ["Pergunta (ex.: como o login funciona?)"] },
  explain: { label: "Explicar um item", hint: "Mostra de onde vem e com o que se liga.", fields: ["Nome (função, classe, arquivo...)"] },
  path: { label: "Caminho entre dois itens", hint: "Como uma coisa chega na outra.", fields: ["De", "Até"] },
  affected: { label: "O que é afetado", hint: "O que pode quebrar se este item mudar.", fields: ["Nome do item"] },
  "god-nodes": { label: "Peças centrais", hint: "Os itens mais conectados do projeto.", fields: [] },
};
let askKind = "query";
function renderAsk(body, p) {
  const k = KINDS[askKind];
  body.innerHTML = `<form id="askForm" class="gf-ask">
      <select id="askKind">${Object.entries(KINDS).map(([v, x]) => `<option value="${v}" ${v === askKind ? "selected" : ""}>${x.label}</option>`).join("")}</select>
      ${k.fields.map((f, i) => `<input class="search" name="a${i}" placeholder="${esc(f)}" autocomplete="off" required>`).join("")}
      <button class="btn" type="submit">Perguntar</button>
    </form>
    <p class="muted">${esc(k.hint)} Usa os comandos do próprio Graphify em cima do <code>graph.json</code>.</p>
    <pre class="gf-out gf-answer" id="answer"></pre>`;
  $("askKind").addEventListener("change", e => { askKind = e.target.value; renderAsk(body, p); });
  $("askForm").addEventListener("submit", async e => {
    e.preventDefault();
    const args = [...e.target.querySelectorAll("input")].map(i => i.value.trim());
    $("answer").textContent = "Consultando o grafo...";
    const r = await post("/api/graphify/perguntar", { id: p.id, kind: askKind, args });
    $("answer").textContent = r.data.error ?? (r.data.out || "(sem resposta)");
  });
}

async function hide(id) {
  await post("/api/graphify/ocultar", { id });
  if (current === id) { current = null; history.replaceState(null, "", "#"); $("detail").dataset.sig = ""; $("detail").innerHTML = `<p class="muted">Projeto ocultado. Para trazer de volta, abra "Projetos ocultos" embaixo da lista.</p>`; }
  refresh();
}
$("projects").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.classList.contains("gf-item")) e.target.click(); });
$("projects").addEventListener("click", async e => {
  const h = e.target.closest("[data-hide]"); if (h) { e.stopPropagation(); hide(h.dataset.hide); return; }
  const s = e.target.closest("[data-show]");
  if (s) { const r = await post("/api/graphify/mostrar", { path: s.dataset.show }); current = r.data.id; history.replaceState(null, "", `#${current}`); $("detail").dataset.sig = ""; refresh(); return; }
  const b = e.target.closest(".skill-item"); if (!b) return;
  current = b.dataset.id; tab = "grafo"; history.replaceState(null, "", `#${current}`);
  renderList(); renderDetail();
  if (window.innerWidth < 900) $("detail").scrollIntoView({ behavior: "smooth" });
});
$("addForm").addEventListener("submit", async e => {
  e.preventDefault();
  const r = await post("/api/graphify/projetos", { path: $("addPath").value });
  if (!r.ok) { alert(r.data.error ?? "Não consegui adicionar."); return; }
  $("addPath").value = ""; current = r.data.id; history.replaceState(null, "", `#${current}`); refresh();
});

const connEl = $("conn");
live(refresh, ok => { connEl.className = `conn ${ok ? "on" : "off"}`; connEl.textContent = ok ? "ao vivo" : "reconectando"; });
// enquanto algo roda, atualiza a cada 1,5 s
setInterval(() => { if (st?.jobs.some(j => !j.ended) || list.some(p => p.building)) refresh(); }, 1500);
