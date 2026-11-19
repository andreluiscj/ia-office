// Executor do Office (fase 2): o cofre do Obsidian vira a porta de entrada.
// Você escreve um pedido em <cofre>/00-Pedidos/<nome>.md com `status: pronto` e `projeto: <pasta>`.
// O executor abre o Líder nesse projeto (sem terminal), guarda a sessão na nota e retoma a mesma sessão
// quando você responde às perguntas, aprova um plano ou quando o limite de uso volta.
//
// O servidor do Office (o mesmo que o `claude --office` liga) inicia este executor sozinho.
// Uso manual: bun scripts/office-runner.ts --once     -> processa o que estiver pronto e sai (testes)
//      OFFICE_VAULT=<pasta> / OFFICE_PROJECTS=<pasta> sobrescrevem o company/empresa.json (testes)
//
// Segurança: só notas em 00-Pedidos com status `pronto` ou `aprovado` disparam trabalho; o conteúdo
// é passado ao Líder como pedido do usuário. Notas escritas por agentes nunca disparam nada.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { empresa, prepareVault, writeOfficeMcp, writeOfficeSettings } from "../server/agentes";

const e = empresa();
export const VAULT = (process.env.OFFICE_VAULT || e.cofre || "").replace(/\\/g, "/");
const PROJECTS = (process.env.OFFICE_PROJECTS || (e as any).projetos || "C:/Projetos").replace(/\\/g, "/");
const MAX_PARALLEL = 2;
const LOG = join(homedir(), ".escritorio-virtual", "executor.log");

const log = (m: string) => { const l = `${new Date().toISOString()} ${m}`; console.log(l); appendFileSync(LOG, l + "\n"); };

