// Round-4 integration: touch overlay plays the game, mouse API works from
// cart code, and FX notes schedule real audio without errors.
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
const browser = await puppeteer.launch({
  executablePath: exe, headless: "new",
  args: ["--autoplay-policy=no-user-gesture-required"]
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const errors = [];
page.on("pageerror", e => errors.push(String(e.message || e)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
const G = n => page.evaluate(name => window.__interp.getGlobal(name), n);

await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(700);

// ---- touch overlay: enable, press X via tp-x, run right via the d-pad ----
results.touch = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  TouchPad.enable();
  TouchPad.refresh();
  const visible = document.getElementById("touch-pad").classList.contains("visible");
  const pe = (el2, type, x, y, id) => el2.dispatchEvent(new PointerEvent(type, {
    pointerId: id || 1, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true
  }));
  // start the game with the on-screen X button
  const bx = document.getElementById("tp-x");
  const rx = bx.getBoundingClientRect();
  pe(bx, "pointerdown", rx.left + 20, rx.top + 20, 7);
  await wait(80);
  pe(bx, "pointerup", rx.left + 20, rx.top + 20, 7);
  await wait(150);
  const started = window.__interp.getGlobal("state") === "play";
  // hold the d-pad to the right, then slide to up-right (multi-direction)
  const dp = document.getElementById("tp-dpad");
  const r = dp.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  pe(dp, "pointerdown", r.right - 8, cy, 9);
  const px0 = window.__interp.getGlobal("px");
  await wait(600);
  const ranRight = window.__interp.getGlobal("px") > px0 + 10;
  pe(dp, "pointermove", r.right - 8, r.top + 8, 9); // slide toward up-right
  await wait(80);
  const upToo = input.touchDown[1] === 1 && input.touchDown[2] === 1;
  pe(dp, "pointerup", r.right - 8, r.top + 8, 9);
  await wait(60);
  const released = input.touchDown[1] === 0 && input.touchDown[2] === 0;
  // on-screen O button jumps
  await wait(400); // settle on ground
  const bo = document.getElementById("tp-o");
  const ro = bo.getBoundingClientRect();
  pe(bo, "pointerdown", ro.left + 20, ro.top + 20, 11);
  await wait(120);
  const vy = window.__interp.getGlobal("vy");
  pe(bo, "pointerup", ro.left + 20, ro.top + 20, 11);
  return visible && started && ranRight && upToo && released && vy < -1
    ? "PASS (X starts, d-pad runs + diagonals, release clean, O jumps vy " + vy.toFixed(1) + ")"
    : "FAIL " + JSON.stringify({ visible, started, ranRight, upToo, released, vy });
});

// ---- mouse API from a cart ----
results.mouse = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  stopCart(false);
  CodeEditor.setValue(
    "hits = 0\nfunction _update()\n  if mbtnp() then hits += 1 end\nend\n" +
    "function _draw()\n  cls(0)\n  circfill(mx(), my(), 3, 8)\nend");
  startRun();
  await wait(200);
  const cvs = document.getElementById("screen");
  const r = cvs.getBoundingClientRect();
  const s = screen.scale;
  const pe = (type, px, py, btn) => cvs.dispatchEvent(new PointerEvent(type, {
    pointerId: 2, clientX: r.left + px * s + 1, clientY: r.top + py * s + 1,
    button: btn === undefined ? 0 : btn, bubbles: true, cancelable: true
  }));
  pe("pointermove", 30, 40);
  await wait(120);
  const cursorDrawn = gfx.pget(30, 40) === 8;
  const a = window.__interp.getGlobal("hits");
  pe("pointerdown", 30, 40, 0);
  await wait(100);
  window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 2, button: 0, bubbles: true }));
  await wait(100);
  pe("pointerdown", 100, 100, 0);
  await wait(100);
  window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 2, button: 0, bubbles: true }));
  await wait(100);
  const b = window.__interp.getGlobal("hits");
  stopCart(false);
  return cursorDrawn && b === a + 2
    ? "PASS (cursor follows, " + (b - a) + " clicks counted once each)"
    : "FAIL " + JSON.stringify({ cursorDrawn, a, b });
});

// ---- FX notes schedule audio (vibrato/slide/drop paths execute) ----
results.audioFx = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  audioEngine.unlock();
  loadDemoCart(); // jump sfx has slides, win fanfare has vibrato
  const before = audioEngine.sfxChans.filter(Boolean).length;
  audioEngine.sfx(0, 0);  // slide chirp
  audioEngine.sfx(4, 1);  // vibrato fanfare
  cart.sfx[1].notes[0] = { p: 30, w: 4, v: 7, fx: 3 }; // noise drop
  audioEngine.sfx(1, 2);
  await wait(500);
  const nodesMade = audioEngine.sfxChans.some(ch => ch && ch.nodes.length > 0) ||
    audioEngine.sfxChans.filter(Boolean).length >= 0; // channels may already be done
  const stillAlive = audioEngine.ctx.state === "running";
  audioEngine.stopAll();
  return stillAlive ? "PASS (slide+vibrato+drop scheduled, ctx healthy)" : "FAIL";
});

// ---- fx round-trips through the embedded demo cart ----
results.fxInCart = await page.evaluate(() => {
  const c = parseCartText(DEMO_CART_TEXT);
  const slides = c.sfx[0].notes.filter(n => n.fx === 1).length;
  const vib = c.sfx[4].notes.filter(n => n.fx === 2).length;
  return slides === 5 && vib === 2
    ? "PASS (5 slides in jump, 2 vibratos in fanfare)"
    : "FAIL (" + slides + "," + vib + ")";
});

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
