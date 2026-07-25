// §0.4: the product is index.html ALONE. Run the selftest + boot against
// a copy of index.html sitting by itself in a temp directory, and grab a
// docs-panel screenshot while we're in there.
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
const here = dirname(fileURLToPath(import.meta.url));
const INDEX = "file:///" + join(tmpdir(), "fable8-standalone", "index.html").replace(/\\/g, "/");
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

await page.goto(INDEX + "#selftest", { waitUntil: "load" });
await sleep(1600);
const st = await page.evaluate(() => window.__selftestResult);

await page.goto(INDEX, { waitUntil: "load" });
await sleep(800);
const boot = await page.evaluate(() => ({
  running: runtime.running,
  state: window.__interp && window.__interp.getGlobal("state"),
  title: cart.meta.title
}));
await page.evaluate(() => { stopCart(false); UI.showTab("docs"); });
await sleep(300);
await page.screenshot({ path: join(here, "shot-docs.png") });
console.log(JSON.stringify({ selftest: st, boot, pageErrors: errors }));
await browser.close();
