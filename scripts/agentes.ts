// Mostra a equipe e onde fica o arquivo de cada agente. Com --aplicar, copia as suas edições para o Claude Code.
// Uso: bun run agentes            -> lista
//      bun run agentes:aplicar    -> aplica as edições de company/agents em ~/.claude/agents
import { relative, resolve } from "node:path";
import { AGENTS_DEST, agentDocs, empresa, fill, syncAgents, variables } from "../server/agentes";

const root = resolve(import.meta.dir, "..");
const e = empresa(), docs = agentDocs(), vars = variables(docs, e);

if (process.argv.includes("--aplicar")) {
  const ids = syncAgents();
  console.log(`${ids.length} agentes atualizados em ${AGENTS_DEST}.`);
  console.log("Abra uma sessão nova (claude --office) para o Claude Code ler as mudanças.");
} else {
  console.log(`${e.empresa} de ${e.usuario}  (configuração geral: company/empresa.json)\n`);
  for (const d of docs) {
    const nome = fill(d.meta.nome || d.id, vars), cargo = fill(d.meta.cargo || "", vars);
    console.log(`  ${nome.padEnd(14)} ${cargo.padEnd(26)} ${relative(root, d.file)}`);
  }
  console.log("\nEdite o arquivo do agente e rode: bun run agentes:aplicar  (o claude --office também aplica sozinho)");
}
