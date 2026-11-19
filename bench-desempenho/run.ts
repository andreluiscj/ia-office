// Teste de desempenho: Office (Líder + equipe + skills) contra Claude Code Sonnet comum.
// Uso (PowerShell, dentro desta pasta):   bun run.ts [--runs 2] [--tasks bug,feature] [--only plain|office]
// Cada rodada copia o fixture para uma pasta temporária, roda `claude -p` sem interação, mede
// tempo, custo, tokens, subagentes e chamadas reais da ferramenta Skill, e confere o resultado
// com um teste de aceite independente. Gera resultados/relatorio.md.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const here = import.meta.dir;
const arg = (n: string, d = "") => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const RUNS = Number(arg("runs", "2"));
const TASKS = arg("tasks", "bug,feature").split(",");
const ONLY = arg("only", "");
const CLAUDE = process.env.CLAUDE_BIN || "claude";
const TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MIN || "25") * 60_000;
const OUT = join(here, "resultados"); mkdirSync(OUT, { recursive: true });

const PROMPTS: Record<string, { fixture: string; accept: string; label: string; prompt: string }> = {
  bug: {
    label: "A. Bug + testes", fixture: "bug", accept: "acceptance-bug.mjs",
    prompt: "Bug: discount(amount, pct) em src/price.js aceita pct acima de 100 ou abaixo de 0 e devolve valores errados (até preço negativo). Corrija: pct fora de 0 a 100 (ou que não seja número) deve lançar RangeError. Adicione testes para os casos novos. Critério de pronto: npm test passa com os casos novos. Não faça commit.",
  },
  feature: {
    label: "B. Ticket de feature (API + tela + testes + docs)", fixture: "feature", accept: "acceptance-feature.mjs",
    prompt: `TICKET #214 — Tags, prazo, filtros e paginação nas tarefas (app em Node.js 20, sem dependências; veja README.md).

Entregue como entregaria numa empresa de software: código, testes, tela e documentação prontos para revisão. Não faça commit.

1. Tarefa ganha "tags" (lista opcional com até 5 tags; cada tag é um texto de 1 a 20 caracteres depois de normalizada). NORMALIZE em vez de rejeitar: tire os espaços das pontas, converta para minúsculas e descarte repetidas; só devolva 400 se, depois de normalizar, a tag ficar vazia ou passar de 20 caracteres, se houver mais de 5 tags distintas, ou se algo não for texto e "due" (data opcional AAAA-MM-DD, tem que ser uma data real). Sem elas: tags = [] e due = null. Valor inválido => 400. O título passa a ter no máximo 100 caracteres.
2. PATCH /api/tasks/:id também aceita "tags" e "due" (due: null limpa a data), com as mesmas validações.
3. GET /api/tasks passa a responder { items, page, limit, total } (mudança de formato: atualize testes e tela). Parâmetros: page (padrão 1), limit (padrão 10, máximo 50), tag (sem diferenciar maiúsculas), done (true|false) e overdue=true (pendentes com due anterior a hoje). Parâmetro inválido => 400. Ordem crescente de id; "total" é o total já filtrado; filtros combinam entre si.
4. Tela: filtro por tag, filtro por situação (todas/pendentes/feitas), paginação (anterior/próxima), mostrar tags e data de cada tarefa e destacar as atrasadas. Texto vindo da API nunca pode ser inserido como HTML (nada de innerHTML).
5. Testes automatizados para o comportamento novo (npm test deve passar) e README com a API atualizada (tags, due, overdue, page, limit).
Não adicione dependências.`,
  },
};

type Variant = "plain" | "office";
const ARGS: Record<Variant, string[]> = {
  // Claude Code comum: Sonnet, sem skills/slash commands e sem delegar para os agentes empresa-*.
  plain: ["--model", "sonnet", "--disable-slash-commands", "--disallowedTools", "Agent", "Task"],
  // Office: Líder como sessão principal (ele delega para a equipe e as skills valem).
  office: ["--model", "sonnet", "--agent", "empresa-lider"],
};
const COMMON = ["--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits",
  "--allowedTools", "Bash", "Edit", "Write", "Read", "Glob", "Grep", "Skill", "Agent", "Task", "TodoWrite"];

type Row = { task: string; variant: Variant; run: number; ok: boolean; score: number; total: number; changed: number; failed: string[]; sec: number; cost: number; tokens: number;
  turns: number; subagents: number; skillCalls: number; skills: string[]; models: string[]; error?: string; dir: string };

