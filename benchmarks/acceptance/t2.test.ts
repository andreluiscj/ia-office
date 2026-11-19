import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { handle } from "../src/server";

const post = (body: string) =>
  handle(new Request("http://x/contacts", { method: "POST", headers: { "content-type": "application/json" }, body }));
const ok = { name: "Ana", email: "ana@example.com", message: "hello" };
const status = async (body: unknown) => (await post(JSON.stringify(body))).status;

test("valid contact returns 201 with id", async () => {
  const r = await post(JSON.stringify(ok));
  expect(r.status).toBe(201);
  expect((await r.json()).id).toBeDefined();
});
test("invalid email returns 422 with the error shape", async () => {
  const r = await post(JSON.stringify({ ...ok, email: "nope" }));
  expect(r.status).toBe(422);
  expect((await r.json()).error.code).toBeDefined();
});
test("empty name returns 422", async () => expect(await status({ ...ok, name: "" })).toBe(422));
test("name over 80 chars returns 422", async () => expect(await status({ ...ok, name: "a".repeat(81) })).toBe(422));
test("message over 1000 chars returns 422", async () => expect(await status({ ...ok, message: "a".repeat(1001) })).toBe(422));
test("wrong types return 422, not 500", async () => expect(await status({ name: 1, email: null, message: {} })).toBe(422));
test("malformed JSON returns 400", async () => expect((await post("{not json")).status).toBe(400));
test("JSON null body does not crash", async () => expect([400, 422]).toContain((await post("null")).status));
test("list is paginated, newest first, limit capped at 50", async () => {
  for (let i = 0; i < 60; i++) await post(JSON.stringify({ ...ok, message: `m${i}` }));
  const r = await handle(new Request("http://x/contacts?page=1&limit=500"));
  expect(r.status).toBe(200);
  const items = (await r.json()).items;
  expect(items.length).toBeLessThanOrEqual(50);
  expect(JSON.stringify(items[0])).toContain("m59");
});
test("notes endpoint still works", async () => expect((await handle(new Request("http://x/notes"))).status).toBe(200));

// Static checks on the form page and any script it ships with.
const html = existsSync("public/contact.html") ? readFileSync("public/contact.html", "utf8") : "";
const scripts = existsSync("public")
  ? readdirSync("public").filter(f => f.endsWith(".js")).map(f => readFileSync("public/" + f, "utf8")).join("\n")
  : "";
const page = html + scripts;

test("form page has labels for the three fields", () => expect((html.match(/<label/g) ?? []).length).toBeGreaterThanOrEqual(3));
test("form page announces status to assistive tech", () => expect(/aria-live|role="(status|alert)"/.test(html)).toBe(true));
test("form page never injects HTML from data", () => {
  expect(html.length).toBeGreaterThan(0);
  expect(/innerHTML|insertAdjacentHTML|document\.write/.test(page)).toBe(false);
});
test("submit button is disabled while sending", () => expect(/disabled/.test(page)).toBe(true));
