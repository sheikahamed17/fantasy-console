// Verify the input accessibility fixes:
// 1) trusted keys still work (QWERTY path),
// 2) non-QWERTY layouts work (key name match, wrong e.code),
// 3) Esc -> RUN tab click restarts the cart,
// 4) clicking the stopped screen restarts the cart,
// 5) typing in the cart-title input no longer feeds the game.
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

// 1) trusted QWERTY keys
await page.keyboard.press("KeyX");
await sleep(200);
results.qwertyX = (await G("state")) === "play" ? "PASS" : "FAIL";

// 2) layout simulation: Dvorak-style events (e.key correct, e.code wrong)
results.dvorakKeys = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const fire = (type, key, code) =>
    window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true }));
  // back to title first
  stopCart(false); startRun();
  await wait(200);
  // "x" typed from physical KeyB (Dvorak): starts the game?
  fire("keydown", "x", "KeyB");
  fire("keyup", "x", "KeyB");
  await wait(150);
  const started = window.__interp.getGlobal("state") === "play";
  // "z" typed from physical KeyW (AZERTY-ish): jumps?
  await wait(300);
  fire("keydown", "z", "KeyW");
  await wait(100);
  const vy = window.__interp.getGlobal("vy");
  fire("keyup", "z", "KeyW");
  return started && vy < -1 ? "PASS (vy " + vy.toFixed(2) + ")" : "FAIL " + JSON.stringify({ started, vy });
});

// 3) Esc stops to editor; clicking the RUN tab restarts
await page.keyboard.press("Escape");
await sleep(150);
const stopped = await page.evaluate(() => !runtime.running && UI.current === "code");
await page.click('#tabs .tab[data-pane="run"]');
await sleep(300);
results.runTabRestarts = stopped && (await page.evaluate(() => runtime.running)) &&
  (await G("state")) === "title" ? "PASS" : "FAIL";

// 4) STOP button then click the screen -> restarts
await page.evaluate(() => stopCart(false));
await sleep(100);
await page.evaluate(() => {
  document.getElementById("run-stage").dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true }));
});
await sleep(300);
results.clickScreenRestarts = (await page.evaluate(() => runtime.running)) ? "PASS" : "FAIL";

// 5) arrows typed into the cart-title input do not reach the game
results.titleInputSafe = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const ti = document.getElementById("cart-title");
  ti.focus();
  const ev = new KeyboardEvent("keydown", { key: "ArrowRight", code: "ArrowRight", bubbles: true, cancelable: true });
  ti.dispatchEvent(ev);
  await wait(50);
  const consumed = ev.defaultPrevented; // game must NOT have consumed it
  ti.blur();
  return !consumed ? "PASS" : "FAIL (game stole the key)";
});

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
