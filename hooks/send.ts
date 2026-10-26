// Hook do Claude Code: lê o JSON do evento (stdin) e envia para o Escritório Virtual.
// Nunca bloqueia nem quebra o Claude Code: se o servidor estiver desligado, sai em silêncio.
// Deixa um registro curto em ~/.escritorio-virtual/ultimo-hook.txt para diagnóstico (bun run check).
import { appendFileSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Só as sessões abertas com `claude --office` aparecem no escritório.
if (process.env.CLAUDE_OFFICE !== "1") { try { await Bun.stdin.text(); } catch {} process.exit(0); }

const url = process.env.ESCRITORIO_URL ?? "http://127.0.0.1:7777/events";
let line = "";
try {
  const body = await Bun.stdin.text();
  let ev = "?";
  try { ev = JSON.parse(body).hook_event_name ?? "?"; } catch {}
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: AbortSignal.timeout(800),
    });
    line = `${new Date().toISOString()} ${ev} -> ${res.status}`;
  } catch (err) {
    line = `${new Date().toISOString()} ${ev} -> servidor fora do ar (${String(err).slice(0, 80)})`;
  }
} catch (err) {
  line = `${new Date().toISOString()} erro lendo o evento: ${String(err).slice(0, 80)}`;
}
try {
  const dir = join(homedir(), ".escritorio-virtual");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "ultimo-hook.txt");
  let big = false;
  try { big = statSync(file).size > 20_000; } catch {}
  if (big) writeFileSync(file, line + "\n"); else appendFileSync(file, line + "\n");
} catch {}
process.exit(0);
