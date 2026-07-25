// Generic cart embedder: node dev/embed_cart.mjs <b64-file> <CONST_NAME>
import { readFileSync, writeFileSync } from "node:fs";

const [, , b64File, constName] = process.argv;
if (!b64File || !constName) {
  console.error("usage: node dev/embed_cart.mjs <b64-file> <CONST_NAME>");
  process.exit(1);
}
const htmlPath = new URL("../index.html", import.meta.url);
const b64 = readFileSync(new URL("./" + b64File, import.meta.url), "utf8").trim();
let html = readFileSync(htmlPath, "utf8");

const CHUNK = 400;
const parts = [];
for (let i = 0; i < b64.length; i += CHUNK) parts.push('"' + b64.slice(i, i + CHUNK) + '"');
const literal = "\n  " + parts.join(" +\n  ");

const re = new RegExp("const " + constName + " =[\\s\\S]*?;");
if (!re.test(html)) throw new Error(constName + " marker not found in index.html");
html = html.replace(re, "const " + constName + " =" + literal + ";");
writeFileSync(htmlPath, html);
console.log("embedded " + constName + ": " + b64.length + " chars in " + parts.length + " lines");
