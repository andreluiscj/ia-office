// Hook PreToolUse: o Líder (sessão principal com o agente office-ceo) não edita arquivos.
// Só vale para a sessão do Líder. Os especialistas (subagentes e teammates) chegam com agent_id e passam livres.
// Antes isso era feito com disallowedTools no Líder, mas os teammates herdavam o bloqueio e ficavam sem Write/Edit.
const BLOCKED = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);
try {
  const p = JSON.parse(await Bun.stdin.text());
  // única escrita liberada: a memória do próprio Líder (memory: project)
  const alvo = String(p.tool_input?.file_path ?? p.tool_input?.notebook_path ?? "").replace(/\\/g, "/");
  const memoria = /\/\.claude\/agent-memory\/office-ceo\//.test(alvo) && !alvo.includes("..");
  if (BLOCKED.has(p.tool_name) && !p.agent_id && p.agent_type === "office-ceo" && !memoria) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "The Lead does not edit files. Hand this change to the responsible specialist (Joaquim, Igor, Leonardo or Luis Felipe).",
      },
    }));
  }
} catch {}
process.exit(0);
