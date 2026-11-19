// Screen check for the Office: opens a page in headless Chromium at phone, tablet and desktop widths,
// saves a screenshot of each, and reports problems a reviewer would otherwise miss.
// Usage: node screen-check.cjs <url> [outDir] [--start "<command that serves the app>"]
// With --start it launches the app itself, waits for the URL, and stops the app at the end,
// so one command (and one permission) covers the whole check.
// Needs the global Playwright CLI (npm i -g playwright); it is resolved from the global npm folder.
const { execSync, spawn } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const path = require("node:path");

let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"))); }

const args = process.argv.slice(2);
const si = args.indexOf("--start");
const startCmd = si >= 0 ? args.splice(si, 2)[1] : null;
const url = args[0];
const outDir = args[1] || ".empresa/screens";
if (!url) { console.error('usage: node screen-check.cjs <url> [outDir] [--start "<serve command>"]'); process.exit(2); }
mkdirSync(outDir, { recursive: true });

const WIDTHS = [[375, 812], [768, 1024], [1280, 800]];

let server = null;
async function startApp() {
  if (!startCmd) return;
  server = spawn(startCmd, { shell: true, stdio: "ignore", detached: process.platform !== "win32" });
  for (let i = 0; i < 40; i++) {
    try { await fetch(url, { signal: AbortSignal.timeout(500) }); return; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`app did not answer at ${url} within 20 s (started with: ${startCmd})`);
}
function stopApp() {
  if (!server) return;
  try {
    if (process.platform === "win32") execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
    else process.kill(-server.pid);
  } catch {}
}

(async () => {
  await startApp();
  const browser = await chromium.launch();
  let problems = 0;
  for (const [w, h] of WIDTHS) {
    // reducedMotion: entrance animations would otherwise be captured mid-fade
    const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    const errors = [];
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", e => errors.push(String(e)));
    page.on("requestfailed", r => errors.push(`request failed: ${r.url()}`));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const file = path.join(outDir, `screen-${w}.png`);
    await page.screenshot({ path: file, fullPage: true, animations: "disabled" });

    const r = await page.evaluate(() => {
      const visible = el => { const s = getComputedStyle(el), b = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0; };
      const name = el => (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "").trim();
      const label = el => name(el) || `<${el.tagName.toLowerCase()} unnamed>`;
      const controls = [...document.querySelectorAll("button, a[href], input, select, textarea, [role=button]")].filter(visible);
      return {
        horizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
        smallTargets: controls.filter(el => { const b = el.getBoundingClientRect(); return b.width < 24 || b.height < 24; }).map(label).slice(0, 5),
        under44: controls.filter(el => { const b = el.getBoundingClientRect(); return b.width < 44 || b.height < 44; }).length,
        unnamedControls: controls.filter(el => !name(el) && !(el.labels && el.labels.length)).length,
        imagesWithoutAlt: [...document.images].filter(i => !i.hasAttribute("alt")).length,
        invisibleText: [...document.querySelectorAll("li, p, td, h1, h2, h3")].filter(el => visible(el) && el.textContent.trim() && Number(getComputedStyle(el).opacity) === 0).length,
        smallText: [...document.querySelectorAll("p, li, td, label, button, a")].filter(el => visible(el) && el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize) < 14).length,
        title: document.title, lang: document.documentElement.lang,
      };
    });
    const issues = [];
    if (errors.length) issues.push(`console/page errors: ${errors.slice(0, 3).join(" | ")}`);
    if (r.horizontalScroll) issues.push("horizontal scroll");
    if (r.smallTargets.length) issues.push(`targets under 24px (WCAG 2.2 minimum): ${r.smallTargets.join(", ")}`);
    if (r.unnamedControls) issues.push(`${r.unnamedControls} controls without an accessible name`);
    if (r.imagesWithoutAlt) issues.push(`${r.imagesWithoutAlt} images without alt`);
    if (r.invisibleText) issues.push(`${r.invisibleText} text elements rendered with opacity 0`);
    if (w === 375 && r.under44) issues.push(`${r.under44} touch targets under 44px on phone (recommended)`);
    if (w === 375 && r.smallText) issues.push(`${r.smallText} text elements under 14px on phone`);
    if (!r.title) issues.push("missing <title>");
    if (!r.lang) issues.push("missing lang on <html>");
    problems += issues.length;
    console.log(`${w}px  ${file}  ${issues.length ? "ISSUES: " + issues.join("; ") : "ok"}`);
    await page.close();
  }
  await browser.close();
  stopApp();
  console.log(problems ? `${problems} issue(s). Open the screenshots and fix or justify each.` : "No automatic issues. Still open the screenshots and look at them.");
  process.exit(problems ? 1 : 0);
})().catch(e => { stopApp(); console.error(String(e)); process.exit(2); });
