// Verify EMBER VOLLEY (2P via real keys), LEARN tutorial, and the watch panel.
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const INDEX = "file:///" + join(here, "..", "index.html").replace(/\\/g, "/");
const exe = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].find(existsSync);
const browser = await puppeteer.launch({ executablePath: exe, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const errors = [];
page.on("pageerror", e => errors.push(String(e.message || e)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
const G = n => page.evaluate(name => window.__interp.getGlobal(name), n);

await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(600);

// ---- EMBER VOLLEY: both players move via real keyboard ----
await page.evaluate(() => { loadVolleyCart(); startRun(); });
await sleep(400);
results.volleyTitle = (await G("state")) === "title" ? "PASS" : "FAIL";
await page.keyboard.press("KeyX");
await sleep(200);
const p1a = await G("p1y"), p2a = await G("p2y");
await page.keyboard.down("ArrowUp");   // P1 up
await page.keyboard.down("KeyD");      // P2 down
await sleep(500);
await page.keyboard.up("ArrowUp");
await page.keyboard.up("KeyD");
const p1b = await G("p1y"), p2b = await G("p2y");
results.volleyTwoPlayers = p1b < p1a - 10 && p2b > p2a + 10
  ? "PASS (p1 " + p1a + "->" + p1b + ", p2 " + p2a + "->" + p2b + ")"
  : "FAIL (" + [p1a, p1b, p2a, p2b].join(",") + ")";
// let a point happen (nobody defends forever)
let scored = "FAIL (no point in 40s)";
const t0 = Date.now();
while (Date.now() - t0 < 40000) {
  const s1 = await G("s1"), s2 = await G("s2");
  if (s1 > 0 || s2 > 0) { scored = "PASS (" + s2 + "-" + s1 + ")"; break; }
  await sleep(300);
}
results.volleyScoring = scored;
await page.screenshot({ path: join(here, "shot-volley.png") });

// ---- LEARN: pages flip with real arrow keys ----
await page.evaluate(() => { loadLearnCart(); startRun(); });
await sleep(400);
results.learnBoots = (await G("page")) === 1 ? "PASS" : "FAIL";
for (let i = 0; i < 3; i++) { await page.keyboard.press("ArrowRight"); await sleep(120); }
const pg = await G("page");
await page.keyboard.press("ArrowLeft");
await sleep(120);
const pg2 = await G("page");
const total = await page.evaluate(() => window.__interp.getGlobal("pages").len());
results.learnPaging = pg === 4 && pg2 === 3 && total === 8
  ? "PASS (8 pages, forward+back)" : "FAIL (" + pg + "," + pg2 + "," + total + ")";
// closure page: X press increments the counter
await page.evaluate(() => window.__interp.globals.set("page", 7));
await sleep(100);
await page.keyboard.press("KeyX");
await sleep(150);
await page.keyboard.press("KeyX");
await sleep(150);
results.learnClosureDemo = (await G("presses")) === 2 ? "PASS (counter_fn closure ticked twice)" : "FAIL";
await page.screenshot({ path: join(here, "shot-learn.png") });

// ---- watch panel ----
await page.evaluate(() => { loadShooterCart(); startRun(); });
await sleep(400);
await page.click("#btn-watch");
await sleep(500);
results.watchPanel = await page.evaluate(() => {
  const p = document.getElementById("watch-panel");
  const perf = document.getElementById("watch-perf");
  const rows = p.querySelectorAll(".watch-row");
  const txt = p.textContent;
  return p.classList.contains("visible") && perf && rows.length > 5 &&
    txt.indexOf("update") !== -1 && txt.indexOf("ops") !== -1 &&
    txt.indexOf("state") !== -1
    ? "PASS (" + rows.length + " globals, profiler live)"
    : "FAIL (" + rows.length + " rows)";
});
await page.screenshot({ path: join(here, "shot-watch.png") });
await page.click("#btn-watch");

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
