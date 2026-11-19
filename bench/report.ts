// Turns bench/results/raw/*.json into docs/benchmarks.md, docs/bench-*.svg and bench/results/summary.json.
//   bun bench/report.ts
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { SCENARIOS } from "./scenarios";

const ROOT = join(import.meta.dir, "..");
const RAW = join(import.meta.dir, "results", "raw");
const DOCS = join(ROOT, "docs");
const PROJECTS = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "projects");
mkdirSync(DOCS, { recursive: true });

type Row = {
  variant: string; scenario: string; run: number; pass: boolean; cost: number; wallS: number;
  tokens: number; output: number; agents: number; skills: string[]; memoryWrites: number; turns: number;
};

/** Main transcript + subagent transcripts of a session. */
function transcripts(sid: string) {
  if (!sid || !existsSync(PROJECTS)) return [];
  for (const d of readdirSync(PROJECTS)) {
    const main = join(PROJECTS, d, `${sid}.jsonl`);
    if (!existsSync(main)) continue;
    const sub = join(PROJECTS, d, sid, "subagents");
    return [main, ...(existsSync(sub) ? readdirSync(sub).filter(f => f.endsWith(".jsonl")).map(f => join(sub, f)) : [])];
  }
  return [];
}

function row(r: any): Row {
  const res = r.result ?? {};
  let tokens = 0, output = 0;
  for (const m of Object.values<any>(res.modelUsage ?? {})) {
    tokens += (m.inputTokens ?? 0) + (m.outputTokens ?? 0) + (m.cacheReadInputTokens ?? 0) + (m.cacheCreationInputTokens ?? 0);
    output += m.outputTokens ?? 0;
  }
  const files = transcripts(res.session_id);
  const skills: string[] = []; let memoryWrites = 0;
  const seen = new Set<string>();
  for (const f of files) for (const line of readFileSync(f, "utf8").split("\n")) {
    if (!line.includes('"tool_use"')) continue;
    let j: any; try { j = JSON.parse(line); } catch { continue; }
    for (const c of j.message?.content ?? []) {
      if (c.type !== "tool_use" || seen.has(c.id)) continue;
      seen.add(c.id);
      if (c.name === "Skill" && c.input?.skill) skills.push(c.input.skill);
      if ((c.name === "Write" || c.name === "Edit") && /agent-memory/.test(String(c.input?.file_path ?? ""))) memoryWrites++;
    }
  }
  return {
    variant: r.variant, scenario: r.scenario, run: r.run, pass: !!r.check?.pass, cost: res.total_cost_usd ?? 0,
    wallS: r.wallMs / 1000, tokens, output, agents: Math.max(0, files.length - 1), skills, memoryWrites, turns: res.num_turns ?? 0,
  };
}

const rows: Row[] = existsSync(RAW) ? readdirSync(RAW).filter(f => f.endsWith(".json")).map(f => row(JSON.parse(readFileSync(join(RAW, f), "utf8")))) : [];
if (!rows.length) { console.log("no results in bench/results/raw — run bun bench/run.ts first"); process.exit(1); }

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const ids = Object.keys(SCENARIOS).filter(id => rows.some(r => r.scenario === id));
const VARIANTS = ["plain", "office"].filter(v => rows.some(r => r.variant === v));
const LABEL: Record<string, string> = { plain: "Claude Code (plain)", office: "IA Office team" };
const group = (v: string, id: string) => rows.filter(r => r.variant === v && r.scenario === id);
const stat = (v: string, id: string, k: keyof Row) => {
  const xs = group(v, id).map(r => r[k] as number);
  return { mean: mean(xs), min: Math.min(...xs), max: Math.max(...xs), n: xs.length };
};