function analyze(lines: string[]) {
  let result: any = null; const skills: string[] = []; let subagents = 0; const models = new Set<string>();
  for (const l of lines) {
    let e: any; try { e = JSON.parse(l); } catch { continue; }
    if (e.type === "result") result = e;
    if (e.type === "assistant") {
      if (e.message?.model) models.add(e.message.model);
      for (const c of e.message?.content ?? []) if (c?.type === "tool_use") {
        if (c.name === "Skill") skills.push(String(c.input?.skill ?? c.input?.name ?? "?"));
        if (c.name === "Agent" || c.name === "Task") subagents++;
      }
    }
  }
  const mu = result?.modelUsage ?? {};
  let tokens = 0; for (const m of Object.values<any>(mu)) tokens += (m.inputTokens ?? 0) + (m.outputTokens ?? 0) + (m.cacheReadInputTokens ?? 0) + (m.cacheCreationInputTokens ?? 0);
  if (!tokens && result?.usage) { const u = result.usage; tokens = (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0); }
  return { result, skills, subagents, models: [...new Set([...Object.keys(mu), ...models])], tokens };
}

function snapshot(dir: string, base = dir, out: Record<string, string> = {}) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    if (f.name === "node_modules" || f.name === ".git" || f.name === ".claude") continue;
    const p = join(dir, f.name);
    if (f.isDirectory()) snapshot(p, base, out); else out[p.slice(base.length)] = readFileSync(p, "utf8");
  }
  return out;
}

async function one(task: string, variant: Variant, run: number): Promise<Row> {
  const t = PROMPTS[task];
  const dir = mkdtempSync(join(tmpdir(), `bench-${task}-${variant}-`));
  cpSync(join(here, "fixtures", t.fixture), dir, { recursive: true });
  const before = snapshot(dir);
  const raw = join(OUT, `${task}-${variant}-${run}.jsonl`);
  const t0 = Date.now();
  const p = Bun.spawn([CLAUDE, "-p", t.prompt, ...ARGS[variant], ...COMMON], { cwd: dir, stdout: "pipe", stderr: "pipe" });
  const timer = setTimeout(() => p.kill(), TIMEOUT_MS);
  const out = await new Response(p.stdout).text(); const err = await new Response(p.stderr).text();
  await p.exited; clearTimeout(timer);
  writeFileSync(raw, out);
  const after = snapshot(dir);
  const changed = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]).length;
  const a = analyze(out.split("\n").filter(Boolean));
  let ok = false; let failed: string[] = []; let score = 0, total = 0;
  try {
    const r = Bun.spawnSync(["node", join(here, t.accept), dir]);
    const j = JSON.parse(r.stdout.toString().trim().split("\n").pop() || "{}");
    ok = !!j.passed; score = j.score ?? 0; total = j.total ?? 0; failed = (j.checks ?? []).filter((c: any) => !c.ok).map((c: any) => c.name);
  } catch (e) { failed = ["verificação não rodou"]; }
  return { task, variant, run, ok, score, total, changed, failed, sec: Math.round((Date.now() - t0) / 1000), cost: a.result?.total_cost_usd ?? 0, tokens: a.tokens,
    turns: a.result?.num_turns ?? 0, subagents: a.subagents, skillCalls: a.skills.length, skills: a.skills, models: a.models,
    error: a.result ? (a.result.is_error ? String(a.result.result).slice(0, 200) : undefined) : (err.slice(0, 300) || "sem resultado"), dir };
}

const rows: Row[] = [];
const variants: Variant[] = ONLY ? [ONLY as Variant] : ["plain", "office"];
for (let r = 1; r <= RUNS; r++) for (const task of TASKS) for (const v of variants) {   // intercalado: nenhum lado sempre primeiro
  process.stdout.write(`> rodada ${r}/${RUNS} · ${PROMPTS[task].label} · ${v} ... `);
  const row = await one(task, v, r); rows.push(row);
  console.log(`${row.ok ? "OK" : "FALHOU"} · ${row.sec}s · $${row.cost.toFixed(2)} · ${Math.round(row.tokens / 1000)}k tokens · ${row.skillCalls} skills · ${row.subagents} subagentes`);
  writeFileSync(join(OUT, "resultados.json"), JSON.stringify(rows, null, 2));
}

