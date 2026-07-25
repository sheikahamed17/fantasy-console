// Round-8 integration: animation preview, sfx transpose, pattern
// copy/paste, map stamp brush (paint + tiling rect-fill + undo).
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

// ---- animation preview cycles between run frames 2 and 3 ----
results.animPreview = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  stopCart(false);
  UI.showTab("sprites");
  await wait(60);
  SpriteEditor.selectSprite(2); // EMBER QUEST run frames 2,3 differ at the feet
  document.getElementById("anim-frames").value = 2;
  document.getElementById("anim-fps").value = 10;
  const cv = document.getElementById("anim-canvas");
  const snap = () => { // proper content hash (string length collides)
    const d = cv.getContext("2d").getImageData(0, 0, 64, 64).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s = (s * 31 + d[i] + d[i + 1]) >>> 0;
    return s;
  };
  const seen = new Set();
  for (let i = 0; i < 12; i++) {
    seen.add(snap());
    await wait(60);
  }
  return seen.size >= 2 ? "PASS (" + seen.size + " distinct frames observed)" : "FAIL";
});

// ---- sfx transpose ----
results.transpose = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  UI.showTab("sfx");
  await wait(60);
  SfxEditor.select(20);
  cart.sfx[20].notes[0] = { p: 30, w: 0, v: 5, fx: 0 };
  cart.sfx[20].notes[5] = { p: 65, w: 0, v: 5, fx: 0 };
  document.querySelector('[data-tr="12"]').click();
  const up = cart.sfx[20].notes[0].p === 42 && cart.sfx[20].notes[5].p === 71; // clamped
  document.querySelector('[data-tr="-1"]').click();
  const down = cart.sfx[20].notes[0].p === 41 && cart.sfx[20].notes[5].p === 70;
  return up && down ? "PASS (+12 clamps at 71, -1 works)" : "FAIL " + JSON.stringify({ up, down });
});

// ---- music pattern copy/paste ----
results.patternCopy = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  UI.showTab("music");
  await wait(60);
  MusicEditor.select(0); // EMBER QUEST P00: [8,9,13,-1], loopStart
  document.getElementById("music-copy").click();
  MusicEditor.select(9);
  document.getElementById("music-paste").click();
  const p = cart.music[9];
  return p.ch.join(",") === cart.music[0].ch.join(",") && p.loopStart === true
    ? "PASS (pattern deep-copied with flags)" : "FAIL " + JSON.stringify(p);
});

// ---- map stamp brush ----
results.mapStamp = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  UI.showTab("map");
  await wait(80);
  // drag-select tiles 16..17 / 48..49 (picker cells (16,0)-(17,1)) => 2x2 stamp
  const picker = document.getElementById("map-picker");
  const pr = picker.getBoundingClientRect();
  picker.dispatchEvent(new MouseEvent("mousedown", { clientX: pr.left + 16 * 16 + 8, clientY: pr.top + 8, bubbles: true }));
  picker.dispatchEvent(new MouseEvent("mousemove", { clientX: pr.left + 17 * 16 + 8, clientY: pr.top + 16 + 8, bubbles: true }));
  window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  const label = document.getElementById("map-tile-label").textContent;
  // paint the stamp at cell (2,2) — accounts for current pan (0 after refresh)
  const before = cart.map.slice();
  const mc = document.getElementById("map-canvas");
  const mr = mc.getBoundingClientRect();
  mc.dispatchEvent(new MouseEvent("mousedown", { clientX: mr.left + 2 * 16 + 8, clientY: mr.top + 2 * 16 + 8, bubbles: true, button: 0 }));
  window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  const stamped =
    cart.map[2 * 128 + 2] === 16 && cart.map[2 * 128 + 3] === 17 &&
    cart.map[3 * 128 + 2] === 48 && cart.map[3 * 128 + 3] === 49;
  // rect-fill tiles the 2x2 pattern across 4x4 cells
  document.querySelector('[data-mtool="rect"]').click();
  mc.dispatchEvent(new MouseEvent("mousedown", { clientX: mr.left + 6 * 16 + 8, clientY: mr.top + 6 * 16 + 8, bubbles: true, button: 0 }));
  window.dispatchEvent(new MouseEvent("mousemove", { clientX: mr.left + 9 * 16 + 8, clientY: mr.top + 9 * 16 + 8, bubbles: true }));
  window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  const tiled =
    cart.map[6 * 128 + 6] === 16 && cart.map[6 * 128 + 7] === 17 &&
    cart.map[7 * 128 + 6] === 48 && cart.map[8 * 128 + 8] === 16; // wraps
  // two undos restore everything
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true }));
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true }));
  await wait(60);
  let restored = true;
  for (let i = 0; i < cart.map.length; i++) if (cart.map[i] !== before[i]) { restored = false; break; }
  document.querySelector('[data-mtool="paint"]').click();
  return label === "stamp 2x2" && stamped && tiled && restored
    ? "PASS (2x2 stamp paints, rect-fill tiles, undo restores)"
    : "FAIL " + JSON.stringify({ label, stamped, tiled, restored });
});

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
