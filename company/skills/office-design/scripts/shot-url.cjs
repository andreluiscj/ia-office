// Screenshots a page (URL or local file) and, optionally, dumps the real styles it uses.
// Usage: node shot-url.cjs <url|file> <outPrefix> [--width 1440] [--height 860] [--slices 4] [--styles]
// Writes <outPrefix>-top.png (first viewport), <outPrefix>-s1..sN.png (viewport slices down the page, after scrolling
// through it so lazy and scroll-reveal content has appeared) and <outPrefix>-full.png. With --styles also prints JSON:
// fonts, sizes and colors of h1/h2/body/buttons/nav and the page background: real tokens for a design system.
// Needs the global Playwright (npm i -g playwright). WebGL is enabled so 3D heroes render.
const { execSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const path = require("node:path");

let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"))); }

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(`--${k}`); if (i < 0) return d; const v = a.splice(i, 2)[1]; return Number(v) || d; };
const styles = a.includes("--styles") ? (a.splice(a.indexOf("--styles"), 1), true) : false;
const width = opt("width", 1440), height = opt("height", 860), slices = opt("slices", 4);
const [target, prefix] = a;
if (!target || !prefix) { console.error("usage: node shot-url.cjs <url|file> <outPrefix> [--width N] [--height N] [--slices N] [--styles]"); process.exit(2); }
const url = /^https?:|^file:/.test(target) ? target : "file:///" + path.resolve(target).replace(/\\/g, "/");
mkdirSync(path.dirname(path.resolve(prefix)), { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
  // common consent banners: accept so they do not cover the design
  await page.evaluate(() => { const b = [...document.querySelectorAll("button,a")].find(x => /^(entendi|aceitar|accept|ok|got it|concordo)/i.test((x.textContent || "").trim())); b && b.click(); }).catch(() => {});
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: `${prefix}-top.png` });
  const step = Math.max(height * 0.85, (H - height) / Math.max(slices, 1));
  for (let i = 1; i <= slices; i++) {
    await page.evaluate(y => window.scrollTo(0, y), Math.min(i * step, H - height));
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${prefix}-s${i}.png` });
  }
  // walk the page once more so every reveal fires, then the full-page shot
  for (let y = 0; y < H; y += height * 0.7) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(250); }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(600);
  await page.screenshot({ path: `${prefix}-full.png`, fullPage: true });
  console.log(`${prefix}-top.png, -s1..s${slices}.png, -full.png (${width}x${H})`);
  if (styles) {
    const out = await page.evaluate(() => {
      const pick = (sel) => { const el = document.querySelector(sel); if (!el) return null; const c = getComputedStyle(el);
        return { font: c.fontFamily.split(",")[0].replace(/["']/g, "").trim(), size: c.fontSize, weight: c.fontWeight, lineHeight: c.lineHeight, letterSpacing: c.letterSpacing, color: c.color, bg: c.backgroundColor, radius: c.borderRadius, padding: c.padding }; };
      return { body: pick("body"), h1: pick("h1"), h2: pick("h2"), p: pick("p"), nav: pick("nav a,header a"), button: pick("button,a[class*=btn],a[class*=button]"), maxWidth: getComputedStyle(document.querySelector("main,body")).maxWidth };
    });
    console.log(JSON.stringify(out, null, 2));
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
