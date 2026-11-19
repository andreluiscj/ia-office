// Builds docs/benchmarks-saas.md (+ SVG charts) from bench/results/saas*/ .
//   bun bench/report-saas.ts
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const RES = join(import.meta.dir, "results");
const DOCS = join(import.meta.dir, "..", "docs");
const PROJECTS = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "projects");
const ROUNDS = [{ dir: "saas", title: "Round 2: agents may run node, npm and curl" }, { dir: "saas-skills", title: "Round 3: Office with key skills preloaded into each agent" }, { dir: "saas-round1", title: "Round 1: nobody could run node" }].filter(r => existsSync(join(RES, r.dir)));
const LABEL: Record<string, string> = { plain: "Claude Code (plain)", office: "IA Office team", "office-skills": "Office + preloaded skills" };
const j = (p: string) => JSON.parse(readFileSync(p, "utf8"));

type ToolUse = { name: string; input: any; agent: string };
function transcripts(sid: string) {
  for (const d of readdirSync(PROJECTS)) {
    const main = join(PROJECTS, d, `${sid}.jsonl`);
    if (!existsSync(main)) continue;
    const sub = join(PROJECTS, d, sid, "subagents");
    return [{ file: main, agent: "lead" }, ...(existsSync(sub) ? readdirSync(sub).filter(f => f.endsWith(".jsonl")).map(f => ({ file: join(sub, f), agent: f })) : [])];
  }
  return [];
}
function analyze(sid: string) {
  const uses: ToolUse[] = [], seen = new Set<string>();
  const perAgent: Record<string, { type: string; out: number; ctx: number; calls: number; cost?: number }> = {};
  for (const { file, agent } of transcripts(sid)) {
    let type = agent === "lead" ? "lead" : "subagent";
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.startsWith("{")) continue;
      let o: any; try { o = JSON.parse(line); } catch { continue; }
      const m = o.message;
      if (m?.usage) { const a = (perAgent[agent] ??= { type, out: 0, ctx: 0, calls: 0 }); a.out += m.usage.output_tokens ?? 0; a.ctx += (m.usage.input_tokens ?? 0) + (m.usage.cache_read_input_tokens ?? 0) + (m.usage.cache_creation_input_tokens ?? 0); a.calls++; }
      for (const c of m?.content ?? []) if (c.type === "tool_use" && !seen.has(c.id)) {
        seen.add(c.id); uses.push({ name: c.name, input: c.input, agent });
        if (c.name === "Agent" || c.name === "Task") perAgent[agent] = perAgent[agent] ?? { type, out: 0, ctx: 0, calls: 0 };
      }
    }
  }
  const skills = uses.filter(u => u.name === "Skill").map(u => ({ skill: String(u.input?.skill), by: u.agent === "lead" ? "Lead" : u.agent }));
  const mem = uses.filter(u => (u.name === "Write" || u.name === "Edit") && /agent-memory/.test(String(u.input?.file_path ?? ""))).length;
  const tools: Record<string, number> = {}; for (const u of uses) tools[u.name] = (tools[u.name] ?? 0) + 1;
  const spawned = uses.filter(u => u.name === "Agent" || u.name === "Task").map(u => String(u.input?.subagent_type ?? u.input?.description ?? "?"));
  return { skills, mem, tools, spawned, toolCalls: uses.length, perAgent };
}

