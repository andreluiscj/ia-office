import { expect, test } from "bun:test";
import { handle } from "../src/server";

const ids = async (q: string) => (await (await handle(new Request("http://x/notes" + q))).json()).items.map((n: any) => n.id);

test("page 1 starts at the first note", async () => expect(await ids("?page=1&limit=2")).toEqual([1, 2]));
test("page 2 follows", async () => expect(await ids("?page=2&limit=2")).toEqual([3, 4]));
test("last partial page", async () => expect(await ids("?page=4&limit=2")).toEqual([7]));
test("beyond last page is empty", async () => expect(await ids("?page=9&limit=2")).toEqual([]));
test("default page returns first five", async () => expect((await ids("")).length).toBe(5));
