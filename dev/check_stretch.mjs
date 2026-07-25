// Verification for the §14 stretch features: STARFALL cart, CRT toggle,
// find/replace, and the shake() display effect.
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
page.on("pageerror", e => errors.push(e.message));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = name => page.screenshot({ path: join(here, "shot-" + name + ".png") });
const results = {};

await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(600);

// ---- STARFALL: load, title, screenshot ----
await page.evaluate(() => { loadShooterCart(); startRun(); });
await sleep(700);
results.shooterBoots = await page.evaluate(() =>
  runtime.running && window.__interp.getGlobal("state") === "title" &&
  cart.meta.title === "STARFALL" ? "PASS" : "FAIL");
await shot("starfall-title");

// ---- play: pilot for ~12s — drift left/right, hold fire ----
const play = await page.evaluate(async () => {
  const G = n => window.__interp.getGlobal(n);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  input.setKey(5, true); await wait(60); input.setKey(5, false);
  await wait(150);
  const st = G("state");
  input.setKey(4, true); // hold fire
  let dir = 0;
  let sawShake = false;
  const t0 = performance.now();
  while (performance.now() - t0 < 12000) {
    if (G("state") !== "play") break;
    // drift toward a random-ish side every 700ms
    const phase = Math.floor((performance.now() - t0) / 700) % 4;
    input.setKey(0, phase === 1 || phase === 2);
    input.setKey(1, phase === 0 || phase === 3);
    if (runtime.shake > 0) sawShake = true;
    await wait(60);
  }
  input.reset();
  return {
    stateAfterStart: st,
    score: G("score"),
    lives: G("lives"),
    wave: G("wave"),
    foes: G("foes").len(),
    finalState: G("state"),
    sawShake,
    canvasTransformSeen: sawShake // shake implies transform frames happened
  };
});
results.shooterPlay =
  play.stateAfterStart === "play" && play.score > 0 && play.sawShake
    ? "PASS (score " + play.score + ", wave " + play.wave + ", lives " + play.lives + ", state " + play.finalState + ")"
    : "FAIL " + JSON.stringify(play);
await shot("starfall-play");

// ---- game over path: burn lives, X returns to title ----
results.shooterOver = await page.evaluate(async () => {
  const G = n => window.__interp.getGlobal(n);
  const S = (n, v) => window.__interp.globals.set(n, v);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  if (G("state") !== "play") { // restart if the pilot died already
    if (G("state") === "over") { input.setKey(5, true); await wait(80); input.setKey(5, false); await wait(200); }
    input.setKey(5, true); await wait(80); input.setKey(5, false);
    await wait(150);
  }
  S("lives", 1); S("inv", 0);
  // spawn a foe on top of the ship
  window.__interp.resetBudget();
  const foes = G("foes");
  const t = new (Object.getPrototypeOf(foes).constructor)();
  // simpler: move an existing foe onto the ship, or wait for a collision
  const t0 = performance.now();
  while (performance.now() - t0 < 15000 && G("state") === "play") {
    const fs = G("foes");
    if (fs.len() > 0) {
      const f = fs.get(1);
      f.set("x", G("px"));
      f.set("y", G("py"));
    }
    S("inv", 0);
    await wait(80);
  }
  const overState = G("state");
  await wait(700);
  input.setKey(5, true); await wait(80); input.setKey(5, false);
  await wait(250);
  return overState === "over" && G("state") === "title" ? "PASS" : "FAIL (" + overState + "->" + G("state") + ")";
});

// ---- CRT toggle ----
results.crt = await page.evaluate(() => {
  const btn = document.getElementById("btn-crt");
  btn.click();
  const on = document.getElementById("screen").classList.contains("crt") &&
    document.getElementById("crt-overlay").classList.contains("visible") &&
    btn.textContent === "CRT: ON" &&
    localStorage.getItem("fable8:crt") === "1";
  return on ? "PASS" : "FAIL";
});
await shot("starfall-crt");
await page.evaluate(() => document.getElementById("btn-crt").click()); // back off

// ---- find/replace ----
results.findReplace = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  stopCart(false);
  UI.showTab("code");
  CodeEditor.setValue("alpha beta\nBETA gamma\nbeta beta end");
  CodeEditor.openFind();
  const fi = document.getElementById("find-input");
  fi.value = "beta";
  fi.dispatchEvent(new Event("input"));
  await wait(50);
  const count = document.getElementById("find-count").textContent;
  const marks = document.querySelectorAll(".find-mark").length;
  // replace all
  document.getElementById("replace-input").value = "delta";
  document.getElementById("replace-all-btn").click();
  await wait(80);
  const text = CodeEditor.getValue();
  const allReplaced = text === "alpha delta\ndelta gamma\ndelta delta end";
  // undo restores in one step
  document.getElementById("code-ta").focus();
  document.execCommand("undo");
  await wait(50);
  const undone = CodeEditor.getValue() === "alpha beta\nBETA gamma\nbeta beta end";
  document.getElementById("find-close").click();
  return count === "1/4" && marks === 4 && allReplaced && undone
    ? "PASS"
    : "FAIL " + JSON.stringify({ count, marks, allReplaced, undone });
});

// ---- sspr visible from a cart ----
results.ssprLive = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  CodeEditor.setValue("function _draw()\n  cls(0)\n  sspr(8, 0, 8, 8, 10, 10, 40, 40)\nend");
  startRun();
  await wait(250);
  // ship sprite region scaled 5x: its (3,0) pixel 'c' should cover a block
  const hit = gfx.pget(10 + 17, 10 + 2); // inside the scaled ship nose
  stopCart(false);
  return hit === 12 ? "PASS" : "FAIL (pget=" + hit + ")";
});

results.pageErrors = errors.length === 0 ? "PASS" : "FAIL: " + errors.join(" | ");
console.log(JSON.stringify(results, null, 1));
await browser.close();
