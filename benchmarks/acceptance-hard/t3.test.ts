// Harder attacks than benchmarks/acceptance (19/11). Copy into a finished bench dir as hard/ and run: bun test ./hard/<file>
import { expect, test } from "bun:test";
import { handle } from "../src/server";
const post = (path: string, body: unknown) => handle(new Request("http://x" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const reg = (email: string, password = "correct-horse-1") => post("/auth/register", { email, password });
const login = (email: string, password: string) => post("/auth/login", { email, password });
const uid = () => Math.random().toString(36).slice(2, 8);

test("parallel wrong logins cannot exceed the 5-attempt limit (race)", async () => {
  const e = `race-${uid()}@ex.com`; await reg(e);
  const rs = await Promise.all(Array.from({ length: 20 }, () => login(e, "wrong-password")));
  const not429 = rs.filter(r => r.status !== 429).length;
  expect(not429).toBeLessThanOrEqual(5);
}, 60000);

test("rate limit cannot be bypassed by changing email case", async () => {
  const e = `case-${uid()}@ex.com`; await reg(e);
  const variants = [e, e.toUpperCase(), e[0].toUpperCase() + e.slice(1), e.replace("@", "@").replace("ex.com", "EX.com"), e.toUpperCase()];
  for (const v of variants) await login(v, "wrong-password");
  expect((await login(e, "wrong-password")).status).toBe(429);
}, 60000);

test("duplicate email with different case is 409", async () => {
  const e = `dup-${uid()}@ex.com`; await reg(e);
  expect((await reg(e.toUpperCase())).status).toBe(409);
}, 30000);

test("unknown email and wrong password take similar time (no user enumeration by timing)", async () => {
  const e = `time-${uid()}@ex.com`; await reg(e);
  const t = async (f: () => Promise<Response>) => { const s = performance.now(); await f(); return performance.now() - s; };
  let known = 0, unknown = 0;
  for (let i = 0; i < 3; i++) { known += await t(() => login(e, "wrong-pass-" + i)); unknown += await t(() => login(`nobody-${uid()}@ex.com`, "wrong-pass")); }
  expect(unknown / known).toBeGreaterThan(0.5);
}, 60000);

test("huge password is rejected or handled fast (no hashing DoS)", async () => {
  const s = performance.now();
  const r = await reg(`big-${uid()}@ex.com`, "x".repeat(1_000_000));
  expect(performance.now() - s).toBeLessThan(3000);
  expect(r.status).not.toBe(500);
}, 30000);

test("token has at least 128 bits of randomness", async () => {
  const e = `tok-${uid()}@ex.com`; await reg(e);
  const { token } = await (await login(e, "correct-horse-1")).json() as any;
  expect(String(token).length).toBeGreaterThanOrEqual(22);
}, 30000);
