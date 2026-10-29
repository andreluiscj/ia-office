// Instala (ou remove) os hooks do Escritório Virtual no ~/.claude/settings.json.
// Uso: bun scripts/install-hooks.ts install | uninstall
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const MARK = "escritorio-virtual-send";
const EVENTS = [
  "SessionStart", "SessionEnd", "UserPromptSubmit", "PreToolUse", "PostToolUse",
  "Notification", "Stop", "SubagentStart", "SubagentStop", "TeammateIdle",
];
const TOOL_EVENTS = new Set(["PreToolUse", "PostToolUse"]);

const mode = process.argv[2] ?? "install";
const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
const settingsPath = join(claudeDir, "settings.json");
const hooksDir = join(claudeDir, "hooks");
const target = join(hooksDir, `${MARK}.ts`);

mkdirSync(claudeDir, { recursive: true });
let settings: any = {};
if (existsSync(settingsPath)) {
  const raw = readFileSync(settingsPath, "utf8");
  try { settings = raw.trim() ? JSON.parse(raw) : {}; }
  catch { console.error(`Não consegui ler ${settingsPath} (JSON inválido). Nada foi alterado.`); process.exit(1); }
  const backup = `${settingsPath}.bak-escritorio-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  copyFileSync(settingsPath, backup);
  console.log(`Backup salvo em ${backup}`);
}
settings.hooks ??= {};

// Remove entradas antigas nossas (deixa as outras intactas).
for (const ev of Object.keys(settings.hooks)) {
  const groups = Array.isArray(settings.hooks[ev]) ? settings.hooks[ev] : [];
  const kept = groups
    .map((g: any) => ({ ...g, hooks: (g.hooks ?? []).filter((h: any) => !String(h.command ?? "").includes(MARK)) }))
    .filter((g: any) => g.hooks.length > 0);
  if (kept.length) settings.hooks[ev] = kept; else delete settings.hooks[ev];
}

// Barra de status (limites de uso e modelo). Guarda a barra que já existia para continuar aparecendo.
const SL_MARK = "escritorio-virtual-statusline";
const slTarget = join(hooksDir, `${SL_MARK}.ts`);
const dataDir = join(homedir(), ".escritorio-virtual");
const prevSl = join(dataDir, "statusline-anterior.json");
const oursSl = (sl: any) => String(sl?.command ?? "").includes(SL_MARK);

if (mode === "install") {
  mkdirSync(hooksDir, { recursive: true });
  mkdirSync(dataDir, { recursive: true });
  const statusUrl = (process.env.ESCRITORIO_URL ?? `http://127.0.0.1:${process.env.PORT ?? 7777}/events`).replace(/\/events$/, "/statusline");
  writeFileSync(slTarget, readFileSync(join(import.meta.dir, "..", "hooks", "statusline.ts"), "utf8").replace("http://127.0.0.1:7777/statusline", statusUrl));
  if (settings.statusLine && !oursSl(settings.statusLine)) {
    writeFileSync(prevSl, JSON.stringify(settings.statusLine, null, 2));
    console.log(`Sua barra de status atual foi guardada em ${prevSl} e continua aparecendo.`);
  }
  const bunPath = process.execPath.replace(/\\/g, "/");
  settings.statusLine = { type: "command", command: `"${bunPath}" "${slTarget.replace(/\\/g, "/")}"`, refreshInterval: 60 };
  console.log("Barra de status instalada (manda limites de uso e modelo para o escritório).");
  // Copia o hook para ~/.claude/hooks (caminho sem acentos) já com o endereço do servidor.
  const url = process.env.ESCRITORIO_URL ?? `http://127.0.0.1:${process.env.PORT ?? 7777}/events`;
  const source = readFileSync(join(import.meta.dir, "..", "hooks", "send.ts"), "utf8")
    .replace("http://127.0.0.1:7777/events", url);
  writeFileSync(target, source);
  const bun = process.execPath.replace(/\\/g, "/");
  const command = `"${bun}" "${target.replace(/\\/g, "/")}"`;
  for (const ev of EVENTS) {
    const group: any = { hooks: [{ type: "command", command, timeout: 5 }] };
    if (TOOL_EVENTS.has(ev)) group.matcher = "*";
    (settings.hooks[ev] ??= []).push(group);
  }
  // Trava do Líder: impede só a sessão do Líder de editar arquivos (os especialistas continuam livres).
  const guardTarget = join(hooksDir, `${MARK}-guarda-lider.ts`);
  writeFileSync(guardTarget, readFileSync(join(import.meta.dir, "..", "hooks", "guard-lider.ts"), "utf8"));
  settings.hooks.PreToolUse.push({ matcher: "Edit|Write|NotebookEdit|MultiEdit", hooks: [{ type: "command", command: `"${bun}" "${guardTarget.replace(/\\/g, "/")}"`, timeout: 5 }] });
  // Regra nº 1 do Office: agente da equipe não encerra tarefa sem ter chamado uma skill.
  const skillTarget = join(hooksDir, `${MARK}-exigir-skill.ts`);
  writeFileSync(skillTarget, readFileSync(join(import.meta.dir, "..", "hooks", "exigir-skill.ts"), "utf8"));
  const skillCmd = `"${bun}" "${skillTarget.replace(/\\/g, "/")}"`;
  for (const ev of ["Stop", "SubagentStop"]) (settings.hooks[ev] ??= []).push({ hooks: [{ type: "command", command: skillCmd, timeout: 10 }] });
  console.log("Trava de skills instalada (agente sem skill não encerra a tarefa).");
  console.log(`Hooks instalados para: ${EVENTS.join(", ")}`);
  console.log(`Comando: ${command}`);
} else {
  if (!Object.keys(settings.hooks).length) delete settings.hooks;
  if (oursSl(settings.statusLine)) {
    if (existsSync(prevSl)) settings.statusLine = JSON.parse(readFileSync(prevSl, "utf8")); else delete settings.statusLine;
  }
  for (const f of [target, slTarget, join(hooksDir, `${MARK}-guarda-lider.ts`), join(hooksDir, `${MARK}-exigir-skill.ts`)]) rmSync(f, { force: true });
  console.log("Hooks do Escritório Virtual removidos.");
}

writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
console.log(`Arquivo atualizado: ${settingsPath}`);
console.log("Sessões do Claude Code abertas agora passam a enviar eventos depois de reiniciadas.");
