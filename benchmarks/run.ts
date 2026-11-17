// Office benchmark: runs one fixed task in a fresh copy of the fixture, with the Office team or plain Sonnet,
// then scores it with hidden acceptance tests and appends one line to benchmarks/results.jsonl.
// Usage: bun benchmarks/run.ts <label> <office|sonnet> <t1|t2|t3>
import { appendFileSync, cpSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeOfficeMcp } from "../server/agentes";

const TASKS: Record<string, string> = {
  t1: "Bug: GET /notes?page=1&limit=2 skips the first notes (page is 1-based). Fix it and add a regression test. Run the tests. Do not ask me anything and do not commit.",
  t2: "Add a contact feature to this API. POST /contacts takes JSON {name, email, message}: name 1-80 chars, a valid email, message 1-1000 chars. Valid: 201 with {id}. Invalid field: 422 with {error:{code,message}}. Malformed JSON: 400. GET /contacts?page=&limit= lists contacts newest first as {items,total}, limit capped at 50. Add public/contact.html with an accessible form that posts to it and shows loading, success and error states. Keep handle(req) exported from src/server.ts, storage in memory, no new dependencies. Add tests and run them. Do not ask me anything and do not commit.",
  t3: "Large implementation, plan pre-approved: do not stop for approval and do not ask me anything; do not commit. I accept that the Claude Security scan may take a long time and use a lot of tokens. Add user accounts and private notes to this API, keeping handle(req) exported from src/server.ts, storage in memory, no new dependencies, and the existing public GET /notes unchanged. POST /auth/register {email, password}: valid email, password at least 8 chars; 201 {id}; duplicate email 409; invalid field 422 {error:{code,message}}; malformed JSON 400. POST /auth/login {email, password}: 200 {token} with a random opaque token; wrong password and unknown email both 401 with the identical body; after 5 failed attempts for the same email within 15 minutes, further attempts return 429. Protected routes take Authorization: Bearer <token>; missing or invalid token 401. POST /me/notes {text 1-500 chars} 201 {id, text}; GET /me/notes returns only the caller's notes as {items, total}; GET /me/notes/:id 200 for the owner, 404 for anyone else; DELETE /me/notes/:id 204 for the owner, 404 for anyone else. Passwords must be hashed with a slow algorithm. Add tests and run them.",
};
const [label, mode, task] = process.argv.slice(2);
if (!label || !["office", "sonnet"].includes(mode) || !TASKS[task]) {
  console.error("usage: bun benchmarks/run.ts <label> <office|sonnet> <t1|t2|t3>");
  process.exit(1);
}

const here = import.meta.dir;
const dir = mkdtempSync(join(tmpdir(), `office-bench-${label}-${task}-`));
cpSync(join(here, "fixture"), dir, { recursive: true });
const sh = (cmd: string[], env = {}) =>
  Bun.spawnSync(cmd, { cwd: dir, stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env }, timeout: 40 * 60_000 });
sh(["git", "init", "-q"]);
sh(["git", "add", "-A"]);
sh(["git", "-c", "user.name=bench", "-c", "user.email=bench@localhost", "commit", "-qm", "fixture"]);

// Same flags as `claude --office`: the Lead agent with only the connectors the team uses.
const who = mode === "office" ? ["--agent", "office-ceo", "--strict-mcp-config", "--mcp-config", writeOfficeMcp()] : ["--model", "sonnet"];
const t0 = Date.now();
const run = sh(["claude", "-p", TASKS[task], "--output-format", "json", "--permission-mode", "acceptEdits",
  "--allowedTools", "Bash(bun:*)", "Bash(git diff:*)", "Bash(git status:*)", "Bash(git log:*)", "Bash(ls:*)", "Bash(cat:*)",
  // Claude Security helpers; in an interactive session the user approves these once
  "Workflow", "Bash(python3:*)", "Bash(bash:*)", "Bash(date:*)", "Bash(mkdir:*)", ...who],
  mode === "office" ? { CLAUDE_OFFICE: "1" } : {});
const seconds = Math.round((Date.now() - t0) / 1000);
let r: any = {};
try { r = JSON.parse(run.stdout.toString()); }
catch { r = { error: (run.stderr.toString() || run.stdout.toString()).slice(0, 300) }; }

const own = sh(["bun", "test"]);   // the tests the run itself left behind
mkdirSync(join(dir, "acceptance"), { recursive: true });
cpSync(join(here, "acceptance", `${task}.test.ts`), join(dir, "acceptance", `${task}.test.ts`));
const acc = sh(["bun", "test", `acceptance/${task}.test.ts`]).stderr.toString();
const count = (re: RegExp) => Number(acc.match(re)?.[1] ?? 0);
const models = Object.values<any>(r.modelUsage ?? {});
const sum = (k: string) => models.reduce((a, m) => a + (m[k] ?? 0), 0);

const row = {
  label, mode, task, ts: new Date().toISOString(), dir, seconds,
  cost_usd: r.total_cost_usd ?? null, turns: r.num_turns ?? null,
  input: sum("inputTokens"), output: sum("outputTokens"),
  cache_read: sum("cacheReadInputTokens"), cache_write: sum("cacheCreationInputTokens"),
  lead_output: r.usage?.output_tokens ?? null, subagents: r.subagent_stats?.spawned ?? null,
  denials: (r.permission_denials ?? []).length,
  own_tests_ok: own.exitCode === 0, acceptance_pass: count(/(\d+) pass/), acceptance_fail: count(/(\d+) fail/),
  error: r.error ?? (r.is_error ? String(r.result).slice(0, 200) : undefined),
};
appendFileSync(join(here, "results.jsonl"), JSON.stringify(row) + "\n");
console.log(JSON.stringify(row));
