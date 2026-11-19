// Drives the web UI of an InvoiceDesk build in headless Edge/Chrome (Chrome DevTools Protocol, no dependencies):
// real clicks and typing through the UI, screenshots at desktop and phone width, and an accessibility/layout audit.
//   node bench/saas/ui.mjs <project-dir> <out-dir> <label>   -> prints JSON, writes <out-dir>/<label>-*.png
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import net from "node:net";

const [dir, out, label] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const BROWSER = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(existsSync);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const freePort = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const steps = [];
const step = (name, pass, detail = "") => { steps.push({ name, pass: !!pass, detail: String(detail).slice(0, 200) }); };

const appPort = await freePort(), dbg = await freePort();
const db = join(tmpdir(), `ui-${label}-${Date.now()}.db`), prof = join(tmpdir(), `ui-prof-${label}-${Date.now()}`);
const server = spawn(process.execPath, ["server.js"], { cwd: dir, env: { ...process.env, PORT: String(appPort), DB_PATH: db }, stdio: "ignore" });
const browser = spawn(BROWSER, [`--remote-debugging-port=${dbg}`, `--user-data-dir=${prof}`, "--headless=new", "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const base = `http://127.0.0.1:${appPort}`;
let ws, id = 0; const pending = new Map();
async function connect() {
  for (let i = 0; i < 80; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${dbg}/json`)).json();
      const t = tabs.find(x => x.type === "page"); if (!t) throw 0;
      ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
      ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
      return;
    } catch { await sleep(250); }
  }
  throw new Error("browser did not start");
}
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? (r.result?.exceptionDetails ? { __error: r.result.exceptionDetails.exception?.description?.slice(0, 200) } : undefined); };
const shot = async name => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(out, `${label}-${name}.png`), Buffer.from(r.result.data, "base64")); };
const view = async (w, h, mobile) => { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(250); };
const go = async url => { await send("Page.navigate", { url }); await sleep(900); };

// in-page helpers, injected before every step
const H = `
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const vis=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);
const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value');d.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
const labelOf=el=>{let t='';if(el.id){const l=document.querySelector('label[for="'+el.id+'"]');if(l)t=l.textContent;}if(!t){const l=el.closest('label');if(l)t=l.textContent;}if(!t&&el.getAttribute('aria-label'))t=el.getAttribute('aria-label');if(!t){const p=el.parentElement;const l=p&&p.querySelector('label');if(l)t=l.textContent;}return t.trim().toLowerCase();};
const field=(root,re)=>[...root.querySelectorAll('input,select,textarea')].filter(vis).find(e=>re.test(labelOf(e)+' '+(e.name||'')+' '+(e.id||'')+' '+(e.placeholder||'')));
const link=re=>[...document.querySelectorAll('a,button')].filter(vis).find(e=>re.test(e.textContent.trim()));
const text=()=>document.body.innerText.replace(/\\s+/g,' ');
`;
const run = body => ev(H + body);

try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base + "/")).status) break; } catch {} await sleep(150); }
  await connect(); await send("Page.enable"); await send("Runtime.enable");
  const consoleErrors = []; // captured via an in-page hook, installed on each load
  const email = `ui-${Date.now()}@example.com`, PW = "correct-horse-battery-9";

  await view(1280, 800, false); await go(base + "/");
  await shot("1-login-desktop");
  await view(390, 844, true); await shot("1-login-phone"); await view(1280, 800, false);

  // sign up through the UI
  const su = await run(`
    let forms=[...document.querySelectorAll('form')].filter(vis);
    if(!forms.some(f=>field(f,/org|company|team/i))){const t=link(/create (an )?(account|organi[sz]ation)|sign ?up|register|new here/i); if(t){t.click(); await sleep(600); forms=[...document.querySelectorAll('form')].filter(vis);}}
    const f=forms.find(f=>field(f,/org|company|team/i)&&field(f,/password/i))||forms.find(f=>f.querySelectorAll('input').length>=3);
    if(!f) return 'no signup form';
    set(field(f,/org|company|team/i),'Acme Studio'); set(field(f,/e-?mail/i),${JSON.stringify(email)}); set(field(f,/password/i),${JSON.stringify(PW)});
    (f.querySelector('button[type=submit],button:not([type])')||{click:()=>f.requestSubmit()}).click();
    for(let i=0;i<30;i++){await sleep(150); if(/dashboard|invoices used|log out|sign out/i.test(text())) return 'ok';}
    return 'timeout: '+text().slice(0,160);`);
  step("Sign up through the UI lands on the dashboard", su === "ok", su);
  await sleep(400); await shot("2-dashboard-desktop");
  const dup = await run(`return (text().match(/Total billed/g)||[]).length`);
  step("Dashboard is rendered once after sign-up (no duplicated content)", dup === 1, `"Total billed" appears ${dup}x`);

  // clients
  const cl = await run(`
    const a=link(/^clients?$/i); if(!a) return 'no clients link'; a.click(); await sleep(700);
    const f=[...document.querySelectorAll('form')].filter(vis).find(f=>field(f,/name/i)&&field(f,/e-?mail/i)); if(!f) return 'no client form: '+text().slice(0,120);
    set(field(f,/name/i),'Globex Corp'); set(field(f,/e-?mail/i),'billing@globex.test'); f.requestSubmit(); await sleep(900);
    return /Globex Corp/.test(text())?'ok':'client not listed: '+text().slice(0,160);`);
  step("Create a client through the UI and see it listed", cl === "ok", cl);
  await shot("3-clients-desktop");

  // invoice with two lines
  const iv = await run(`
    const a=link(/^invoices?$/i); if(!a) return 'no invoices link'; a.click(); await sleep(700);
    const f=[...document.querySelectorAll('form')].filter(vis).find(f=>f.querySelector('select')&&field(f,/descr/i)); if(!f) return 'no invoice form: '+text().slice(0,140);
    const sel=f.querySelector('select'); const opt=[...sel.options].find(o=>/globex/i.test(o.textContent)); if(!opt) return 'client not in select'; set(sel,opt.value);
    set(field(f,/descr/i),'Design work'); set(field(f,/qty|quant/i),'3'); set(field(f,/price/i),'120.50');
    const add=[...f.querySelectorAll('button')].find(b=>/add (line|item)|\\+/i.test(b.textContent));
    let second='no add-line button'; if(add){add.click(); await sleep(300); const ds=[...f.querySelectorAll('input')].filter(vis).filter(e=>/descr/i.test(labelOf(e)+e.name)); const qs=[...f.querySelectorAll('input')].filter(vis).filter(e=>/qty|quant/i.test(labelOf(e)+e.name)); const ps=[...f.querySelectorAll('input')].filter(vis).filter(e=>/price/i.test(labelOf(e)+e.name)); if(ds.length>1){set(ds[1],'Hosting'); set(qs[1],'1'); set(ps[1],'9.99'); second='ok';} else second='second line did not appear';}
    f.requestSubmit(); await sleep(1100);
    return JSON.stringify({second, listed:/INV-0001/.test(text()), total:/\\$?381[.,]49|381[.,]49/.test(text()), page:text().slice(0,200)});`);
  let ivo = {}; try { ivo = JSON.parse(iv); } catch {}
  step("Create a 2-line invoice through the UI (client select, add line)", ivo.listed === true, iv);
  step("UI shows the correct total (3 x 120.50 + 9.99 = 371.49)", /371[.,]49/.test(String(iv)) || ivo.total === true || (await run(`return /371[.,]49/.test(text())`)) === true, "");
  await shot("4-invoices-desktop");

  // XSS through the UI
  const xs = await run(`
    window.__x=0; window.alert=()=>{window.__x++};
    const a=link(/^clients?$/i); a.click(); await sleep(600);
    const f=[...document.querySelectorAll('form')].filter(vis).find(f=>field(f,/name/i)&&field(f,/e-?mail/i));
    set(field(f,/name/i),'<img src=x onerror=alert(1)><script>alert(2)</script>'); set(field(f,/e-?mail/i),'x@x.test'); f.requestSubmit(); await sleep(900);
    return JSON.stringify({fired:window.__x, injected:!!document.querySelector('main img[src="x"], #app img[src="x"], img[src="x"]'), shown:/<img src=x/.test(text())});`);
  let xo = {}; try { xo = JSON.parse(xs); } catch {}
  step("Stored XSS payload is shown as text, nothing executes", xo.fired === 0 && xo.injected === false, xs);

  // phone layout of the logged-in app
  await view(390, 844, true); await go(base + "/"); await sleep(700);
  await run(`const a=link(/^invoices?$/i); if(a) a.click(); await sleep(600);`); await shot("5-invoices-phone");
  await run(`const a=link(/^dashboard$/i); if(a) a.click(); await sleep(600);`); await shot("6-dashboard-phone");
  const overflowPhone = await run(`return document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  step("No horizontal scroll at 390 px width", overflowPhone <= 1, `overflow=${overflowPhone}px`);
  await view(1280, 800, false);

  // audit of the logged-in dashboard + login page
  const audit = async () => run(`
    const all=[...document.querySelectorAll('input,select,textarea')].filter(vis);
    const unl=all.filter(e=>!labelOf(e)).length;
    const btn=[...document.querySelectorAll('button,a')].filter(vis); const nameless=btn.filter(b=>!(b.textContent.trim()||b.getAttribute('aria-label')||b.title)).length;
    const lum=c=>{const m=c.match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]);};
    const bgOf=e=>{while(e){const b=getComputedStyle(e).backgroundColor;const m=b.match(/[\\d.]+/g);if(m&&(m.length<4||Number(m[3])>0.5))return b;e=e.parentElement;}return 'rgb(255,255,255)';};
    const ratios=[...document.querySelectorAll('p,td,th,label,a,button,h1,h2,h3,li,span')].filter(vis).filter(e=>e.textContent.trim()&&e.children.length===0).slice(0,120).map(e=>{const c=getComputedStyle(e).color,b=bgOf(e);const l1=lum(c),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);});
    const low=ratios.filter(r=>r<4.5).length;
    return JSON.stringify({lang:document.documentElement.lang||'', viewport:!!document.querySelector('meta[name=viewport]'), h1:document.querySelectorAll('h1').length, main:!!document.querySelector('main,[role=main]'), nav:!!document.querySelector('nav,[role=navigation]'), skipLink:!!document.querySelector('a[href^="#"][class*=skip],a.skip,a[href="#main"],a[href="#content"]'), inputs:all.length, unlabelled:unl, namelessButtons:nameless, textNodesChecked:ratios.length, lowContrast:low, minContrast:Math.round(Math.min(...ratios,21)*10)/10});`);
  const a1 = JSON.parse(await audit());
  await run(`const a=link(/^dashboard$/i); if(a) a.click(); await sleep(500);`);
  step("Accessibility basics: lang, viewport, main, h1, labelled inputs, named buttons", a1.lang && a1.viewport && a1.main && a1.h1 >= 1 && a1.unlabelled === 0 && a1.namelessButtons === 0, JSON.stringify(a1));

  // after the UI work: check the server-side data is right (independent of the UI text)
  const login = await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json", "x-requested-with": "fetch" }, body: JSON.stringify({ email, password: PW }) });
  const cookie = (login.headers.getSetCookie?.() ?? []).map(c => c.split(";")[0]).join("; ");
  const invs = await (await fetch(base + "/api/invoices", { headers: { cookie } })).json().catch(() => []);
  const total = Array.isArray(invs) && invs[0]?.total;
  step("Invoice created by the UI is stored correctly (37149 cents)", total === 37149, `total=${total} items=${JSON.stringify(invs?.[0]?.items)?.slice(0, 120)}`);

  console.log(JSON.stringify({ label, steps, audit: a1 }));
} catch (e) {
  steps.push({ name: "UI driver aborted", pass: false, detail: e.message });
  console.log(JSON.stringify({ label, steps }));
} finally {
  try { ws?.close(); } catch {}
  browser.kill(); server.kill();
  await sleep(500);
  for (const s of ["", "-wal", "-shm"]) { try { rmSync(db + s, { force: true }); } catch {} }
  try { rmSync(prof, { recursive: true, force: true }); } catch {}
  process.exit(0);
}
