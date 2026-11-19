// IA Office SaaS benchmark: ONE large task, built twice from the same prompt (bench/saas/prompt.md):
//   "plain"  = Claude Code as it comes: no agents, no skills, no slash commands
//   "office" = the Office team: the Lead (claude --agent empresa-lider)
// Then the same independent checks run on both results (bench/saas/acceptance.mjs, static.mjs).
//
//   bun bench/run-saas.ts [--only plain|office] [--budget 40] [--minutes 120]
//
// Output: bench/results/saas/<variant>/{result.json,acceptance.json,static.json,project/}
// A variant that already has result.json is skipped, so you can resume. If the usage limit is
// hit, nothing is saved for that variant and the script stops.
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, cpSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { syncAgents } from "../server/agentes";

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const ONLY = arg("only", "");
const BUDGET = arg("budget", "40");
const MINUTES = Number(arg("minutes", "120"));
const ROOT = join(import.meta.dir, "results", arg("dir", "saas"));
// Commands the agents need to verify their own work (run the server, the tests, probe it with curl).
// Without these, headless runs cannot execute `node` and nobody can verify anything.
const ALLOW = ["Skill", "Bash(node *)", "Bash(npm *)", "Bash(curl *)", "Bash(sleep *)", "Bash(kill *)", "Bash(ls *)", "Bash(cat *)", "Bash(mkdir *)", "Bash(grep *)", "Bash(head *)", "Bash(tail *)", "Bash(wc *)", "Bash(find *)", "Bash(echo *)", "Bash(git status*)", "Bash(git diff*)"];
const PROMPT = readFileSync(join(import.meta.dir, "saas", "prompt.md"), "utf8");

const AGENT_IDS = (() => { try { return readdirSync(join(homedir(), ".claude", "agents")).filter(f => f.startsWith("empresa-")).map(f => f.slice(0, -3)); } catch { return []; } })();
const ARGS: Record<string, string[]> = {
  plain: ["--disable-slash-commands", "--disallowedTools", ["Skill", ...AGENT_IDS.map(a => `Agent(${a})`)].join(",")],
  office: ["--agent", "empresa-lider"],
};

function run(variant: string) {
  const out = join(ROOT, variant);
  if (existsSync(join(out, "result.json"))) { console.log(`${variant}: already done, skipping`); return; }
  rmSync(out, { recursive: true, force: true });
  const proj = join(out, "project");
  mkdirSync(proj, { recursive: true });
  for (const c of [["init", "-q"], ["-c", "user.name=bench", "-c", "user.email=bench@local", "commit", "-q", "--allow-empty", "-m", "init"]]) Bun.spawnSync(["git", ...c], { cwd: proj });
  console.log(`${variant}: building (up to ${MINUTES} min)...`);
  const t0 = Date.now();
  const p = Bun.spawnSync(["claude", ...ARGS[variant], "-p", PROMPT, "--output-format", "json", "--permission-mode", "acceptEdits", "--allowedTools", ALLOW.join(","), "--max-budget-usd", BUDGET],
    { cwd: proj, env: { ...process.env, CLAUDE_OFFICE: variant === "office" ? "1" : "" }, timeout: MINUTES * 60_000 });
  const wallMs = Date.now() - t0;
  let result: any;
  try { result = JSON.parse(p.stdout.toString()); } catch { result = { is_error: true, result: p.stdout.toString().slice(0, 1500) + p.stderr.toString().slice(0, 1500) }; }
  if (result.is_error || /session limit|usage limit|rate limit/i.test(String(result.result).slice(0, 300))) {
    console.error(`${variant} FAILED: ${String(result.result).slice(0, 300)}\nNothing saved for this variant. Fix the cause and run again to resume.`);
    process.exit(2);
  }
  writeFileSync(join(out, "result.json"), JSON.stringify({ variant, wallMs, at: new Date().toISOString(), result }, null, 1));
  console.log(`${variant}: built in ${(wallMs / 60000).toFixed(1)} min, $${(result.total_cost_usd ?? 0).toFixed(2)}`);
  for (const [name, script] of [["acceptance", "acceptance.mjs"], ["static", "static.mjs"]]) {
    const r = Bun.spawnSync(["node", join(import.meta.dir, "saas", script), proj], { timeout: 10 * 60_000 });
    writeFileSync(join(out, `${name}.json`), r.stdout.toString() || JSON.stringify({ error: r.stderr.toString().slice(0, 500) }));
  }
  try {
    const a = JSON.parse(readFileSync(join(out, "acceptance.json"), "utf8")).checks;
    console.log(`${variant}: acceptance ${a.filter((c: any) => c.pass).length}/${a.length} checks passed`);
  } catch { console.log(`${variant}: acceptance output unreadable`); }
}

syncAgents();
for (const v of ONLY ? [ONLY] : ["plain", "office"]) run(v);
console.log("done. Next: bun bench/report-saas.ts");
