// EMBER VOLLEY — local 2-player pong, showcases btn(i, 1) + shake().
// Usage: node dev/build_volley.mjs -> dev/volley.b64
import { writeFileSync } from "node:fs";

const SHEET_W = 128, SHEET_H = 128, MAP_W = 128, MAP_H = 32;
const gfx = new Uint8Array(SHEET_W * SHEET_H);
const flags = new Uint8Array(256);
const map = new Uint8Array(MAP_W * MAP_H);

function putSprite(n, rows) {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = parseInt(rows[y][x], 16);
    if (Number.isNaN(v)) throw new Error("bad pixel sprite " + n);
    gfx[((n >> 4) * 8 + y) * SHEET_W + (n & 15) * 8 + x] = v;
  }
}
// 1: ember ball
putSprite(1, [
  "00090000",
  "009a9000",
  "09afa900",
  "9afffa90",
  "09afa900",
  "009a9000",
  "00090000",
  "00000000"
]);

// banner "EMBER VOLLEY" (12 chars x 8px = 96px), sprites 32.., rows 16-25
const FONT = {
  B: [6,5,6,5,6], E: [7,4,6,4,7], L: [4,4,4,4,7], M: [7,7,5,5,5],
  O: [7,5,5,5,7], R: [7,5,6,5,5], V: [5,5,5,5,2], Y: [5,5,7,2,2],
  " ": [0,0,0,0,0]
};
function drawBanner(text, sheetX, sheetY) {
  let cx = sheetX;
  for (const ch of text) {
    const rows = FONT[ch] || FONT[" "];
    for (let r = 0; r < 5; r++) for (let b = 0; b < 3; b++) {
      if (rows[r] & (4 >> b)) {
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          gfx[(sheetY + r * 2 + dy) * SHEET_W + cx + b * 2 + dx] = r < 3 ? 9 : 8;
        }
      }
    }
    cx += 8;
  }
}
drawBanner("EMBER VOLLEY", 0, 16);

// ---- audio ----
function newSfx() {
  return { speed: 16, notes: Array.from({ length: 32 }, () => [-1, 0, 5]) };
}
const sfx = Array.from({ length: 64 }, newSfx);
function N(name) {
  const m = /^([a-g])(#?)(\d)$/.exec(name);
  return { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1]] + (m[2] ? 1 : 0) + 12 * (+m[3]);
}
function score(idx, speed, rows) {
  sfx[idx].speed = speed;
  for (const [st, note, wave, vol, fx] of rows) {
    sfx[idx].notes[st] = [typeof note === "string" ? N(note) : note, wave, vol, fx || 0];
  }
}
score(0, 1, [[0, "a3", 1, 6], [1, "e4", 1, 4]]);                        // paddle
score(1, 1, [[0, "e3", 2, 4], [1, "a2", 2, 3]]);                        // wall
score(2, 3, [[0, "a3", 3, 7], [1, "e3", 3, 6], [2, "a2", 3, 5], [3, "e2", 3, 4]]); // point
score(3, 5, [[0, "c3", 1, 6], [2, "e3", 1, 6], [4, "g3", 1, 7], [6, "c4", 1, 7], [10, "g3", 2, 5], [12, "c4", 2, 7, 2]]); // win, vibrato tail
score(8, 11, [ // gentle title arp
  [0, "a2", 2, 4], [4, "c3", 2, 4], [8, "e3", 2, 5], [12, "c3", 2, 4],
  [16, "g2", 2, 4], [20, "b2", 2, 4], [24, "d3", 2, 5], [28, "b2", 2, 4]
]);
score(9, 11, [[0, "a1", 2, 5], [8, "a1", 2, 3], [16, "g1", 2, 5], [24, "g1", 2, 3]]);

function newPat() { return { ch: [-1, -1, -1, -1], loopStart: false, loopEnd: false, stop: false }; }
const music = Array.from({ length: 32 }, newPat);
music[0] = { ch: [8, 9, -1, -1], loopStart: true, loopEnd: true, stop: false };

