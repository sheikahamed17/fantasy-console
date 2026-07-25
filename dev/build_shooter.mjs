// FABLE-8 second demo cart generator — STARFALL, a mini shooter.
// Usage: node dev/build_shooter.mjs -> writes dev/shooter.json + dev/shooter.b64
import { writeFileSync } from "node:fs";

const SHEET_W = 128, SHEET_H = 128, MAP_W = 128, MAP_H = 32;
const gfx = new Uint8Array(SHEET_W * SHEET_H);
const flags = new Uint8Array(256);
const map = new Uint8Array(MAP_W * MAP_H); // unused by the shooter

function putSprite(n, rows) {
  if (rows.length !== 8) throw new Error("sprite " + n + " needs 8 rows");
  for (let y = 0; y < 8; y++) {
    if (rows[y].length !== 8) throw new Error("sprite " + n + " row " + y);
    for (let x = 0; x < 8; x++) {
      const v = parseInt(rows[y][x], 16);
      if (Number.isNaN(v)) throw new Error("bad pixel in sprite " + n);
      gfx[((n >> 4) * 8 + y) * SHEET_W + (n & 15) * 8 + x] = v;
    }
  }
}

// 1/2: player ship (thruster animates)
putSprite(1, [
  "000cc000",
  "000cc000",
  "00cccc00",
  "0dccccd0",
  "dcc77ccd",
  "dccccccd",
  "0d0cc0d0",
  "000aa000"
]);
putSprite(2, [
  "000cc000",
  "000cc000",
  "00cccc00",
  "0dccccd0",
  "dcc77ccd",
  "dccccccd",
  "0d0cc0d0",
  "00a99a00"
]);
// 3/4: drone saucer (lights animate)
putSprite(3, [
  "00000000",
  "00222200",
  "02888820",
  "28866882",
  "02888820",
  "00222200",
  "00000000",
  "00000000"
]);
putSprite(4, [
  "00000000",
  "00222200",
  "02888820",
  "28688682",
  "02888820",
  "00222200",
  "00000000",
  "00000000"
]);
// 5: darter (fast, points down)
putSprite(5, [
  "00000000",
  "09999990",
  "00999900",
  "009aa900",
  "00099000",
  "00090000",
  "00000000",
  "00000000"
]);
// 6: player bolt
putSprite(6, [
  "00000000",
  "00077000",
  "000aa000",
  "000aa000",
  "00099000",
  "00000000",
  "00000000",
  "00000000"
]);
// 7/8: explosion burst then smoke ring
putSprite(7, [
  "00000000",
  "00099000",
  "009aa900",
  "09affa90",
  "09affa90",
  "009aa900",
  "00099000",
  "00000000"
]);
putSprite(8, [
  "00000000",
  "00555500",
  "05000050",
  "50000005",
  "50000005",
  "05000050",
  "00555500",
  "00000000"
]);
// 9: enemy orb
putSprite(9, [
  "00000000",
  "00000000",
  "000ee000",
  "00efee00",
  "000ee000",
  "00000000",
  "00000000",
  "00000000"
]);
// 11: heart (HUD)
putSprite(11, [
  "00000000",
  "08808800",
  "8e888880",
  "88888880",
  "08888800",
  "00888000",
  "00080000",
  "00000000"
]);

// ---- title banner "STARFALL" (same 3x5 font, scaled x2, sprites 32..) ----
const FONT = {
  A: [7,5,7,5,5], F: [7,4,6,4,4], L: [4,4,4,4,7], R: [7,5,6,5,5],
  S: [7,4,7,1,7], T: [7,2,2,2,2], " ": [0,0,0,0,0]
};
function drawBanner(text, sheetX, sheetY) {
  let cx = sheetX;
  for (const ch of text) {
    const rows = FONT[ch] || FONT[" "];
    for (let r = 0; r < 5; r++) {
      for (let b = 0; b < 3; b++) {
        if (rows[r] & (4 >> b)) {
          for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
            gfx[(sheetY + r * 2 + dy) * SHEET_W + cx + b * 2 + dx] = r < 3 ? 12 : 13;
          }
        }
      }
    }
    cx += 8;
  }
  return cx - sheetX;
}
const w = drawBanner("STARFALL", 0, 16);
if (w > 96) throw new Error("banner too wide");

