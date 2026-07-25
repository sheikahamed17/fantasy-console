// Regression checks for the review findings: drag state must cancel on
// tab switch (sprite pencil, sprite rect, map rect-fill, map pan), and
// musicPos() must be null after stop / fresh after restart.
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
page.on("pageerror", e => console.log("PAGEERROR:", e.message));
await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await new Promise(r => setTimeout(r, 600));

const res = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  stopCart(false);

  // --- sprite pencil stroke cancelled by tab switch ---
  UI.showTab("sprites");
  await wait(50);
  SpriteEditor.selectSprite(210);
  const before = cart.gfx.slice();
  const cv = document.getElementById("spr-canvas");
  const r = cv.getBoundingClientRect();
  cv.dispatchEvent(new MouseEvent("mousedown", { clientX: r.left + 12, clientY: r.top + 12, bubbles: true, button: 0 }));
  const afterDown = cart.gfx.slice(); // one pixel legitimately painted
  UI.showTab("code"); // switch mid-stroke (like Ctrl+Enter would)
  window.dispatchEvent(new MouseEvent("mousemove", { clientX: 400, clientY: 300, bubbles: true }));
  window.dispatchEvent(new MouseEvent("mousemove", { clientX: 90, clientY: 200, bubbles: true }));
  window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  let corrupted = 0;
  for (let i = 0; i < cart.gfx.length; i++) if (cart.gfx[i] !== afterDown[i]) corrupted++;
  out.spritePencilCancelled = corrupted === 0 ? "PASS" : "FAIL (" + corrupted + " px changed after switch)";

  // --- sprite rect stroke must NOT finalize after tab switch ---
  UI.showTab("sprites");
  await wait(50);
  document.querySelector('[data-tool="rect"]').click();
  const r2 = cv.getBoundingClientRect();
  cv.dispatchEvent(new MouseEvent("mousedown", { clientX: r2.left + 12, clientY: r2.top + 12, bubbles: true, button: 0 }));
  window.dispatchEvent(new MouseEvent("mousemove", { clientX: r2.left + 150, clientY: r2.top + 150, bubbles: true }));
  const beforeSwitch = cart.gfx.slice();
  UI.showTab("map");
  window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  let rectLeak = 0;
  for (let i = 0; i < cart.gfx.length; i++) if (cart.gfx[i] !== beforeSwitch[i]) rectLeak++;
  out.spriteRectCancelled = rectLeak === 0 ? "PASS" : "FAIL (" + rectLeak + " px)";
  document.querySelector('[data-tool="pencil"]').click();

  // --- map rect fill must NOT finalize after tab switch ---
  UI.showTab("map");
  await wait(80);
  document.querySelector('[data-mtool="rect"]').click();
  const mc = document.getElementById("map-canvas");
  const mr = mc.getBoundingClientRect();
  const mapBefore = cart.map.slice();
  mc.dispatchEvent(new MouseEvent("mousedown", { clientX: mr.left + 24, clientY: mr.top + 24, bubbles: true, button: 0 }));
  window.dispatchEvent(new MouseEvent("mousemove", { clientX: mr.left + 120, clientY: mr.top + 120, bubbles: true }));
  UI.showTab("sfx");
  window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  let mapLeak = 0;
  for (let i = 0; i < cart.map.length; i++) if (cart.map[i] !== mapBefore[i]) mapLeak++;
  out.mapRectCancelled = mapLeak === 0 ? "PASS" : "FAIL (" + mapLeak + " cells)";
  document.querySelector('[data-mtool="paint"]').click();

  // --- musicPos: null after stop, fresh after restart ---
  audioEngine.unlock();
  cart.sfx[0].speed = 4;
  for (let i = 0; i < 32; i++) cart.sfx[0].notes[i] = { p: 24, w: 2, v: 5 };
  cart.music[10].ch = [0, -1, -1, -1];
  audioEngine.music(10);
  await wait(500);
  const posPlaying = audioEngine.musicPos();
  audioEngine.music(-1);
  const posStopped = audioEngine.musicPos();
  audioEngine.music(10);
  const posRestart = audioEngine.musicPos();
  audioEngine.stopAll();
  out.musicPos =
    posPlaying && posPlaying.pat === 10 &&
    posStopped === null &&
    posRestart && posRestart.pat === 10 && posRestart.step === 0
      ? "PASS"
      : "FAIL " + JSON.stringify({ posPlaying, posStopped, posRestart });
  return out;
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
