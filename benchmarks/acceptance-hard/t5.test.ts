// Harder attacks than benchmarks/acceptance (19/11). Copy into a finished bench dir as hard/ and run: bun test ./hard/<file>
import { afterAll, expect, test } from "bun:test";
import { handle } from "../src/server";
let hits = 0;
const internal = Bun.serve({ port: 0, hostname: "0.0.0.0", fetch: () => { hits++; return new Response("<title>secret-internal-data</title>"); } });
afterAll(() => internal.stop(true));
const P = internal.port;
const preview = (url: string) => handle(new Request("http://x/link-preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) }));
const blocked = async (url: string) => { const r = await preview(url); const t = await r.text(); expect(t).not.toContain("secret-internal-data"); expect(r.status).not.toBe(200); };
test("DNS name that resolves to 127.0.0.1 (localtest.me)", () => blocked(`http://localtest.me:${P}/`), 15000);
test("DNS name that resolves to 127.0.0.1 (127.0.0.1.nip.io)", () => blocked(`http://127.0.0.1.nip.io:${P}/`), 15000);
test("IPv4-mapped IPv6 loopback", () => blocked(`http://[::ffff:127.0.0.1]:${P}/`), 15000);
test("0.0.0.0", () => blocked(`http://0.0.0.0:${P}/`), 15000);
test("short form 127.1", () => blocked(`http://127.1:${P}/`), 15000);
test("octal 0177.0.0.1", () => blocked(`http://0177.0.0.1:${P}/`), 15000);
test("hex 0x7f000001", () => blocked(`http://0x7f000001:${P}/`), 15000);
test("trailing dot localhost.", () => blocked(`http://localhost.:${P}/`), 15000);
test("internal service never reached", () => expect(hits).toBe(0));
