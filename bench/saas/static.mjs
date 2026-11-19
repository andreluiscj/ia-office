// Static facts about an InvoiceDesk implementation (size, docs, tests, risky patterns).
//   node bench/saas/static.mjs <project-dir>  -> JSON
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { spawnSync } from "node:child_process";

const dir = process.argv[2];
const SKIP = new Set(["node_modules", ".git", ".claude", ".serena", ".empresa"]);
const files = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.endsWith(".db") || e.name.includes(".db-")) continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p); else files.push(p);
  }
})(dir);

const rel = f => relative(dir, f).replace(/\\/g, "/");
const read = f => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
const loc = f => read(f).split("\n").filter(l => l.trim()).length;
const isTest = f => /(^|\/)(tests?|__tests__)\//.test(rel(f)) || /\.(test|spec)\.[mc]?js$/.test(f);
const code = files.filter(f => [".js", ".mjs", ".cjs"].includes(extname(f)));
const src = code.filter(f => !isTest(f));
const tests = code.filter(isTest);
const web = files.filter(f => [".html", ".css"].includes(extname(f)) || (/public|static|web|ui/.test(rel(f)) && extname(f) === ".js"));
const docs = files.filter(f => extname(f) === ".md");

const all = code.map(read).join("\n");
const srcText = src.map(read).join("\n");
const sqlConcat = (srcText.match(/\.(prepare|exec)\(\s*`[^`]*\$\{/g) || []).length + (srcText.match(/\.(prepare|exec)\(\s*["'][^"']*["']\s*\+/g) || []).length;
let pkg = {}; try { pkg = JSON.parse(read(join(dir, "package.json"))); } catch {}
const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

const t = spawnSync(process.execPath, ["--test"], { cwd: dir, encoding: "utf8", timeout: 180000 });
const out = (t.stdout || "") + (t.stderr || "");
const n = k => Number(out.match(new RegExp(`ℹ ${k} (\\d+)`))?.[1] ?? 0);

const docInfo = f => ({ file: rel(f), lines: read(f).split("\n").length, bytes: statSync(f).size });
console.log(JSON.stringify({
  files: files.length,
  loc: { source: src.reduce((s, f) => s + loc(f), 0), tests: tests.reduce((s, f) => s + loc(f), 0), web: web.reduce((s, f) => s + loc(f), 0) },
  docs: docs.map(docInfo),
  hasProductDoc: docs.some(f => /product/i.test(rel(f))), hasArchitectureDoc: docs.some(f => /architect/i.test(rel(f))), hasSecurityDoc: docs.some(f => /secur/i.test(rel(f))), hasReadme: docs.some(f => /readme/i.test(rel(f))),
  tests: { pass: n("pass"), fail: n("fail"), total: n("tests"), files: tests.length },
  dependencies: deps,
  patterns: {
    eval: (all.match(/\beval\s*\(|new Function\s*\(/g) || []).length,
    innerHTMLwithData: (read(join(dir, "server.js")) + web.map(read).join("\n")).match(/\.innerHTML\s*[+]?=\s*[^;]*(\$\{|\+)/g)?.length ?? 0,
    sqlConcatenation: sqlConcat,
    passwordHashing: /scrypt|pbkdf2|argon2|bcrypt/i.test(srcText),
    timingSafeEqual: /timingSafeEqual/.test(srcText),
    randomBytesSession: /randomBytes|randomUUID/.test(srcText),
    consoleLogs: (srcText.match(/console\.(log|error)/g) || []).length,
  },
}));
