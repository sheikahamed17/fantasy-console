// Round-10 integration: sprite bank 2 through the real UI + cart flow.
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

await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(700);

// ---- bank toggle + drawing in bank 1 via the editor, then spr() it ----
results.bankEditor = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  stopCart(false);
  UI.showTab("sprites");
  await wait(60);
  document.getElementById("spr-bank").click(); // -> bank 1, sprite 257
  const bankLabel = document.getElementById("spr-bank").textContent;
  const num = document.getElementById("spr-num").textContent;
  // draw a pixel through the pencil on the bank-1 sprite
  const swatches = document.querySelectorAll(".pal-swatch");
  swatches[11].dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  const cv = document.getElementById("spr-canvas");
  const r = cv.getBoundingClientRect();
  cv.dispatchEvent(new MouseEvent("mousedown", { clientX: r.left + 12, clientY: r.top + 12, bubbles: true, button: 0 }));
  window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  const n = SpriteEditor.current;
  const stored = cart.gfx[((n >> 4) * 8) * 128 + (n & 15) * 8];
  // flags work in bank 1
  document.querySelectorAll("#spr-flags input")[2].click();
  const flagOk = (cart.flags[n] & 4) === 4;
  return bankLabel === "BANK 1" && n === 257 && stored === 11 && flagOk
    ? "PASS (sprite " + n + " drawn + flagged in bank 1)"
    : "FAIL " + JSON.stringify({ bankLabel, num, n, stored, flagOk });
});

// ---- a cart draws the bank-1 sprite ----
results.bankInCart = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  CodeEditor.setValue(
    "function _draw()\n  cls(0)\n  spr(257, 40, 40)\n  if fget(257, 2) then print(\"flagged\", 2, 2, 7) end\nend");
  startRun();
  await wait(250);
  const px = gfx.pget(40, 40);
  const text = gfx.pget(2, 2);
  stopCart(false);
  return px === 11 && text === 7
    ? "PASS (spr(257) + fget(257) live in a cart)"
    : "FAIL (px=" + px + " text=" + text + ")";
});

// ---- full persistence: library save/load with bank-2 data ----
results.bankPersistence = await page.evaluate(() => {
  cart.meta.title = "bank test";
  const before = cartToJson(cart);
  const hasGfx2 = JSON.parse(before).gfx2 !== undefined;
  const restored = cartToJson(deserializeCart(JSON.parse(before)));
  // and PNG-cartridge sized payload check: still fits after gfx2
  const okSize = before.length < 120000;
  return hasGfx2 && restored === before && okSize
    ? "PASS (gfx2 present, byte-exact round trip, " + Math.round(before.length / 1024) + " kb)"
    : "FAIL " + JSON.stringify({ hasGfx2, same: restored === before });
});

// ---- EMBER QUEST (bank-less) still byte-stable ----
results.legacyStability = await page.evaluate(() => {
  const j1 = cartToJson(parseCartText(DEMO_CART_TEXT));
  const j2 = cartToJson(deserializeCart(JSON.parse(j1)));
  const noGfx2 = JSON.parse(j1).gfx2 === undefined && JSON.parse(j1).flags.length === 256;
  return j1 === j2 && noGfx2 ? "PASS (old carts untouched by the new field)" : "FAIL";
});

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
