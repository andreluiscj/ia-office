// Chamado pelo `claude --office` antes de abrir o Claude Code:
//  1. atualiza os agentes em ~/.claude/agents com o que está em company/agents (suas edições valem na hora);
//  2. liga o servidor do Office se estiver parado.
import { syncAgents } from "../server/agentes";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { mkdirSync, openSync } from "node:fs";

const PORT = Number(process.env.PORT ?? 7777);
const BASE = `http://127.0.0.1:${PORT}`;
const root = resolve(import.meta.dir, "..");

async function running() {
  try { return (await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(800) })).ok; } catch { return false; }
}

try { syncAgents(); } catch (e) { console.error("Office: não consegui atualizar os agentes:", (e as Error).message); }

if (await running()) {
  console.log(`Office: ${BASE}`);
} else if (process.platform === "win32") {
  // mesmo jeito do office:ligar (escondido, sem janela)
  Bun.spawnSync([process.execPath, join(root, "scripts", "autostart.ts"), "start"], { stdout: "inherit", stderr: "inherit" });
} else {
  const dir = join(homedir(), ".escritorio-virtual"); mkdirSync(dir, { recursive: true });
  const log = openSync(join(dir, "servidor.log"), "a");
  const child = Bun.spawn([process.execPath, join(root, "server", "index.ts")], { cwd: root, stdout: log, stderr: log, stdin: "ignore" });
  child.unref();
  for (let i = 0; i < 20 && !(await running()); i++) await Bun.sleep(250);
  console.log((await running()) ? `Office ligado: ${BASE}` : "Não consegui ligar o Office (veja ~/.escritorio-virtual/servidor.log).");
}
