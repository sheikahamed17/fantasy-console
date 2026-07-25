// Round-9 integration: long strings run in carts, and the incremental
// highlighter recolors cascading lines when a [[ opens/closes above them.
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

// ---- a cart using a long-string level map, drawn from data ----
results.longStringCart = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  stopCart(false);
  CodeEditor.setValue(
    'level = [[\n' +
    '####\n' +
    '#..#\n' +
    '####]]\n' +
    'rows = split(level, "\\n")\n' +
    'walls = 0\n' +
    'for y = 1, #rows do\n' +
    '  for x = 1, #rows[y] do\n' +
    '    if sub(rows[y], x, x) == "#" then walls += 1 end\n' +
    '  end\n' +
    'end\n' +
    'function _draw()\n' +
    '  cls(0)\n' +
    '  print("walls: " .. walls, 2, 2, 7)\n' +
    'end');
  startRun();
  await wait(250);
  const walls = window.__interp.getGlobal("walls");
  const err = document.getElementById("run-error").textContent;
  stopCart(false);
  return walls === 10 && !err
    ? "PASS (10 wall tiles parsed from [[ ]] data)"
    : "FAIL (walls=" + walls + " err=" + err + ")";
});

// ---- highlighter: opening [[ above recolors the lines below ----
results.cascadeHighlight = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  UI.showTab("code");
  CodeEditor.setValue('x = 1\nlocal y = 2\nz = "done"');
  await wait(50);
  const hl = document.getElementById("code-hl-inner");
  const lineHtml = i => hl.querySelectorAll(".cl")[i].innerHTML;
  const beforeL1 = lineHtml(1);
  const kwBefore = beforeL1.indexOf("t-kw") !== -1; // 'local' keyword colored
  // type "s = [[" at the start — everything below becomes string-colored
  const ta = document.getElementById("code-ta");
  ta.focus();
  ta.setSelectionRange(0, 0);
  document.execCommand("insertText", false, "s = [[\n");
  await wait(50);
  const insideStr = lineHtml(1).indexOf("t-str") !== -1 &&
    lineHtml(1).indexOf("t-kw") === -1 &&
    lineHtml(2).indexOf("t-str") !== -1;
  // close it on line 1 — the rest returns to normal colors
  ta.setSelectionRange(6, 6); // right after "[["
  document.execCommand("insertText", false, "]]");
  await wait(50);
  const restored = lineHtml(1).indexOf("t-kw") === -1 // line1 is now "x = 1"
    ? hl.querySelectorAll(".cl")[2].innerHTML.indexOf("t-kw") !== -1 // 'local' back
    : false;
  return kwBefore && insideStr && restored
    ? "PASS (open recolors below, close restores)"
    : "FAIL " + JSON.stringify({ kwBefore, insideStr, restored });
});

// ---- editor perf still fine with the state pass at 2000 lines ----
results.perf = await page.evaluate(async () => {
  const big = [];
  for (let i = 0; i < 2000; i++) big.push('local v' + i + ' = ' + i + ' -- line with "text"');
  CodeEditor.setValue(big.join("\n"));
  const ta = document.getElementById("code-ta");
  ta.focus();
  ta.setSelectionRange(60000, 60000);
  const t0 = performance.now();
  document.execCommand("insertText", false, "x");
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  const ms = performance.now() - t0;
  return ms < 25 ? "PASS (" + ms.toFixed(1) + "ms keystroke)" : "FAIL (" + ms.toFixed(1) + "ms)";
});

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
