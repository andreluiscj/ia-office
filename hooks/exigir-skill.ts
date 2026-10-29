// Hook Stop / SubagentStop: regra nº 1 do Office, "toda tarefa usa skill".
// Se um agente da equipe (empresa-*) tentar encerrar sem ter chamado a ferramenta Skill,
// o encerramento é barrado uma vez com a instrução do que falta. Na segunda tentativa
// (stop_hook_active) ele passa, para nunca prender o agente em loop; o Líder e o Revisor
// cobram o resto pelo relatório (SKILLS INVOCADAS).
import { existsSync, readFileSync } from "node:fs";

function skillsChamadas(path: string, soDepoisDoUltimoPedido: boolean): string[] {
  if (!path || !existsSync(path)) return [];
  const linhas = readFileSync(path, "utf8").split("\n");
  let usadas: string[] = [];
  for (const l of linhas) {
    if (!l.trim()) continue;
    let e: any;
    try { e = JSON.parse(l); } catch { continue; }
    const content = e?.message?.content;
    // Pedido novo do usuário (texto, não resultado de ferramenta): recomeça a contagem.
    if (soDepoisDoUltimoPedido && e.type === "user" && !e.isMeta
        && (typeof content === "string" || (Array.isArray(content) && content.some((c: any) => c?.type === "text")))) {
      usadas = [];
      continue;
    }
    if (e.type !== "assistant" || !Array.isArray(content)) continue;
    for (const c of content) {
      if (c?.type === "tool_use" && c.name === "Skill") usadas.push(String(c.input?.skill ?? c.input?.name ?? "?"));
    }
  }
  return usadas;
}

try {
  const p = JSON.parse(await Bun.stdin.text());
  if (p.stop_hook_active) process.exit(0);
  const tipo = String(p.agent_type ?? "");
  if (!tipo.startsWith("empresa-")) process.exit(0);

  let usadas: string[];
  if (p.hook_event_name === "SubagentStop") usadas = skillsChamadas(p.agent_transcript_path, false);
  else if (!p.agent_id && tipo === "empresa-lider") usadas = skillsChamadas(p.transcript_path, true);
  else process.exit(0);

  if (usadas.length) process.exit(0);
  console.log(JSON.stringify({
    decision: "block",
    reason: `Regra nº 1 do Office: toda tarefa usa skill. Você não chamou nenhuma skill nesta tarefa. Chame agora, com a ferramenta Skill, `
      + `a skill da sua função (lista no seu arquivo) e "verification-before-completion", aplique o que elas pedirem `
      + `e só então entregue, com a linha SKILLS INVOCADAS no relatório. ECONOMIZAR TOKEN. UTILIZAR AS SKILLS.`,
  }));
} catch {}
process.exit(0);
