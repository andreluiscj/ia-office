import { expect, test } from "bun:test";
import { handle } from "../src/server";

test("unknown route returns 404", async () => {
  const r = await handle(new Request("http://x/nope"));
  expect(r.status).toBe(404);
});

test("notes returns total", async () => {
  const r = await handle(new Request("http://x/notes"));
  expect((await r.json()).total).toBe(7);
});
