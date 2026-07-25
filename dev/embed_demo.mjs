// Injects dev/demo.b64 into index.html at the @@DEMO_CART_B64@@ marker
// (or replaces the existing embedded payload on rebuilds).
import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = new URL("../index.html", import.meta.url);
const b64 = readFileSync(new URL("./demo.b64", import.meta.url), "utf8").trim();
let html = readFileSync(htmlPath, "utf8");

// chunk into readable string-literal lines
const CHUNK = 400;
const parts = [];
for (let i = 0; i < b64.length; i += CHUNK) parts.push('"' + b64.slice(i, i + CHUNK) + '"');
const literal = "\n  " + parts.join(" +\n  ");

const marker = 'const DEMO_CART_TEXT = "@@DEMO_CART_B64@@";';
const re = /const DEMO_CART_TEXT =[\s\S]*?;/;
if (html.includes(marker)) {
  html = html.replace(marker, "const DEMO_CART_TEXT =" + literal + ";");
} else if (re.test(html)) {
  html = html.replace(re, "const DEMO_CART_TEXT =" + literal + ";");
} else {
  throw new Error("DEMO_CART_TEXT marker not found in index.html");
}
writeFileSync(htmlPath, html);
console.log("embedded demo cart: " + b64.length + " base64 chars in " + parts.length + " lines");
