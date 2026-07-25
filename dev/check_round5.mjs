// Round-5 integration: gallery (previews, keyboard nav, launch),
// sprite transforms, map undo, size badge.
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

await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(700);

// ---- gallery: open via the logo, previews are real, keyboard launches ----
await page.click("#logo");
await sleep(1200); // preview rendering for 4 carts
results.galleryOpens = await page.evaluate(() => {
  const cards = document.querySelectorAll(".gal-card");
  if (UI.current !== "gallery" || cards.length < 4) {
    return "FAIL (" + UI.current + ", " + cards.length + " cards)";
  }
  // the EMBER QUEST preview must not be blank (its title banner is orange)
  const cv = cards[0].querySelector("canvas");
  const d = cv.getContext("2d").getImageData(0, 0, 128, 128).data;
  let nonBlack = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] > 24 || d[i + 1] > 24 || d[i + 2] > 32) nonBlack++;
  }
  return nonBlack > 500 ? "PASS (4 cards, live preview " + nonBlack + " px)" : "FAIL (blank preview)";
});
await page.screenshot({ path: join(here, "shot-gallery.png") });
// keyboard: right x1 -> STARFALL, Enter launches it
await page.keyboard.press("ArrowRight");
await sleep(80);
await page.keyboard.press("Enter");
await sleep(500);
results.galleryLaunch = await page.evaluate(() =>
  runtime.running && cart.meta.title === "STARFALL" && UI.current === "run"
    ? "PASS" : "FAIL (" + cart.meta.title + ")");
await page.evaluate(() => stopCart(false));

// ---- sprite transforms ----
results.transforms = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  UI.showTab("sprites");
  await wait(60);
  SpriteEditor.selectSprite(230);
  const px = (x, y) => cart.gfx[((230 >> 4) * 8 + y) * 128 + (230 & 15) * 8 + x];
  const setPx = (x, y, v) => { cart.gfx[((230 >> 4) * 8 + y) * 128 + (230 & 15) * 8 + x] = v; };
  setPx(0, 0, 9); // one asymmetric pixel, top-left
  document.querySelector('[data-xf="fliph"]').click();
  const afterFlipH = px(7, 0) === 9 && px(0, 0) === 0;
  document.querySelector('[data-xf="rot"]').click();   // top-right -> bottom-right
  const afterRot = px(7, 7) === 9;
  document.querySelector('[data-xf="right"]').click(); // wraps to column 0
  const afterShift = px(0, 7) === 9 && px(7, 7) === 0;
  // undo three times restores the original single pixel
  document.getElementById("spr-undo").click();
  document.getElementById("spr-undo").click();
  document.getElementById("spr-undo").click();
  const undone = px(0, 0) === 9 && px(7, 0) === 0 && px(0, 7) === 0;
  document.querySelector('[data-xf="clear"]').click();
  const cleared = px(0, 0) === 0;
  return afterFlipH && afterRot && afterShift && undone && cleared
    ? "PASS (flip, rotate, wrap-shift, 3x undo, clear)"
    : "FAIL " + JSON.stringify({ afterFlipH, afterRot, afterShift, undone, cleared });
});

// ---- map undo ----
results.mapUndo = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  UI.showTab("map");
  await wait(80);
  const before = cart.map.slice();
  const mc = document.getElementById("map-canvas");
  const r = mc.getBoundingClientRect();
  // paint stroke across three cells
  mc.dispatchEvent(new MouseEvent("mousedown", { clientX: r.left + 8, clientY: r.top + 8, bubbles: true, button: 0 }));
  window.dispatchEvent(new MouseEvent("mousemove", { clientX: r.left + 40, clientY: r.top + 8, bubbles: true }));
  window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  let changed = 0;
  for (let i = 0; i < cart.map.length; i++) if (cart.map[i] !== before[i]) changed++;
  // ctrl+z restores
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true }));
  await wait(60);
  let restored = true;
  for (let i = 0; i < cart.map.length; i++) if (cart.map[i] !== before[i]) { restored = false; break; }
  return changed >= 2 && restored
    ? "PASS (" + changed + " cells painted, ctrl+z restored)"
    : "FAIL (" + changed + ", restored " + restored + ")";
});

// ---- size badge ----
await page.evaluate(() => updateSizeBadge());
results.sizeBadge = await page.evaluate(() => {
  const s = document.getElementById("status-size").textContent;
  return /\d+ lines · \d+(\.\d+)? kb cart/.test(s) ? "PASS (" + s + ")" : "FAIL (" + s + ")";
});

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
