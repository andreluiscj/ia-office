import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { handle } from "../src/server";

const call = (method: string, path: string, body?: unknown, token?: string, raw?: string) =>
  handle(new Request("http://x" + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  }));
let n = 0;
const email = () => `user${Date.now()}${n++}@example.com`;
async function user() {
  const e = email(), pw = "correct horse 1";
  expect((await call("POST", "/auth/register", { email: e, password: pw })).status).toBe(201);
  const r = await call("POST", "/auth/login", { email: e, password: pw });
  expect(r.status).toBe(200);
  return { email: e, token: (await r.json()).token as string };
}

test("register returns 201 with id and never echoes the password", async () => {
  const r = await call("POST", "/auth/register", { email: email(), password: "longenough1" });
  expect(r.status).toBe(201);
  const t = await r.text();
  expect(JSON.parse(t).id).toBeDefined();
  expect(t).not.toContain("longenough1");
});
test("duplicate email returns 409", async () => {
  const e = email();
  await call("POST", "/auth/register", { email: e, password: "longenough1" });
  expect((await call("POST", "/auth/register", { email: e, password: "longenough1" })).status).toBe(409);
});
test("short password returns 422", async () => expect((await call("POST", "/auth/register", { email: email(), password: "short" })).status).toBe(422));
test("invalid email returns 422", async () => expect((await call("POST", "/auth/register", { email: "nope", password: "longenough1" })).status).toBe(422));
test("malformed JSON returns 400", async () => expect((await call("POST", "/auth/register", undefined, undefined, "{bad")).status).toBe(400));

test("login returns a random token that is not the user id", async () => {
  const e = email();
  const id = (await (await call("POST", "/auth/register", { email: e, password: "longenough1" })).json()).id;
  const tok = (await (await call("POST", "/auth/login", { email: e, password: "longenough1" })).json()).token;
  expect(typeof tok).toBe("string");
  expect(tok.length).toBeGreaterThanOrEqual(20);
  expect(tok).not.toBe(String(id));
});
test("wrong password and unknown email answer the same way (401, same body)", async () => {
  const u = await user();
  const a = await call("POST", "/auth/login", { email: u.email, password: "wrong password" });
  const b = await call("POST", "/auth/login", { email: email(), password: "wrong password" });
  expect(a.status).toBe(401);
  expect(b.status).toBe(401);
  expect(await a.text()).toBe(await b.text());
});
test("sixth failed login for the same email within 15 minutes returns 429", async () => {
  const u = await user();
  for (let i = 0; i < 5; i++) await call("POST", "/auth/login", { email: u.email, password: "wrong password" });
  expect((await call("POST", "/auth/login", { email: u.email, password: "wrong password" })).status).toBe(429);
});

test("notes require a valid token", async () => {
  expect((await call("GET", "/me/notes")).status).toBe(401);
  expect((await call("GET", "/me/notes", undefined, "not-a-real-token-123456")).status).toBe(401);
});
test("create and list own notes", async () => {
  const u = await user();
  const c = await call("POST", "/me/notes", { text: "mine" }, u.token);
  expect(c.status).toBe(201);
  const list = await (await call("GET", "/me/notes", undefined, u.token)).json();
  expect(list.items.map((x: any) => x.text)).toContain("mine");
  expect(list.total).toBe(1);
});
test("note text over 500 chars returns 422", async () => {
  const u = await user();
  expect((await call("POST", "/me/notes", { text: "a".repeat(501) }, u.token)).status).toBe(422);
});
test("a user never sees another user's notes (list, read, delete)", async () => {
  const a = await user(), b = await user();
  const id = (await (await call("POST", "/me/notes", { text: "secret of a" }, a.token)).json()).id;
  const list = await (await call("GET", "/me/notes", undefined, b.token)).json();
  expect(JSON.stringify(list)).not.toContain("secret of a");
  expect((await call("GET", `/me/notes/${id}`, undefined, b.token)).status).toBe(404);
  expect((await call("DELETE", `/me/notes/${id}`, undefined, b.token)).status).toBe(404);
  expect((await call("GET", `/me/notes/${id}`, undefined, a.token)).status).toBe(200);
});
test("owner can delete a note", async () => {
  const a = await user();
  const id = (await (await call("POST", "/me/notes", { text: "tmp" }, a.token)).json()).id;
  expect((await call("DELETE", `/me/notes/${id}`, undefined, a.token)).status).toBe(204);
  expect((await call("GET", `/me/notes/${id}`, undefined, a.token)).status).toBe(404);
});
test("owner id in the body cannot move a note to another user", async () => {
  const a = await user(), b = await user();
  await call("POST", "/me/notes", { text: "planted", ownerId: 1, userId: 1, owner: b.email }, a.token);
  const list = await (await call("GET", "/me/notes", undefined, b.token)).json();
  expect(JSON.stringify(list)).not.toContain("planted");
});
test("public GET /notes still works", async () => expect((await call("GET", "/notes")).status).toBe(200));

const src = (dir: string): string => readdirSync(dir).map(f => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? src(p) : /\.(ts|js)$/.test(f) ? readFileSync(p, "utf8") : "";
}).join("\n");
test("passwords are hashed with a slow algorithm", () =>
  expect(/Bun\.password|argon2|bcrypt|scrypt|pbkdf2/i.test(src("src"))).toBe(true));