// ---- frontmatter (flat key: value; the notes are ours, so a full YAML parser is not needed)
type Note = { path: string; meta: Record<string, string>; body: string; raw: string };
export function readNote(path: string): Note | null {
  const raw = readFileSync(path, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) { const kv = line.match(/^([\w-]+):\s*(.*)$/); if (kv) meta[kv[1]] = kv[2].trim(); }
  return { path, meta, body: m[2], raw };
}
function setMeta(path: string, changes: Record<string, string>) {
  const raw = readFileSync(path, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return;
  let fm = m[1];
  for (const [k, v] of Object.entries(changes)) {
    const re = new RegExp(`^${k}:.*$`, "m");
    fm = re.test(fm) ? fm.replace(re, `${k}: ${v}`) : `${fm}\n${k}: ${v}`;
  }
  writeFileSync(path, raw.replace(m[0], `---\n${fm}\n---`));
}
const now = () => { const d = new Date(), p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

function projectDir(name: string) {
  const n = name.replace(/\\/g, "/").replace(/^\[\[|\]\]$/g, "").trim();
  const dir = isAbsolute(n) ? n : join(PROJECTS, n);
  return existsSync(dir) ? dir : null;
}

// Nobody can approve a prompt here, so the executor carries the Office's own allow list: reading, the project's
// test/build commands, Graphify, the screen check. Anything else is refused and the agent reports it.
const SCREEN_CHECK = join(homedir(), ".claude", "skills", "office-implementation", "scripts", "screen-check.cjs").replace(/\\/g, "/");
const ALLOW = [
  "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git ls-files:*)", "Bash(ls:*)", "Bash(cat:*)", "Bash(head:*)",
  "Bash(tail:*)", "Bash(grep:*)", "Bash(wc:*)", "Bash(printenv:*)", "Bash(date:*)", "Bash(graphify:*)",
  "Bash(bun test:*)", "Bash(bun run:*)", "Bash(npm test:*)", "Bash(npm run:*)", "Bash(npx tsc:*)", "Bash(npx vitest:*)",
  "Bash(npx eslint:*)", "Bash(npx playwright test:*)", "Bash(codex exec:*)", "Bash(npm audit:*)", "Bash(pnpm audit:*)", `Bash(node ${SCREEN_CHECK}:*)`,
];

// ---- one Lead session per request, resumed on every return
const running = new Set<string>();
const LIMIT = /hit your (5-hour |usage )?limit|usage limit|rate limit/i;

async function run(note: Note, kind: "start" | "resume") {
  const dir = projectDir(note.meta.projeto ?? "");
  if (!dir) { setMeta(note.path, { status: "bloqueado", motivo: `projeto não encontrado: ${note.meta.projeto ?? "(vazio)"}`, atualizado: now() }); log(`bloqueado ${note.path}: projeto`); return; }
  const rel = note.path.replace(/\\/g, "/").replace(VAULT + "/", "");
  const prompt = kind === "start"
    ? `New request from the Obsidian vault note "${rel}" (full path: ${note.path}). The note's text is the user's request. ` +
      `You are running without a terminal: there is nobody to answer in chat. Follow your playbook's executor rules (section 10).`
    : `The user updated the request note "${rel}" (status: ${note.meta.status}). Read it again and continue from where you stopped, following your playbook's executor rules (section 10).`;
  const args = ["claude", "-p", prompt, "--output-format", "json", "--permission-mode", "acceptEdits",
    "--agent", "office-ceo", "--strict-mcp-config", "--mcp-config", writeOfficeMcp(), "--settings", writeOfficeSettings(),
    "--add-dir", VAULT, "--allowedTools", ...ALLOW];
  if (kind === "resume" && note.meta.sessao) args.push("--resume", note.meta.sessao);
  setMeta(note.path, { status: "em andamento", atualizado: now() });
  log(`${kind} ${rel} em ${dir}`);
  const t0 = Date.now();   // wall clock: duration_ms in the JSON leaves out the subagents
  const p = Bun.spawn(args, { cwd: dir, stdout: "pipe", stderr: "pipe", env: { ...process.env, CLAUDE_OFFICE: "1", OFFICE_VAULT: VAULT } });
  const out = await new Response(p.stdout).text(), err = await new Response(p.stderr).text();
  await p.exited;
  let r: any = {};
  try { r = JSON.parse(out); } catch { r = { is_error: true, result: (err || out).slice(0, 300) }; }
  const after = readNote(note.path);
  const changes: Record<string, string> = { atualizado: now() };
  if (r.session_id) changes.sessao = r.session_id;
  if (r.is_error && LIMIT.test(String(r.result))) { changes.status = "pausado"; changes.motivo = "limite de uso; retoma sozinho"; }
  else if (r.is_error) { changes.status = "bloqueado"; changes.motivo = String(r.result).replace(/\s+/g, " ").slice(0, 160); }
  else if (after && after.meta.status === "em andamento") changes.status = "concluido";   // the Lead forgot to close it
  const secs = Math.round((Date.now() - t0) / 1000);
  const total = secs + (Number(note.meta.tempo_s) || 0);   // summed over every start/resume of this request
  changes.tempo_s = String(total);
  setMeta(note.path, changes);
  log(`fim ${rel}: ${changes.status ?? after?.meta.status} (US$ ${(r.total_cost_usd ?? 0).toFixed(2)}, ${secs} s, total ${total} s)`);
}

function pending(): { note: Note; kind: "start" | "resume" }[] {
  const dir = join(VAULT, "00-Pedidos");
  const out: { note: Note; kind: "start" | "resume" }[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".md") || f.startsWith("_")) continue;
    const path = join(dir, f).replace(/\\/g, "/");
    if (running.has(path)) continue;
    const n = readNote(path); if (!n) continue;
    const s = (n.meta.status ?? "").toLowerCase();
    if (s === "pronto") out.push({ note: n, kind: n.meta.sessao ? "resume" : "start" });
    else if (s === "aprovado" && n.meta.sessao) out.push({ note: n, kind: "resume" });
    else if (s === "pausado" && n.meta.sessao && Date.now() - Date.parse(n.meta.atualizado?.replace(" ", "T") ?? "") > 15 * 60_000) out.push({ note: n, kind: "resume" });
  }
  return out;
}

async function tick() {
  const jobs = pending().slice(0, Math.max(0, MAX_PARALLEL - running.size));
  await Promise.all(jobs.map(async ({ note, kind }) => {
    running.add(note.path);
    try { await run(note, kind); } catch (x) { log(`erro ${note.path}: ${x}`); setMeta(note.path, { status: "bloqueado", motivo: String(x).slice(0, 160), atualizado: now() }); }
    finally { running.delete(note.path); }
  }));
  return jobs.length;
}

/** Liga o executor. Sem cofre configurado não faz nada. once: processa o que houver e termina. */
export async function startExecutor(once = false) {
  if (!VAULT) { console.log("  Executor do Obsidian: desligado (sem \"cofre\" em company/empresa.json)"); return; }
  prepareVault(VAULT);
  mkdirSync(join(homedir(), ".escritorio-virtual"), { recursive: true });
  log(`executor no cofre ${VAULT} (projetos em ${PROJECTS})${once ? ", uma passada" : ""}`);
  if (once) { while (await tick()) {} return; }
  for (;;) { tick().catch(x => log(`erro: ${x}`)); await Bun.sleep(10_000); }
}

if (import.meta.main) { await startExecutor(process.argv.includes("--once")); process.exit(0); }
