// Isolated check: win screen -> press X -> back to title?
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
page.on("pageerror", e => console.log("PAGEERROR:", e.message));
await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await new Promise(r => setTimeout(r, 600));
const res = await page.evaluate(async () => {
  const G = n => window.__interp.getGlobal(n);
  const S = (n, v) => window.__interp.globals.set(n, v);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  input.setKey(5, true); await wait(60); input.setKey(5, false);
  await wait(150);
  // teleport to the flag -> win
  S("px", 972); S("py", 74); S("vx", 0); S("vy", 0);
  await wait(300);
  const st1 = G("state");
  const tickAtWin = G("tick"), endtick = G("endtick");
  await wait(800);
  const tickLater = G("tick");
  const frameAdvancing = tickLater > tickAtWin;
  // press X
  input.setKey(5, true); await wait(100); input.setKey(5, false);
  await wait(300);
  const st2 = G("state");
  return { st1, st2, tickAtWin, endtick, tickLater, frameAdvancing,
           running: runtime.running, paused: runtime.paused };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
