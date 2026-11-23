// Utilidades compartilhadas pelas telas.
import { t, LOCALE } from "./i18n.js";
export { t };
export const STATUS = {
  working: { label: t("Working"), color: "#5ee07a" },
  waiting: { label: t("Waiting for you"), color: "#ffcc4d" },
  idle:    { label: t("Idle"), color: "#7aa2c8" },
  done:    { label: t("Done"), color: "#9a8fb0" },
  ended:   { label: t("Ended"), color: "#6b6480" },
  offline: { label: t("Offline"), color: "#4d4860" },
};

export const SHIRTS = ["#e8664a", "#4a90e2", "#9b5de5", "#2bb3a3", "#f29e4c", "#e05297", "#6cc04a", "#3d5a80"];

export function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}
export const colorFor = (key) => SHIRTS[hash(key) % SHIRTS.length];

export function ago(ts, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Nome curto de uma skill/ferramenta: "anthropic-skills:docs" -> "docs" (o completo vai no title). */
export function shortName(s) {
  const str = String(s ?? "");
  if (str.startsWith("mcp__")) return str.split("__").slice(1).join(" · ");
  return str.includes(":") ? str.split(":").pop() : str;
}

/** Conecta no WebSocket e chama onChange a cada mudança; reconecta sozinho. */
export function live(onChange, onStatus = () => {}) {
  let ws;
  const connect = () => {
    ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
    ws.onopen = () => { onStatus(true); onChange(); };
    ws.onmessage = () => onChange();
    ws.onclose = () => { onStatus(false); setTimeout(connect, 2000); };
  };
  connect();
  setInterval(onChange, 10_000); // garante atualização dos "há X min"
}

// Barra de uso do plano (Sessão atual = limite de 5 h, Semanal), igual em todas as telas.
function resetText(epochSec, skew) {
  if (!epochSec) return "";
  const ms = epochSec * 1000 - (Date.now() - skew);
  if (ms <= 0) return t("resetting");
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  if (h < 24) return t("Resets in {t}", { t: `${h ? `${h} h ` : ""}${m} min` });
  const d = new Date(epochSec * 1000);
  const day = h < 24 * 6 ? { weekday: "short" } : { day: "2-digit", month: "2-digit" };   // a weekday alone is ambiguous past a week (Codex free: 30-day window)
  return t("Resets {t}", { t: `${d.toLocaleDateString(LOCALE, day)} ${d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" })}` });
}
function usageRow(label, w, skew) {
  const pct = Math.max(0, Math.min(100, Math.round(w.used_percentage ?? 0)));
  const cls = pct >= 90 ? "hot" : pct >= 75 ? "warn" : "";
  return `<div class="row"><span class="lbl">${label}</span><span class="bar"><i class="${cls}" style="width:${pct}%"></i></span>
    <span class="pct">${pct}%</span><span class="rst">${esc(resetText(w.resets_at, skew))}</span></div>`;
}
// Pixel icons for the two plans (generic glyphs, not logos).
const ICON = {
  claude: `<svg viewBox="0 0 12 12" width="24" height="24" aria-hidden="true" shape-rendering="crispEdges"><rect x="2" y="2" width="8" height="6" fill="#e8664a"/><rect x="0" y="4" width="2" height="2" fill="#e8664a"/><rect x="10" y="4" width="2" height="2" fill="#e8664a"/><rect x="3" y="8" width="1" height="2" fill="#e8664a"/><rect x="5" y="8" width="2" height="2" fill="#e8664a"/><rect x="8" y="8" width="1" height="2" fill="#e8664a"/><rect x="4" y="4" width="1" height="1" fill="#000"/><rect x="7" y="4" width="1" height="1" fill="#000"/></svg>`,
  codex: `<svg viewBox="0 0 12 12" width="24" height="24" aria-hidden="true" shape-rendering="crispEdges"><rect x="0" y="1" width="12" height="10" fill="#f2eee3"/><rect x="1" y="2" width="10" height="8" fill="#15141e"/><rect x="2" y="4" width="1" height="1" fill="#5ee07a"/><rect x="3" y="5" width="1" height="1" fill="#5ee07a"/><rect x="2" y="6" width="1" height="1" fill="#5ee07a"/><rect x="5" y="7" width="4" height="1" fill="#5ee07a"/></svg>`,
};
const group = (name, title, rows) => `<div class="ugroup" title="${esc(title)}"><span class="uicon" role="img" aria-label="${name}">${ICON[name.toLowerCase()]}</span><div class="urows">${rows}</div></div>`;
function backAt(epochSec) {
  const d = new Date(epochSec * 1000);
  return `${d.toLocaleDateString(LOCALE, { weekday: "short" })} ${d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" })}`;
}
/** codex: undefined = page without Codex row; null = no data yet. */
export function renderUsage(el, u, skew = 0, codex = undefined) {
  if (!el) return;
  const claude = !u || (!u.five_hour && !u.seven_day)
    ? `<div class="uempty">${t("Plan usage shows up after Claude Code's first reply")}</div>`
    : (u.five_hour ? usageRow(t("Current session"), u.five_hour, skew) : "") + (u.seven_day ? usageRow(t("Weekly"), u.seven_day, skew) : "");
  let out = group("Claude", t("Your Claude plan usage limits, the same as Settings › Usage"), claude);
  if (codex !== undefined) {
    const blocked = codex?.blocked_until
      ? `<div class="row"><span class="lbl">${t("Used up")}</span><span class="bar"><i class="hot" style="width:100%"></i></span><span class="pct">100%</span><span class="rst">${esc(t("Back {t}", { t: backAt(codex.blocked_until) }))}</span></div>` : "";
    const label = m => m === 300 ? t("Current session") : m === 10080 ? t("Weekly") : m === 43200 ? t("Monthly") : m ? t("{n} days", { n: Math.round(m / 1440) }) : t("Current session");
    const rows = blocked + (codex?.windows ?? []).map(w => usageRow(label(w.minutes), w, skew)).join("");
    out += group("Codex", t("Your Codex usage limits, read from its session logs"), rows || `<div class="uempty">${t("Codex usage shows up after its first run")}</div>`);
  }
  el.innerHTML = out;
}
/** Liga a barra de uso no elemento #usage da página (atualiza a cada 30 s). */
export function mountUsage() {
  const el = document.getElementById("usage");
  if (!el) return;
  const tick = async () => {
    try { const r = await (await fetch("/api/usage")).json(); renderUsage(el, r.usage, Date.now() - r.now, "codex" in r ? r.codex : undefined); } catch {}
  };
  tick();
  setInterval(tick, 30_000);
}
