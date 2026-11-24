// Scans a project's front-end source for the "AI look" and prints each hit as path:line - rule.
// Usage: node ai-look-check.cjs [dir=.]   exit code 1 when there are findings (so it can gate a delivery).
// Heuristics, not verdicts: a hit is a reason to look, and a deliberate use is noted in .empresa/design.md.
const { readdirSync, readFileSync, statSync } = require("node:fs");
const path = require("node:path");

const root = process.argv[2] || ".";
const EXT = /\.(css|scss|html|tsx|jsx|vue|svelte|svg)$/;
const SKIP = /(^|[\\/])(node_modules|dist|build|\.next|\.git|\.empresa|graphify-out|coverage|\.claude)([\\/]|$)/;
const RULES = [
  ["gradient (background, button, text or art)", /(linear|radial|conic)-gradient\(|\bbg-gradient-|\bfrom-\w+-\d+|\bto-\w+-\d+|<(linear|radial)Gradient/i],
  ["glass / blur surface", /backdrop-filter|backdrop-blur|\bblur\(\s*[1-9]/i],
  ["glow or colored shadow", /box-shadow:[^;]*(0 0 \d|rgba\(\s*(99|139|168|59|37|79)\b)|\bshadow-(blue|purple|indigo|violet|pink)-/i],
  ["default AI palette (indigo/violet/purple)", /#(6366f1|8b5cf6|a855f7|7c3aed|4f46e5|9333ea)\b|\b(bg|text|border|from|to|via|ring)-(indigo|violet|purple|fuchsia)-\d/i],
  ["emoji used as UI icon or bullet", /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}✨]/u],
  ["full-width tinted message banner", /\b(alert|banner|notice|callout|toast)[\w-]*\b[^{}]*\{[^}]*background(-color)?:\s*(?!none|transparent|inherit|var\(--(surface|bg|panel|card)\b)\S/i],
  ["oversized radius (>= 20px) / pill everywhere", /border-radius:\s*(2[0-9]|[3-9][0-9])px|\brounded-(2xl|3xl)\b/i],
  ["gradient/animated text or pulse glow", /bg-clip-text|text-transparent|-webkit-background-clip:\s*text|animate-pulse/i],
];

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (SKIP.test(p)) continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p); else if (EXT.test(f)) files.push(p);
  }
})(root);

let hits = 0;
const summary = {};
for (const f of files) {
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [name, re] of RULES) {
      if (re.test(line)) { hits++; summary[name] = (summary[name] || 0) + 1; if (hits <= 60) console.log(`${path.relative(".", f)}:${i + 1} - ${name}`); }
    }
  });
}
console.log(`\n${files.length} files, ${hits} hits`);
for (const [k, v] of Object.entries(summary).sort((a, b) => b[1] - a[1])) console.log(`  ${v} x ${k}`);
process.exit(hits ? 1 : 0);
