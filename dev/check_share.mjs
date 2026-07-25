// Share-pillar integration: GIF decodes as a real image, PNG cartridge
// round-trips byte-exactly through actual PNG encode/decode, standalone
// player build boots as a game and can unlock the editor.
import puppeteer from "puppeteer-core";
import { existsSync, writeFileSync } from "node:fs";
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
await sleep(900); // demo runs, gif buffer fills

// ---- GIF: encode the live ring buffer, decode it as an image ----
results.gif = await page.evaluate(async () => {
  if (!GifRec.frames.length) return "FAIL (ring buffer empty)";
  const frames = GifRec.frames.slice(0, 30);
  const bytes = gifEncode(frames, 128, 128, PALETTE_HEX, 3);
  const blob = new Blob([bytes], { type: "image/gif" });
  const url = URL.createObjectURL(blob);
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("gif does not decode"));
    im.src = url;
  }).catch(e => null);
  URL.revokeObjectURL(url);
  if (!img) return "FAIL (browser refused the gif)";
  if (img.naturalWidth !== 128 || img.naturalHeight !== 128) {
    return "FAIL (size " + img.naturalWidth + "x" + img.naturalHeight + ")";
  }
  // pixel-accurate: first frame must equal ring frame 0
  const cv = document.createElement("canvas");
  cv.width = 128; cv.height = 128;
  const c2 = cv.getContext("2d");
  c2.drawImage(img, 0, 0);
  const got = c2.getImageData(0, 0, 128, 128).data;
  const px32 = new Uint32Array(got.buffer);
  let bad = 0;
  for (let i = 0; i < 128 * 128; i++) {
    if (px32[i] !== PALETTE_U32[frames[0][i] & 15]) bad++;
  }
  return bad === 0 ? "PASS (decoded, " + Math.round(bytes.length / 1024) + " kb, pixels exact)"
    : "FAIL (" + bad + " wrong pixels)";
});

// ---- PNG cartridge: full encode -> PNG -> decode round trip ----
results.pngCart = await page.evaluate(async () => {
  stopCart(false);
  const original = cartToJson(cart);
  const jsonBytes = new TextEncoder().encode(original);
  const data = await deflateBytes(jsonBytes);
  const label = renderCartLabel(cart.meta.title, gfx.fb);
  const c2 = label.getContext("2d");
  const img = c2.getImageData(0, 0, label.width, label.height);
  if (!stegoEmbed(img.data, data, STEGO_FLAG_DEFLATE)) return "FAIL (does not fit)";
  c2.putImageData(img, 0, 0);
  const url = label.toDataURL("image/png"); // real PNG encode
  const back = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("png decode failed"));
    im.src = url;
  });
  const cv = document.createElement("canvas");
  cv.width = back.naturalWidth; cv.height = back.naturalHeight;
  const cc = cv.getContext("2d");
  cc.drawImage(back, 0, 0);
  const found = stegoExtract(cc.getImageData(0, 0, cv.width, cv.height).data);
  if (!found) return "FAIL (payload lost in png round trip)";
  const bytes = await inflateBytes(found.data);
  const restored = cartToJson(parseCartText(new TextDecoder().decode(bytes)));
  return restored === original
    ? "PASS (byte-exact through a real png, payload " + Math.round(data.length / 1024) + " kb)"
    : "FAIL (cart differs after round trip)";
});

// ---- standalone player build ----
const html = await page.evaluate(() => buildStandaloneHtml(PRISTINE_HTML, cartToText(cart)));
if (!html) {
  results.standalone = "FAIL (builder returned null)";
} else {
  const out = join(here, "standalone_game.html");
  writeFileSync(out, html);
  const p2 = await browser.newPage();
  const errs2 = [];
  p2.on("pageerror", e => errs2.push(String(e.message || e)));
  await p2.goto("file:///" + out.replace(/\\/g, "/"), { waitUntil: "load" });
  await sleep(900);
  const boot = await p2.evaluate(() => ({
    playerMode: document.body.classList.contains("player-mode"),
    topbarHidden: getComputedStyle(document.getElementById("topbar")).display === "none",
    running: runtime.running,
    title: cart.meta.title,
    paneH: document.getElementById("panes").getBoundingClientRect().height
  }));
  // Esc pauses (does not dump to editor)
  await p2.keyboard.press("Escape");
  await sleep(150);
  const pausedNotEditor = await p2.evaluate(() =>
    document.getElementById("pause-menu").classList.contains("visible") &&
    document.body.classList.contains("player-mode"));
  // quit item unlocks the editor
  const unlocked = await p2.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('.pm-item[data-pm="quit"]').click();
    await wait(200);
    return !document.body.classList.contains("player-mode") && UI.current === "code";
  });
  results.standalone =
    boot.playerMode && boot.topbarHidden && boot.running && boot.paneH > 300 &&
    pausedNotEditor && unlocked
      ? "PASS (boots as game '" + boot.title + "', Esc pauses, quit unlocks editor)"
      : "FAIL " + JSON.stringify({ boot, pausedNotEditor, unlocked, errs2 });
  await p2.close();
}

results.pageErrors = errors.length ? errors : "none";
console.log(JSON.stringify(results, null, 1));
await browser.close();
