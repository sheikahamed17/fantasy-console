// FABLE-8 verification harness (dev-only). Drives the real index.html
// over file:// in headless Edge/Chrome via puppeteer-core.
// Usage: node dev/verify.mjs <selftest|boot|playdemo|gameover|fps|editorperf>
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const INDEX = "file:///" + join(here, "..", "index.html").replace(/\\/g, "/");
const EXES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];
const exe = EXES.find(existsSync);
const mode = process.argv[2] || "selftest";

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: "new",
  args: ["--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required", "--window-size=1280,800"]
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("pageerror", e => console.log("PAGEERROR:", e.message));
const shot = name => page.screenshot({ path: join(here, "shot-" + name + ".png") });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function boot(hash = "") {
  await page.goto(INDEX + hash, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
}

if (mode === "selftest") {
  await boot("#selftest");
  await sleep(1500);
  const res = await page.evaluate(() => ({
    result: window.__selftestResult,
    title: document.title,
    fails: [...document.querySelectorAll(".st-fail")].map(td => td.parentElement.textContent)
  }));
  console.log(JSON.stringify(res, null, 1));
} else if (mode === "boot") {
  const t0 = Date.now();
  await boot();
  // poll until the demo is running and drawing
  let bootMs = -1;
  for (;;) {
    const st = await page.evaluate(() =>
      typeof runtime !== "undefined" && runtime.running && window.__interp
        ? window.__interp.getGlobal("state") : null);
    if (st === "title") { bootMs = Date.now() - t0; break; }
    if (Date.now() - t0 > 5000) break;
    await sleep(40);
  }
  console.log(JSON.stringify({
    bootToTitleMs: bootMs,
    cartTitle: await page.evaluate(() => cart.meta.title),
    pendingMusic: await page.evaluate(() => audioEngine.pendingMusic)
  }));
  await sleep(700);
  await shot("title");
  // real keydown unlocks audio + starts pending music
  await page.keyboard.press("KeyQ");
  await sleep(600);
  console.log(JSON.stringify({
    audioUnlocked: await page.evaluate(() => audioEngine.unlocked),
    musicPlaying: await page.evaluate(() => audioEngine.mus.playing),
    musicPattern: await page.evaluate(() => audioEngine.mus.pat)
  }));
} else if (mode === "playdemo") {
  await boot();
  await sleep(600);
  const result = await page.evaluate(async () => {
    const G = n => window.__interp.getGlobal(n);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    input.setKey(5, true); await wait(60); input.setKey(5, false);
    await wait(120);
    const zones = [
      ["pit1", 82, 92, 20], ["spk23", 166, 178, 20], ["step27", 202, 212, 4],
      ["gap32", 238, 252, 20], ["spkgap46", 342, 350, 20], ["gap53", 412, 421, 11],
      ["gap59", 456, 468, 11], ["spk66", 508, 518, 11], ["gap73", 570, 582, 20],
      ["gap92", 700, 708, 20], ["hop100", 788, 798, 11], ["hop104", 820, 830, 11],
      ["step109", 858, 868, 4], ["step111", 880, 892, 4]
    ];
    const pilot = { fired: new Set(), holdLeft: 0, lastLives: G("lives"), deaths: 0, maxPx: 0 };
    const hooks = runtime.hooks;
    const orig = hooks.update;
    let midShotTaken = false;
    hooks.update = () => {
      if (G("state") === "play") {
        const px = G("px");
        pilot.maxPx = Math.max(pilot.maxPx, px);
        if (G("lives") < pilot.lastLives) {
          pilot.deaths++; pilot.lastLives = G("lives");
          pilot.fired.clear(); pilot.holdLeft = 0; input.setKey(4, false);
        }
        input.setKey(1, true);
        if (pilot.holdLeft > 0) {
          pilot.holdLeft--;
          if (pilot.holdLeft === 0) input.setKey(4, false);
        } else if (G("grounded")) {
          for (const [id, lo, hi, hold] of zones) {
            if (px >= lo && px <= hi && !pilot.fired.has(id)) {
              pilot.fired.add(id);
              input.setKey(4, true);
              pilot.holdLeft = hold;
              break;
            }
          }
        }
        if (px > 400 && !midShotTaken) { midShotTaken = true; window.__midlevel = true; }
      }
      orig();
    };
    const t0 = performance.now();
    while (performance.now() - t0 < 120000) {
      const st = G("state");
      if (st === "win" || st === "over") break;
      await wait(100);
    }
    hooks.update = orig;
    input.reset();
    return {
      finalState: G("state"),
      maxPx: Math.round(pilot.maxPx),
      deaths: pilot.deaths,
      livesLeft: G("lives"),
      gems: G("gems") + "/" + G("gemtotal"),
      gameTimer: Math.round(G("timer") * 10) / 10
    };
  });
  console.log(JSON.stringify(result));
  await shot("winscreen");
  // back to title from win screen
  await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    input.setKey(5, true); await wait(80); input.setKey(5, false);
  });
  await sleep(300);
  console.log(JSON.stringify({ afterWinKey: await page.evaluate(() => window.__interp.getGlobal("state")) }));
} else if (mode === "midshot") {
  await boot();
  await sleep(600);
  await page.evaluate(async () => {
    const G = n => window.__interp.getGlobal(n);
    const S = (n, v) => window.__interp.globals.set(n, v);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    input.setKey(5, true); await wait(60); input.setKey(5, false);
    await wait(200);
    S("px", 296); S("py", 40); S("vx", 0); S("vy", 0);
    await wait(350);
  });
  await shot("midlevel");
  console.log(JSON.stringify({ ok: true }));
} else if (mode === "gameover") {
  await boot();
  await sleep(600);
  const res = await page.evaluate(async () => {
    const G = n => window.__interp.getGlobal(n);
    const S = (n, v) => window.__interp.globals.set(n, v);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    input.setKey(5, true); await wait(60); input.setKey(5, false);
    await wait(150);
    // burn all lives on the first spikes
    for (let i = 0; i < 4; i++) {
      S("px", 186); S("py", 88); S("inv", 0);
      await wait(250);
      if (G("state") === "over") break;
    }
    const overState = G("state");
    await wait(700); // allow the "press x" gate (30 ticks) to open
    input.setKey(5, true); await wait(80); input.setKey(5, false);
    await wait(250);
    return { overState, backTo: G("state") };
  });
  await shot("gameover");
  console.log(JSON.stringify(res));
} else if (mode === "fps") {
  await boot();
  await sleep(600);
  // measure EMBER QUEST logic-frame cost while playing (mid-level view)
  const demo = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const G = n => window.__interp.getGlobal(n);
    const S = (n, v) => window.__interp.globals.set(n, v);
    input.setKey(5, true); await wait(60); input.setKey(5, false);
    await wait(200);
    S("px", 500); S("py", 60);
    input.setKey(1, true);
    await wait(400);
    const hooks = runtime.hooks;
    const t0 = performance.now();
    const N = 240;
    for (let i = 0; i < N; i++) { input.beginFrame(); hooks.update(); hooks.draw(); screen.blit(); }
    const ms = (performance.now() - t0) / N;
    input.reset();
    const f0 = runtime.frame;
    await wait(2000);
    const logicHz = (runtime.frame - f0) / 2;
    return { demoFrameMs: +ms.toFixed(3), demoLogicHz: +logicHz.toFixed(1) };
  });
  // stress cart: 500 spr() per frame
  const stress = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    stopCart(false);
    const src = [
      "function _draw()",
      "  cls(1)",
      "  for i = 1, 500 do",
      "    spr(1 + i % 8, (i * 37) % 120, (i * 53) % 120)",
      "  end",
      "  print(\"stress 500 spr\", 2, 2, 7)",
      "end"
    ].join("\n");
    CodeEditor.setValue(src);
    startRun();
    await wait(400);
    const hooks = runtime.hooks;
    const t0 = performance.now();
    const N = 240;
    for (let i = 0; i < N; i++) { hooks.draw(); screen.blit(); }
    const ms = (performance.now() - t0) / N;
    const f0 = runtime.frame;
    await wait(2000);
    const logicHz = (runtime.frame - f0) / 2;
    stopCart(false);
    return { stressFrameMs: +ms.toFixed(3), stressLogicHz: +logicHz.toFixed(1) };
  });
  console.log(JSON.stringify({ ...demo, ...stress,
    note: "frameMs < 16.67 sustains 60fps; headless rAF itself is capped ~30Hz" }));
} else if (mode === "editorperf") {
  await boot();
  await sleep(400);
  const res = await page.evaluate(async () => {
    UI.showTab("code");
    const big = [];
    for (let i = 0; i < 2000; i++) big.push("local v" + i + " = " + i + " -- line with \"text\" and spr(1,2,3)");
    CodeEditor.setValue(big.join("\n"));
    const ta = document.getElementById("code-ta");
    ta.focus();
    ta.setSelectionRange(60000, 60000);
    const t0 = performance.now();
    document.execCommand("insertText", false, "x");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    const t1 = performance.now();
    return { lines: CodeEditor.lineCount, editLatencyMs: +(t1 - t0).toFixed(2) };
  });
  console.log(JSON.stringify(res));
}

await browser.close();
