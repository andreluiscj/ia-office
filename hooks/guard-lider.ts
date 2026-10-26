// Hook PreToolUse: o Líder (sessão principal com o agente empresa-lider) não edita arquivos.
// Só vale para a sessão do Líder. Os especialistas (subagentes e teammates) chegam com agent_id e passam livres.
// Antes isso era feito com disallowedTools no Líder, mas os teammates herdavam o bloqueio e ficavam sem Write/Edit.
const BLOCKED = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);
try {
  const p = JSON.parse(await Bun.stdin.text());
  if (BLOCKED.has(p.tool_name) && !p.agent_id && p.agent_type === "empresa-lider") {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "O Líder não edita arquivos. Passe esta alteração para o especialista responsável (Joaquim, Igor, Leonardo ou Luis Felipe).",
      },
    }));
  }
} catch {}
process.exit(0);
