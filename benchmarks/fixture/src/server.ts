type Note = { id: number; text: string };
const notes: Note[] = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, text: `note ${i + 1}` }));

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname === "/notes") {
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 5);
    return json({ items: notes.slice(page * limit, page * limit + limit), total: notes.length });
  }
  return json({ error: { code: "not_found", message: "Not found" } }, 404);
}

if (import.meta.main) Bun.serve({ port: 3000, fetch: handle });
