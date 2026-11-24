// Hook PreToolUse: o Líder (sessão principal com o agente office-ceo) não edita arquivos.
// Só vale para a sessão do Líder. Os especialistas (subagentes e teammates) chegam com agent_id e passam livres.
// Antes isso era feito com disallowedTools no Líder, mas os teammates herdavam o bloqueio e ficavam sem Write/Edit.
// O cofre do Obsidian (OFFICE_VAULT, definido pelo lançador) é onde o Líder grava a fila de tarefas.
const cofre = (process.env.OFFICE_VAULT ?? "").replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
const dentroDoCofre = (alvo: string) => !!cofre && alvo.toLowerCase().startsWith(cofre + "/");
const BLOCKED = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);
try {
  const p = JSON.parse(await Bun.stdin.text());
  // escritas liberadas: a memória do Líder e os arquivos de coordenação (plano, padrões, lições)
  const alvo = String(p.tool_input?.file_path ?? p.tool_input?.notebook_path ?? "").replace(/\\/g, "/");
  const liberado = !alvo.includes("..") && (/\/\.claude\/agent-memory\/office-ceo\//.test(alvo)
    || /\/\.empresa\/(plano|padroes|licoes)\.md$/.test(alvo)
    || /\/CLAUDE-SECURITY-[^/]+\//.test(alvo)
    || dentroDoCofre(alvo));   // o Claude Security roda na sessão do Líder e grava o próprio relatório
  if (BLOCKED.has(p.tool_name) && !p.agent_id && p.agent_type === "office-ceo" && !liberado) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "The Lead does not edit files. Hand this change to the responsible specialist (Joaquim, Igor, Pedro, Leonardo or Lucas). The Lead writes only .empresa/plano.md, padroes.md, licoes.md, its memory, Claude Security report folders and the Obsidian vault.",
      },
    }));
  }
} catch {}
process.exit(0);
