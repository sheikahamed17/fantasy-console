// Round-7 integration: log() tail in the WATCH panel, and call-site
// traces visible in the run error bar.
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

// ---- log() tail shows in the watch panel while a cart runs ----
results.logTail = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  stopCart(false);
  CodeEditor.setValue(
    "t = 0\nfunction _update()\n  t += 1\n  if t % 30 == 0 then log(\"tick\", t) end\nend\n" +
    "function _draw() cls(1) end");
  startRun();
  await wait(900);
  document.getElementById("btn-watch").click();
  await wait(400);
  const panel = document.getElementById("watch-panel").textContent;
  const logged = CartLog.entries.length >= 1 && CartLog.entries[0] === "tick 30";
  document.getElementById("btn-watch").click();
  stopCart(false);
  return logged && panel.indexOf("log() tail") !== -1 && panel.indexOf("tick 30") !== -1
    ? "PASS (" + CartLog.entries.length + " entries, tail rendered)"
    : "FAIL " + JSON.stringify({ logged, panelHasTail: panel.indexOf("tick 30") !== -1 });
});

// ---- runtime error trace shows the call chain in the error bar ----
results.errorTrace = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  CodeEditor.setValue(
    "function boom()\n  local x = nil\n  return x.field\nend\n" + // line 3 errors
    "function middle()\n  boom()\nend\n" +                        // line 6
    "function _update()\n  middle()\nend");                       // line 9
  startRun();
  await wait(250);
  const bar = document.getElementById("run-error").textContent;
  stopCart(false);
  return bar.indexOf("line 3") !== -1 &&
    bar.indexOf("attempt to index nil value 'x'") !== -1 &&
    bar.indexOf("called via line 6") !== -1 &&
    bar.indexOf("line 9") !== -1
    ? "PASS (" + bar.replace(/\s+/g, " ").slice(0, 110) + "…)"
    : "FAIL (" + bar + ")";
});

// ---- log survives across the frame boundary; cleared on re-run ----
results.logClear = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  CodeEditor.setValue('log("once")\nfunction _draw() cls(0) end');
  startRun();
  await wait(150);
  const first = CartLog.entries.length === 1;
  startRun();
  await wait(150);
  const second = CartLog.entries.length === 1; // cleared, then logged once again
  stopCart(false);
  return first && second ? "PASS" : "FAIL";
});

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
