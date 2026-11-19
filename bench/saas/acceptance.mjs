// Independent acceptance + security checks for an InvoiceDesk implementation.
//   node bench/saas/acceptance.mjs <project-dir>      -> prints JSON {checks:[{id,group,name,pass,detail}]}
// The checks are written against bench/saas/prompt.md only; they know nothing about the implementation.
import { spawn } from "node:child_process";
import { readFileSync, existsSync, rmSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import net from "node:net";

const dir = process.argv[2];
const checks = [];
const add = (id, group, name, pass, detail = "") => checks.push({ id, group, name, pass: !!pass, detail: String(detail).slice(0, 160) });

const freePort = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let proc, base, dbPath;
async function start(port, db) {
  proc = spawn(process.execPath, ["server.js"], { cwd: dir, env: { ...process.env, PORT: String(port), DB_PATH: db }, stdio: ["ignore", "pipe", "pipe"] });
  proc.stdout.on("data", () => {}); proc.stderr.on("data", () => {});
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/`); if (r.status) return true; } catch {} await sleep(150); }
  return false;
}
const stop = () => new Promise(r => { if (!proc) return r(); proc.once("exit", r); proc.kill(); setTimeout(r, 1500); });

// tiny client with its own cookie jar
function client() {
  let cookie = "";
  const call = async (method, path, body, { csrf = true, raw, headers = {} } = {}) => {
    const h = { ...headers };
    if (cookie) h.cookie = cookie;
    if (csrf && method !== "GET") h["x-requested-with"] = "fetch";
    if (body !== undefined && !raw) h["content-type"] = "application/json";
    const res = await fetch(base + path, { method, headers: h, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)), redirect: "manual" });
    const sc = res.headers.getSetCookie?.() ?? [];
    for (const c of sc) { const [kv] = c.split(";"); const [k] = kv.split("="); cookie = cookie.split("; ").filter(x => x && !x.startsWith(k + "=")).concat(kv).join("; "); }
    let json = null, text = "";
    try { text = await res.text(); json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers, setCookie: sc };
  };
  return { call, get cookie() { return cookie; } };
}
const uniq = () => Math.random().toString(36).slice(2, 8);
const PW = "correct-horse-battery-9";

try {
  if (!existsSync(join(dir, "server.js"))) { add("F0", "functional", "server.js exists", false); throw new Error("no server.js"); }
  const port = await freePort(); base = `http://127.0.0.1:${port}`;
  dbPath = join(tmpdir(), `invoicedesk-${uniq()}.db`);
  const up = await start(port, dbPath);
  add("F0", "functional", "server starts and answers on PORT", up);
  if (!up) throw new Error("server did not start");

  const A = client(), B = client(), M = client();
  const emailA = `a-${uniq()}@example.com`, emailB = `b-${uniq()}@example.com`;
  let r = await A.call("POST", "/api/signup", { email: emailA, password: PW, orgName: "Org A" });
  add("F1", "functional", "signup creates org and owner (201 + cookie)", r.status === 201 && r.json?.user?.role === "owner" && r.json?.org?.plan && A.cookie.includes("sid="), `${r.status} ${JSON.stringify(r.json).slice(0, 80)}`);
  const sidSignup = A.cookie;
  r = await A.call("GET", "/api/me");
  add("F2", "functional", "GET /api/me returns the session user", r.status === 200 && r.json?.user?.email === emailA);
  r = await client().call("POST", "/api/signup", { email: emailA, password: PW, orgName: "Dup" });
  add("F3", "functional", "duplicate email -> 409", r.status === 409, r.status);
  r = await client().call("POST", "/api/signup", { email: `x-${uniq()}@example.com`, password: "short", orgName: "X" });
  const v1 = r.status === 400;
  r = await client().call("POST", "/api/signup", { email: "not-an-email", password: PW, orgName: "X" });
  const v2 = r.status === 400;
  r = await client().call("POST", "/api/signup", { email: `y-${uniq()}@example.com`, password: PW, orgName: "  " });
  add("F4", "functional", "signup validation (short password, bad email, empty org -> 400)", v1 && v2 && r.status === 400);
  const L = client();
  r = await L.call("POST", "/api/login", { email: emailA, password: "wrong-password-1" });
  const bad = r.status === 401;
  r = await L.call("POST", "/api/login", { email: emailA, password: PW });
  add("F5", "functional", "login: wrong password 401, right password 200 + cookie", bad && r.status === 200 && L.cookie.includes("sid="));
  add("S13", "security", "new session id on every login (no fixation)", L.cookie && L.cookie !== sidSignup, "");

  r = await A.call("POST", "/api/clients", { name: "Acme Ltd", email: "billing@acme.test" });
  const clientA = r.json?.id;
  add("F6", "functional", "create client (201) and list it", r.status === 201 && !!clientA && (await A.call("GET", "/api/clients")).json?.some?.(c => c.id === clientA));

  r = await A.call("POST", "/api/invoices", { clientId: clientA, items: [{ description: "Design", qty: 3, unitPrice: 12050 }, { description: "Hosting", qty: 1, unitPrice: 999 }], total: 1 });
  const inv1 = r.json?.id;
  add("F7", "functional", "invoice total computed server-side in cents (3*12050+999=37149), ignores client total", r.status === 201 && r.json?.total === 37149 && r.json?.status === "draft", `${r.status} total=${r.json?.total}`);
  add("F8", "functional", "invoice numbers sequential per org (INV-0001)", r.json?.number === "INV-0001", r.json?.number);
  r = await A.call("POST", "/api/invoices", { clientId: clientA, items: [{ description: "x", qty: 1, unitPrice: 100 }] });
  add("F8b", "functional", "second invoice is INV-0002", r.json?.number === "INV-0002", r.json?.number);
  r = await A.call("GET", `/api/invoices/${inv1}`);
  add("F9", "functional", "GET /api/invoices/:id returns it", r.status === 200 && r.json?.id === inv1);
  for (let i = 0; i < 3; i++) await A.call("POST", "/api/invoices", { clientId: clientA, items: [{ description: "y", qty: 1, unitPrice: 100 }] });
  r = await A.call("POST", "/api/invoices", { clientId: clientA, items: [{ description: "z", qty: 1, unitPrice: 100 }] });
  add("F10", "functional", "free plan: 6th invoice -> 402", r.status === 402, r.status);
  // validation
  const bodies = [
    { clientId: clientA, items: [{ description: "n", qty: -1, unitPrice: 100 }] },
    { clientId: clientA, items: [{ description: "n", qty: 1, unitPrice: 0.5 }] },
    { clientId: clientA, items: [] },
    { clientId: clientA, items: [{ description: "n", qty: 1001, unitPrice: 1 }] },
    { clientId: clientA, items: [{ description: "n".repeat(500), qty: 1, unitPrice: 1 }] },
  ];
  const codes = []; for (const b of bodies) codes.push((await A.call("POST", "/api/invoices", b)).status);
  add("F11", "functional", "invoice validation (negative qty, float price, no items, qty>1000, long text) never 201", codes.every(c => c >= 400 && c < 500 && c !== 402 || c === 402), codes.join(","));
  r = await A.call("POST", "/api/billing/upgrade", {});
  const pro = r.status === 200 && r.json?.org?.plan === "pro";
  r = await A.call("POST", "/api/invoices", { clientId: clientA, items: [{ description: "after upgrade", qty: 1, unitPrice: 100 }] });
  add("F12", "functional", "upgrade to pro lifts the 5-invoice limit", pro && r.status === 201, `${pro} ${r.status}`);

  // members and roles
  const memEmail = `m-${uniq()}@example.com`;
  r = await A.call("POST", "/api/members", { email: memEmail, password: PW });
  const memOk = r.status === 201 && r.json?.role === "member";
  await M.call("POST", "/api/login", { email: memEmail, password: PW });
  const meM = await M.call("GET", "/api/me");
  const sameOrg = meM.json?.org?.id === (await A.call("GET", "/api/me")).json?.org?.id;
  add("F13", "functional", "owner creates a member in the same org who can log in", memOk && meM.status === 200 && sameOrg);
  r = await M.call("POST", "/api/members", { email: `n-${uniq()}@example.com`, password: PW });
  const memCant = r.status === 403;
  r = await M.call("DELETE", `/api/invoices/${inv1}`);
  const memCantDel = r.status === 403;
  add("S14", "security", "member cannot create members or delete invoices (403)", memCant && memCantDel, `${memCant} ${memCantDel}`);
  r = await M.call("POST", "/api/billing/upgrade", {});
  add("S14b", "security", "member cannot upgrade billing (403)", r.status === 403, r.status);
  r = await A.call("DELETE", `/api/invoices/${inv1}`);
  add("F14", "functional", "owner deletes invoice (204)", r.status === 204 && (await A.call("GET", `/api/invoices/${inv1}`)).status === 404, r.status);
  r = await A.call("POST", "/api/logout"); const afterLogout = await A.call("GET", "/api/me");
  add("F15", "functional", "logout invalidates the session", r.status === 204 && afterLogout.status === 401, `${r.status}/${afterLogout.status}`);
  await A.call("POST", "/api/login", { email: emailA, password: PW });

  // ---- tenant B
  r = await B.call("POST", "/api/signup", { email: emailB, password: PW, orgName: "Org B" });
  const orgB = r.json?.org?.id;
  const a2 = await A.call("POST", "/api/invoices", { clientId: clientA, items: [{ description: "secret", qty: 1, unitPrice: 777 }] });
  const secretId = a2.json?.id;
  r = await B.call("GET", `/api/invoices/${secretId}`);
  const s2a = r.status === 404 || r.status === 403;
  const list = await B.call("GET", "/api/invoices");
  const s2b = Array.isArray(list.json) && !list.json.some(i => i.id === secretId);
  const cl = await B.call("GET", "/api/clients");
  const s2c = Array.isArray(cl.json) && !cl.json.some(c => c.id === clientA);
  r = await B.call("POST", "/api/invoices", { clientId: clientA, items: [{ description: "x", qty: 1, unitPrice: 1 }] });
  const s2d = r.status >= 400 && r.status < 500;
  r = await B.call("DELETE", `/api/invoices/${secretId}`);
  const s2e = r.status === 404 || r.status === 403;
  add("S2", "security", "tenant isolation: B cannot read, list, use the client of, or delete A's data", s2a && s2b && s2c && s2d && s2e, `${s2a}${s2b}${s2c}${s2d}${s2e}`);
  r = await client().call("POST", "/api/signup", { email: `c-${uniq()}@example.com`, password: PW, orgName: "C", role: "owner", orgId: orgB, plan: "pro" });
  add("S9", "security", "mass assignment: extra signup fields (orgId, plan) are ignored", r.status === 201 && r.json?.org?.id !== orgB && r.json?.org?.plan !== "pro", JSON.stringify(r.json?.org));

  // ---- auth / csrf
  r = await client().call("GET", "/api/clients");
  const u1 = r.status === 401;
  r = await client().call("GET", "/api/invoices"); const u2 = r.status === 401;
  r = await client().call("POST", "/api/invoices", { clientId: 1, items: [] }); const u3 = r.status === 401 || r.status === 403;
  add("S1", "security", "unauthenticated access to protected routes -> 401", u1 && u2 && u3);
  r = await A.call("POST", "/api/clients", { name: "no csrf", email: "n@x.test" }, { csrf: false });
  const c1 = r.status === 403;
  r = await A.call("DELETE", `/api/invoices/${secretId}`, undefined, { csrf: false });
  add("S3", "security", "state-changing requests without X-Requested-With -> 403", c1 && r.status === 403, `${c1} ${r.status}`);

  // ---- injection
  r = await client().call("POST", "/api/login", { email: "' OR '1'='1", password: "' OR '1'='1" });
  const i1 = r.status === 401 || r.status === 400;
  r = await client().call("POST", "/api/login", { email: `${emailA}' --`, password: PW }); const i2 = r.status === 401 || r.status === 400;
  const nasty = "Robert'); DROP TABLE clients;--";
  r = await A.call("POST", "/api/clients", { name: nasty, email: "r@x.test" });
  const listN = await A.call("GET", "/api/clients");
  add("S5", "security", "SQL injection: login payloads rejected, quote/DROP payload stored as plain text", i1 && i2 && r.status === 201 && listN.json?.some?.(c => c.name === nasty), `${i1}${i2} ${r.status}`);

  // ---- passwords
  const dbBytes = existsSync(dbPath) ? readFileSync(dbPath).toString("latin1") : "";
  const walBytes = existsSync(dbPath + "-wal") ? readFileSync(dbPath + "-wal").toString("latin1") : "";
  const leaked = (await A.call("GET", "/api/me")).text.includes(PW) || (await A.call("GET", "/api/clients")).text.includes("password");
  add("S4", "security", "password not stored in plaintext and never returned by the API", (dbBytes + walBytes).length > 0 && !(dbBytes + walBytes).includes(PW) && !leaked, `dbBytes=${(dbBytes + walBytes).length}`);

  // ---- cookie + headers
  const ck = (await client().call("POST", "/api/login", { email: emailA, password: PW })).setCookie.join(" | ");
  add("S6", "security", "session cookie is HttpOnly and SameSite", /httponly/i.test(ck) && /samesite=(lax|strict)/i.test(ck), ck.slice(0, 120));
  const home = await client().call("GET", "/");
  const h = home.headers;
  const csp = h.get("content-security-policy") || "";
  add("S7", "security", "security headers: CSP, nosniff, frame protection, referrer policy", !!csp && /nosniff/i.test(h.get("x-content-type-options") || "") && (/frame-ancestors/i.test(csp) || !!h.get("x-frame-options")) && !!h.get("referrer-policy"), csp.slice(0, 100));
  add("S7b", "security", "CSP does not allow unsafe-inline scripts or eval", csp !== "" && !/script-src[^;]*'unsafe-(inline|eval)'/i.test(csp) && !(/default-src[^;]*'unsafe-inline'/i.test(csp) && !/script-src/i.test(csp)), csp.slice(0, 100));
  const apiHdr = (await A.call("GET", "/api/me")).headers;
  add("S7c", "security", "security headers also on API responses", !!apiHdr.get("x-content-type-options"));

  // ---- errors and limits
  r = await A.call("POST", "/api/clients", undefined, { raw: "{not json" , headers: { "content-type": "application/json" } });
  const e1 = r.status === 400 && r.json && typeof r.json.error === "string" && !/\bat .*\(.*:\d+:\d+\)|node_modules|\.js:\d+/.test(r.text);
  r = await A.call("GET", "/api/invoices/not-a-number"); const e2 = [400, 404].includes(r.status) && !/\bat .*:\d+:\d+|SQLITE|sqlite/i.test(r.text);
  add("S11", "security", "malformed input gives clean JSON errors without stack traces or SQL", e1 && e2, `${e1} ${e2}`);
  r = await A.call("POST", "/api/clients", undefined, { raw: JSON.stringify({ name: "x".repeat(1_200_000), email: "a@b.test" }), headers: { "content-type": "application/json" } });
  add("S12", "security", "request body over 1 MB -> 413", r.status === 413, r.status);
  const bf = client(); const victim = `bf-${uniq()}@example.com`;
  await bf.call("POST", "/api/signup", { email: victim, password: PW, orgName: "BF" });
  const bfl = client(); let got429 = false;
  for (let i = 0; i < 8; i++) { const x = await bfl.call("POST", "/api/login", { email: victim, password: "wrong-wrong-1" + i }); if (x.status === 429) got429 = true; }
  const afterLock = await bfl.call("POST", "/api/login", { email: victim, password: PW });
  add("S8", "security", "brute force: login locked (429) after repeated failures, even with the right password", got429 && afterLock.status === 429, `429=${got429} next=${afterLock.status}`);

  // ---- UI
  r = await client().call("GET", "/");
  const html = r.text;
  const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/gi)].map(m => m[1]);
  let scriptText = ""; for (const sp of srcs) scriptText += (await client().call("GET", sp.startsWith("/") ? sp : "/" + sp)).text;
  add("F16", "functional", "GET / serves an HTML app with login/signup inputs (in the HTML or its script)", r.status === 200 && /<html/i.test(html) && /type="?password|['"]password['"]/i.test(html + scriptText), `${r.status} ${html.length}b scripts=${srcs.length}`);
  const ui = [html.includes('lang='), /viewport/.test(html), /<label|aria-label/.test(html + scriptText)];
  add("F17", "functional", "UI basics: lang attribute, viewport meta, labelled inputs", ui.every(Boolean), ui.join(","));

  // ---- deep security probes (harder than the contract)
  const D1 = client();
  const dEmail = `d-${uniq()}@example.com`;
  await D1.call("POST", "/api/signup", { email: dEmail, password: PW, orgName: "Deep" });
  const dClient = (await D1.call("POST", "/api/clients", { name: "C", email: "c@x.test" })).json?.id;
  // path traversal / source exposure on the static handler
  const trav = [];
  for (const p of ["/..%2fserver.js", "/%2e%2e/server.js", "/public/../server.js", "/../server.js", "/server.js", "/package.json", "/src/app.js", "/data.db", "/%2e%2e%2f%2e%2e%2fetc/passwd", "/..\\server.js"]) {
    const x = await fetch(base + p, { redirect: "manual" }).catch(() => ({ status: 0, text: async () => "" }));
    const body = await x.text().catch(() => "");
    trav.push(!(x.status === 200 && /createServer|require\(|node:http|DatabaseSync|"name"\s*:/.test(body)));
  }
  add("D1", "security", "path traversal / source files are not served (10 probes)", trav.every(Boolean), trav.map(Number).join(""));
  // email canonicalization
  r = await client().call("POST", "/api/signup", { email: dEmail.toUpperCase(), password: PW, orgName: "Dup2" });
  add("D2", "security", "email uniqueness is case-insensitive (no duplicate account via upper case)", r.status === 409, r.status);
  // prototype pollution and odd bodies
  r = await client().call("POST", "/api/signup", undefined, { raw: `{"email":"p-${uniq()}@example.com","password":"${PW}","orgName":"P","__proto__":{"role":"owner","plan":"pro"},"constructor":{"prototype":{"admin":true}}}`, headers: { "content-type": "application/json" } });
  const meP = r.status === 201 ? r.json : null;
  const after = await client().call("GET", "/api/me");
  add("D3", "security", "prototype pollution payload does not elevate or break the server", (r.status === 201 || r.status === 400) && (!meP || meP.org?.plan !== "pro") && after.status === 401, r.status);
  // password length DoS
  const t0 = Date.now();
  r = await client().call("POST", "/api/signup", { email: `l-${uniq()}@example.com`, password: "a".repeat(500_000), orgName: "Long" });
  const dt = Date.now() - t0;
  add("D4", "security", "very long password rejected or handled fast (<2 s, no hash DoS)", (r.status === 400 || r.status === 413) || dt < 2000, `${r.status} ${dt}ms`);
  // ReDoS-ish email
  const t1 = Date.now();
  r = await client().call("POST", "/api/signup", { email: "a".repeat(60_000) + "@" + "b.".repeat(20_000) + "x", password: PW, orgName: "Re" });
  add("D5", "security", "huge malformed email handled fast (<2 s) and rejected", r.status === 400 && Date.now() - t1 < 2000, `${r.status} ${Date.now() - t1}ms`);
  // race on the free-plan limit
  const R1 = client(); await R1.call("POST", "/api/signup", { email: `race-${uniq()}@example.com`, password: PW, orgName: "Race" });
  const rc = (await R1.call("POST", "/api/clients", { name: "R", email: "r@x.test" })).json?.id;
  const results = await Promise.all(Array.from({ length: 12 }, () => R1.call("POST", "/api/invoices", { clientId: rc, items: [{ description: "r", qty: 1, unitPrice: 100 }] })));
  const okN = results.filter(x => x.status === 201).length, nums = results.filter(x => x.status === 201).map(x => x.json?.number);
  add("D6", "security", "race condition: 12 parallel invoices on a free plan create exactly 5, with unique numbers", okN === 5 && new Set(nums).size === nums.length, `created=${okN}`);
  // CORS
  r = await D1.call("GET", "/api/me", undefined, { headers: { origin: "https://evil.example" } });
  const acao = r.headers.get("access-control-allow-origin");
  add("D7", "security", "no permissive CORS for a foreign origin", !acao || (acao !== "*" && acao !== "https://evil.example"), acao || "none");
  // content type confusion with CSRF header present but text/plain body
  r = await D1.call("POST", "/api/clients", undefined, { raw: JSON.stringify({ name: "ct", email: "ct@x.test" }), headers: { "content-type": "text/plain" } });
  add("D8", "security", "non-JSON content-type body is rejected (415/400), not parsed", [400, 415].includes(r.status), r.status);
  // methods / unknown routes
  const tr = await fetch(base + "/", { method: "TRACE" }).catch(() => ({ status: 0 }));
  const un = await D1.call("GET", "/api/does-not-exist");
  add("D9", "security", "TRACE refused and unknown API route is a clean JSON 404", [0, 400, 404, 405, 501].includes(tr.status) && un.status === 404 && un.json && typeof un.json.error === "string", `${tr.status}/${un.status}`);
  // session expiry attribute
  const ck2 = ck; // cookie from the earlier successful login (a fresh login could hit an IP throttle caused by this suite)
  add("D10", "security", "session cookie has an expiry (Max-Age/Expires) and path", /max-age=|expires=/i.test(ck2) && /path=\//i.test(ck2), ck2.slice(0, 100));
  // user enumeration by login response / timing
  const tk = [], tu = [];
  for (let i = 0; i < 4; i++) {
    let a0 = Date.now(); const k = await client().call("POST", "/api/login", { email: dEmail, password: "wrong-wrong-" + i }); tk.push(Date.now() - a0);
    a0 = Date.now(); const u = await client().call("POST", "/api/login", { email: `nobody-${uniq()}@example.com`, password: "wrong-wrong-" + i }); tu.push(Date.now() - a0);
    if (i === 0) add("D11", "security", "same error body for unknown user and wrong password (no enumeration)", k.text === u.text && k.status === u.status, `${k.status}/${u.status}`);
  }
  const med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  add("D12", "security", "login timing for unknown vs known user is similar (within 3x, no hash skip)", Math.max(med(tk), med(tu)) < 3 * Math.max(1, Math.min(med(tk), med(tu))) + 15, `known=${med(tk)}ms unknown=${med(tu)}ms`);
  // IDOR on numeric/guessable ids with another session
  const IdA = (await D1.call("POST", "/api/invoices", { clientId: dClient, items: [{ description: "i", qty: 1, unitPrice: 5 }] })).json?.id;
  const probes = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => B.call("GET", `/api/invoices/${n}`)));
  add("D13", "security", "no IDOR: another org cannot read any of invoices 1..10 or the new one", probes.every(x => x.status === 404 || x.status === 403) && [404, 403].includes((await B.call("GET", `/api/invoices/${IdA}`)).status), "");
  // large item count and extreme total
  r = await D1.call("POST", "/api/invoices", { clientId: dClient, items: Array.from({ length: 50 }, () => ({ description: "max", qty: 1000, unitPrice: 100000000 })) });
  add("D15", "functional", "extreme totals stay exact in integer cents (50 x 1000 x 1e8 = 5e12)", r.status === 201 && r.json?.total === 5_000_000_000_000, `${r.status} ${r.json?.total}`);
  r = await D1.call("POST", "/api/invoices", { clientId: dClient, items: Array.from({ length: 51 }, () => ({ description: "x", qty: 1, unitPrice: 1 })) });
  add("D16", "functional", "more than 50 items is rejected", r.status === 400, r.status);
  // parallel brute force: concurrent wrong guesses must not slip past the attempt limit
  const pv = `par-${uniq()}@example.com`; await client().call("POST", "/api/signup", { email: pv, password: PW, orgName: "Par" });
  const par = await Promise.all(Array.from({ length: 30 }, (_, i) => client().call("POST", "/api/login", { email: pv, password: "wrong-guess-" + i })));
  const guesses = par.filter(x => x.status === 401).length;
  add("D17", "security", "parallel brute force: at most ~5 of 30 concurrent wrong guesses are evaluated (rest 429)", guesses <= 6, `${guesses} guesses were evaluated`);
  // resilience: server still alive after all the abuse
  const alive = await fetch(base + "/api/me").then(x => x.status > 0).catch(() => false);
  add("D14", "security", "server still alive and responding after the abuse above", alive);

  // ---- persistence
  await stop();
  const up2 = await start(port, dbPath);
  const P = client();
  r = await P.call("POST", "/api/login", { email: emailA, password: PW });
  const inv = await P.call("GET", "/api/invoices");
  add("F18", "functional", "data persists across a server restart", up2 && r.status === 200 && Array.isArray(inv.json) && inv.json.length >= 6, `${r.status} n=${inv.json?.length}`);
} catch (e) {
  add("ERR", "functional", "harness aborted", false, e.message);
} finally {
  await stop();
  if (dbPath) for (const s of ["", "-wal", "-shm"]) rmSync(dbPath + s, { force: true });
}
console.log(JSON.stringify({ checks }));
