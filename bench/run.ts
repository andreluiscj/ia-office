// IA Office benchmark: the same tasks run twice, headless:
//   "plain"  = Claude Code as it comes: no agents, no skills, no slash commands
//   "office" = the Office team: the Lead (claude --agent empresa-lider) with the current agents
//
//   bun bench/run.ts [--runs 3] [--only plain|office] [--scenarios A,B,C] [--budget 4]
//
// Each run copies bench/fixture to a temp folder, runs claude and saves the JSON result in
// bench/results/raw. Runs already saved are skipped, so you can resume after an interruption.
// If the usage limit is hit, the run is NOT saved and the benchmark stops (no corrupted data).
import { cpSync, mkdirSync, writeFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { syncAgents } from "../server/agentes";
import { SCENARIOS } from "./scenarios";

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const RUNS = Number(arg("runs", "3"));
const ONLY = arg("only", "");
const BUDGET = arg("budget", "4");
const PICK = arg("scenarios", Object.keys(SCENARIOS).join(",")).split(",");
const OUT = join(import.meta.dir, "results", "raw");
mkdirSync(OUT, { recursive: true });

// The plain run must not be able to call the Office agents that live in ~/.claude/agents.
const AGENT_IDS = (() => { try { return readdirSync(join(homedir(), ".claude", "agents")).filter(f => f.startsWith("empresa-")).map(f => f.slice(0, -3)); } catch { return []; } })();
const ARGS: Record<string, string[]> = {
  plain: ["--disable-slash-commands", "--disallowedTools", ["Skill", ...AGENT_IDS.map(a => `Agent(${a})`)].join(",")],
  office: ["--agent", "empresa-lider"],
};

class LimitHit extends Error {}

function runOne(variant: string, id: string, i: number) {
  const file = join(OUT, `${variant}-${id}-${i}.json`);
  if (existsSync(file)) { console.log(`${variant} ${id} #${i}: already saved, skipping`); return; }
  const sc = SCENARIOS[id];
  const dir = join(tmpdir(), `ia-office-bench-${variant}-${id}-${i}`);
  rmSync(dir, { recursive: true, force: true });
  cpSync(join(import.meta.dir, "fixture"), dir, { recursive: true });
  for (const c of [["init", "-q"], ["add", "."], ["-c", "user.name=bench", "-c", "user.email=bench@local", "commit", "-qm", "init"]])
    Bun.spawnSync(["git", ...c], { cwd: dir });
  const t0 = Date.now();
  const p = Bun.spawnSync(["claude", ...ARGS[variant], "-p", sc.prompt, "--output-format", "json",
    "--permission-mode", "acceptEdits", "--max-budget-usd", BUDGET], { cwd: dir, env: { ...process.env, CLAUDE_OFFICE: variant === "office" ? "1" : "" }, timeout: 20 * 60_000 });
  const wallMs = Date.now() - t0;
  let result: any = {};
  try { result = JSON.parse(p.stdout.toString()); } catch { result = { is_error: true, result: p.stdout.toString().slice(0, 1500) + p.stderr.toString().slice(0, 1500) }; }
  if (result.is_error || /session limit|usage limit|rate limit/i.test(String(result.result))) {
    throw new LimitHit(`${variant} ${id} #${i} failed: ${String(result.result).slice(0, 200)}`);
  }
  const check = sc.check(dir);
  writeFileSync(file, JSON.stringify({ variant, scenario: id, run: i, wallMs, dir, check, result, at: new Date().toISOString() }, null, 1));
  console.log(`${variant} ${id} #${i}: ${(wallMs / 1000).toFixed(0)}s $${(result.total_cost_usd ?? 0).toFixed(3)} accepted=${check.pass}`);
}

try {
  syncAgents(); // the Office variant uses the current agents
  // interleave variants run by run, so a mid-run interruption does not favor one side
  for (let i = 1; i <= RUNS; i++) for (const id of PICK) for (const v of (ONLY ? [ONLY] : ["plain", "office"])) runOne(v, id, i);
  console.log("done. Next: bun bench/report.ts");
} catch (e) {
  if (e instanceof LimitHit) { console.error("\nSTOPPED:", e.message, "\nNothing from the failed run was saved. Run the same command again later to resume."); process.exit(2); }
  throw e;
}
