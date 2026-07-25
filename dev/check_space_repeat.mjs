// Investigate "jump works once then stops": repeated real Space presses,
// space+arrow combos, key auto-repeat, and edge-of-platform jumps.
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
const results = {};
const G = n => page.evaluate(name => window.__interp.getGlobal(name), n);

await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(700);
await page.keyboard.press("KeyX");
await sleep(300);

async function waitGrounded(ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await G("grounded")) return true;
    await sleep(30);
  }
  return false;
}

// 1) five consecutive jumps with full press/release cycles
let jumps = 0;
for (let i = 0; i < 5; i++) {
  await waitGrounded(2000);
  await page.keyboard.down("Space");
  await sleep(100);
  const vy = await G("vy");
  await page.keyboard.up("Space");
  if (vy < -1) jumps++;
  await sleep(700);
}
results.fiveConsecutiveJumps = jumps === 5 ? "PASS (5/5)" : "FAIL (" + jumps + "/5)";

// 2) jump while holding ArrowRight (synthetic combo — rules out app-level combo bugs)
await waitGrounded(2000);
await page.keyboard.down("ArrowRight");
await sleep(150);
await page.keyboard.down("Space");
await sleep(100);
const vyCombo = await G("vy");
await page.keyboard.up("Space");
await page.keyboard.up("ArrowRight");
results.jumpWhileRunning = vyCombo < -1 ? "PASS" : "FAIL (vy " + vyCombo + ")";
await sleep(600);

// 3) holding Space with OS auto-repeat must give exactly ONE jump
await waitGrounded(2000);
const cdp = await page.createCDPSession();
const sfxCalls = await page.evaluate(() => {
  window.__sfxLog = [];
  const orig = audioFacade.sfx.bind(audioFacade);
  audioFacade.sfx = (n, ch) => { window.__sfxLog.push(n); orig(n, ch); };
  return 0;
});
await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", code: "Space", key: " ", windowsVirtualKeyCode: 32 });
for (let i = 0; i < 10; i++) { // OS-style auto-repeat while held
  await sleep(60);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", code: "Space", key: " ", windowsVirtualKeyCode: 32, autoRepeat: true });
}
await sleep(400);
await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", code: "Space", key: " ", windowsVirtualKeyCode: 32 });
const jumpSfx = await page.evaluate(() => window.__sfxLog.filter(n => n === 0).length);
results.holdSpaceOneJump = jumpSfx === 1 ? "PASS (1 jump while held)" : "NOTE: " + jumpSfx + " jumps while held";

// 4) after the repeat-hold, a fresh press must jump again (no stuck state)
await waitGrounded(2000);
await page.keyboard.down("Space");
await sleep(100);
const vyAfter = await G("vy");
await page.keyboard.up("Space");
results.jumpAfterHold = vyAfter < -1 ? "PASS" : "FAIL (vy " + vyAfter + ")";

// 5) the "edge jump" scenario: run toward the first pit and press Space
//    exactly as the player crosses the ledge (1 frame late) — this is the
//    situation players describe as "jump randomly stops working"
await page.evaluate(() => {
  const S = (n, v) => window.__interp.globals.set(n, v);
  S("px", 80); S("py", 88); S("vx", 0); S("vy", 0); S("inv", 999);
});
await page.keyboard.down("ArrowRight");
// wait until just past the ledge (px > 90 = walked off tile 11)
let lateJumpVy = 0;
for (let i = 0; i < 100; i++) {
  const px = await G("px");
  if (px > 91) { // ledge is at 88+... player just walked off
    await page.keyboard.down("Space");
    await sleep(80);
    lateJumpVy = await G("vy");
    await page.keyboard.up("Space");
    break;
  }
  await sleep(15);
}
await page.keyboard.up("ArrowRight");
results.edgeJumpAfterLedge = lateJumpVy < -1
  ? "jump still fired (coyote)"
  : "NO JUMP (vy " + lateJumpVy.toFixed(2) + ") — classic 'jump stopped working' feel";

console.log(JSON.stringify(results, null, 1));
await browser.close();
