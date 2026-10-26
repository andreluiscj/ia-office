// Instala as skills recomendadas para a equipe do Office (globais, para o Claude Code).
// Usa o CLI "skills" (skills.sh) via npx. Uso: bun scripts/install-skills.ts [--opcionais]
const BASE: [string, string, string][] = [
  // [repositório, skill, quem usa]
  ["https://github.com/anthropics/skills", "frontend-design", "Leonardo"],
  ["https://github.com/anthropics/skills", "webapp-testing", "Luis Felipe, Leonardo"],
  ["https://github.com/anthropics/skills", "skill-creator", "Joaquim, Líder"],
  ["https://github.com/anthropics/skills", "mcp-builder", "Joaquim"],
  ["https://github.com/vercel-labs/agent-skills", "vercel-react-best-practices", "Leonardo, Joaquim"],
  ["https://github.com/vercel-labs/agent-skills", "web-design-guidelines", "Leonardo, Joaquim"],
  ["https://github.com/secondsky/claude-skills", "playwright", "Luis Felipe"],
  ["https://github.com/jeffallan/claude-skills", "security-reviewer", "Pedro"],
  ["https://github.com/secondsky/claude-skills", "vulnerability-scanning", "Pedro"],
  ["https://github.com/borghei/claude-skills", "skill-security-auditor", "Pedro"],
];
// Só quando o tipo de projeto pedir (passe --opcionais).
const OPCIONAIS: [string, string, string][] = [
  ["https://github.com/anthropics/skills", "claude-api", "Igor"],
  ["https://github.com/prisma/skills", "prisma-cli", "Igor"],
  ["https://github.com/jeffallan/claude-skills", "playwright-expert", "Luis Felipe"],
  ["https://github.com/borghei/claude-skills", "database-schema-designer", "Joaquim, Igor"],
];

const list = process.argv.includes("--opcionais") ? [...BASE, ...OPCIONAIS] : BASE;
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const falhas: string[] = [];
for (const [repo, skill, quem] of list) {
  console.log(`\n> ${skill} (${quem})`);
  const p = Bun.spawnSync([npx, "-y", "skills", "add", repo, "--skill", skill, "-g", "-a", "claude-code", "-y"], { stdout: "inherit", stderr: "inherit" });
  if (p.exitCode !== 0) falhas.push(skill);
}
console.log(falhas.length ? `\nNão instaladas: ${falhas.join(", ")}. Copie a mensagem de erro e mande para o Claude.` : "\nTodas as skills foram instaladas.");
