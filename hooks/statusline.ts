// Barra de status do Claude Code: manda os limites de uso (sessão de 5 h e semana) e o modelo
// para o Escritório Virtual e mostra uma linha curta. Se você já tinha uma barra de status,
// ela continua sendo mostrada (o instalador guarda o comando antigo).
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const url = process.env.ESCRITORIO_STATUS_URL ?? "http://127.0.0.1:7777/statusline";
const body = await Bun.stdin.text();
let data: any = {};
try { data = JSON.parse(body); } catch {}

try { await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body, signal: AbortSignal.timeout(500) }); } catch {}

const prevFile = join(homedir(), ".escritorio-virtual", "statusline-anterior.json");
let printed = false;
if (existsSync(prevFile)) {
  try {
    const prev = JSON.parse(readFileSync(prevFile, "utf8"));
    if (prev?.command) {
      const cmd = process.platform === "win32" ? ["cmd", "/c", prev.command] : ["sh", "-c", prev.command];
      const p = Bun.spawnSync(cmd, { stdin: Buffer.from(body), stdout: "pipe", stderr: "ignore", windowsHide: true });
      const out = p.stdout.toString();
      if (out.trim()) { process.stdout.write(out); printed = true; }
    }
  } catch {}
}
if (!printed) {
  const parts: string[] = [];
  if (data?.agent?.name) parts.push(data.agent.name);
  if (data?.model?.display_name) parts.push(data.model.display_name);
  const f = data?.rate_limits?.five_hour?.used_percentage, w = data?.rate_limits?.seven_day?.used_percentage;
  if (f != null) parts.push(`sessão ${Math.round(f)}%`);
  if (w != null) parts.push(`semana ${Math.round(w)}%`);
  process.stdout.write(parts.join(" · "));
}
process.exit(0);
