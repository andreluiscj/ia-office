// Modo demonstração: cria histórico falso e simula a equipe trabalhando ao vivo.
// Usa um banco separado (~/.escritorio-virtual/demo.db):
//   bun run demo:server   (num terminal)
//   bun run demo          (noutro)
const URL_EVENTS = process.env.ESCRITORIO_URL ?? "http://127.0.0.1:7777/events";
const ONLY_SEED = process.argv.includes("--seed-only");

const PROJECTS = [
  "C:/Projetos/loja-online",
  "C:/Projetos/site-institucional",
  "C:/Projetos/api-financeiro",
];
// O fluxo do Líder: cada fase roda em paralelo (no máximo 5 agentes ativos).
const PIPELINE = [
  ["empresa-arquiteto"],
  ["empresa-backend", "empresa-frontend"],
  ["empresa-qa", "empresa-seguranca"],
  ["empresa-revisor"],
];
const TASKS: Record<string, string[]> = {
  "empresa-arquiteto": ["Desenhar API de pagamentos", "Definir camadas do módulo"],
  "empresa-backend": ["Endpoints de cobrança", "Migração da tabela de faturas"],
  "empresa-frontend": ["Tela de checkout", "Componente de agenda"],
  "empresa-qa": ["Testes E2E do checkout", "Testes de integração da API"],
  "empresa-seguranca": ["Auditoria OWASP do pagamento", "Revisar segredos e LGPD"],
  "empresa-revisor": ["Revisar diff do módulo", "Revisar mudança de cobrança"],
};
const SKILLS: Record<string, string[]> = {
  "empresa-arquiteto": ["mcp-builder", "database-schema-designer"],
  "empresa-backend": ["prisma-cli", "claude-api"],
  "empresa-frontend": ["frontend-design", "vercel-react-best-practices", "web-design-guidelines"],
  "empresa-qa": ["playwright", "webapp-testing"],
  "empresa-seguranca": ["security-reviewer", "vulnerability-scanning"],
  "empresa-revisor": ["code-review-and-quality"],
};
const TOOLS: Record<string, string[]> = {
  default: ["Read", "Grep", "Glob", "Bash"],
  "empresa-arquiteto": ["Read", "WebFetch", "Write"],
  "empresa-backend": ["Read", "Edit", "Write", "Bash", "Grep"],
  "empresa-frontend": ["Read", "Edit", "Write", "Bash"],
  "empresa-qa": ["Write", "Bash", "Read", "Edit"],
};

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const rid = () => Math.random().toString(36).slice(2, 10);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let buffer: any[] = [];
async function send(ev: any, flush = true) {
  buffer.push(ev);
  if (!flush && buffer.length < 200) return;
  const body = JSON.stringify(buffer); buffer = [];
  try { await fetch(URL_EVENTS, { method: "POST", headers: { "content-type": "application/json" }, body }); }
  catch { console.error("Servidor fora do ar? Rode `bun run demo:server` antes."); process.exit(1); }
}

function workEvents(base: any, type: string, agent_id: string, n: number) {
  const out: any[] = [];
  for (let k = 0; k < n; k++) {
    const isSkill = Math.random() < 0.3;
    out.push({ ...base, agent_id, agent_type: type, hook_event_name: "PreToolUse", tool_use_id: rid(),
      tool_name: isSkill ? "Skill" : pick(TOOLS[type] ?? TOOLS.default), tool_input: isSkill ? { skill: pick(SKILLS[type]) } : {} });
  }
  return out;
}

async function seedHistory() {
  const now = Date.now();
  for (let d = 14; d >= 1; d--) {
    for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) {
      const base = { session_id: `demo-${rid()}`, cwd: pick(PROJECTS) };
      let t = now - d * 86_400_000 + Math.random() * 30_000_000;
      await send({ ...base, hook_event_name: "SessionStart", _ts: t }, false);
      await send({ ...base, hook_event_name: "UserPromptSubmit", prompt: "nova funcionalidade de cadastro", _ts: (t += 1000) }, false);
      for (const phase of PIPELINE) {
        if (Math.random() < 0.2 && phase.length > 1) continue;
        for (const type of phase) {
          const tu = rid(), agent_id = rid(), input = { subagent_type: type, description: pick(TASKS[type]) };
          await send({ ...base, hook_event_name: "PreToolUse", tool_name: "Agent", tool_use_id: tu, tool_input: input, _ts: (t += 500) }, false);
          for (const e of workEvents(base, type, agent_id, 3 + Math.floor(Math.random() * 6))) await send({ ...e, _ts: (t += 2000) }, false);
          await send({ ...base, agent_id, hook_event_name: "SubagentStop", _ts: (t += 500) }, false);
          await send({ ...base, hook_event_name: "PostToolUse", tool_name: "Agent", tool_use_id: tu, tool_input: input, _ts: (t += 200) }, false);
        }
      }
      await send({ ...base, hook_event_name: "Stop", _ts: (t += 1000) }, false);
      await send({ ...base, hook_event_name: "SessionEnd", reason: "exit", _ts: (t += 60_000) }, false);
    }
  }
  await send({ hook_event_name: "noop" });
  console.log("Histórico de 14 dias criado.");
}

/** Um projeto rodando o fluxo da empresa, fase por fase, em loop. */
async function runProject(cwd: string, delay: number) {
  await sleep(delay);
  for (;;) {
    const base = { session_id: `live-${rid()}`, cwd };
    await send({ ...base, hook_event_name: "SessionStart" });
    await send({ ...base, hook_event_name: "UserPromptSubmit", prompt: "criar módulo de pagamentos" });
    for (const phase of PIPELINE) {
      const subs = phase.map(type => ({ type, tu: rid(), agent_id: rid(), input: { subagent_type: type, description: pick(TASKS[type]) }, until: Date.now() + 9000 + Math.random() * 9000 }));
      for (const s of subs) await send({ ...base, hook_event_name: "PreToolUse", tool_name: "Agent", tool_use_id: s.tu, tool_input: s.input });
      while (subs.some(s => !("finished" in s))) {
        for (const s of subs as any[]) {
          if (s.finished) continue;
          if (Date.now() > s.until) {
            s.finished = true;
            await send({ ...base, agent_id: s.agent_id, hook_event_name: "SubagentStop" });
            await send({ ...base, hook_event_name: "PostToolUse", tool_name: "Agent", tool_use_id: s.tu, tool_input: s.input });
          } else if (Math.random() < 0.6) {
            for (const e of workEvents(base, s.type, s.agent_id, 1)) await send(e);
          }
        }
        await sleep(1200);
      }
    }
    // Diretor pede aprovação ao usuário e fica parado um pouco antes do próximo projeto.
    await send({ ...base, hook_event_name: "Notification", message: "Entrega pronta. Posso abrir o PR?" });
    await sleep(8000);
    await send({ ...base, hook_event_name: "Stop" });
    await send({ ...base, hook_event_name: "SessionEnd", reason: "exit" });
    await sleep(6000);
  }
}

await seedHistory();
if (!ONLY_SEED) {
  console.log("Simulando a equipe ao vivo. Ctrl+C para parar.");
  await Promise.all([runProject(PROJECTS[0], 0), runProject(PROJECTS[1], 15000)]);
}
