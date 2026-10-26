// Instala (ou remove) a equipe do Office no Claude Code do usuário:
//  - 7 agentes em ~/.claude/agents/empresa-*.md (Líder + 6 especialistas), gerados a partir de company/agents/*.md
//  - arquiva agentes e a skill /empresa da versão anterior (cópia em ~/.claude/office-arquivo-<data>/)
//  - remove a regra antiga do ~/.claude/CLAUDE.md (o Office agora só entra com `claude --office`)
//  - ~/.claude/settings.json: liga as equipes de agentes e bloqueia git commit/push/merge/rebase/tag
//    (só você faz commits, pelo seu próprio terminal)
// Uso: bun scripts/install-company.ts install | uninstall
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { empresa, syncAgents } from "../server/agentes";

const mode = process.argv[2] ?? "install";
const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
const src = join(import.meta.dir, "..", "company");
const agentsDir = join(claudeDir, "agents");
const claudeMd = join(claudeDir, "CLAUDE.md");
const settingsPath = join(claudeDir, "settings.json");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

// Versão anterior da equipe (11 funcionários + skill /empresa), substituída pelo Líder.
const OLD_AGENTS = ["empresa-tech-lead", "empresa-ux", "empresa-dados", "empresa-devops", "empresa-docs"];
const OLD_SKILL = join(claudeDir, "skills", "empresa");

const GIT_DENY = ["Bash(git commit:*)", "Bash(git push:*)", "Bash(git merge:*)", "Bash(git rebase:*)", "Bash(git tag:*)"];
const AUTO_ALLOW = [
  "Read", "Glob", "Grep", "WebSearch", "WebFetch", "Skill",
  "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git show:*)", "Bash(git branch:*)",
  "Bash(ls:*)", "Bash(pwd)", "Bash(cat:*)", "Bash(head:*)", "Bash(tail:*)", "Bash(wc:*)", "Bash(grep:*)",
  "Bash(npm test:*)", "Bash(npm run test:*)", "Bash(npm run lint:*)", "Bash(npm run build:*)", "Bash(npm run typecheck:*)", "Bash(npm audit:*)",
  "Bash(npx tsc:*)", "Bash(npx playwright test:*)", "Bash(npx vitest:*)", "Bash(npx eslint:*)",
  "Bash(bun test:*)", "Bash(bun run test:*)", "Bash(bun run lint:*)", "Bash(bun run build:*)",
  "Bash(php artisan test:*)", "Bash(composer audit:*)", "Bash(pytest:*)", "Bash(python -m pytest:*)", "Bash(pip-audit:*)",
];
const TEAMS_ENV = "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS";

const START = "<!-- claude-cia:inicio -->", END = "<!-- claude-cia:fim -->";

const agentFiles = readdirSync(join(src, "agents")).filter(f => f.endsWith(".md"));

function stripRule(text: string) {
  const i = text.indexOf(START), j = text.indexOf(END);
  if (i < 0 || j < 0) return text;
  return (text.slice(0, i).trimEnd() + "\n" + text.slice(j + END.length).trimStart()).trim() + "\n";
}

function readSettings(): any {
  if (!existsSync(settingsPath)) return {};
  const raw = readFileSync(settingsPath, "utf8");
  try { return raw.trim() ? JSON.parse(raw) : {}; }
  catch { console.error(`Não consegui ler ${settingsPath} (JSON inválido). Nada foi alterado nas configurações.`); process.exit(1); }
}

function writeSettings(s: any) {
  if (existsSync(settingsPath)) copyFileSync(settingsPath, `${settingsPath}.bak-office-${stamp}`);
  writeFileSync(settingsPath, JSON.stringify(s, null, 2) + "\n");
}

