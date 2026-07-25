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
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto(INDEX, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await sleep(600);
const out = await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  stopCart(false);
  UI.showTab("sprites");
  await wait(80);
  SpriteEditor.selectSprite(2);
  document.getElementById("anim-frames").value = 2;
  document.getElementById("anim-fps").value = 10;
  const cv = document.getElementById("anim-canvas");
  const hash = () => {
    const d = cv.getContext("2d").getImageData(0, 0, 64, 64).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s = (s * 31 + d[i] + d[i + 1]) >>> 0;
    return s;
  };
  const samples = [];
  for (let i = 0; i < 14; i++) {
    samples.push(hash());
    await wait(60);
  }
  // sprite 2 vs 3 actually differ?
  let diff = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    if (cart.gfx[y * 128 + 16 + x] !== cart.gfx[y * 128 + 24 + x]) diff++;
  }
  return {
    playing: document.getElementById("anim-play").textContent,
    samples: [...new Set(samples)],
    sampleCount: samples.length,
    sprite23DiffPixels: diff,
    tab: UI.current
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
