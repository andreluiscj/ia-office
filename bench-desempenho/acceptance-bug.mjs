// Verificação independente da tarefa "bug". Uso: node acceptance-bug.mjs <pasta>
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
const dir = process.argv[2];
const checks = [];
const add = (name, ok) => checks.push({ name, ok: !!ok });
try {
  const probe = join(dir, "__probe.mjs");
  writeFileSync(probe, `
    import { discount, total } from "./src/price.js";
    const out = {};
    const thr = (a, p) => { try { discount(a, p); return false; } catch (e) { return e instanceof RangeError; } };
    out.neg = thr(100, -1); out.over = thr(100, 101); out.nan = thr(100, NaN);
    out.zero = discount(100, 0) === 100; out.hundred = discount(100, 100) === 0; out.mid = discount(200, 10) === 180;
    out.total = total([{ price: 10, qty: 2 }]) === 20;
    console.log(JSON.stringify(out));`);
  const r = JSON.parse(execSync(`node ${probe}`, { cwd: dir, encoding: "utf8" }));
  add("pct < 0 lança RangeError", r.neg); add("pct > 100 lança RangeError", r.over);
  add("valores válidos continuam certos (0, 100, 10)", r.zero && r.hundred && r.mid); add("total() intacto", r.total);
} catch (e) { add("código carrega e roda", false); }
try { execSync("npm test", { cwd: dir, stdio: "pipe" }); add("npm test passa", true); } catch { add("npm test passa", false); }
let n = 0;
if (existsSync(join(dir, "test"))) for (const f of readdirSync(join(dir, "test"))) n += (readFileSync(join(dir, "test", f), "utf8").match(/\btest\(/g) || []).length;
const t = n;
add("testes novos adicionados (pelo menos 2 além dos 3 originais)", Number(t) >= 5);
const score = checks.filter(c => c.ok).length;
console.log(JSON.stringify({ passed: score === checks.length, score, total: checks.length, checks }));
