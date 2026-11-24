// Renders an SVG or HTML file to a PNG with headless Chromium (favicons, social card, a look at hand-made SVG).
// Usage: node rasterize.cjs <in.svg|in.html> <out.png> <width> [height]
// Height defaults to the SVG's aspect ratio, or 630 for HTML. Needs the global Playwright (npm i -g playwright).
const { execSync } = require("node:child_process");
const { mkdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"))); }

const [input, out, w, h] = process.argv.slice(2);
if (!input || !out || !Number(w)) { console.error("usage: node rasterize.cjs <in.svg|in.html> <out.png> <width> [height]"); process.exit(2); }
const width = Number(w);
let height = Number(h) || 0;
if (!height && input.endsWith(".svg")) {
  const vb = readFileSync(input, "utf8").match(/viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
  height = vb ? Math.round(width * Number(vb[2]) / Number(vb[1])) : width;
}
if (!height) height = 630;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  const url = "file:///" + path.resolve(input).replace(/\\/g, "/");
  if (input.endsWith(".svg")) {
    // about:blank cannot load file:// images, so the markup goes inline and is sized to the viewport
    const svg = readFileSync(input, "utf8").replace(/<\?xml[^>]*\?>/, "").replace(/<svg/, `<svg style="display:block;width:${width}px;height:${height}px"`);
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  } else await page.goto(url);
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: out, omitBackground: input.endsWith(".svg") });
  await browser.close();
  console.log(`${out} ${width}x${height}`);
})().catch(e => { console.error(e.message); process.exit(1); });
