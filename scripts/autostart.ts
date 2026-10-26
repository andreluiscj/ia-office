// Liga o servidor do Office junto com o Windows, escondido (sem janela de terminal).
// Uso:
//   bun scripts/autostart.ts install    -> liga ao iniciar o Windows e já inicia agora
//   bun scripts/autostart.ts uninstall  -> deixa de iniciar com o Windows e para o servidor
//   bun scripts/autostart.ts start | stop | status
// Funciona com um atalho .vbs na pasta Inicializar do Windows; o log fica em ~/.escritorio-virtual/servidor.log.
import { existsSync, mkdirSync, openSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const mode = process.argv[2] ?? "status";
const PORT = Number(process.env.PORT ?? 7777);
const BASE = `http://127.0.0.1:${PORT}`;
const root = resolve(import.meta.dir, "..");
const entry = join(root, "server", "index.ts");
const bun = process.execPath;
const logDir = join(homedir(), ".escritorio-virtual");
const log = join(logDir, "servidor.log");
const startupDir = join(process.env.APPDATA ?? "", "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
const vbs = join(startupDir, "Office (escritorio virtual).vbs");

async function running(): Promise<boolean> {
  try { return (await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(800) })).ok; } catch { return false; }
}

function writeVbs() {
  mkdirSync(logDir, { recursive: true });
  // cmd /c ""bun" "index.ts" >> "log" 2>&1"  rodando com janela escondida (0) e sem esperar (False)
  const cmd = `cmd /c ""${bun}" "${entry}" >> "${log}" 2>&1"`;
  const text = [
    "' Inicia o Office (escritório virtual) escondido. Criado por: bun run office:autostart",
    'Set sh = CreateObject("WScript.Shell")',
    `sh.CurrentDirectory = "${root}"`,
    `sh.Run "${cmd.replace(/"/g, '""')}", 0, False`,
    "",
  ].join("\r\n");
  writeFileSync(vbs, text);
}

async function start() {
  if (await running()) { console.log(`O Office já está rodando em ${BASE}`); return; }
  if (process.platform !== "win32") {
    // macOS / Linux: processo em segundo plano, log em ~/.escritorio-virtual/servidor.log
    mkdirSync(logDir, { recursive: true });
    const out = openSync(log, "a");
    Bun.spawn([bun, entry], { cwd: root, stdout: out, stderr: out, stdin: "ignore" }).unref();
  } else if (existsSync(vbs)) Bun.spawn(["wscript.exe", vbs], { cwd: root });
  else {
    mkdirSync(logDir, { recursive: true });
    const tmp = join(logDir, "iniciar-office.vbs");
    const cmd = `cmd /c ""${bun}" "${entry}" >> "${log}" 2>&1"`;
    writeFileSync(tmp, `Set sh = CreateObject("WScript.Shell")\r\nsh.CurrentDirectory = "${root}"\r\nsh.Run "${cmd.replace(/"/g, '""')}", 0, False\r\n`);
    Bun.spawn(["wscript.exe", tmp], { cwd: root });
  }
  for (let i = 0; i < 20; i++) {
    await Bun.sleep(500);
    if (await running()) { console.log(`Office rodando em segundo plano: ${BASE}`); return; }
  }
  console.log(`Não consegui confirmar que o Office subiu. Veja o log: ${log}`);
}

async function stop() {
  if (!(await running())) { console.log("O Office não está rodando."); return; }
  try { await fetch(`${BASE}/api/parar`, { method: "POST", headers: { "x-office": "parar" } }); } catch {}
  await Bun.sleep(800);
  console.log((await running()) ? "Não consegui parar o Office." : "Office parado.");
}

if (process.platform !== "win32" && (mode === "install" || mode === "uninstall")) {
  console.log("Iniciar junto com o sistema só existe no Windows por enquanto.");
  console.log("No macOS/Linux use: bun run office:ligar (ou só abra claude --office, que liga o Office sozinho).");
  process.exit(0);
}

if (mode === "install") {
  mkdirSync(startupDir, { recursive: true });
  writeVbs();
  console.log(`Office vai iniciar sozinho com o Windows (atalho em ${vbs}).`);
  await start();
} else if (mode === "uninstall") {
  rmSync(vbs, { force: true });
  console.log("O Office não inicia mais com o Windows.");
  await stop();
} else if (mode === "start") await start();
else if (mode === "stop") await stop();
else {
  if (process.platform === "win32") console.log(`Inicia com o Windows: ${existsSync(vbs) ? "sim" : "não"}`);
  console.log(`Rodando agora: ${(await running()) ? `sim (${BASE})` : "não"}`);
  console.log(`Log: ${log}`);
}
