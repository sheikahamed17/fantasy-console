// Reproduce the report "can't play with X/Z/arrows": drive the game with
// TRUSTED keyboard events (CDP), exactly like a human keyboard would.
// Usage: node dev/check_realkeys.mjs [firefox]
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const INDEX = "file:///" + join(here, "..", "index.html").replace(/\\/g, "/");
const useFirefox = process.argv[2] === "firefox";
const exe = useFirefox
  ? ["C:\\Program Files\\Mozilla Firefox\\firefox.exe"].find(existsSync)
  : ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
     "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find(existsSync);
if (!exe) { console.log(JSON.stringify({ skipped: "browser not installed" })); process.exit(0); }

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: true,
  ...(useFirefox ? { browser: "firefox", protocol: "webDriverBiDi" } : {})
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e.message || e)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = { browser: useFirefox ? "firefox" : "chrome" };

await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(800);

const G = n => page.evaluate(name => window.__interp && window.__interp.getGlobal(name), n);

results.booted = await page.evaluate(() =>
  typeof runtime !== "undefined" && runtime.running ? "yes" : "NO");
results.tab = await page.evaluate(() => UI.current);
results.state0 = await G("state");

// press X (real key) on the title screen
await page.keyboard.press("KeyX");
await sleep(250);
results.stateAfterX = await G("state");

// press Z first, while grounded at the spawn point — should jump
await sleep(200);
await page.keyboard.down("KeyZ");
await sleep(120);
const vy = await G("vy");
await page.keyboard.up("KeyZ");
results.zJumps = vy < -1 ? "PASS (vy " + vy.toFixed(2) + ")" : "FAIL (vy " + vy + ")";
await sleep(700);

// hold ArrowRight — the player should move right
const px0 = await G("px");
await page.keyboard.down("ArrowRight");
await sleep(700);
await page.keyboard.up("ArrowRight");
const px1 = await G("px");
results.arrowMoves = px1 > px0 + 5 ? "PASS (" + Math.round(px0) + " -> " + Math.round(px1) + ")" : "FAIL (" + px0 + " -> " + px1 + ")";

// Enter opens the pause menu
await page.keyboard.press("Enter");
await sleep(150);
results.pauseOpens = await page.evaluate(() =>
  document.getElementById("pause-menu").classList.contains("visible") ? "PASS" : "FAIL");
await page.keyboard.press("Enter"); // resume
await sleep(150);

// Escape stops to the editor
await page.keyboard.press("Escape");
await sleep(150);
results.escStops = await page.evaluate(() =>
  !runtime.running && UI.current === "code" ? "PASS" : "FAIL (" + UI.current + ")");

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
