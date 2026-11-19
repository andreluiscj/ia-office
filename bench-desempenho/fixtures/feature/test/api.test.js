import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server.js";

async function withServer(fn) {
  const server = createApp();
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}
const json = (base, path, method = "GET", body) =>
  fetch(base + path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

test("cria e lista tarefas", () => withServer(async (base) => {
  const r = await json(base, "/api/tasks", "POST", { title: "Comprar pão" });
  assert.equal(r.status, 201);
  const list = await (await json(base, "/api/tasks")).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].title, "Comprar pão");
}));

test("rejeita título vazio", () => withServer(async (base) => {
  const r = await json(base, "/api/tasks", "POST", { title: "  " });
  assert.equal(r.status, 400);
}));

test("marca como feita", () => withServer(async (base) => {
  const t = await (await json(base, "/api/tasks", "POST", { title: "x" })).json();
  const r = await json(base, `/api/tasks/${t.id}`, "PATCH", { done: true });
  assert.equal((await r.json()).done, true);
}));

test("404 em tarefa inexistente", () => withServer(async (base) => {
  assert.equal((await json(base, "/api/tasks/999", "PATCH", { done: true })).status, 404);
  assert.equal((await json(base, "/api/tasks/999", "DELETE")).status, 404);
}));

test("exclui tarefa", () => withServer(async (base) => {
  const t = await (await json(base, "/api/tasks", "POST", { title: "x" })).json();
  assert.equal((await json(base, `/api/tasks/${t.id}`, "DELETE")).status, 204);
}));
