// Verify Space = button 4 in both demo carts, with trusted key events.
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
const errors = [];
page.on("pageerror", e => errors.push(String(e.message || e)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
const G = n => page.evaluate(name => window.__interp.getGlobal(name), n);

await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(700);

// EMBER QUEST: X to start, Space to jump from the ground
await page.keyboard.press("KeyX");
await sleep(300);
await page.keyboard.down("Space");
await sleep(120);
const vy = await G("vy");
await page.keyboard.up("Space");
results.emberSpaceJumps = vy < -1 ? "PASS (vy " + vy.toFixed(2) + ")" : "FAIL (vy " + vy + ")";

// variable height: quick tap should cut the jump (vy clamped toward -1.2)
await sleep(800);
await page.keyboard.down("Space");
await sleep(50);
await page.keyboard.up("Space");
await sleep(100);
const vyCut = await G("vy");
results.emberSpaceJumpCut = vyCut > -1.4 ? "PASS (vy " + vyCut.toFixed(2) + ")" : "FAIL (vy " + vyCut + ")";

// pause menu: Enter opens, Space activates RESUME
await page.keyboard.press("Enter");
await sleep(120);
const paused = await page.evaluate(() => document.getElementById("pause-menu").classList.contains("visible"));
await page.keyboard.press("Space");
await sleep(120);
const resumed = await page.evaluate(() => !document.getElementById("pause-menu").classList.contains("visible") && !runtime.paused);
results.pauseSpaceActivates = paused && resumed ? "PASS" : "FAIL";

// STARFALL: Space fires
await page.evaluate(() => { loadShooterCart(); startRun(); });
await sleep(500);
await page.keyboard.press("KeyX");
await sleep(200);
const shots0 = await page.evaluate(() => window.__interp.getGlobal("shots").len());
await page.keyboard.down("Space");
await sleep(400);
await page.keyboard.up("Space");
const shots1 = await page.evaluate(() => window.__interp.getGlobal("shots").len());
results.starfallSpaceFires = shots1 > shots0 ? "PASS (" + shots0 + " -> " + shots1 + " bolts)" : "FAIL";

// title text mentions space in both carts
results.hintTexts = await page.evaluate(() =>
  DEMO_CART_TEXT.length > 0 && // decode both carts and check the code strings
  parseCartText(DEMO_CART_TEXT).code.indexOf("z or space = jump") !== -1 &&
  parseCartText(SHOOTER_CART_TEXT).code.indexOf("z/space fires") !== -1
    ? "PASS" : "FAIL");

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
