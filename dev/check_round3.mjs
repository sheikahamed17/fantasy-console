// Round-3 integration: gamepad drives a cart (faked navigator.getGamepads),
// cart library save/load/delete round-trip, WebM recording produces a video.
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
const errors = [];
page.on("pageerror", e => errors.push(String(e.message || e)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
const G = n => page.evaluate(name => window.__interp.getGlobal(name), n);

await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(700);

// ---- gamepad: fake navigator.getGamepads, drive EMBER QUEST ----
results.gamepad = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const mkPad = presses => ({
    connected: true,
    axes: [presses.ax0 || 0, presses.ax1 || 0],
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: !!presses[i] }))
  });
  let padState = {};
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => [mkPad(padState), null]
  });
  // start the game with the pad's A button... X button = console button 5 = pad B(1)
  padState = { 1: 1 }; // B -> X button -> start
  await wait(150);
  padState = {};
  await wait(100);
  const started = window.__interp.getGlobal("state") === "play";
  const px0 = window.__interp.getGlobal("px");
  padState = { 15: 1 }; // d-pad right
  await wait(600);
  const pxMoved = window.__interp.getGlobal("px") > px0 + 10;
  padState = { 15: 1, 0: 1 }; // keep running + A = jump
  await wait(120);
  const vy = window.__interp.getGlobal("vy");
  padState = { ax0: 0.9 };    // analog stick right instead of d-pad
  await wait(300);
  const pxStick0 = window.__interp.getGlobal("px");
  await wait(300);
  const stickWorks = window.__interp.getGlobal("px") !== pxStick0;
  // Start button opens the pause menu
  padState = { 9: 1 };
  await wait(120);
  const paused = document.getElementById("pause-menu").classList.contains("visible");
  padState = {};
  await wait(80);
  padState = { 9: 1 }; // Start again = resume
  await wait(120);
  const resumed = !document.getElementById("pause-menu").classList.contains("visible");
  padState = {};
  delete navigator.getGamepads; // restore (configurable shadow)
  return started && pxMoved && vy < -1 && stickWorks && paused && resumed
    ? "PASS (start, d-pad run, A jump vy " + vy.toFixed(1) + ", stick, Start=pause/resume)"
    : "FAIL " + JSON.stringify({ started, pxMoved, vy, stickWorks, paused, resumed });
});

// ---- cart library round trip ----
results.library = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  stopCart(false);
  // save EMBER QUEST under a custom name
  cart.meta.title = "lib test cart";
  document.getElementById("cart-title").value = cart.meta.title;
  const beforeJson = cartToJson(cart);
  librarySave();
  await wait(100);
  const ix = libIndex();
  if (ix.length !== 1 || ix[0].title !== "lib test cart") return "FAIL (index " + JSON.stringify(ix.map(e => e.title)) + ")";
  if (!ix[0].thumb || ix[0].thumb.length !== 4096) return "FAIL (thumb len " + (ix[0].thumb || "").length + ")";
  // switch to another cart, then load back from the library
  loadShooterCart();
  if (cart.meta.title !== "STARFALL") return "FAIL (switch)";
  const raw = localStorage.getItem("fable8:lib:cart:" + ix[0].id);
  loadCartIntoIDE(parseCartText(raw));
  const identical = cartToJson(cart) === beforeJson;
  // delete
  localStorage.removeItem("fable8:lib:cart:" + ix[0].id);
  libWriteIndex([]);
  return identical ? "PASS (save -> switch -> load byte-exact, 64x64 thumb)" : "FAIL (differs)";
});

// ---- legacy single-slot migration ----
results.legacyMigration = await page.evaluate(() => {
  localStorage.setItem("fable8:saved", cartToJson(cart));
  openLibrary();
  UI.closeModal();
  const ix = libIndex();
  const migrated = ix.some(e => e.title.indexOf("(imported)") !== -1) &&
    localStorage.getItem("fable8:saved") === null;
  libWriteIndex([]);
  return migrated ? "PASS" : "FAIL";
});

// ---- WebM recording ----
results.webm = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  loadDemoCart();
  startRun();
  await wait(300);
  let saved = null;
  const origFinish = VideoRec.finish.bind(VideoRec);
  VideoRec.finish = function () { // intercept instead of downloading
    saved = new Blob(this.chunks, { type: "video/webm" });
    this.cleanup();
  };
  VideoRec.start();
  if (!VideoRec.active) { VideoRec.finish = origFinish; return "FAIL (recorder did not start)"; }
  const btnDuring = document.getElementById("btn-rec").textContent;
  await wait(1800);
  VideoRec.stop();
  await wait(500);
  VideoRec.finish = origFinish;
  if (!saved || !saved.size) return "FAIL (empty blob)";
  return saved.size > 2000 && btnDuring.indexOf("STOP") !== -1
    ? "PASS (" + Math.round(saved.size / 1024) + " kb webm, button toggled)"
    : "FAIL (size " + saved.size + ")";
});

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
