// Injects dev/shooter.b64 into index.html at the SHOOTER_CART_TEXT constant.
import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = new URL("../index.html", import.meta.url);
const b64 = readFileSync(new URL("./shooter.b64", import.meta.url), "utf8").trim();
let html = readFileSync(htmlPath, "utf8");

const CHUNK = 400;
const parts = [];
for (let i = 0; i < b64.length; i += CHUNK) parts.push('"' + b64.slice(i, i + CHUNK) + '"');
const literal = "\n  " + parts.join(" +\n  ");

const marker = 'const SHOOTER_CART_TEXT = "@@SHOOTER_CART_B64@@";';
const re = /const SHOOTER_CART_TEXT =[\s\S]*?;/;
if (html.includes(marker)) {
  html = html.replace(marker, "const SHOOTER_CART_TEXT =" + literal + ";");
} else if (re.test(html)) {
  html = html.replace(re, "const SHOOTER_CART_TEXT =" + literal + ";");
} else {
  throw new Error("SHOOTER_CART_TEXT marker not found in index.html");
}
writeFileSync(htmlPath, html);
console.log("embedded shooter cart: " + b64.length + " base64 chars in " + parts.length + " lines");
