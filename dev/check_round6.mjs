// Round-6 integration: sprite-sheet PNG round trip (with quantization and
// undo), and editor block ops (comment toggle, indent/dedent, single undo).
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

// ---- sheet PNG round trip (export -> real PNG -> quantize import) ----
results.sheetRoundTrip = await page.evaluate(async () => {
  stopCart(false);
  const original = cart.gfx.slice(); // EMBER QUEST's sheet
  // real PNG of the current sheet
  const url = SheetCache.canvas.toDataURL("image/png");
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("png decode"));
    im.src = url;
  });
  // wreck the sheet, then import back from the PNG the way the button does
  cart.gfx.fill(3);
  const cv = document.createElement("canvas");
  cv.width = 128; cv.height = 128;
  const c2 = cv.getContext("2d");
  c2.imageSmoothingEnabled = false;
  c2.drawImage(img, 0, 0, 128, 128);
  const q = quantizeToPalette(c2.getImageData(0, 0, 128, 128).data);
  cart.gfx.set(q);
  let diff = 0;
  for (let i = 0; i < original.length; i++) if (cart.gfx[i] !== original[i]) diff++;
  SheetCache.invalidate();
  return diff === 0 ? "PASS (16384 px byte-exact through a real png)" : "FAIL (" + diff + " px differ)";
});

// ---- 4x-scaled import still lands exactly (external editors upscale) ----
results.sheetScaledImport = await page.evaluate(async () => {
  const original = cart.gfx.slice();
  const big = document.createElement("canvas");
  big.width = 512; big.height = 512;
  const bc = big.getContext("2d");
  bc.imageSmoothingEnabled = false;
  bc.drawImage(SheetCache.canvas, 0, 0, 512, 512);
  const cv = document.createElement("canvas");
  cv.width = 128; cv.height = 128;
  const c2 = cv.getContext("2d");
  c2.imageSmoothingEnabled = false;
  c2.drawImage(big, 0, 0, 128, 128);
  const q = quantizeToPalette(c2.getImageData(0, 0, 128, 128).data);
  let diff = 0;
  for (let i = 0; i < original.length; i++) if (q[i] !== original[i]) diff++;
  return diff === 0 ? "PASS (512px source downsamples exactly)" : "FAIL (" + diff + ")";
});

// ---- editor block ops ----
results.blockOps = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  UI.showTab("code");
  CodeEditor.setValue("alpha()\nbeta()\n\ngamma()");
  const ta = document.getElementById("code-ta");
  ta.focus();
  ta.setSelectionRange(0, ta.value.length);
  // Ctrl+/ comments everything (blank line untouched)
  ta.dispatchEvent(new KeyboardEvent("keydown", { key: "/", ctrlKey: true, bubbles: true, cancelable: true }));
  await wait(50);
  const commented = CodeEditor.getValue() === "-- alpha()\n-- beta()\n\n-- gamma()";
  // Ctrl+/ again uncomments
  ta.setSelectionRange(0, ta.value.length);
  ta.dispatchEvent(new KeyboardEvent("keydown", { key: "/", ctrlKey: true, bubbles: true, cancelable: true }));
  await wait(50);
  const uncommented = CodeEditor.getValue() === "alpha()\nbeta()\n\ngamma()";
  // multiline Tab indents, Shift+Tab dedents
  ta.setSelectionRange(0, ta.value.indexOf("gamma"));
  ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
  await wait(50);
  const indented = CodeEditor.getValue().startsWith("  alpha()\n  beta()");
  ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
  await wait(50);
  const dedented = CodeEditor.getValue() === "alpha()\nbeta()\n\ngamma()";
  // single-caret Tab still inserts two spaces
  ta.setSelectionRange(0, 0);
  ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
  await wait(50);
  const spaced = CodeEditor.getValue().startsWith("  alpha");
  // one undo undoes the whole insert
  document.execCommand("undo");
  await wait(50);
  const undone = CodeEditor.getValue() === "alpha()\nbeta()\n\ngamma()";
  return commented && uncommented && indented && dedented && spaced && undone
    ? "PASS (comment toggle, indent/dedent, single-step undo)"
    : "FAIL " + JSON.stringify({ commented, uncommented, indented, dedented, spaced, undone });
});

// ---- keys() reachable from a live cart ----
results.keysLive = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  CodeEditor.setValue(
    'p = {x = 4, y = 9}\nout = ""\nforeach(keys(p), function(k) out = out .. k end)\n' +
    "function _draw() cls(0) print(out, 0, 0, 7) end");
  startRun();
  await wait(200);
  const out = window.__interp.getGlobal("out");
  stopCart(false);
  return out === "xy" || out === "yx" ? "PASS (keys -> " + out + ")" : "FAIL (" + out + ")";
});

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
