// Cria o comando `claude --office` (ou remove).
//   claude --office [outras opções]  -> liga o servidor do Office (se estiver parado) e abre o Claude Code com o Líder
//   claude [outras opções]           -> abre o Claude Code normal, sem o Office
// O Claude Code não aceita opções novas, então isso é uma função com o mesmo nome no perfil do terminal:
//   PowerShell (Windows PowerShell e PowerShell 7): profile.ps1 do usuário
//   Git Bash / bash / zsh: ~/.bashrc e ~/.zshrc (só se o arquivo já existir, ou em Linux/macOS)
// Uso: bun scripts/install-cli.ts install | uninstall
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const mode = process.argv[2] ?? "install";
const root = resolve(import.meta.dir, "..");
const bun = process.execPath;
const START = "# >>> Office (claude --office) >>>", END = "# <<< Office (claude --office) <<<";
const win = process.platform === "win32";

function strip(text: string) {
  const i = text.indexOf(START), j = text.indexOf(END);
  if (i < 0 || j < 0) return text;
  return (text.slice(0, i).trimEnd() + "\n" + text.slice(j + END.length).trimStart()).replace(/^\n+/, "");
}

function update(file: string, block: string | null, bom = false) {
  const had = existsSync(file);
  let text = had ? readFileSync(file, "utf8").replace(/^﻿/, "") : "";
  if (had) copyFileSync(file, `${file}.bak-office`);
  text = strip(text);
  if (block) text = (text.trim() ? text.trimEnd() + "\n\n" : "") + block + "\n";
  if (!block && !had) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, (bom ? "﻿" : "") + text);
  return true;
}

const PS = `${START}
# Criado pelo Office (bun run setup). Para remover: bun run office:comando:remover
function claude {
  $real = Get-Command claude -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $real) { $real = Get-Command claude -CommandType ExternalScript -ErrorAction SilentlyContinue | Select-Object -First 1 }
  if (-not $real) { Write-Error "Claude Code não encontrado no PATH."; return }
  if ($args -contains '--office') {
    $rest = @($args | Where-Object { $_ -ne '--office' })
    & "${bun}" "${join(root, "scripts", "office-mode.ts")}"
    $antes = $env:CLAUDE_OFFICE
    $env:CLAUDE_OFFICE = '1'
    try { & $real.Source --agent empresa-lider @rest } finally { $env:CLAUDE_OFFICE = $antes }
  } else {
    & $real.Source @args
  }
}
${END}`;

const posix = (p: string) => p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
const SH = `${START}
# Criado pelo Office (bun run setup). Para remover: bun run office:comando:remover
claude() {
  local a office=0 rest=()
  for a in "$@"; do if [ "$a" = "--office" ]; then office=1; else rest+=("$a"); fi; done
  if [ "$office" = 1 ]; then
    "${posix(bun)}" "${posix(join(root, "scripts", "office-mode.ts"))}"
    CLAUDE_OFFICE=1 command claude --agent empresa-lider "\${rest[@]}"
  else
    command claude "$@"
  fi
}
${END}`;

/** Caminho do profile.ps1 (todos os hosts) de cada PowerShell instalado. */
function psProfiles(): string[] {
  const out = new Set<string>();
  for (const exe of ["powershell.exe", "pwsh.exe"]) {
    try {
      const r = Bun.spawnSync([exe, "-NoProfile", "-NonInteractive", "-Command", "$PROFILE.CurrentUserAllHosts"]);
      const p = r.stdout.toString().trim();
      if (r.exitCode === 0 && p) out.add(p);
    } catch {}
  }
  // padrão, caso nenhum responda
  if (!out.size) out.add(join(homedir(), "Documents", "WindowsPowerShell", "profile.ps1"));
  return [...out];
}

function policyWarning() {
  try {
    const r = Bun.spawnSync(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", "Get-ExecutionPolicy"]);
    const pol = r.stdout.toString().trim();
    if (/Restricted|AllSigned|Undefined/i.test(pol)) {
      console.log(`\nAtenção: o PowerShell está com a política "${pol}" e não vai carregar o perfil.`);
      console.log("Para o comando funcionar, rode uma vez no PowerShell:");
      console.log("  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned");
    }
  } catch {}
}

const changed: string[] = [];
if (win) for (const f of psProfiles()) if (update(f, mode === "install" ? PS : null, true)) changed.push(f);
for (const name of [".bashrc", ".zshrc"]) {
  const f = join(homedir(), name);
  const want = mode === "install" && (existsSync(f) || (!win && (name === ".bashrc" || (name === ".zshrc" && process.platform === "darwin"))));
  if (want || existsSync(f)) if (update(f, want ? SH : null)) changed.push(f);
}

if (mode === "install") {
  console.log(`Comando "claude --office" instalado em:\n  ${changed.join("\n  ")}`);
  console.log("Abra um terminal novo para valer. \"claude\" sozinho abre o Claude normal.");
  if (win) policyWarning();
} else {
  console.log(changed.length ? `Comando "claude --office" removido de:\n  ${changed.join("\n  ")}` : "Nada para remover.");
}
