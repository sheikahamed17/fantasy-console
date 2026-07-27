// Soak test for "buttons work once then stop": a counting cart tallies every
// btnp edge while we hammer keys/touch/UI buttons through realistic cycles.
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
await sleep(600);

// counting cart: one counter per button edge
await page.evaluate(async () => {
  stopCart(false);
  CodeEditor.setValue(
    "zc = 0\nxc = 0\nlc = 0\nrc = 0\n" +
    "function _update()\n" +
    "  if btnp(4) then zc += 1 end\n" +
    "  if btnp(5) then xc += 1 end\n" +
    "  if btnp(0) then lc += 1 end\n" +
    "  if btnp(1) then rc += 1 end\n" +
    "end\n" +
    "function _draw() cls(0) print(zc, 0, 0, 7) end");
  startRun();
});
await sleep(300);

// ---- 1) 12 clean presses per key ----
for (let i = 0; i < 12; i++) {
  await page.keyboard.down("KeyZ"); await sleep(45); await page.keyboard.up("KeyZ"); await sleep(45);
  await page.keyboard.down("KeyX"); await sleep(45); await page.keyboard.up("KeyX"); await sleep(45);
}
results.cleanPresses = (await G("zc")) === 12 && (await G("xc")) === 12
  ? "PASS (12/12 z, 12/12 x)"
  : "FAIL (z=" + (await G("zc")) + " x=" + (await G("xc")) + ")";

// ---- 2) tapping Z while an arrow is held ----
await page.keyboard.down("ArrowRight");
for (let i = 0; i < 8; i++) {
  await page.keyboard.down("KeyZ"); await sleep(45); await page.keyboard.up("KeyZ"); await sleep(45);
}
await page.keyboard.up("ArrowRight");
results.pressWhileHeld = (await G("zc")) === 20
  ? "PASS (8 more while arrow held)"
  : "FAIL (z=" + (await G("zc")) + ", want 20)";

// ---- 3) across pause/resume cycles ----
for (let c = 0; c < 3; c++) {
  await page.keyboard.press("Enter"); await sleep(80); // pause
  await page.keyboard.press("Enter"); await sleep(80); // resume (activates RESUME)
  await page.keyboard.down("KeyZ"); await sleep(45); await page.keyboard.up("KeyZ"); await sleep(60);
}
results.acrossPause = (await G("zc")) === 23
  ? "PASS (edges survive pause cycles)"
  : "FAIL (z=" + (await G("zc")) + ", want 23)";

// ---- 4) across restarts via the RUN button ----
let restartOk = true;
for (let c = 0; c < 3; c++) {
  await page.click("#btn-run");
  await sleep(200);
  await page.keyboard.down("KeyZ"); await sleep(45); await page.keyboard.up("KeyZ"); await sleep(60);
  if ((await G("zc")) !== 1) { restartOk = false; break; } // fresh cart => 1
}
results.acrossRestarts = restartOk ? "PASS (fresh edges after each restart)" : "FAIL";

// ---- 5) touch overlay button: 10 taps ----
results.touchTaps = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  TouchPad.enable();
  const before = window.__interp.getGlobal("zc");
  const bo = document.getElementById("tp-o");
  const r = bo.getBoundingClientRect();
  for (let i = 0; i < 10; i++) {
    bo.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 5, clientX: r.left + 10, clientY: r.top + 10, bubbles: true }));
    await wait(45);
    bo.dispatchEvent(new PointerEvent("pointerup", { pointerId: 5, clientX: r.left + 10, clientY: r.top + 10, bubbles: true }));
    await wait(45);
  }
  const got = window.__interp.getGlobal("zc") - before;
  return got === 10 ? "PASS (10/10 touch taps)" : "FAIL (" + got + "/10)";
});

// ---- 6) THE TRAP: a lost pointerup must not kill other sources ----
results.stuckSourceRecovery = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const bo = document.getElementById("tp-o");
  const r = bo.getBoundingClientRect();
  // pointerdown with NO pointerup (simulates a swallowed event)
  bo.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 9, clientX: r.left + 10, clientY: r.top + 10, bubbles: true }));
  await wait(80);
  const before = window.__interp.getGlobal("zc");
  // keyboard presses while the touch source is stuck down
  for (let i = 0; i < 3; i++) {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ", key: "z", bubbles: true, cancelable: true }));
    await wait(45);
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyZ", key: "z", bubbles: true, cancelable: true }));
    await wait(45);
  }
  const got = window.__interp.getGlobal("zc") - before;
  // clean up the stuck pointer
  bo.dispatchEvent(new PointerEvent("pointerup", { pointerId: 9, bubbles: true }));
  return got === 3
    ? "PASS (keyboard edges survive a stuck touch source)"
    : "FAIL (" + got + "/3 presses registered while touch stuck)";
});

// ---- 7) UI buttons repeat: CRT toggles every click ----
results.uiButtons = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const states = [];
  for (let i = 0; i < 4; i++) {
    document.getElementById("btn-crt").click();
    await wait(30);
    states.push(document.getElementById("btn-crt").textContent);
  }
  const ok = states.join("|") === "CRT: ON|CRT: OFF|CRT: ON|CRT: OFF";
  if (!ok) return "FAIL (" + states.join("|") + ")";
  return "PASS (toggles on every click)";
});

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
