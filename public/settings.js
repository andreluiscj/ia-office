// Settings: general data, each agent's knowledge, how the team uses Codex, and a few maintenance actions.
import { esc, live, mountUsage, t } from "./common.js";
mountUsage();

const $ = id => document.getElementById(id);
const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-office": "1" }, body: JSON.stringify(body ?? {}) }).then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));
let S = null, tab = location.hash.slice(1) || "general", agentId = null;
const say = (m, bad) => { $("msg").textContent = m; $("msg").className = bad ? "warn" : "muted"; };

const MODES = [
  ["off", t("Do not use"), t("Only Claude Code. Agents never call Codex and images are drawn by hand (SVG).")],
  ["light", t("Use a little: supervise"), t("Codex gives a second opinion on big changes and makes design images.")],
  ["normal", t("Use normally"), t("Codex works like a second Claude Code: it takes whole slices of work, so you can keep going when one of the plans runs out.")],
];

async function load() {
  try { S = await fetch("/api/settings").then(r => r.json()); } catch { $("panel").innerHTML = `<p>${t("Could not reach the Office server. If you just updated the files, run <code>bun run office:parar</code> and <code>bun run office:ligar</code>.")}</p>`; return; }
  render();
}

function render() {
  for (const b of $("tabs").children) b.classList.toggle("on", b.dataset.t === tab);
  ({ general, agents, codex, more })[tab]?.();
}

async function general() {
  const o = await fetch("/api/obsidian").then(r => r.json()).catch(() => ({}));
  $("panel").innerHTML = `<h2>${t("General")}</h2>
    <form id="gForm" class="set-form">
      <label>${t("Company name")}<input class="search" name="empresa" value="${esc(S.empresa.empresa)}" maxlength="60"></label>
      <label>${t("Your name")}<input class="search" name="usuario" value="${esc(S.empresa.usuario)}" maxlength="60"></label>
      <button class="btn" type="submit">${t("Save")}</button>
    </form>
    <p class="muted">${t("Names appear in the agents' instructions, so saving reinstalls the agents in Claude Code.")}</p>
    <dl class="set-kv">
      <dt>${t("Agents")}</dt><dd>${S.agents.length}</dd>
      <dt>${t("Skills")}</dt><dd>${S.skills}</dd>
      <dt>${t("Obsidian vault")}</dt><dd><code>${esc(S.empresa.cofre || "-")}</code></dd>
      <dt>${t("Vault opened by the Obsidian button")}</dt><dd><code>${esc(o.vault ?? "-")}</code></dd>
      <dt>${t("Database")}</dt><dd><code>${esc(S.db)}</code></dd>
    </dl>`;
  $("gForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const r = await post("/api/settings/empresa", { empresa: f.get("empresa"), usuario: f.get("usuario") });
    say(r.ok ? t("Saved.") : (r.data.error && t(r.data.error)) ?? t("Could not save it."), !r.ok);
    if (r.ok) load();
  });
}

async function agents() {
  agentId ??= S.agents[0]?.id;
  const a = agentId && await fetch(`/api/settings/agent/${encodeURIComponent(agentId)}`).then(r => r.json()).catch(() => null);
  $("panel").innerHTML = `<h2>${t("What each agent knows")}</h2>
    <p class="muted">${t("This is the agent's full instruction file (header + knowledge). Saving rewrites it and reinstalls the agents in Claude Code. Only change the header lines if you know what they do.")}</p>
    <div class="set-form"><label>${t("Agent")}<select id="agentSel">${S.agents.map(x => `<option value="${esc(x.id)}" ${x.id === agentId ? "selected" : ""}>${esc(x.nome)} · ${esc(x.cargo || x.id)}</option>`).join("")}</select></label></div>
    ${a?.text != null ? `<textarea id="agentText" class="set-text" spellcheck="false" aria-label="${t("Agent instructions")}">${esc(a.text)}</textarea>
    <div class="gf-actions"><button class="btn" id="agentSave">${t("Save")}</button><button class="btn ghost" id="agentReset">${t("Discard changes")}</button></div>` : `<p class="muted">${t("Agent not found.")}</p>`}`;
  $("agentSel").addEventListener("change", e => { agentId = e.target.value; agents(); });
  $("agentReset")?.addEventListener("click", agents);
  $("agentSave")?.addEventListener("click", async () => {
    const r = await post("/api/settings/agent", { id: agentId, text: $("agentText").value });
    say(r.ok ? t("Saved. The agents were reinstalled in Claude Code.") : (r.data.error && t(r.data.error)) ?? t("Could not save it."), !r.ok);
  });
}

function codex() {
  $("panel").innerHTML = `<h2>${t("How to use Codex")}</h2>
    <p class="muted">${t("You can use Codex and Claude Code together, so work does not stop when one plan runs out. Changing this updates every agent's instructions in Claude Code.")}</p>
    <div class="set-modes" role="radiogroup" aria-label="${t("How to use Codex")}">${MODES.map(([v, title, text]) => `
      <label class="set-mode ${S.codex === v ? "on" : ""}"><input type="radio" name="codex" value="${v}" ${S.codex === v ? "checked" : ""}>
        <span><b>${title}</b>${v === "light" ? ` <span class="tag">${t("default")}</span>` : ""}<br><span class="muted">${text}</span></span></label>`).join("")}</div>`;
  $("panel").onchange = async e => {
    if (e.target.name !== "codex") return;
    const r = await post("/api/settings/codex", { mode: e.target.value });
    if (r.ok) { S.codex = e.target.value; say(t("Saved. The agents were reinstalled in Claude Code."), false); } else say((r.data.error && t(r.data.error)) ?? t("Could not save it."), true);
    codex();
  };
}

function more() {
  $("panel").innerHTML = `<h2>${t("More")}</h2>
    <div class="set-form"><div><b>${t("Reinstall agents and skills")}</b><p class="muted">${t("Copies the agents and playbooks into Claude Code again. Use it if something looks outdated.")}</p>
      <button class="btn" id="syncBtn">${t("Reinstall now")}</button></div>
    <div><b>${t("Obsidian")}</b><p class="muted">${t("Open the Graphify page and click Obsidian to open, install or change the vault.")}</p>
      <a class="btn ghost" href="/graphify">${t("Go to Graphify")}</a></div></div>`;
  $("syncBtn").addEventListener("click", async () => { const r = await post("/api/settings/sync"); say(r.ok ? t("Done.") : t("Could not save it."), !r.ok); });
}

$("tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { tab = b.dataset.t; history.replaceState(null, "", `#${tab}`); say("", false); render(); } });
const connEl = $("conn");
live(() => {}, ok => { connEl.className = `conn ${ok ? "on" : "off"}`; connEl.textContent = ok ? t("live") : t("reconnecting"); });
load();