// ---------- SVG grouped bars: mean bar + min–max whisker, one measure per chart ----------
function chart(file: string, title: string, unit: string, k: keyof Row, fmt: (x: number) => string) {
  const W = 680, H = 300, L = 56, R = 16, T = 56, B = 48;
  const max = Math.max(...ids.flatMap(id => VARIANTS.map(v => stat(v, id, k).max))) * 1.15 || 1;
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const y = (x: number) => T + (H - T - B) * (1 - x / top);
  const gw = (W - L - R) / ids.length, bw = 28, gap = 2;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${title}">
<style>
.bg{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.grid{stroke:#e4e3df}.s-plain{fill:#eb6834}.s-office{fill:#2a78d6}.wh{stroke:#52514e}
text{font-family:system-ui,-apple-system,Segoe UI,sans-serif}
@media (prefers-color-scheme: dark){.bg{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.grid{stroke:#34332f}.s-plain{fill:#d95926}.s-office{fill:#3987e5}.wh{stroke:#c3c2b7}}
</style>
<rect class="bg" width="${W}" height="${H}" rx="8"/>
<text class="t1" x="${L}" y="24" font-size="15" font-weight="600">${title}</text>
<text class="t2" x="${L}" y="42" font-size="12">${unit} · bar = mean, whisker = min–max over runs</text>\n`;
  // legend (top right)
  let lx = W - R;
  for (const v of [...VARIANTS].reverse()) {
    const w = LABEL[v].length * 6.4 + 18; lx -= w;
    s += `<rect class="s-${v}" x="${lx}" y="14" width="10" height="10" rx="2"/><text class="t2" x="${lx + 14}" y="23" font-size="12">${LABEL[v]}</text>\n`;
    lx -= 8;
  }
  for (let g = 0; g <= top + 1e-9; g += step)
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}"/><text class="t2" x="${L - 6}" y="${y(g) + 4}" font-size="11" text-anchor="end">${fmt(g)}</text>\n`;
  ids.forEach((id, gi) => {
    const cx = L + gw * gi + gw / 2, total = VARIANTS.length * bw + (VARIANTS.length - 1) * gap;
    VARIANTS.forEach((v, vi) => {
      const st = stat(v, id, k), x = cx - total / 2 + vi * (bw + gap), h = y(0) - y(st.mean);
      if (!st.n) return;
      s += `<path class="s-${v}" d="M${x},${y(0)} V${y(st.mean) + 4} Q${x},${y(st.mean)} ${x + 4},${y(st.mean)} H${x + bw - 4} Q${x + bw},${y(st.mean)} ${x + bw},${y(st.mean) + 4} V${y(0)} Z"><title>${LABEL[v]} · ${SCENARIOS[id].title}: ${fmt(st.mean)} (min ${fmt(st.min)}, max ${fmt(st.max)}, n=${st.n})</title></path>\n`;
      if (st.n > 1) s += `<line class="wh" x1="${x + bw / 2}" x2="${x + bw / 2}" y1="${y(st.min)}" y2="${y(st.max)}" stroke-width="1.5"/>\n`;
      s += `<text class="t1" x="${x + bw / 2}" y="${Math.min(y(st.max), y(st.mean)) - 6}" font-size="11" text-anchor="middle">${fmt(st.mean)}</text>\n`;
      void h;
    });
    s += `<text class="t2" x="${cx}" y="${H - B + 18}" font-size="12" text-anchor="middle">${id}. ${SCENARIOS[id].title}</text>\n`;
  });
  s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/></svg>\n`;
  writeFileSync(join(DOCS, file), s);
}
function niceStep(x: number) { const p = 10 ** Math.floor(Math.log10(x)); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= x) return m * p; return 10 * p; }

const usd = (x: number) => `$${x.toFixed(2)}`, sec = (x: number) => `${x.toFixed(0)}s`, ktok = (x: number) => `${(x / 1000).toFixed(0)}k`;
chart("bench-cost.svg", "Cost per task", "US$ (list price)", "cost", usd);
chart("bench-time.svg", "Time per task", "seconds, wall clock", "wallS", sec);
chart("bench-tokens.svg", "Tokens processed per task", "input + cache + output tokens, all models", "tokens", ktok);

// ---------- markdown ----------
const pct = (a: number, b: number) => b ? `${(((a - b) / b) * 100).toFixed(0)}%` : "–";
const all = (v: string, k: keyof Row) => mean(rows.filter(r => r.variant === v).map(r => r[k] as number));
let md = `# Benchmarks

How the IA Office agent team performs on real tasks, measured with \`bun bench/run.ts\` and summarized by \`bun bench/report.ts\`.
Each task runs headless (\`claude -p ...\`, with or without \`--agent empresa-lider\`) on a copy of [bench/fixture](../bench/fixture), and an objective acceptance check runs on the result.
**Claude Code (plain)** = Claude Code as it comes: no agents, no skills, no slash commands. **IA Office team** = the Lead with the current agents, skills and memory.

_Last run: ${new Date().toISOString().slice(0, 10)} · ${rows.length} runs · ${[...new Set(rows.map(r => r.run))].length} per scenario and variant._

## The four goals

| Goal | Metric | ${VARIANTS.map(v => LABEL[v]).join(" | ")}${VARIANTS.length === 2 ? " | Change" : ""} |
|---|---|${VARIANTS.map(() => "---:|").join("")}${VARIANTS.length === 2 ? "---:|" : ""}
`;
const goal = (g: string, m: string, f: (v: string) => number, show: (x: number) => string) => {
  const vals = VARIANTS.map(f);
  md += `| ${g} | ${m} | ${vals.map(show).join(" | ")}${VARIANTS.length === 2 ? ` | ${pct(vals[1], vals[0])}` : ""} |\n`;
};
goal("Effectiveness", "acceptance checks passed", v => mean(rows.filter(r => r.variant === v).map(r => r.pass ? 1 : 0)) * 100, x => `${x.toFixed(0)}%`);
goal("Efficiency", "mean time per task", v => all(v, "wallS"), sec);
goal("Efficiency", "subagents started per task", v => all(v, "agents"), x => x.toFixed(1));
goal("Token economy", "mean tokens per task", v => all(v, "tokens"), ktok);
goal("Token economy", "mean cost per task", v => all(v, "cost"), usd);
goal("Skill use", "skill calls per task", v => mean(rows.filter(r => r.variant === v).map(r => r.skills.length)), x => x.toFixed(1));
goal("Learning", "memory writes per task", v => all(v, "memoryWrites"), x => x.toFixed(1));

md += `
## Charts

![Cost per task](bench-cost.svg)

![Time per task](bench-time.svg)

![Tokens per task](bench-tokens.svg)

## Per scenario

| Scenario | Variant | Runs | Accepted | Mean cost | Mean time | Mean tokens | Subagents | Skills used |
|---|---|---:|---:|---:|---:|---:|---:|---|
`;
for (const id of ids) for (const v of VARIANTS) {
  const g = group(v, id);
  const sk = [...new Set(g.flatMap(r => r.skills))];
  md += `| ${id}. ${SCENARIOS[id].title} | ${LABEL[v]} | ${g.length} | ${g.filter(r => r.pass).length}/${g.length} | ${usd(stat(v, id, "cost").mean)} | ${sec(stat(v, id, "wallS").mean)} | ${ktok(stat(v, id, "tokens").mean)} | ${stat(v, id, "agents").mean.toFixed(1)} | ${sk.length ? sk.map(s => `\`${s}\``).join(", ") : "none"} |\n`;
}
md += `
## Scenarios

${ids.map(id => `- **${id}. ${SCENARIOS[id].title}:** "${SCENARIOS[id].prompt}"`).join("\n")}

## Method and limits

- Tokens = input + cache read + cache write + output, summed over every model used in the session (Lead and subagents). Most of it is cache reads, which cost about a tenth of fresh input.
- Cost is the list-price estimate Claude Code reports (\`total_cost_usd\`); on a Pro/Max plan it shows as plan usage, not a bill.
- Subagents, skill calls and memory writes are counted from the session transcripts in \`~/.claude/projects\`.
- Small sample: language models vary run to run, so the whiskers matter as much as the bars. Run more with \`bun bench/run.ts --runs 5\`.
- The fixture is a tiny project; on bigger codebases the absolute numbers grow, but the comparison method is the same.
- Raw data: \`bench/results/summary.json\`.
`;
writeFileSync(join(DOCS, "benchmarks.md"), md);
writeFileSync(join(import.meta.dir, "results", "summary.json"), JSON.stringify(rows, null, 1));
console.log(`ok: ${rows.length} runs → docs/benchmarks.md + 3 charts`);
