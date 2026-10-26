// Dashboard da equipe: quem está trabalhando, em quê, e quais skills cada funcionário mais usa.
import { ago, esc, shortName, live, mountUsage } from "./common.js";
mountUsage();

let range = 7, project = "";
const $ = id => document.getElementById(id);
const COLORS = { working: "#5ee07a", waiting: "#ffcc4d", idle: "#7aa2c8" };
const LABEL = { working: "Trabalhando", waiting: "Esperando você", idle: "Disponível" };

async function refresh() {
  const [st, co] = await Promise.all([
    fetch(`/api/stats?range=${range}&project=${encodeURIComponent(project)}`).then(r => r.json()),
    fetch("/api/company").then(r => r.json()),
  ]);
  renderProjects(st.projects);
  renderCards(st, co);
  renderTeam(co);
  renderByAgent(st.byAgent, co);
  renderBars($("topSkills"), st.topSkills.map(r => ({ label: shortName(r.skill), title: r.skill, value: r.c, note: `${r.agents} funcionário(s)` })), "#ffcc4d", "Nenhuma skill usada no período.");
  renderBars($("topTools"), st.topTools.map(r => ({ label: shortName(r.tool), title: r.tool, value: r.c })), "#4a90e2", "Nenhuma ferramenta usada no período.");
  renderDaily(st.daily);
}

function renderProjects(list) {
  const sel = $("project"), cur = sel.value;
  sel.innerHTML = `<option value="">Todos</option>` + list.map(p => `<option ${p === cur ? "selected" : ""}>${esc(p)}</option>`).join("");
}

function renderCards(st, co) {
  const per = { 1: "hoje", 7: "em 7 dias", 30: "em 30 dias", 0: "no total" }[st.rangeDays] ?? "";
  const working = co.funcionarios.filter(f => f.status === "working").length;
  const projects = new Set(co.diretor.sessions.map(s => s.project)).size;
  const items = [
    ["Funcionários trabalhando", `${working}/${co.funcionarios.length}`, COLORS.working],
    ["Projetos ativos agora", projects],
    ["Esperando você", co.diretor.sessions.filter(s => s.status === "waiting").length, COLORS.waiting],
    [`Tarefas delegadas ${per}`, st.cards.subagents],
    [`Usos de skill ${per}`, st.cards.skillUses],
  ];
  $("cards").innerHTML = items.map(([l, n, color]) =>
    `<div class="stat"><div class="l">${esc(l)}</div><div class="n" style="${color ? `color:${color}` : ""}">${n}</div></div>`).join("");
}

function renderTeam(co) {
  const now = co.now;
  const setor = id => co.setores.find(s => s.id === id)?.nome ?? id;
  const rows = [...co.funcionarios].sort((a, b) => (a.status === "working" ? 0 : 1) - (b.status === "working" ? 0 : 1));
  const d = co.diretor;
  const dirRow = `<tr>
      <td><i class="dot" style="background:${d.cor}"></i> <b>${esc(d.nome)}</b><div class="muted">Líder</div></td>
      <td>Liderança</td>
      <td><span class="pill" style="background:${COLORS[d.status]}">${d.status === "idle" ? "Sem projeto" : LABEL[d.status]}</span></td>
      <td>${d.sessions.map(s => `${esc(s.project)}${s.task ? `<div class="muted">${esc(s.task)}</div>` : ""}`).join("") || '<span class="muted">—</span>'}</td>
      <td class="muted">—</td><td class="muted">—</td><td class="muted">—</td></tr>`;
  $("team").innerHTML = `<table><thead><tr>
      <th>Funcionário</th><th>Setor</th><th>Status</th><th>Agora</th><th>Tarefas (7 dias)</th><th>Última atividade</th><th>Skills mais usadas</th>
    </tr></thead><tbody>${dirRow}${rows.map(f => `<tr>
      <td><i class="dot" style="background:${f.cor}"></i> <b>${esc(f.nome)}</b><div class="muted">${esc(f.cargo)}</div></td>
      <td>${esc(setor(f.setor))}</td>
      <td><span class="pill" style="background:${COLORS[f.status]}">${LABEL[f.status]}${f.active.length > 1 ? ` x${f.active.length}` : ""}</span></td>
      <td>${f.active.map(a => `${esc(a.project)}${a.task ? `<div class="muted">${esc(a.task)}</div>` : ""}`).join("") || '<span class="muted">—</span>'}</td>
      <td>${f.tasks7d}</td>
      <td>${f.last ? `há ${ago(f.last.ts, now)}` : '<span class="muted">nunca</span>'}</td>
      <td><div class="chips">${f.skills.slice(0, 3).map(s => `<span class="chip" title="${esc(s.name)}">${esc(shortName(s.name))} <b>${s.count}</b></span>`).join("") || '<span class="muted">—</span>'}</div></td>
    </tr>`).join("")}</tbody></table>`;
}

