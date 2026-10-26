// Utilidades compartilhadas pelas duas telas.
export const STATUS = {
  working: { label: "Trabalhando", color: "#5ee07a" },
  waiting: { label: "Esperando você", color: "#ffcc4d" },
  idle:    { label: "Parado", color: "#7aa2c8" },
  done:    { label: "Concluído", color: "#9a8fb0" },
  ended:   { label: "Encerrado", color: "#6b6480" },
  offline: { label: "Offline", color: "#4d4860" },
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
  if (ms <= 0) return "reiniciando";
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  if (h < 24) return `Reinicia em ${h ? `${h} h ` : ""}${m} min`;
  const d = new Date(epochSec * 1000);
  return `Reinicia ${d.toLocaleDateString("pt-BR", { weekday: "short" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}
function usageRow(label, w, skew) {
  const pct = Math.max(0, Math.min(100, Math.round(w.used_percentage ?? 0)));
  const cls = pct >= 90 ? "hot" : pct >= 75 ? "warn" : "";
  return `<div class="row"><span class="lbl">${label}</span><span class="bar"><i class="${cls}" style="width:${pct}%"></i></span>
    <span class="pct">${pct}%</span><span class="rst">${esc(resetText(w.resets_at, skew))}</span></div>`;
}
export function renderUsage(el, u, skew = 0) {
  if (!el) return;
  if (!u || (!u.five_hour && !u.seven_day)) {
    el.innerHTML = '<div class="empty">Uso do plano aparece depois da primeira resposta do Claude Code</div>';
    return;
  }
  el.innerHTML = (u.five_hour ? usageRow("Sessão atual", u.five_hour, skew) : "") + (u.seven_day ? usageRow("Semanal", u.seven_day, skew) : "");
}
/** Liga a barra de uso no elemento #usage da página (atualiza a cada 30 s). */
export function mountUsage() {
  const el = document.getElementById("usage");
  if (!el) return;
  const tick = async () => {
    try { const r = await (await fetch("/api/usage")).json(); renderUsage(el, r.usage, Date.now() - r.now); } catch {}
  };
  tick();
  setInterval(tick, 30_000);
}
