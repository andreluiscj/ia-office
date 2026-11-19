import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { handle } from "../src/server";

// Static checks on the notes screen and any script or stylesheet it ships with.
const html = existsSync("public/notes.html") ? readFileSync("public/notes.html", "utf8") : "";
const assets = existsSync("public")
  ? readdirSync("public").filter(f => /\.(js|css)$/.test(f)).map(f => readFileSync("public/" + f, "utf8")).join("\n")
  : "";
const page = html + assets;

test("screen exists", () => expect(html.length).toBeGreaterThan(0));
test("declares language and mobile viewport", () => {
  expect(/<html[^>]*\blang=/i.test(html)).toBe(true);
  expect(/name=["']viewport["']/i.test(html)).toBe(true);
});
test("uses landmarks and a heading", () => {
  expect(/<main\b/i.test(html)).toBe(true);
  expect(/<h1\b/i.test(html)).toBe(true);
});
test("announces loading, empty and error states to assistive tech", () => expect(/aria-live|role=["'](status|alert)["']/i.test(html)).toBe(true));
test("has copy for the loading, empty and error states", () => {
  expect(/load/i.test(page)).toBe(true);
  expect(/no notes|nothing|empty/i.test(page)).toBe(true);
  expect(/error|could not|couldn't|failed|try again|retry/i.test(page)).toBe(true);
});
test("offers a retry after an error", () => expect(/retry|try again/i.test(page)).toBe(true));
test("pagination uses real buttons", () => expect((page.match(/<button\b|createElement\(["']button["']\)/gi) ?? []).length).toBeGreaterThanOrEqual(2));
test("disables pagination at the edges", () => expect(/disabled/i.test(page)).toBe(true));
test("never injects HTML from data", () => expect(/innerHTML|insertAdjacentHTML|document\.write|outerHTML/.test(page)).toBe(false));
test("respects reduced motion when it animates", () => {
  if (/transition|animation|@keyframes/i.test(page)) expect(/prefers-reduced-motion/i.test(page)).toBe(true);
});
test("visible focus is not removed", () => expect(/outline:\s*(none|0)(?![^}]*focus-visible)/i.test(page) && !/:focus-visible/i.test(page)).toBe(false));
test("reads the notes API", () => expect(/\/notes/.test(page)).toBe(true));
test("the API still paginates from page 1", async () => {
  const b = await (await handle(new Request("http://x/notes?page=1&limit=2"))).json();
  expect(b.items.map((n: any) => n.id)).toEqual([1, 2]);
});
