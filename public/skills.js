// Lista das skills instaladas no Claude Code, com busca e detalhes.
import { ago, esc, mountUsage, t } from "./common.js";
mountUsage();
import { md } from "./markdown.js";
const srcLabel = s => s === "Personal" ? t("Personal") : s === "Personal command" ? t("Personal command")
  : s.startsWith("Plugin ") ? t("Plugin {x}", { x: s.slice(7) }) : s.startsWith("Project ") ? t("Project {x}", { x: s.slice(8) }) : s;

const $ = id => document.getElementById(id);
let all = [], roots = [], current = null;

// Categoria: plugin com várias skills vira grupo próprio (nome do plugin); skills avulsas entram num tema.
const NOMES = { "mattpocock-skills": "Matt Pocock Skills" };
const bonito = n => NOMES[n] ?? n.replace(/^\./, "").split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
let porPlugin = new Map();
// Plugins com uma skill só entram num tema; os que não estão aqui vão para "Outras".
const TEMAS = { "frontend-design": "Design", "claude-security": "Segurança", "pdf-viewer": "Documentos",
  "skill-creator": "Ferramentas", "kmj-codebridge": "Ferramentas", "evaldossier": "Ferramentas" };
const grupo = s => s.kind === "comando" ? "Comandos" : !s.plugin ? (TEMAS[s.name] ?? "Ferramentas")
  : s.plugin === "mattpocock-skills" ? "Engineering"   // sem grupo próprio: junta com Engineering
  : porPlugin.get(s.plugin) > 1 ? bonito(s.plugin) : (TEMAS[s.plugin] ?? "Outras");

async function load() {
  let res;
  try {
    const r = await fetch("/api/skills", { cache: "no-store" });
    if (!r.ok) throw new Error(t("the server answered {s}", { s: r.status }));
    res = await r.json();
  } catch (err) {
    $("list").innerHTML = `<p>${t("Could not fetch the skills ({e}).", { e: esc(err.message) })}</p>
      <p class="muted">${t("If you just updated the files, stop the server (Ctrl+C) and run <code>bun run start</code> again.")}</p>`;
    return;
  }
  all = res.skills; roots = res.roots ?? [];
  porPlugin = new Map();
  for (const s of all) if (s.plugin && s.kind === "skill") porPlugin.set(s.plugin, (porPlugin.get(s.plugin) ?? 0) + 1);
  const sources = [...new Set(all.map(grupo))].sort((a, b) => a.localeCompare(b));
  $("source").innerHTML = `<option value="">${t("All")}</option>` + sources.map(s => `<option value="${esc(s)}">${esc(srcLabel(s))}</option>`).join("");
  const used = all.filter(s => s.uses > 0).length, plugins = new Set(all.filter(s => s.plugin).map(s => s.plugin)).size;
  $("cards").innerHTML = [
    [t("Installed skills"), all.filter(s => s.kind === "skill").length],
    [t("Personal commands"), all.filter(s => s.kind === "comando").length],
    [t("Plugins with skills"), plugins],
    [t("Already used"), `${used}`, "#5ee07a"],
  ].map(([l, n, c]) => `<div class="stat"><div class="l">${esc(l)}</div><div class="n" style="${c ? `color:${c}` : ""}">${n}</div></div>`).join("");
  render();
  const want = location.hash.slice(1);
  if (want) open(want);
}

function render() {
  const q = $("q").value.trim().toLowerCase(), src = $("source").value, onlyUsed = $("used").checked;
  const rows = all.filter(s => (!src || grupo(s) === src) && (!onlyUsed || s.uses > 0)
    && (!q || s.full.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)));
  $("count").textContent = t("{n} of {total}", { n: rows.length, total: all.length });
  if (!rows.length) {
    $("list").innerHTML = all.length ? `<p class="muted">${t("No skill found.")}</p>` : `<p>${t("No skill found on this computer.")}</p>
      <p class="muted">${t("Folders checked:")}</p><ul class="roots">${roots.map(r => `<li><code>${esc(r.path)}</code> · ${r.exists ? t("{n} file(s)", { n: r.files }) : t("does not exist")}</li>`).join("")}</ul>`;
    return;
  }
  // agrupa por categoria (tema ou plugin)
  const groups = new Map();
  for (const s of rows.sort((a, b) => (b.plugin === "mattpocock-skills") - (a.plugin === "mattpocock-skills"))) {
    const g = grupo(s); if (!groups.has(g)) groups.set(g, []);
    if (!groups.get(g).some(x => x.name === s.name && x.kind === s.kind)) groups.get(g).push(s);   // mesma skill duas vezes no grupo: fica a do Matt Pocock
  }
  const order = [...groups.keys()].sort((a, b) => (a === "Comandos" ? 1 : b === "Comandos" ? -1 : a.localeCompare(b)));
  $("list").innerHTML = order.map(g => `<div class="skill-group">${esc(srcLabel(g))} <span class="muted">(${groups.get(g).length})</span></div>` +
    groups.get(g).map(s => `<button class="skill-item ${current === s.id ? "on" : ""}" data-id="${s.id}">
      <span class="skill-name">${esc(s.kind === "comando" ? "/" + s.name : s.name)}${s.enabled ? "" : ` <span class="tag off">${t("disabled")}</span>`}</span>
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
    ? t("Type <code>/{n}</code> in Claude Code.", { n: esc(s.name) })
    : t("Claude uses it on its own when the request matches the description. You can also ask: <code>use the skill {s}</code>.", { s: esc(s.full) }) + (s.plugin ? "" : " " + t("Or type <code>/{n}</code>.", { n: esc(s.name) }));
  $("detail").innerHTML = `
    <h2>${esc(s.kind === "comando" ? "/" + s.name : s.name)}</h2>
    <dl class="kv">
      <dt>${t("Source")}</dt><dd>${esc(srcLabel(s.source))}${s.enabled ? "" : ` · <span class="tag off">${t("plugin disabled")}</span>`}</dd>
      ${s.plugin ? `<dt>${t("Full name")}</dt><dd><code>${esc(s.full)}</code></dd>` : ""}
      <dt>${t("Uses")}</dt><dd>${s.uses ? t("{n} time(s), the last {t} ago", { n: s.uses, t: ago(s.lastUsed) }) : t("never used")}</dd>
      <dt>${t("How to use")}</dt><dd>${how}</dd>
    </dl>
    <h3 class="skill-h">${t("What it does")}</h3>
    <p class="skill-what">${esc(s.description) || `<span class="muted">${t("No description.")}</span>`}</p>
    ${s.files.length ? `<h3 class="skill-h">${t("Support files")}</h3><div class="chips">${s.files.map(f => `<span class="chip">${esc(f)}</span>`).join("")}</div>` : ""}
    <details class="skill-body"><summary>${t("See the full instructions")}</summary><div class="md">${md(s.body)}</div></details>`;
  if (window.innerWidth < 900) $("detail").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("list").addEventListener("click", e => { const b = e.target.closest(".skill-item"); if (b) open(b.dataset.id); });
for (const id of ["q", "source", "used"]) $(id).addEventListener("input", render);
load();
