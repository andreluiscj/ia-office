// Benchmark scenarios: a prompt for the Lead and an objective acceptance check run on the result.
import { join } from "node:path";

type Check = { pass: boolean; tests: { pass: number; fail: number }; changed: string[]; notes: string[] };

function sh(cwd: string, cmd: string[]) { const p = Bun.spawnSync(cmd, { cwd }); return p.stdout.toString() + p.stderr.toString(); }
function npmTest(cwd: string) {
  const out = sh(cwd, ["node", "--test"]);
  const n = (k: string) => Number(out.match(new RegExp(`ℹ ${k} (\\d+)`))?.[1] ?? 0);
  return { pass: n("pass"), fail: n("fail") };
}
function changed(cwd: string) {
  return sh(cwd, ["git", "status", "--porcelain"]).split("\n").map(l => l.slice(3).trim()).filter(Boolean);
}
/** Runs a snippet against the project's src/price.js and returns true if it prints "ok". */
function probe(cwd: string, code: string) {
  const url = "file:///" + join(cwd, "src", "price.js").replace(/\\/g, "/");
  return sh(cwd, ["node", "--input-type=module", "-e", `import * as m from "${url}"; ${code}`]).includes("ok");
}

export const SCENARIOS: Record<string, { title: string; prompt: string; check: (dir: string) => Check }> = {
  A: {
    title: "Question (no change)",
    prompt: "In src/price.js, what does total() return for an empty list? Just answer, do not change anything.",
    check: dir => {
      const ch = changed(dir).filter(f => !f.startsWith(".claude/") && !f.startsWith(".serena"));
      return { pass: ch.length === 0, tests: npmTest(dir), changed: ch, notes: [] };
    },
  },
  B: {
    title: "Bug fix + test",
    prompt: "Bug: discount(amount, pct) in src/price.js accepts pct above 100 or below 0 and returns wrong values (even negative prices). Fix it: pct outside 0 to 100 must throw RangeError. Add tests. Acceptance: npm test passes with the new cases.",
    check: dir => {
      const t = npmTest(dir), ch = changed(dir);
      const ok = probe(dir, `let a=0;for(const p of [101,-1]){try{m.discount(100,p)}catch(e){if(e instanceof RangeError)a++}} if(a===2&&m.discount(100,10)===90&&m.discount(100,100)===0)console.log("ok")`);
      return { pass: ok && t.fail === 0 && t.pass > 2, tests: t, changed: ch, notes: ok ? [] : ["behavior check failed"] };
    },
  },
  C: {
    title: "Small feature + tests",
    prompt: "Add a function shipping(amount) to src/price.js: free (0) when amount is 200 or more, otherwise 15. Add tests. Acceptance: npm test passes with the new cases.",
    check: dir => {
      const t = npmTest(dir), ch = changed(dir);
      const ok = probe(dir, `if(m.shipping(200)===0&&m.shipping(250)===0&&m.shipping(199.99)===15&&m.shipping(0)===15)console.log("ok")`);
      return { pass: ok && t.fail === 0 && t.pass > 2, tests: t, changed: ch, notes: ok ? [] : ["behavior check failed"] };
    },
  },
};
