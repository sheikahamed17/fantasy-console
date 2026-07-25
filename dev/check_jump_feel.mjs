// Verify jump buffer + coyote time in EMBER QUEST with real key events.
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
const S = (n, v) => page.evaluate(([name, val]) => window.__interp.globals.set(name, val), [n, v]);

await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(700);
await page.keyboard.press("KeyX");
await sleep(300);

// 1) buffered jump: jump, press Space again while VERIFIABLY airborne just
//    before landing — the jump sfx must fire twice (second via the buffer)
await page.evaluate(() => {
  window.__jumps = 0;
  const orig = audioFacade.sfx.bind(audioFacade);
  audioFacade.sfx = (n, ch) => { if (n === 0) window.__jumps++; orig(n, ch); };
});
let bufferedProof = "no airborne press landed in the window";
for (let attempt = 0; attempt < 4 && !bufferedProof.startsWith("PASS"); attempt++) {
  await page.evaluate(() => { window.__jumps = 0; });
  await page.keyboard.down("Space");
  await sleep(120);
  await page.keyboard.up("Space");
  // wait until descending and near the ground, then press mid-air
  let pressedInAir = false;
  for (let i = 0; i < 60; i++) {
    const [gr, vy] = await page.evaluate(() =>
      [window.__interp.getGlobal("grounded"), window.__interp.getGlobal("vy")]);
    if (!gr && vy > 1.6) { // descending, close to touchdown
      await page.keyboard.down("Space");
      const grAtPress = await G("grounded");
      await sleep(50);
      await page.keyboard.up("Space");
      pressedInAir = !grAtPress;
      break;
    }
    await sleep(15);
  }
  await sleep(600); // land + buffered jump resolves
  const jumps = await page.evaluate(() => window.__jumps);
  if (pressedInAir && jumps === 2) bufferedProof = "PASS (2 jumps, second pressed mid-air)";
  else if (pressedInAir) bufferedProof = "FAIL (mid-air press, " + jumps + " jump sfx)";
  await sleep(400);
}
results.bufferedJump = bufferedProof;

// 2) coyote jump: walk off the first ledge, press Space a few frames AFTER
//    leaving the ground (px ~95 = past the hitbox edge at 93.9)
await S("px", 84); await S("py", 88); await S("vx", 0); await S("vy", 0); await S("inv", 999);
await sleep(50);
await page.keyboard.down("ArrowRight");
let fired = 0;
for (let i = 0; i < 200; i++) {
  const px = await G("px");
  const grounded = await G("grounded");
  if (px > 95 && !grounded) {        // definitely off the ledge, falling
    await page.keyboard.down("Space");
    await sleep(80);
    fired = await G("vy");
    await page.keyboard.up("Space");
    break;
  }
  await sleep(10);
}
await page.keyboard.up("ArrowRight");
results.coyoteJump = fired < -1 ? "PASS (vy " + fired.toFixed(2) + " after leaving the ledge)" : "FAIL (vy " + fired + ")";

console.log(JSON.stringify(results, null, 1));
await browser.close();
