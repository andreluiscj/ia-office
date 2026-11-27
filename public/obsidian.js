// Obsidian button (shared by every page): opens the vault, or explains how to install Obsidian / register the vault.
import { esc, t } from "./common.js";

const $ = id => document.getElementById(id);
const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-office": "1" }, body: JSON.stringify(body ?? {}) }).then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));
const OBS_URL = vault => `obsidian://open?path=${encodeURIComponent(vault)}`;
function obsDialog(html) {
  let d = $("obsDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "obsDlg"; d.className = "obs-dlg"; document.body.appendChild(d); d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-close]")) d.close(); }); }
  d.innerHTML = html; if (!d.open) d.showModal(); return d;
}
const obsSteps = () => `<ol class="obs-steps">
  <li>${t("Open the Obsidian window.")}</li>
  <li>${t("Click <b>Open folder as vault</b> and pick your vault folder (the one that holds your notes).")}</li>
  <li>${t("Come back here and click Obsidian again.")}</li></ol>`;
export async function openObsidian() {
  let o; try { o = await fetch("/api/obsidian").then(r => r.json()); } catch { alert(t("Could not reach the Office server. If you just updated the files, run <code>bun run office:parar</code> and <code>bun run office:ligar</code>.").replace(/<\/?code>/g, "")); return; }
  if (!o.installed) {
    obsDialog(`<h2>${t("Obsidian is not installed")}</h2>
      <p>${t("Obsidian is a free notes app. The Office uses a vault (a folder of notes) to receive your requests.")}</p>
      <ol class="obs-steps"><li>${t("Download and install Obsidian from <a href=\"https://obsidian.md/download\" target=\"_blank\" rel=\"noopener\">obsidian.md/download</a>.")}</li>
      <li>${t("Open it once and choose <b>Create new vault</b> or <b>Open folder as vault</b>.")}</li>
      <li>${t("Come back here and click Obsidian again to register the vault.")}</li></ol>
      <div class="gf-actions"><a class="btn" href="https://obsidian.md/download" target="_blank" rel="noopener">${t("Download Obsidian")}</a><button class="btn ghost" data-close>${t("Close")}</button></div>`);
    return;
  }
  if (o.vault && o.known) { location.href = OBS_URL(o.vault); return; }
  const d = obsDialog(`<h2>${t("Register your vault")}</h2>
    <p>${o.vault ? t("Obsidian does not know this folder as a vault yet:") + ` <code>${esc(o.vault)}</code>` : t("No vault is registered yet. Type the folder of your vault.")}</p>
    <form id="obsForm" class="gf-ask"><input class="search" id="obsPath" name="p" value="${esc(o.vault ?? "")}" placeholder="C:\Obsidian - Vault" autocomplete="off" required>
      <button class="btn" type="submit">${t("Save and open")}</button></form>
    <p class="muted" id="obsMsg"></p>
    ${o.vaults.length ? `<p class="muted">${t("Vaults Obsidian already knows:")}</p><div class="gf-actions">${o.vaults.map(v => `<button class="btn ghost small" data-pick="${esc(v)}">${esc(v)}</button>`).join("")}</div>` : ""}
    <h3>${t("If Obsidian does not open it")}</h3>${obsSteps()}
    <div class="gf-actions"><button class="btn ghost" data-close>${t("Close")}</button></div>`);
  d.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => { $("obsPath").value = b.dataset.pick; }));
  $("obsForm").addEventListener("submit", async e => {
    e.preventDefault();
    const r = await post("/api/obsidian/vault", { path: $("obsPath").value });
    if (!r.ok) { $("obsMsg").textContent = (r.data.error && t(r.data.error)) ?? t("Could not save it."); return; }
    if (r.data.known) { d.close(); location.href = OBS_URL(r.data.vault); }
    else $("obsMsg").textContent = t("Saved. Now register this folder in Obsidian (steps below), then click Obsidian again.");
  });
}