if (mode === "install") {
  // 1. Arquiva a versão anterior (move, não apaga).
  const archive = join(claudeDir, `office-arquivo-${stamp}`);
  let archived = 0;
  for (const name of OLD_AGENTS) {
    const f = join(agentsDir, `${name}.md`);
    if (existsSync(f)) { mkdirSync(join(archive, "agents"), { recursive: true }); renameSync(f, join(archive, "agents", `${name}.md`)); archived++; }
  }
  if (existsSync(OLD_SKILL)) {
    mkdirSync(join(archive, "skills"), { recursive: true });
    cpSync(OLD_SKILL, join(archive, "skills", "empresa"), { recursive: true });
    rmSync(OLD_SKILL, { recursive: true, force: true });
    archived++;
  }
  if (archived) console.log(`Versão anterior arquivada em ${archive}`);

  // 2. Agentes novos.
  const ids = syncAgents();
  console.log(`${ids.length} agentes instalados em ${agentsDir}: ${ids.join(", ")}`);
  console.log(`Os agentes vão te chamar de "${empresa().usuario}". Para mudar, edite "usuario" em company/empresa.json e rode: bun run agentes:aplicar`);

  // 3. CLAUDE.md global: tira a regra do Office. Ela fazia toda sessão agir como a empresa;
  //    agora o Líder só entra com `claude --office` e já traz as próprias instruções.
  if (existsSync(claudeMd)) {
    const text = readFileSync(claudeMd, "utf8");
    if (text.includes(START)) {
      copyFileSync(claudeMd, `${claudeMd}.bak-office-${stamp}`);
      writeFileSync(claudeMd, stripRule(text));
      console.log(`Regra do Office removida de ${claudeMd} (backup criado).`);
    }
  }

  // 4. Configurações: equipes de agentes + bloqueio de git.
  const s = readSettings();
  s.env ??= {};
  s.env[TEAMS_ENV] = "1";
  s.teammateMode ??= "in-process";
  // O Líder NÃO é mais o agente padrão: "claude" abre o Claude normal e "claude --office" abre o Líder.
  if (s.agent === "empresa-lider") delete s.agent;
  s.permissions ??= {};
  // Menos interrupções: edições de arquivo e comandos de leitura/teste passam sem confirmação.
  // git commit/push continuam bloqueados; outros comandos ainda pedem confirmação. Para manter as confirmações: --com-confirmacoes
  if (!process.argv.includes("--com-confirmacoes")) {
    s.permissions.defaultMode = "acceptEdits";
    s.permissions.allow ??= [];
    for (const rule of AUTO_ALLOW) if (!s.permissions.allow.includes(rule)) s.permissions.allow.push(rule);
  }
  s.permissions.deny ??= [];
  for (const rule of GIT_DENY) if (!s.permissions.deny.includes(rule)) s.permissions.deny.push(rule);
  writeSettings(s);
  console.log(`Equipes de agentes ligadas, Líder só com claude --office, edições e comandos de teste sem confirmação e git commit/push/merge/rebase/tag bloqueados para o Claude em ${settingsPath} (backup criado).`);

  console.log("\nPronto. Abra um terminal novo na pasta do projeto:");
  console.log("  claude --office   -> abre o Líder e a equipe (aparece no Office)");
  console.log("  claude            -> abre só o Claude, sem o Office");
} else {
  for (const f of agentFiles) rmSync(join(agentsDir, f), { force: true });
  if (existsSync(claudeMd)) writeFileSync(claudeMd, stripRule(readFileSync(claudeMd, "utf8")));
  const s = readSettings();
  if (s.env) { delete s.env[TEAMS_ENV]; if (!Object.keys(s.env).length) delete s.env; }
  if (s.teammateMode === "in-process") delete s.teammateMode;
  if (s.agent === "empresa-lider") delete s.agent;
  if (s.permissions?.defaultMode === "acceptEdits") delete s.permissions.defaultMode;
  if (s.permissions?.allow) {
    s.permissions.allow = s.permissions.allow.filter((r: string) => !AUTO_ALLOW.includes(r));
    if (!s.permissions.allow.length) delete s.permissions.allow;
  }
  if (s.permissions?.deny) {
    s.permissions.deny = s.permissions.deny.filter((r: string) => !GIT_DENY.includes(r));
    if (!s.permissions.deny.length) delete s.permissions.deny;
    if (!Object.keys(s.permissions).length) delete s.permissions;
  }
  writeSettings(s);
  console.log("Equipe do Office removida (agentes, regra do CLAUDE.md, equipes de agentes e bloqueio de git).");
}
