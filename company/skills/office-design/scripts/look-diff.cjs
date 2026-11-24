// Measures how different two screenshots look: the share of pixels that changed noticeably.
// Usage: node look-diff.cjs <before.png> <after.png> [minChangedPercent]   (exit 1 when below the minimum)
// Both images are scaled to the same width and compared pixel by pixel (sum of RGB difference > 48 = changed).
// A redesign request needs a clearly different look; refinements legitimately score low.
const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"))); }

const [fa, fb, min] = process.argv.slice(2);
if (!fa || !fb) { console.error("usage: node look-diff.cjs <before.png> <after.png> [minChangedPercent]"); process.exit(2); }
const b64 = f => "data:image/png;base64," + readFileSync(f).toString("base64");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pct = await page.evaluate(async ([A, B]) => {
    const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [ia, ib] = await Promise.all([load(A), load(B)]);
    const W = 800, H = Math.round(W * Math.min(ia.height / ia.width, ib.height / ib.width));
    const data = img => { const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.drawImage(img, 0, 0, W, H); return x.getImageData(0, 0, W, H).data; };
    const da = data(ia), db = data(ib); let n = 0;
    for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 48) n++;
    return +(100 * n / (da.length / 4)).toFixed(1);
  }, [b64(fa), b64(fb)]);
  await browser.close();
  console.log(`${pct}% of pixels changed`);
  if (min && pct < Number(min)) { console.log(`below the required ${min}%: the look did not change enough`); process.exit(1); }
})().catch(e => { console.error(e.message); process.exit(1); });