// ------------------------------------------------------------------ audio
function newSfx() {
  return { speed: 16, notes: Array.from({ length: 32 }, () => [-1, 0, 5]) };
}
const sfx = Array.from({ length: 64 }, newSfx);
function N(name) {
  const m = /^([a-g])(#?)(\d)$/.exec(name);
  if (!m) throw new Error("bad note " + name);
  return { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1]] + (m[2] ? 1 : 0) + 12 * (+m[3]);
}
function score(idx, speed, rows) {
  sfx[idx].speed = speed;
  for (const [step, note, wave, vol, fx] of rows) {
    sfx[idx].notes[step] = [typeof note === "string" ? N(note) : note, wave, vol, fx || 0];
  }
}
// 0: shoot zap
score(0, 1, [[0, "g4", 0, 5], [1, "d4", 0, 4], [2, "a3", 0, 3], [3, "e3", 0, 2]]);
// 1: enemy boom (noise dropping in pitch per step)
score(1, 2, [[0, "c3", 4, 7, 3], [1, "g2", 4, 6, 3], [2, "c2", 4, 5, 3], [3, "g1", 4, 4, 3], [4, "c1", 4, 3, 3]]);
// 2: player hit (falling saw with drops)
score(2, 3, [[0, "e3", 3, 7, 3], [1, "b2", 3, 7, 3], [2, "f2", 3, 6, 3], [3, "c2", 3, 5, 3], [4, "g1", 3, 4, 3], [5, "d1", 3, 3, 3]]);
// 3: enemy shot blip
score(3, 1, [[0, "e4", 2, 3], [1, "c4", 2, 2]]);
// 8/10: arps, 9: bass — E minor drive
score(8, 10, [
  [0, "e2", 1, 5], [2, "g2", 1, 4], [4, "b2", 1, 5], [6, "e3", 1, 4],
  [8, "b2", 1, 4], [10, "g2", 1, 4], [12, "e2", 1, 5], [14, "b2", 1, 3],
  [16, "c2", 1, 5], [18, "e2", 1, 4], [20, "g2", 1, 5], [22, "c3", 1, 4],
  [24, "d2", 1, 5], [26, "f#2", 1, 4], [28, "a2", 1, 5], [30, "d3", 1, 4]
]);
score(10, 10, [
  [0, "e3", 1, 5], [2, "d3", 1, 4], [4, "b2", 1, 5], [6, "g2", 1, 4],
  [8, "a2", 1, 5], [10, "b2", 1, 4], [12, "c3", 1, 5], [14, "b2", 1, 4],
  [16, "a2", 1, 5], [18, "g2", 1, 4], [20, "e2", 1, 5], [22, "g2", 1, 4],
  [24, "a2", 1, 4], [26, "b2", 1, 4], [28, "d3", 1, 5], [30, "e3", 1, 3]
]);
score(9, 10, [
  [0, "e1", 2, 6], [4, "e1", 2, 4], [8, "e1", 2, 5], [12, "e1", 2, 4],
  [16, "c1", 2, 6], [20, "c1", 2, 4], [24, "d1", 2, 6], [28, "d1", 2, 4]
]);

function newPat() { return { ch: [-1, -1, -1, -1], loopStart: false, loopEnd: false, stop: false }; }
const music = Array.from({ length: 32 }, newPat);
music[0] = { ch: [8, 9, -1, -1], loopStart: true, loopEnd: false, stop: false };
music[1] = { ch: [10, 9, -1, -1], loopStart: false, loopEnd: true, stop: false };

