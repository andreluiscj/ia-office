import { expect, test } from "bun:test";
import { handle } from "../src/server";

const post = (body: unknown, raw?: string) =>
  handle(new Request("http://x/notes", { method: "POST", headers: { "content-type": "application/json" }, body: raw ?? JSON.stringify(body) }));
const get = async (path: string) => { const r = await handle(new Request("http://x" + path)); return { status: r.status, body: await r.json() }; };
// The fixture's pagination base is not part of this task, so list reads merge page 0 and page 1.
const all = async (q: string) => { const a = await get(`/notes?${q}&limit=50&page=0`), b = await get(`/notes?${q}&limit=50&page=1`); return [...(a.body.items ?? []), ...(b.body.items ?? [])]; };

test("create a note with tags, normalized and deduplicated", async () => {
  const r = await post({ text: "tagged", tags: ["Work", "work", "urgent"] });
  expect(r.status).toBe(201);
  const b = await r.json();
  expect(b.id).toBeDefined();
  expect([...b.tags].sort()).toEqual(["urgent", "work"]);
});
test("tags are optional", async () => {
  const r = await post({ text: "plain" });
  expect(r.status).toBe(201);
  expect((await r.json()).tags).toEqual([]);
});
test("more than 5 tags returns 422", async () => expect((await post({ text: "x", tags: ["a", "b", "c", "d", "e", "f"] })).status).toBe(422));
test("invalid tag characters return 422", async () => expect((await post({ text: "x", tags: ["no spaces"] })).status).toBe(422));
test("tag longer than 20 chars returns 422", async () => expect((await post({ text: "x", tags: ["a".repeat(21)] })).status).toBe(422));
test("text over 500 chars returns 422", async () => expect((await post({ text: "a".repeat(501) })).status).toBe(422));
test("malformed JSON returns 400", async () => expect((await post(undefined, "{bad")).status).toBe(400));
test("filter notes by tag", async () => {
  await post({ text: "find me", tags: ["blue"] });
  await post({ text: "not me", tags: ["red"] });
  const texts = (await all("tag=blue")).map((n: any) => n.text);
  expect(texts).toContain("find me");
  expect(texts).not.toContain("not me");
});
test("tag filter is case-insensitive", async () => {
  await post({ text: "case", tags: ["green"] });
  expect((await all("tag=GREEN")).map((n: any) => n.text)).toContain("case");
});
test("existing notes have empty tags", async () => {
  const first = (await all("x=1")).find((n: any) => n.id === 1);
  expect(first.tags).toEqual([]);
});
test("GET /tags lists counts, most used first, then by name", async () => {
  await post({ text: "t1", tags: ["zeta", "alpha"] });
  await post({ text: "t2", tags: ["zeta"] });
  const { status, body } = await get("/tags");
  expect(status).toBe(200);
  const names = body.items.map((t: any) => t.name);
  expect(names.indexOf("zeta")).toBeLessThan(names.indexOf("alpha"));
  expect(body.items.find((t: any) => t.name === "zeta").count).toBe(2);
});
