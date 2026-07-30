// Space-specific investigation:
// A) focused ▶ RUN button + real Space presses — does the cart restart?
// B) lost Space keyup — do later physical presses still jump?
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
await sleep(600);

// counting cart
await page.evaluate(() => {
  stopCart(false);
  CodeEditor.setValue(
    "zc = 0\nboot = (boot or 0) + 1\n" +
    "function _update()\n  if btnp(4) then zc += 1 end\nend\n" +
    "function _draw() cls(0) print(zc, 0, 0, 7) end");
});

// ---- A) click ▶ RUN with a real mouse click, then 5 real Space presses ----
await page.click("#btn-run");
await sleep(250);
const focusAfterRun = await page.evaluate(() =>
  document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : "none");
let restarts = 0;
for (let i = 0; i < 5; i++) {
  const beforeCount = await G("zc");
  await page.keyboard.down("Space");
  await sleep(60);
  await page.keyboard.up("Space");
  await sleep(120);
  const afterCount = await G("zc");
  if (afterCount < beforeCount || afterCount === 0 && beforeCount === 0 && i > 0) restarts++;
}
const zcA = await G("zc");
results.focusedRunButton = "focus=" + focusAfterRun + ", presses counted=" + zcA + "/5" +
  (zcA === 5 ? " PASS" : " FAIL (cart restarted or presses lost)");

// ---- B) lost keyup: keydown, then ANOTHER physical keydown with no keyup between ----
results.lostKeyup = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  stopCart(false);
  startRun();
  await wait(200);
  const fire = (type, repeat) => window.dispatchEvent(new KeyboardEvent(type, {
    code: "Space", key: " ", repeat: !!repeat, bubbles: true, cancelable: true
  }));
  fire("keydown");          // press 1
  await wait(80);
  // keyup LOST (never fired). now more physical presses:
  fire("keydown");          // press 2 (repeat=false => a real new press)
  await wait(80);
  fire("keyup");
  await wait(40);
  fire("keydown");          // press 3
  await wait(80);
  fire("keyup");
  await wait(40);
  // auto-repeat must NOT count as presses
  fire("keydown");          // press 4
  await wait(40);
  fire("keydown", true);    // repeats while held
  fire("keydown", true);
  await wait(40);
  fire("keyup");
  await wait(60);
  const zc = window.__interp.getGlobal("zc");
  return "presses counted=" + zc + "/4" + (zc === 4 ? " PASS" : " FAIL");
});

console.log(JSON.stringify(results, null, 1));
await browser.close();
