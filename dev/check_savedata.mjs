// STARFALL high score persistence across a real page reload.
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(600);
// load STARFALL, force a game-over with a score
const before = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  loadShooterCart(); startRun();
  await wait(400);
  const S = (n, v) => window.__interp.globals.set(n, v);
  input.setKey(5, true); await wait(60); input.setKey(5, false);
  await wait(150);
  S("score", 777); S("lives", 1); S("inv", 0);
  // ram a foe into the ship until game over
  const t0 = performance.now();
  while (performance.now() - t0 < 15000) {
    if (window.__interp.getGlobal("state") === "over") break;
    const fs = window.__interp.getGlobal("foes");
    if (fs.len() > 0) {
      fs.get(1).set("x", window.__interp.getGlobal("px"));
      fs.get(1).set("y", window.__interp.getGlobal("py"));
    }
    S("inv", 0);
    await wait(60);
  }
  return {
    state: window.__interp.getGlobal("state"),
    hi: window.__interp.getGlobal("hi"),
    stored: localStorage.getItem("fable8:data:starfall")
  };
});
// hard reload; the demo boots EMBER QUEST — load STARFALL again
await page.goto(INDEX + "?r=2", { waitUntil: "load" });
await sleep(600);
const after = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  loadShooterCart(); startRun();
  await wait(400);
  return { hiAfterReload: window.__interp.getGlobal("hi") };
});
console.log(JSON.stringify({ ...before, ...after,
  verdict: before.hi === 777 && after.hiAfterReload === 777 ? "PASS" : "FAIL" }, null, 1));
await browser.close();
