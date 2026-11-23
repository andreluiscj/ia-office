// Codex usage limits for the top bar, read from Codex CLI's own session logs (~/.codex/sessions/**.jsonl).
// Codex writes `rate_limits` (primary = 5 h window, secondary = weekly) on paid plans; on the free plan those are null,
// so a `usage_limit_exceeded` error with its "try again at <date>" is the only signal we get.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type Window = { minutes: number | null; used_percentage: number; resets_at: number | null };
export type CodexUsage = { windows: Window[]; blocked_until: number | null; ts: number } | null;

const ROOT = join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "sessions");

function newestFiles(n: number): string[] {
  const out: { p: string; m: number }[] = [];
  const walk = (d: string) => {
    let names: string[] = [];
    try { names = readdirSync(d); } catch { return; }
    for (const f of names) {
      const p = join(d, f);
      if (f.endsWith(".jsonl")) { try { out.push({ p, m: statSync(p).mtimeMs }); } catch {} }
      else if (!f.includes(".")) walk(p);
    }
  };
  walk(ROOT);
  return out.sort((a, b) => b.m - a.m).slice(0, n).map(x => x.p);
}

/** "Nov 20th, 2026 2:17 PM" -> epoch seconds (local time, as Codex prints it) */
export function parseRetry(msg: string): number | null {
  const m = msg.match(/try again at ([A-Z][a-z]{2,8} \d{1,2})(?:st|nd|rd|th)?,? (\d{4}),? (\d{1,2}:\d{2} ?[AP]M)/);
  if (!m) return null;
  const t = Date.parse(`${m[1]}, ${m[2]} ${m[3]}`);
  return Number.isNaN(t) ? null : Math.round(t / 1000);
}

function toWindow(w: any): Window | null {
  if (!w || typeof w.used_percent !== "number") return null;
  const resets = typeof w.resets_at === "number" ? w.resets_at
    : typeof w.resets_in_seconds === "number" ? Math.round(Date.now() / 1000) + w.resets_in_seconds : null;
  return { minutes: typeof w.window_minutes === "number" ? w.window_minutes : null, used_percentage: w.used_percent, resets_at: resets };
}

let cache: { at: number; v: CodexUsage } | null = null;
/** Cached for 30 s: the Office page asks on every live update and the session logs can be large. */
export function codexUsage(): CodexUsage {
  if (cache && Date.now() - cache.at < 30_000) return cache.v;
  const v = readCodexUsage();
  cache = { at: Date.now(), v };
  return v;
}

function readCodexUsage(): CodexUsage {
  let limits: any = null, limitsTs = 0, blocked: number | null = null, blockedTs = 0;
  for (const f of newestFiles(5)) {
    let text = "";
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    for (const line of text.split("\n")) {
      if (!line.includes("rate_limits") && !line.includes("usage_limit_exceeded")) continue;
      let o: any;
      try { o = JSON.parse(line); } catch { continue; }
      const ts = Date.parse(o.timestamp ?? "") || 0;
      const rl = o.payload?.rate_limits ?? o.payload?.info?.rate_limits ?? o.rate_limits;
      if (rl && (rl.primary || rl.secondary) && ts >= limitsTs) { limits = rl; limitsTs = ts; }
      const err = o.payload?.error;
      if (err?.codex_error_info === "usage_limit_exceeded" && ts >= blockedTs) { blocked = parseRetry(String(err.message ?? "")); blockedTs = ts; }
    }
  }
  if (!limits && !blocked) return null;
  // Window length depends on the plan (paid: 300 min and 10080 min; free: 43200 min), so the page labels them by minutes.
  const windows = [limits?.primary, limits?.secondary].map(toWindow).filter((w): w is Window => !!w).sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0));
  // A newer successful limits reading means the block is over.
  const stillBlocked = blocked && blocked * 1000 > Date.now() && blockedTs >= limitsTs ? blocked : null;
  return { windows, blocked_until: stillBlocked, ts: Math.max(limitsTs, blockedTs) };
}

if (import.meta.main) {
  console.assert(parseRetry("or try again at Nov 20th, 2026 2:17 PM.") === Math.round(Date.parse("Nov 20, 2026 2:17 PM") / 1000), "parseRetry");
  console.assert(parseRetry("no date here") === null, "parseRetry null");
  console.assert(toWindow({ used_percent: 40, window_minutes: 10080, resets_at: 5 })?.minutes === 10080, "toWindow");
  console.log(JSON.stringify(codexUsage()));
}
