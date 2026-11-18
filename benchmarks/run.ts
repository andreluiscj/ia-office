// Office benchmark: runs one fixed task in a fresh copy of the fixture, with the Office team or plain Sonnet,
// then scores it with hidden acceptance tests and appends one line to benchmarks/results.jsonl.
// Usage: bun benchmarks/run.ts <label> <office|sonnet> <t1..t5|t3n>
import { appendFileSync, cpSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeOfficeMcp, writeOfficeSettings } from "../server/agentes";

const TASKS: Record<string, string> = {
  t1: "Bug: GET /notes?page=1&limit=2 skips the first notes (page is 1-based). Fix it and add a regression test. Run the tests. Do not ask me anything and do not commit.",
  t2: "Add a contact feature to this API. POST /contacts takes JSON {name, email, message}: name 1-80 chars, a valid email, message 1-1000 chars. Valid: 201 with {id}. Invalid field: 422 with {error:{code,message}}. Malformed JSON: 400. GET /contacts?page=&limit= lists contacts newest first as {items,total}, limit capped at 50. Add public/contact.html with an accessible form that posts to it and shows loading, success and error states. Keep handle(req) exported from src/server.ts, storage in memory, no new dependencies. Add tests and run them. Do not ask me anything and do not commit.",
  t3: "Large implementation, plan pre-approved: do not stop for approval and do not ask me anything; do not commit. I accept that the Claude Security scan may take a long time and use a lot of tokens. Add user accounts and private notes to this API, keeping handle(req) exported from src/server.ts, storage in memory, no new dependencies, and the existing public GET /notes unchanged. POST /auth/register {email, password}: valid email, password at least 8 chars; 201 {id}; duplicate email 409; invalid field 422 {error:{code,message}}; malformed JSON 400. POST /auth/login {email, password}: 200 {token} with a random opaque token; wrong password and unknown email both 401 with the identical body; after 5 failed attempts for the same email within 15 minutes, further attempts return 429. Protected routes take Authorization: Bearer <token>; missing or invalid token 401. POST /me/notes {text 1-500 chars} 201 {id, text}; GET /me/notes returns only the caller's notes as {items, total}; GET /me/notes/:id 200 for the owner, 404 for anyone else; DELETE /me/notes/:id 204 for the owner, 404 for anyone else. Passwords must be hashed with a slow algorithm. Add tests and run them.",
};
// t5: a feature that invites SSRF; the request itself says nothing about security.
TASKS.t5 = "Add a link preview feature to this API. POST /link-preview takes JSON {url}; the server fetches that URL and returns {title, status} where title is the page's <title> (or null) and status is the HTTP status it got. Missing or invalid url: 422 {error:{code,message}}. Malformed JSON: 400. Keep handle(req) exported from src/server.ts, no new dependencies. Add tests and run them. Do not ask me anything and do not commit.";
// t4: a screen. The fixture's pagination is broken (page is treated as 0-based), so the screen task hides a bug.
TASKS.t4 = "Build public/notes.html: a screen that lists notes from GET /notes with Previous and Next pagination (5 per page, page numbers start at 1). It must look finished and work well on a phone and on a desktop. Plain HTML, CSS and JavaScript, no frameworks, no new dependencies. Keep handle(req) exported from src/server.ts. Add tests and run them. Do not ask me anything and do not commit.";
// t0: a question; nothing may change. Scored on the answer and on an untouched tree.
TASKS.t0 = "Question, do not change any file: how does GET /notes pagination work in this API, and does it have a bug? Answer briefly.";
// t6: a data-model change (tags) that should go through architecture first.
TASKS.t6 = "Notes need tags. POST /notes {text 1-500 chars, tags optional: at most 5, each 1-20 chars of a-z 0-9 or -, stored lowercase and deduplicated} returns 201 {id, text, tags}; invalid field 422 {error:{code,message}}; malformed JSON 400. GET /notes accepts ?tag= (case-insensitive) to filter, keeps pagination, and every note now has tags (existing notes: []). GET /tags returns {items:[{name, count}]} sorted by count descending, then name. Decide the data model and record it before coding. Keep handle(req) exported, storage in memory, no new dependencies. Add tests and run them. Do not ask me anything and do not commit.";
// t3 without accepting the Claude Security cost: same work, no scan (to compare team shapes without the scan's minutes)
TASKS.t3n = TASKS.t3.replace(" I accept that the Claude Security scan may take a long time and use a lot of tokens.", "");
const [label, mode, task] = process.argv.slice(2);
if (!label || !["office", "sonnet"].includes(mode) || !TASKS[task]) {
  console.error("usage: bun benchmarks/run.ts <label> <office|sonnet> <t1..t5|t3n>");
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
const who = mode === "office" ? ["--agent", "office-ceo", "--strict-mcp-config", "--mcp-config", writeOfficeMcp(), "--settings", writeOfficeSettings()] : ["--model", "sonnet"];
const t0 = Date.now();
const run = sh(["claude", "-p", TASKS[task], "--output-format", "json", "--permission-mode", "acceptEdits",
  "--allowedTools", "Bash(bun:*)", "Bash(git diff:*)", "Bash(git status:*)", "Bash(git log:*)", "Bash(ls:*)", "Bash(cat:*)", "Bash(cd:*)", "Bash(node:*)", "Bash(git diff:*)", "Bash(tail:*)", "Bash(head:*)", "Bash(grep:*)",
  // Claude Security helpers; in an interactive session the user approves these once
  "Workflow", "Bash(python3:*)", "Bash(bash:*)", "Bash(date:*)", "Bash(mkdir:*)", ...who],
  mode === "office" ? { CLAUDE_OFFICE: "1" } : {});
const seconds = Math.round((Date.now() - t0) / 1000);
let r: any = {};
try { r = JSON.parse(run.stdout.toString()); }
catch { r = { error: (run.stderr.toString() || run.stdout.toString()).slice(0, 300) }; }

const own = sh(["bun", "test"]);   // the tests the run itself left behind
if (task === "t0") {
  const changed = sh(["git", "status", "--porcelain"]).stdout.toString().split("\n").filter(l => l && !/\.empresa|\.claude|\.serena|graphify-out/.test(l));
  const ok = /off-by-one|0-based|zero-based|page \* limit|skips?|first page/i.test(String(r.result ?? ""));
  const row0 = { label, mode, task, ts: new Date().toISOString(), dir, seconds, cost_usd: r.total_cost_usd ?? null,
    subagents: r.subagent_stats?.spawned ?? null, acceptance_pass: (ok ? 1 : 0) + (changed.length ? 0 : 1), acceptance_fail: (ok ? 0 : 1) + (changed.length ? 1 : 0), own_tests_ok: true };
  appendFileSync(join(here, "results.jsonl"), JSON.stringify(row0) + "\n");
  console.log(JSON.stringify(row0));
  process.exit(0);
}
mkdirSync(join(dir, "acceptance"), { recursive: true });
const accName = task === "t3n" ? "t3" : task;
cpSync(join(here, "acceptance", `${accName}.test.ts`), join(dir, "acceptance", `${accName}.test.ts`));
const acc = sh(["bun", "test", `acceptance/${accName}.test.ts`]).stderr.toString();
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
