import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.js";

const PUBLIC = join(fileURLToPath(new URL("..", import.meta.url)), "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

export function createApp(store = createStore()) {
  const send = (res, status, body) => {
    if (status === 204) { res.writeHead(204); return res.end(); }
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
  };
  const readBody = (req) => new Promise((resolve) => {
    let raw = ""; req.on("data", (c) => (raw += c));
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve(null); } });
  });

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const m = url.pathname.match(/^\/api\/tasks(?:\/(\d+))?$/);
    if (!m) {
      const file = join(PUBLIC, url.pathname === "/" ? "index.html" : url.pathname);
      if (!file.startsWith(PUBLIC) || !existsSync(file)) { res.writeHead(404); return res.end("Não encontrado"); }
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      return res.end(readFileSync(file));
    }
    const id = m[1] ? Number(m[1]) : null;

    if (req.method === "GET" && id === null) return send(res, 200, store.all());

    if (req.method === "POST" && id === null) {
      const body = await readBody(req);
      if (!body || typeof body.title !== "string" || !body.title.trim()) return send(res, 400, { error: "title é obrigatório" });
      return send(res, 201, store.add({ title: body.title.trim() }));
    }

    if (req.method === "PATCH" && id !== null) {
      const task = store.find(id);
      if (!task) return send(res, 404, { error: "tarefa não encontrada" });
      const body = await readBody(req);
      if (!body) return send(res, 400, { error: "JSON inválido" });
      if (typeof body.done === "boolean") task.done = body.done;
      return send(res, 200, task);
    }

    if (req.method === "DELETE" && id !== null) {
      return store.remove(id) ? send(res, 204) : send(res, 404, { error: "tarefa não encontrada" });
    }
    send(res, 405, { error: "método não permitido" });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, () => console.log(`Tarefas em http://localhost:${port}`));
}