// ---- relatório ----
const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const pct = (a: number, b: number) => b ? `${a >= b ? "+" : ""}${Math.round((a / b - 1) * 100)}%` : "–";
const g = (task: string, v: Variant) => rows.filter(r => r.task === task && r.variant === v);
const cell = (xs: Row[]) => ({ n: xs.length, ok: xs.filter(x => x.ok).length, score: avg(xs.map(x => x.total ? x.score / x.total : 0)), files: avg(xs.map(x => x.changed)), sec: avg(xs.map(x => x.sec)), cost: avg(xs.map(x => x.cost)), tok: avg(xs.map(x => x.tokens)),
  sub: avg(xs.map(x => x.subagents)), sk: avg(xs.map(x => x.skillCalls)) });
let md = `# Desempenho: Office × Claude Code Sonnet comum\n\n_Rodado em ${new Date().toISOString().slice(0, 10)} · ${RUNS} rodada(s) por tarefa e lado · modelo: Sonnet nos dois lados._\n\n`;
md += `| Tarefa | Lado | Aceite total | Checagens passadas | Tempo | Custo | Tokens | Arquivos alterados | Subagentes | Chamadas de skill |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
const tot: Record<Variant, Row[]> = { plain: [], office: [] };
for (const task of TASKS) for (const v of variants) {
  const xs = g(task, v); tot[v].push(...xs); const c = cell(xs);
  md += `| ${PROMPTS[task].label} | ${v === "plain" ? "Claude Code Sonnet" : "Office"} | ${c.ok}/${c.n} | ${Math.round(c.score * 100)}% | ${Math.round(c.sec)}s | $${c.cost.toFixed(2)} | ${Math.round(c.tok / 1000)}k | ${c.files.toFixed(1)} | ${c.sub.toFixed(1)} | ${c.sk.toFixed(1)} |\n`;
}
if (variants.length === 2) {
  const p = cell(tot.plain), o = cell(tot.office);
  md += `\n## Resumo\n\n| Métrica | Claude Code Sonnet | Office | Diferença |\n|---|---:|---:|---:|\n`;
  md += `| Entregas 100% aceitas | ${p.ok}/${p.n} | ${o.ok}/${o.n} | – |\n| Qualidade (checagens passadas) | ${Math.round(p.score * 100)}% | ${Math.round(o.score * 100)}% | – |\n| Tempo médio | ${Math.round(p.sec)}s | ${Math.round(o.sec)}s | ${pct(o.sec, p.sec)} |\n| Custo médio | $${p.cost.toFixed(2)} | $${o.cost.toFixed(2)} | ${pct(o.cost, p.cost)} |\n| Tokens médios | ${Math.round(p.tok / 1000)}k | ${Math.round(o.tok / 1000)}k | ${pct(o.tok, p.tok)} |\n| Skills chamadas por tarefa | ${p.sk.toFixed(1)} | ${o.sk.toFixed(1)} | – |\n`;
}
md += `\n## Rodadas\n\n| Tarefa | Lado | # | Aceite | Checagens | Tempo | Custo | Skills chamadas | Modelos | Checagens que falharam |\n|---|---|---:|---|---:|---:|---:|---|---|---|\n`;
for (const r of rows) md += `| ${PROMPTS[r.task].label} | ${r.variant} | ${r.run} | ${r.ok ? "sim" : "não"} | ${r.score}/${r.total} | ${r.sec}s | $${r.cost.toFixed(2)} | ${r.skills.join(", ") || "nenhuma"} | ${r.models.join(", ")} | ${r.failed.join("; ") || (r.error ?? "")} |\n`;
md += `\n## Como ler\n\n- Aceite = teste independente que nenhum dos lados vê (\`acceptance-*.mjs\`).\n- Custo = preço de tabela (\`total_cost_usd\`); em plano Pro/Max aparece como uso do plano.\n- Tokens = entrada + cache + saída, somados de todos os modelos e subagentes.\n- Skills = chamadas reais da ferramenta Skill, contadas no registro da sessão (skills pré-carregadas não entram nessa conta).\n- Poucas rodadas: use como indício, não como prova. Rode mais com \`--runs 5\`.\n- Os arquivos gerados ficam nas pastas temporárias de cada rodada (coluna dir em \`resultados.json\`); o registro bruto está em \`resultados/*.jsonl\`.\n`;
writeFileSync(join(OUT, "relatorio.md"), md);
console.log(`\nRelatório: ${join(OUT, "relatorio.md")}`);