// ------------------------------------------------------------------ code
const code = `-- ==========================
--  STARFALL
--  arrows move - z/space fires
-- ==========================

state = "title"
tick = 0
score = 0
hi = 0
lives = 3
wave = 1
px = 60
py = 104
cool = 0
inv = 0
endtick = 0
shots = {}
foes = {}
fshots = {}
booms = {}
stars = {}

function _init()
  srand(4)
  cartdata("starfall")
  hi = dget(0)
  for i = 1, 48 do
    add(stars, {x = rnd(128), y = rnd(128), s = 0.4 + rnd(1.6)})
  end
  music(0)
end

function begin_game()
  state = "play"
  score = 0
  lives = 3
  wave = 1
  px = 60
  py = 104
  cool = 0
  inv = 60
  shots = {}
  foes = {}
  fshots = {}
  booms = {}
end

function boom(x, y)
  add(booms, {x = x, y = y, t = 0})
end

function spawn_foe()
  local kind = 1
  if wave >= 2 and rnd(1) < 0.35 then kind = 2 end
  local speed = 0.4 + wave * 0.08 + rnd(0.3)
  if kind == 2 then speed = 1.2 + wave * 0.1 end
  add(foes, {x = 8 + rnd(112), y = -8, kind = kind, v = speed,
             drift = rnd(6.28), hp = 1})
end

function hurt()
  sfx(2)
  shake(10, 2.5)
  boom(px + 4, py + 4)
  lives -= 1
  inv = 90
  if lives <= 0 then
    state = "over"
    endtick = tick
    if score > hi then
      hi = score
      dset(0, hi) -- high score survives closing the browser
    end
    music(-1)
  end
end

function upd_play()
  -- ship
  if btn(0) then px -= 1.8 end
  if btn(1) then px += 1.8 end
  if btn(2) then py -= 1.4 end
  if btn(3) then py += 1.4 end
  px = mid(2, px, 118)
  py = mid(24, py, 118)
  if cool > 0 then cool -= 1 end
  if btn(4) and cool <= 0 then
    add(shots, {x = px + 3, y = py - 2})
    cool = 7
    sfx(0)
  end
  if inv > 0 then inv -= 1 end
  -- player shots
  foreach(shots, function(s)
    s.y -= 3.2
    if s.y < -6 then del(shots, s) end
  end)
  -- spawning speeds up with the wave counter
  local rate = max(14, 40 - wave * 4)
  if tick % rate == 0 then spawn_foe() end
  -- foes
  foreach(foes, function(f)
    f.y += f.v
    if f.kind == 1 then
      f.drift += 0.05
      f.x += sin(f.drift) * 0.8
      if rnd(1) < 0.004 + wave * 0.001 then
        add(fshots, {x = f.x + 3, y = f.y + 6})
        sfx(3)
      end
    end
    if f.y > 132 then
      del(foes, f)
    end
    foreach(shots, function(s)
      if abs(s.x - f.x - 3) < 6 and abs(s.y - f.y - 3) < 6 then
        del(shots, s)
        f.hp -= 1
      end
    end)
    if f.hp <= 0 then
      del(foes, f)
      score += f.kind * 10
      boom(f.x + 4, f.y + 4)
      sfx(1)
      shake(3, 1)
    end
    if inv <= 0 and abs(f.x - px) < 7 and abs(f.y - py) < 7 then
      del(foes, f)
      boom(f.x + 4, f.y + 4)
      hurt()
    end
  end)
  -- enemy shots
  foreach(fshots, function(s)
    s.y += 1.6
    if s.y > 132 then del(fshots, s) end
    if inv <= 0 and abs(s.x - px - 3) < 5 and abs(s.y - py - 3) < 6 then
      del(fshots, s)
      hurt()
    end
  end)
  -- explosions
  foreach(booms, function(b)
    b.t += 1
    if b.t > 14 then del(booms, b) end
  end)
  wave = 1 + flr(score / 150)
end

function _update()
  tick += 1
  foreach(stars, function(s)
    s.y += s.s
    if s.y > 128 then
      s.y = 0
      s.x = rnd(128)
    end
  end)
  if state == "title" then
    if btnp(5) then begin_game() end
  elseif state == "play" then
    upd_play()
  else
    if tick - endtick > 30 and (btnp(4) or btnp(5)) then
      state = "title"
      music(0)
    end
  end
end

-- drawing ------------------------------------------------------
function draw_stars()
  foreach(stars, function(s)
    local c = 1
    if s.s > 1.4 then
      c = 6
    elseif s.s > 0.9 then
      c = 13
    end
    pset(s.x, s.y, c)
  end)
end

function draw_ship()
  if inv > 0 and tick % 6 < 3 then return end
  spr(1 + flr(tick / 4) % 2, px, py)
end

function draw_title()
  cls(0)
  draw_stars()
  spr(32, 32, 22, 8, 2)
  sspr(8, 0, 8, 8, 48, 50, 32, 32)
  if tick % 45 < 30 then
    print("press x to start", 33, 92, 10)
  end
  print("arrows move - z/space fires", 11, 104, 5)
  print("don't let the swarm pass", 17, 112, 5)
  if hi > 0 then
    print("best: " .. hi, 46, 122, 13)
  end
end

function draw_play()
  cls(0)
  draw_stars()
  foreach(shots, function(s) spr(6, s.x - 3, s.y) end)
  foreach(fshots, function(s) spr(9, s.x - 3, s.y) end)
  foreach(foes, function(f)
    if f.kind == 1 then
      spr(3 + flr(tick / 6) % 2, f.x, f.y)
    else
      spr(5, f.x, f.y)
    end
  end)
  draw_ship()
  foreach(booms, function(b)
    if b.t < 7 then
      spr(7, b.x - 4, b.y - 4)
    else
      spr(8, b.x - 4, b.y - 4)
    end
  end)
  print("score:" .. score, 2, 2, 7)
  print("wave " .. wave, 96, 2, 13)
  for i = 1, 3 do
    if i <= lives then spr(11, 2 + (i - 1) * 9, 118) end
  end
end

function draw_over()
  cls(0)
  draw_stars()
  print("your ship is stardust", 22, 40, 8)
  print("score: " .. score, 38, 58, 7)
  print("best: " .. hi, 42, 68, 13)
  if tick % 45 < 30 then
    print("press x for title", 31, 92, 6)
  end
end

function _draw()
  if state == "title" then
    draw_title()
  elseif state == "play" then
    draw_play()
  else
    draw_over()
  end
end
`;

// ------------------------------------------------------------------ output
function nibblesToHex(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += (bytes[i] & 15).toString(16);
  return s;
}
const cartObj = {
  v: 1,
  meta: { title: "STARFALL", author: "FABLE-8" },
  code,
  gfx: nibblesToHex(gfx),
  flags: Array.from(flags),
  map: Buffer.from(map).toString("base64"),
  sfx,
  music
};
const json = JSON.stringify(cartObj);
const b64 = Buffer.from(json, "utf8").toString("base64");
writeFileSync(new URL("./shooter.json", import.meta.url), JSON.stringify(cartObj, null, 1));
writeFileSync(new URL("./shooter.b64", import.meta.url), b64);
console.log("STARFALL cart built: " + code.split("\n").length + " code lines, " +
  b64.length + " b64 chars");
