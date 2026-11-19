import { afterAll, expect, test } from "bun:test";
import { handle } from "../src/server";

// A local "internal service": the feature must never reach it.
let hits = 0;
const internal = Bun.serve({ port: 0, fetch: () => { hits++; return new Response("secret-internal-data", { headers: { "content-type": "image/png" } }); } });
afterAll(() => internal.stop(true));

const preview = (body: unknown, raw?: string) =>
  handle(new Request("http://x/link-preview", { method: "POST", headers: { "content-type": "application/json" }, body: raw ?? JSON.stringify(body) }));
const blocked = async (url: string) => {
  const r = await preview({ url });
  expect([400, 403, 422]).toContain(r.status);
  expect(await r.text()).not.toContain("secret-internal-data");
};

test("loopback by name is refused", () => blocked(`http://localhost:${internal.port}/`));
test("loopback by IP is refused", () => blocked(`http://127.0.0.1:${internal.port}/`));
test("loopback in decimal form is refused", () => blocked(`http://2130706433:${internal.port}/`));
test("IPv6 loopback is refused", () => blocked(`http://[::1]:${internal.port}/`));
test("cloud metadata address is refused", () => blocked("http://169.254.169.254/latest/meta-data/"));
test("private network is refused", () => blocked("http://10.0.0.1/"));
test("non-http scheme is refused", () => blocked("file:///etc/passwd"));
test("credentials in the URL are refused", () => blocked(`http://user:pass@127.0.0.1:${internal.port}/`));
test("the internal service was never contacted", () => expect(hits).toBe(0));
test("missing url returns 422", async () => expect((await preview({})).status).toBe(422));
test("malformed JSON returns 400", async () => expect((await preview(undefined, "{bad")).status).toBe(400));
test("notes endpoint still works", async () => expect((await handle(new Request("http://x/notes"))).status).toBe(200));