// ---- code ----
const code = `-- =============================
--  EMBER VOLLEY - two players!
--  p1 (right): up/down arrows
--  p2 (left):  e = up, d = down
-- =============================

state = "title"
tick = 0
s1 = 0
s2 = 0
p1y = 52
p2y = 52
bx = 64
by = 64
bvx = 1
bvy = 0.5
serve = 1
rally = 0
winat = 0
trail = {}

function _init()
  srand(9)
  music(0)
end

function serve_ball()
  bx = 64
  by = 30 + rnd(68)
  bvx = 0.9 * serve
  bvy = rnd(1.4) - 0.7
  rally = 0
end

function begin_game()
  state = "play"
  s1 = 0
  s2 = 0
  serve = 1
  p1y = 52
  p2y = 52
  trail = {}
  serve_ball()
end

function score_point(who)
  if who == 1 then
    s1 += 1
    serve = -1
  else
    s2 += 1
    serve = 1
  end
  sfx(2)
  shake(8, 2)
  if s1 >= 5 or s2 >= 5 then
    state = "won"
    winat = tick
    music(-1)
    sfx(3)
  else
    serve_ball()
  end
end

function upd_play()
  -- player 1 = arrows, player 2 = btn(i, 1) reads e/d
  if btn(2) then p1y -= 2 end
  if btn(3) then p1y += 2 end
  if btn(2, 1) then p2y -= 2 end
  if btn(3, 1) then p2y += 2 end
  p1y = mid(12, p1y, 92)
  p2y = mid(12, p2y, 92)
  bx += bvx
  by += bvy
  add(trail, {x = bx, y = by, life = 9})
  foreach(trail, function(p)
    p.life -= 1
    if p.life <= 0 then del(trail, p) end
  end)
  if by < 13 then
    by = 13
    bvy = abs(bvy)
    sfx(1)
  end
  if by > 115 then
    by = 115
    bvy = -abs(bvy)
    sfx(1)
  end
  -- left paddle (p2) at x 9-11, right paddle (p1) at x 116-118
  if bvx < 0 and bx > 8 and bx < 14 and by > p2y - 5 and by < p2y + 29 then
    bvx = abs(bvx) + 0.15
    bvy += (by - p2y - 12) * 0.07
    rally += 1
    sfx(0)
  end
  if bvx > 0 and bx > 114 and bx < 120 and by > p1y - 5 and by < p1y + 29 then
    bvx = -(abs(bvx) + 0.15)
    bvy += (by - p1y - 12) * 0.07
    rally += 1
    sfx(0)
  end
  bvy = mid(-2.6, bvy, 2.6)
  if bx < -4 then score_point(1) end
  if bx > 132 then score_point(2) end
end

function _update()
  tick += 1
  if state == "title" then
    if btnp(5) then begin_game() end
  elseif state == "play" then
    upd_play()
  else
    if tick - winat > 30 and (btnp(4) or btnp(5)) then
      state = "title"
      music(0)
    end
  end
end

function draw_court()
  cls(0)
  rect(0, 8, 127, 120, 1)
  for i = 0, 13 do
    pset(64, 12 + i * 8, 5)
    pset(64, 13 + i * 8, 5)
  end
  foreach(trail, function(p)
    if p.life > 5 then
      pset(p.x, p.y, 9)
    else
      pset(p.x, p.y, 2)
    end
  end)
  rectfill(9, p2y, 11, p2y + 24, 12)
  rectfill(116, p1y, 118, p1y + 24, 11)
  spr(1, bx - 4, by - 4)
  print(s2, 44, 14, 12)
  print(s1, 80, 14, 11)
  if rally >= 6 then
    print("rally x" .. rally, 47, 122, 9)
  end
end

function _draw()
  if state == "title" then
    cls(0)
    spr(32, 16, 26, 12, 2)
    print("first to 5 points wins", 20, 56, 7)
    print("p1 (right): up/down arrows", 12, 72, 11)
    print("p2 (left):  e = up, d = down", 8, 82, 12)
    if tick % 45 < 30 then
      print("press x to rally", 33, 102, 10)
    end
  elseif state == "play" then
    draw_court()
  else
    draw_court()
    rectfill(24, 44, 103, 78, 0)
    rect(24, 44, 103, 78, 9)
    if s1 > s2 then
      print("player 1 wins!", 37, 52, 11)
    else
      print("player 2 wins!", 37, 52, 12)
    end
    print(s2 .. " - " .. s1, 52, 64, 7)
    if tick % 45 < 30 then
      print("press x for title", 31, 88, 6)
    end
  end
end
`;

function nibblesToHex(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += (bytes[i] & 15).toString(16);
  return s;
}
const cartObj = {
  v: 1,
  meta: { title: "EMBER VOLLEY", author: "FABLE-8" },
  code,
  gfx: nibblesToHex(gfx),
  flags: Array.from(flags),
  map: Buffer.from(map).toString("base64"),
  sfx,
  music
};
const json = JSON.stringify(cartObj);
writeFileSync(new URL("./volley.b64", import.meta.url), Buffer.from(json, "utf8").toString("base64"));
console.log("EMBER VOLLEY built: " + code.split("\n").length + " code lines");
