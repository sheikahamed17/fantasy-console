// LEARN FABLESCRIPT — interactive tutorial cart, written in FableScript.
// Usage: node dev/build_learn.mjs -> dev/learn.b64
import { writeFileSync } from "node:fs";

const SHEET_W = 128, SHEET_H = 128, MAP_W = 128, MAP_H = 32;
const gfx = new Uint8Array(SHEET_W * SHEET_H);
const flags = new Uint8Array(256);
const map = new Uint8Array(MAP_W * MAP_H);

function newSfx() {
  return { speed: 16, notes: Array.from({ length: 32 }, () => [-1, 0, 5]) };
}
const sfx = Array.from({ length: 64 }, newSfx);
sfx[0].speed = 1;
sfx[0].notes[0] = [52, 2, 4]; // page-turn blip
sfx[0].notes[1] = [57, 2, 3];
function newPat() { return { ch: [-1, -1, -1, -1], loopStart: false, loopEnd: false, stop: false }; }
const music = Array.from({ length: 32 }, newPat);

const code = `-- ==================================
--  LEARN FABLESCRIPT
--  an interactive tour, written in
--  fablescript itself. use <- and ->
--  to turn pages. then press esc and
--  read this cart's code!
-- ==================================

page = 1
tick = 0
pages = {}
balls = {}
presses = 0
counter_fn = nil

function counter()
  local c = 0
  return function()
    c += 1
    return c
  end
end

function addpage(t, body, demo)
  add(pages, {t = t, body = body, demo = demo})
end

function _init()
  srand(2)
  counter_fn = counter()
  for i = 1, 6 do
    add(balls, {x = 20 + rnd(88), y = 80 + rnd(30),
                vx = rnd(2) - 1, vy = rnd(2) - 1, c = 8 + flr(rnd(7))})
  end
  build_pages()
end

function build_pages()
  addpage("welcome!", {
    "this whole tutorial is a",
    "fable-8 cart. a cart is just",
    "fablescript code plus art",
    "and sound data.",
    "",
    "turn pages with <- and ->"
  }, function()
    for i = 0, 15 do
      local y = 100 + sin(tick / 20 + i / 3) * 6
      rectfill(8 + i * 7, y, 13 + i * 7, y + 4, i)
    end
  end)

  addpage("drawing", {
    "_draw() runs 60x per second.",
    "cls(c) clears the screen,",
    "print(), circfill(), rectfill()",
    "and spr() paint on it.",
    "",
    "this box is drawn right now:"
  }, function()
    local r = 8 + sin(tick / 15) * 4
    circfill(40, 102, r, 9)
    circ(40, 102, r + 3, 10)
    rectfill(70, 94, 100, 112, 3)
    print("hi!", 79, 100, 7)
  end)

  addpage("variables", {
    "variables are global unless",
    "you write 'local'.",
    "",
    "tick += 1 runs every frame,",
    "so numbers make motion:"
  }, function()
    print("tick = " .. tick, 12, 96, 10)
    print("sin(tick/20) = " .. flr(sin(tick / 20) * 100) / 100, 12, 106, 12)
    circfill(100, 102, 4 + sin(tick / 20) * 3, 14)
  end)

  addpage("buttons", {
    "btn(i) is true while held.",
    "btnp(i) fires once per press.",
    "0-3 arrows, 4 = z, 5 = x.",
    "",
    "hold some arrow keys:"
  }, function()
    local names = {"left", "right", "up", "down"}
    for i = 1, 4 do
      local x = 6 + (i - 1) * 30
      if btn(i - 1) then
        rectfill(x, 96, x + 26, 112, 11)
        print(names[i], x + 4, 102, 0)
      else
        rect(x, 96, x + 26, 112, 5)
        print(names[i], x + 4, 102, 5)
      end
    end
  end)

  addpage("loops", {
    "for i = 1, 10 do ... end",
    "counts inclusively.",
    "",
    "one loop draws all of this:"
  }, function()
    for i = 1, 14 do
      local h = 6 + sin(tick / 12 + i / 2) * 5
      rectfill(6 + i * 8, 112 - h * 2, 11 + i * 8, 112, i % 15 + 1)
    end
  end)

  addpage("tables", {
    "tables hold everything.",
    "t = {x = 1, tags = {..}}",
    "add(t, v)  del(t, v)  #t",
    "",
    "each ball is a table in a",
    "table, moved with foreach:"
  }, function()
    foreach(balls, function(b)
      b.x += b.vx
      b.y += b.vy
      if b.x < 8 or b.x > 120 then b.vx = -b.vx end
      if b.y < 92 or b.y > 116 then b.vy = -b.vy end
      circfill(b.x, b.y, 3, b.c)
    end)
  end)

  addpage("functions", {
    "functions are values and",
    "capture their locals",
    "(closures).",
    "",
    "counter_fn remembers c:",
    "press x!"
  }, function()
    if btnp(5) then
      presses = counter_fn()
      sfx(0)
    end
    print("counted: " .. presses, 34, 98, 10)
    print("(the count lives inside", 18, 108, 5)
    print("the closure)", 40, 115, 5)
  end)

  addpage("make a game!", {
    "a cart needs only:",
    "_init()   runs once",
    "_update() 60x per second",
    "_draw()   after update",
    "",
    "sprites, map, sfx and music",
    "live in the editor tabs.",
    "",
    "press esc and read this",
    "cart's code - then break it,",
    "run it, and make it yours!"
  }, function()
    print("the whole console is yours", 12, 108, 9 + tick / 10 % 3)
  end)
end

function _update()
  tick += 1
  if btnp(1) and page < #pages then
    page += 1
    sfx(0)
  end
  if btnp(0) and page > 1 then
    page -= 1
    sfx(0)
  end
end

function _draw()
  cls(1)
  rectfill(0, 0, 127, 10, 2)
  local p = pages[page]
  print(p.t, 4, 3, 10)
  print(page .. "/" .. #pages, 106, 3, 14)
  for i = 1, #p.body do
    print(p.body[i], 4, 10 + i * 7, 7)
  end
  rect(0, 88, 127, 120, 13)
  p.demo()
  if page > 1 then print("<-", 4, 123, 6) end
  if page < #pages then print("->", 116, 123, 6) end
  print("turn the page", 39, 123, 5)
end
`;

function nibblesToHex(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += (bytes[i] & 15).toString(16);
  return s;
}
const cartObj = {
  v: 1,
  meta: { title: "LEARN FABLESCRIPT", author: "FABLE-8" },
  code,
  gfx: nibblesToHex(gfx),
  flags: Array.from(flags),
  map: Buffer.from(map).toString("base64"),
  sfx,
  music
};
const json = JSON.stringify(cartObj);
writeFileSync(new URL("./learn.b64", import.meta.url), Buffer.from(json, "utf8").toString("base64"));
console.log("LEARN FABLESCRIPT built: " + code.split("\n").length + " code lines");