function renderByAgent(groups, co) {
  const byId = new Map(groups.map(g => [g.agent, g]));
  const cards = [{ key: "diretor", nome: co.diretor.nome, cargo: "Líder", cor: co.diretor.cor }]
    .concat(co.funcionarios.map(f => ({ key: f.id, nome: f.nome, cargo: f.cargo, cor: f.cor })));
  // terceirizados com uso no período
  for (const g of groups) if (g.agent !== "diretor" && !co.funcionarios.some(f => g.agent === f.id || g.agent.endsWith(":" + f.id)))
    cards.push({ key: g.agent, nome: g.agent, cargo: "terceirizado", cor: "#9aa0b4" });
  $("byAgent").innerHTML = cards.map(c => {
    const g = byId.get(c.key) ?? groups.find(x => x.agent.endsWith(":" + c.key)) ?? { total: 0, tasks: 0, skills: [], tools: [] };
    const maxS = g.skills[0]?.count ?? 1, maxT = g.tools[0]?.count ?? 1;
    return `<div class="agent-card">
      <div class="head"><i class="dot" style="background:${c.cor}"></i><span class="name">${esc(c.nome)}</span>
        <span class="muted">${esc(c.cargo)}</span><span class="total">${c.key === "diretor" ? "" : `${g.tasks} tarefas`}</span></div>
      <div class="muted" style="margin:4px 0">Skills</div>
      <div class="bars">${g.skills.slice(0, 4).map(s => bar(shortName(s.skill), s.skill, s.count, maxS, c.cor)).join("") || '<span class="muted">nenhuma no período</span>'}</div>
      <div class="muted" style="margin:8px 0 4px">Ferramentas</div>
      <div class="bars">${g.tools.slice(0, 4).map(s => bar(shortName(s.tool), s.tool, s.count, maxT, "#4a90e2")).join("") || '<span class="muted">nenhuma no período</span>'}</div>
    </div>`;
  }).join("");
}

function bar(label, title, value, max, color, note = "") {
  const pct = Math.max(3, Math.round((value / max) * 100));
  return `<div class="bar" title="${esc(title)}${note ? " · " + esc(note) : ""}">
    <span class="lbl">${esc(label)}</span>
    <span class="track"><span class="fill" style="display:block;width:${pct}%;background:${color}"></span></span>
    <span class="v">${value}</span></div>`;
}

function renderBars(el, rows, color, empty) {
  if (!rows.length) { el.innerHTML = `<p class="muted">${esc(empty)}</p>`; return; }
  const max = Math.max(...rows.map(r => r.value));
  el.innerHTML = rows.map(r => bar(r.label, r.title, r.value, max, color, r.note)).join("");
}

function renderDaily(rows) {
  const map = new Map(rows.map(r => [r.day, r.c]));
  let days = rows.map(r => r.day);
  if (range > 1) {
    days = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
  }
  const total = rows.reduce((s, r) => s + r.c, 0);
  $("dailySub").textContent = total ? `${total} usos de skill no período.` : "Nenhum uso no período.";
  if (!days.length) { $("daily").innerHTML = ""; return; }
  const W = 960, H = 220, L = 36, B = 28, T = 16;
  const max = Math.max(1, ...days.map(d => map.get(d) ?? 0));
  const bw = (W - L - 8) / days.length;
  const y = v => H - B - (v / max) * (H - B - T);
  const every = Math.ceil(days.length / 12);
  $("daily").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Usos de skill por dia">
    <line x1="${L}" x2="${W - 8}" y1="${H - B}" y2="${H - B}" stroke="#000" stroke-width="3"/>
    <text x="${L - 6}" y="${y(max) + 5}" text-anchor="end" fill="#a49fbd" font-family="Pixelify Sans" font-size="14">${max}</text>
    <line x1="${L}" x2="${W - 8}" y1="${y(max)}" y2="${y(max)}" stroke="#45405f" stroke-dasharray="4 4"/>
    ${days.map((d, i) => {
      const v = map.get(d) ?? 0, x = L + i * bw + 3, h = H - B - y(v);
      return `<g><title>${d.split("-").reverse().join("/")}: ${v} usos</title>
        <rect x="${x}" y="${y(v)}" width="${Math.max(2, bw - 6)}" height="${h}" fill="#ffcc4d" stroke="#000" stroke-width="2"/>
        ${i % every === 0 ? `<text x="${x + (bw - 6) / 2}" y="${H - 8}" text-anchor="middle" fill="#a49fbd" font-family="Pixelify Sans" font-size="13">${d.slice(8)}/${d.slice(5, 7)}</text>` : ""}
      </g>`;
    }).join("")}
  </svg>`;
}

$("range").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  range = Number(b.dataset.r);
  for (const x of $("range").children) x.classList.toggle("on", x === b);
  refresh();
});
$("project").addEventListener("change", e => { project = e.target.value; refresh(); });

const connEl = $("conn");
live(refresh, ok => { connEl.className = `conn ${ok ? "on" : "off"}`; connEl.textContent = ok ? "ao vivo" : "reconectando"; });