const money = (x: number) => `$${x.toFixed(2)}`, mins = (ms: number) => `${(ms / 60000).toFixed(1)} min`, k = (x: number) => `${(x / 1000).toFixed(0)}k`;
mkdirSync(DOCS, { recursive: true });
let md = `# SaaS benchmark: building a product from scratch

One large task, given identically to **Claude Code (plain)** (no agents, no skills, no slash commands) and to the **IA Office team** (the Lead with the Architect, Backend, Frontend, QA, Security and Code Review agents and their skills).
The task is [bench/saas/prompt.md](../bench/saas/prompt.md): build "InvoiceDesk", a multi-tenant invoicing SaaS, from product thinking to a verified delivery (product doc, architecture, API, web UI, automated tests, threat model and vulnerability tests).
The result is then checked by **independent tests that neither side saw** ([bench/saas/acceptance.mjs](../bench/saas/acceptance.mjs): 53 functional and security probes) and a static scan ([bench/saas/static.mjs](../bench/saas/static.mjs)).
One run per side per round, so treat differences as indicative, not statistical.

`;
const findingsFile = join(import.meta.dir, "saas", "findings.md");
if (existsSync(findingsFile)) md += readFileSync(findingsFile, "utf8") + String.fromCharCode(10);
const summary: any[] = [];
for (const round of ROUNDS) {
  const rows: any[] = [];
  for (const v of ["plain", "office"]) {
    const d = join(RES, round.dir, v);
    if (!existsSync(join(d, "result.json"))) continue;
    const R = j(join(d, "result.json")), r = R.result, st = j(join(d, "static.json")), ac = j(join(d, "acceptance.json")).checks, an = analyze(r.session_id);
    let tokens = 0, out = 0; const models: string[] = [];
    for (const [m, u] of Object.entries<any>(r.modelUsage ?? {})) { tokens += u.inputTokens + u.outputTokens + u.cacheReadInputTokens + u.cacheCreationInputTokens; out += u.outputTokens; models.push(`${m.replace("claude-", "")} ${money(u.costUSD)}`); }
    rows.push({ v, round: round.dir, cost: r.total_cost_usd, wallMs: R.wallMs, turns: r.num_turns, tokens, out, models, st, ac, an, final: String(r.result) });
  }
  if (rows.length) summary.push({ round, rows });
}
for (const { round, rows } of summary) {
  md += `## ${round.title}\n\n| Metric | ${rows.map(r => LABEL[r.v]).join(" | ")} |\n|---|${rows.map(() => "---:|").join("")}\n`;
  const line = (name: string, f: (r: any) => string) => { md += `| ${name} | ${rows.map(f).join(" | ")} |\n`; };
  line("Build time", r => mins(r.wallMs));
  line("Cost (list price)", r => money(r.cost));
  line("Tokens processed", r => k(r.tokens));
  line("Output tokens", r => k(r.out));
  line("Models", r => r.models.join(", "));
  line("Subagents started", r => String(r.an.spawned.length) + (r.an.spawned.length ? ` (${r.an.spawned.join(", ").replace(/empresa-/g, "")})` : ""));
  line("Tool calls (all agents)", r => String(r.an.toolCalls));
  line("**Independent checks passed**", r => `**${r.ac.filter((c: any) => c.pass).length}/${r.ac.length}**`);
  line("Functional checks", r => { const f = r.ac.filter((c: any) => c.group === "functional"); return `${f.filter((c: any) => c.pass).length}/${f.length}`; });
  line("Security checks", r => { const f = r.ac.filter((c: any) => c.group === "security"); return `${f.filter((c: any) => c.pass).length}/${f.length}`; });
  line("Own tests written / passing", r => `${r.st.tests.total} / ${r.st.tests.pass}`);
  line("Lines: source / tests / web", r => `${r.st.loc.source} / ${r.st.loc.tests} / ${r.st.loc.web}`);
  line("Docs delivered (lines)", r => r.st.docs.map((d: any) => `${d.file.replace("docs/", "").replace(".md", "")} ${d.lines}`).join(", "));
  line("Skills called", r => r.an.skills.length ? r.an.skills.map((s: any) => `\`${s.skill}\``).join(", ") : "none");
  line("Memory files written", r => String(r.an.mem));
  line("Said it verified its work?", r => /(never|not|couldn't|could not|nothing)[^.]{0,60}(run|executed|verified|started)/i.test(r.final.slice(0, 1200)) ? "admitted gaps" : "yes");
  md += "\n";
  const fails = rows.flatMap(r => r.ac.filter((c: any) => !c.pass).map((c: any) => `${LABEL[r.v]}: **${c.id}** ${c.name} (${c.detail})`));
  md += fails.length ? `Checks that failed:\n${fails.map(f => `- ${f}`).join("\n")}\n\n` : "No check failed.\n\n";
  if (rows.length === 2) {
    md += `### Subagent breakdown (IA Office)\n\n| Agent transcript | API calls | Context processed | Output |\n|---|---:|---:|---:|\n`;
    for (const [a, x] of Object.entries<any>(rows.find(r => r.v === "office")?.an.perAgent ?? {})) md += `| ${a === "lead" ? "Lead" : a.replace(/\.jsonl$/, "")} | ${x.calls} | ${k(x.ctx)} | ${k(x.out)} |\n`;
    md += "\n";
  }
}
// ---- final comparison: plain (round 2) vs Office (round 2) vs Office with preloaded skills (round 3)
const pick = (dir: string, v: string) => summary.find(x => x.round.dir === dir)?.rows.find((r: any) => r.v === v);
const final = [{ key: "plain", r: pick("saas", "plain") }, { key: "office", r: pick("saas", "office") }, { key: "office-skills", r: pick("saas-skills", "office") }].filter(c => c.r);
const uiOf = (key: string) => { const dir = key === "office-skills" ? "saas-skills/office" : `saas/${key}`; const f = join(RES, dir, "ui.json"); return existsSync(f) ? j(f) : null; };
if (final.length > 1) {
  md += `## Final comparison (rounds 2 and 3)\n\n| Metric | ${final.map(c => LABEL[c.key]).join(" | ")} |\n|---|${final.map(() => "---:|").join("")}\n`;
  const L = (name: string, f: (c: any) => string) => { md += `| ${name} | ${final.map(f).join(" | ")} |\n`; };
  L("Build time", c => mins(c.r.wallMs)); L("Cost (list price)", c => money(c.r.cost)); L("Tokens processed", c => k(c.r.tokens));
  L("Subagents", c => String(c.r.an.spawned.length)); L("Skills called by agents", c => String(c.r.an.skills.length));
  L("Memory files written", c => String(c.r.an.mem));
  L("**Independent API checks (functional + security)**", c => `**${c.r.ac.filter((x: any) => x.pass).length}/${c.r.ac.length}**`);
  L("**Real-browser UI checks**", c => { const u = uiOf(c.key); return u ? `**${u.steps.filter((x: any) => x.pass).length}/${u.steps.length}**` : "n/a"; });
  L("Own tests written", c => String(c.r.st.tests.total));
  L("security.md lines", c => String(c.r.st.docs.find((d: any) => /secur/i.test(d.file))?.lines ?? 0));
  md += "\n";
  for (const c of final) { const u = uiOf(c.key); const bad = u?.steps.filter((x: any) => !x.pass) ?? []; if (bad.length) md += `- **${LABEL[c.key]}** failed UI check: ${bad.map((x: any) => `${x.name} (${x.detail})`).join("; ")}\n`; }
  md += "\n### Screens side by side (headless Edge, same steps on every build)\n\n";
  const shots: [string, string][] = [["1-login-desktop", "Login (desktop)"], ["2-dashboard-desktop", "Dashboard after sign-up (desktop)"], ["3-clients-desktop", "Clients (desktop)"], ["4-invoices-desktop", "Invoices (desktop)"], ["5-invoices-phone", "Invoices (390 px phone)"], ["6-dashboard-phone", "Dashboard (390 px phone)"]];
  md += `| Screen | ${final.map(c => LABEL[c.key]).join(" | ")} |\n|---|${final.map(() => "---|").join("")}\n`;
  for (const [f, name] of shots) md += `| ${name} | ${final.map(c => `![](saas-ui/${c.key}-${f}.png)`).join(" | ")} |\n`;
  md += "\n";
}
// ---- charts for the main round
const main = final.map(c => ({ ...c.r, v: c.key }));
function bars(file: string, title: string, unit: string, vals: { v: string; x: number; label: string }[]) {
  const W = 640, H = 230, L = 24, B = 40, T = 56, max = Math.max(...vals.map(a => a.x), 1) * 1.2, bw = 100, gap = 50;
  const x0 = (W - (vals.length * bw + (vals.length - 1) * gap)) / 2, y = (x: number) => T + (H - T - B) * (1 - x / max);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${title}"><style>.bg{fill:#fcfcfb}.t1{fill:#0b0b0b}.t2{fill:#52514e}.g{stroke:#e4e3df}.s-plain{fill:#eb6834}.s-office{fill:#2a78d6}.s-office-skills{fill:#1baf7a}text{font-family:system-ui,-apple-system,Segoe UI,sans-serif}@media (prefers-color-scheme: dark){.bg{fill:#1a1a19}.t1{fill:#f0efec}.t2{fill:#c3c2b7}.g{stroke:#34332f}.s-plain{fill:#d95926}.s-office{fill:#3987e5}.s-office-skills{fill:#199e70}}</style><rect class="bg" width="${W}" height="${H}" rx="8"/><text class="t1" x="${L}" y="24" font-size="15" font-weight="600">${title}</text><text class="t2" x="${L}" y="42" font-size="12">${unit}</text><line class="g" x1="${L}" x2="${W - L}" y1="${y(0)}" y2="${y(0)}"/>`;
  vals.forEach((a, i) => { const x = x0 + i * (bw + gap), h = y(0) - y(a.x); s += `<path class="s-${a.v}" d="M${x},${y(0)} V${y(a.x) + 5} Q${x},${y(a.x)} ${x + 5},${y(a.x)} H${x + bw - 5} Q${x + bw},${y(a.x)} ${x + bw},${y(a.x) + 5} V${y(0)} Z"><title>${LABEL[a.v]}: ${a.label}</title></path><text class="t1" x="${x + bw / 2}" y="${y(a.x) - 7}" font-size="13" text-anchor="middle" font-weight="600">${a.label}</text><text class="t2" x="${x + bw / 2}" y="${H - 16}" font-size="12" text-anchor="middle">${LABEL[a.v]}</text>`; void h; });
  writeFileSync(join(DOCS, file), s + "</svg>\n");
}
if (main.length) {
  bars("bench-saas-cost.svg", "Cost to build the SaaS", "US$ at list price", main.map((r: any) => ({ v: r.v, x: r.cost, label: money(r.cost) })));
  bars("bench-saas-time.svg", "Time to build the SaaS", "minutes, wall clock", main.map((r: any) => ({ v: r.v, x: r.wallMs / 60000, label: mins(r.wallMs) })));
  bars("bench-saas-checks.svg", "Independent checks passed", "of the functional and security probes", main.map((r: any) => ({ v: r.v, x: r.ac.filter((c: any) => c.pass).length, label: `${r.ac.filter((c: any) => c.pass).length}/${r.ac.length}` })));
  md += `## Charts (rounds 2 and 3)\n\n![Cost](bench-saas-cost.svg)\n\n![Time](bench-saas-time.svg)\n\n![Checks](bench-saas-checks.svg)\n\n`;
}
md += `## Notes\n\n- Tokens are input + cache read + cache write + output over every model used; cost is the list-price estimate Claude Code reports.\n- Skills, memory writes and subagents are counted from the session transcripts.\n- Both sides run in an empty temp folder with the same permissions, and neither saw the acceptance tests.\n- Raw data: \`bench/results/saas*/\`.\n`;
writeFileSync(join(DOCS, "benchmarks-saas.md"), md);
writeFileSync(join(RES, "saas-summary.json"), JSON.stringify(summary.map(s => ({ round: s.round.dir, rows: s.rows.map((r: any) => ({ v: r.v, cost: r.cost, wallMs: r.wallMs, tokens: r.tokens, checks: r.ac, skills: r.an.skills, mem: r.an.mem, spawned: r.an.spawned, tools: r.an.tools, static: r.st })) })), null, 1));
console.log("ok → docs/benchmarks-saas.md");
