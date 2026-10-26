// Diagnóstico: confere hooks, servidor e se os eventos estão chegando.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ok = (m: string) => console.log(`  [ok]    ${m}`);
const bad = (m: string) => console.log(`  [falha] ${m}`);
const info = (m: string) => console.log(`          ${m}`);

console.log("\nEscritório Virtual: diagnóstico\n");
const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
const settingsPath = join(claudeDir, "settings.json");

// 1. Hooks instalados?
let commands: string[] = [];
try {
  const s = JSON.parse(readFileSync(settingsPath, "utf8"));
  for (const [ev, groups] of Object.entries<any>(s.hooks ?? {}))
    for (const g of groups ?? []) for (const h of g.hooks ?? [])
      if (String(h.command ?? "").includes("escritorio-virtual-send")) commands.push(`${ev}: ${h.command}`);
} catch (e) { bad(`não consegui ler ${settingsPath}: ${e}`); }
if (commands.length) {
  ok(`${commands.length} hooks no ${settingsPath}`);
  const cmd = commands[0].split(": ").slice(1).join(": ");
  for (const path of cmd.match(/"([^"]+)"/g)?.map(x => x.slice(1, -1)) ?? []) {
    existsSync(path) ? ok(`existe: ${path}`) : bad(`não encontrado: ${path} (rode bun run hooks:install de novo)`);
  }
} else bad("hooks não instalados. Rode: bun run hooks:install");

// Hooks em settings de projeto/local podem estar desligados com disableAllHooks
for (const f of [settingsPath, join(claudeDir, "settings.local.json")]) {
  try { if (JSON.parse(readFileSync(f, "utf8")).disableAllHooks) bad(`${f} tem "disableAllHooks": true, isso desliga todos os hooks`); } catch {}
}

// 2. Servidor no ar?
const port = Number(process.env.PORT ?? 7777);
try {
  const h: any = await (await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) })).json();
  ok(`servidor no ar em http://localhost:${port} (banco: ${h.db})`);
  info(`${h.sessions} sessões e ${h.events} eventos no banco`);
  if (h.lastHook) ok(`último evento dos hooks: ${new Date(h.lastHook.ts).toLocaleString("pt-BR")} (${h.lastHook.event})`);
  else bad("o servidor ainda não recebeu nenhum evento dos hooks");
} catch {
  bad(`servidor fora do ar. Deixe um terminal com: bun run start`);
}

// 3. O hook chegou a rodar?
const log = join(homedir(), ".escritorio-virtual", "ultimo-hook.txt");
if (existsSync(log)) {
  const lines = readFileSync(log, "utf8").trim().split("\n");
  ok(`o Claude Code já chamou o hook ${lines.length} vez(es). Últimas:`);
  for (const l of lines.slice(-5)) info(l);
} else {
  bad("o Claude Code ainda não chamou o hook nenhuma vez.");
  info("Feche e abra de novo o Claude Code (terminal, VS Code ou app) e mande qualquer mensagem.");
  info("Dica: dentro do Claude Code, o comando /hooks mostra se os hooks foram carregados.");
}
console.log("");
