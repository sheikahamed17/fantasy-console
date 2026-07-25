// FABLE-8 demo cart generator — builds EMBER QUEST as a .f8.json cart.
// Dev-only tool (the final product is index.html alone).
// Usage: node dev/build_demo.mjs   -> writes dev/demo.json + dev/demo.b64

import { writeFileSync } from "node:fs";

const SHEET_W = 128, SHEET_H = 128, MAP_W = 128, MAP_H = 32;

// ---------------------------------------------------------------- sprites
const gfx = new Uint8Array(SHEET_W * SHEET_H);
const flags = new Uint8Array(256);
const map = new Uint8Array(MAP_W * MAP_H);

function putSprite(n, rows) {
  if (rows.length !== 8) throw new Error("sprite " + n + " needs 8 rows");
  for (let y = 0; y < 8; y++) {
    if (rows[y].length !== 8) throw new Error("sprite " + n + " row " + y + " needs 8 cols");
    for (let x = 0; x < 8; x++) {
      const v = parseInt(rows[y][x], 16);
      if (Number.isNaN(v)) throw new Error("bad pixel in sprite " + n);
      gfx[((n >> 4) * 8 + y) * SHEET_W + (n & 15) * 8 + x] = v;
    }
  }
}

// 1: player idle
putSprite(1, [
  "00099000",
  "0099a900",
  "009aaa00",
  "0ffff900",
  "0f1ff100",
  "00fff000",
  "02888200",
  "00404000"
]);
// 2: player run A (legs apart)
putSprite(2, [
  "00099000",
  "0099a900",
  "009aaa00",
  "0ffff900",
  "0f1ff100",
  "00fff000",
  "02888200",
  "04000400"
]);
// 3: player run B (stride)
putSprite(3, [
  "00099000",
  "0099a900",
  "009aaa00",
  "0ffff900",
  "0f1ff100",
  "00fff000",
  "02888200",
  "00044000"
]);
// 4: player jump (legs tucked, hair flying)
putSprite(4, [
  "00990000",
  "009a9900",
  "009aaa00",
  "0ffff900",
  "0f1ff100",
  "00fff000",
  "02888200",
  "00000000"
]);
// 5: ember gem
putSprite(5, [
  "00090000",
  "009a9000",
  "09afa900",
  "9afffa90",
  "09afa900",
  "009a9000",
  "00090000",
  "00000000"
]);
// 6: soot crawler A
putSprite(6, [
  "00000000",
  "00555500",
  "05555550",
  "05175710",
  "05555550",
  "55555555",
  "05055050",
  "00000000"
]);
// 7: soot crawler B (feet alternate)
putSprite(7, [
  "00000000",
  "00555500",
  "05555550",
  "05175710",
  "05555550",
  "55555555",
  "00505500",
  "00000000"
]);
// 8: spikes (deadly)
putSprite(8, [
  "00000000",
  "00000000",
  "00000000",
  "00000000",
  "07000700",
  "06600660",
  "66606660",
  "66666666"
]);
// 9: goal flag
putSprite(9, [
  "06000000",
  "06888800",
  "06888880",
  "06888800",
  "06000000",
  "06000000",
  "06000000",
  "66600000"
]);
// 10: big ember (title decoration)
putSprite(10, [
  "00099000",
  "0009a000",
  "009aa900",
  "09affa90",
  "09affa90",
  "009aa900",
  "000aa000",
  "00090000"
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
// 16: grass top
putSprite(16, [
  "bbbbbbbb",
  "3bb3b3bb",
  "33333333",
  "44444444",
  "44424442",
  "44444444",
  "42444244",
  "44444444"
]);
// 17: dirt
putSprite(17, [
  "44444444",
  "44244442",
  "44444444",
  "44444244",
  "42444444",
  "44444444",
  "44442444",
  "44444444"
]);
// 18: stone
putSprite(18, [
  "55555555",
  "56665666",
  "56665666",
  "55555555",
  "66566656",
  "66566656",
  "55555555",
  "56665666"
]);
// 19: brick platform
putSprite(19, [
  "99999999",
  "94494449",
  "99999999",
  "44944944",
  "99999999",
  "94494449",
  "99999999",
  "44444444"
]);
// 20: bush
putSprite(20, [
  "00000000",
  "000bb000",
  "00bbbb00",
  "0b3bb3b0",
  "bb3bbb3b",
  "b3bbb3bb",
  "0bb3bb30",
  "00000000"
]);
// 21: flower
putSprite(21, [
  "00000000",
  "00e0e000",
  "0eaeae00",
  "00eee000",
  "000b0000",
  "00b3b000",
  "000b0000",
  "00000000"
]);
// 22: cloud
putSprite(22, [
  "00000000",
  "00777700",
  "07777770",
  "77777777",
  "67777776",
  "06666660",
  "00000000",
  "00000000"
]);
// 23: crate
putSprite(23, [
  "99999999",
  "94444449",
  "94944949",
  "94494499",
  "94494499",
  "94944949",
  "94444449",
  "99999999"
]);
// 24: checkpoint (inactive)
putSprite(24, [
  "00555000",
  "05505500",
  "00555000",
  "00060000",
  "00060000",
  "00060000",
  "00060000",
  "00666000"
]);
// 25: checkpoint (active — lit ember orb)
putSprite(25, [
  "009a9000",
  "09afa900",
  "009a9000",
  "00060000",
  "00060000",
  "00060000",
  "00060000",
  "00666000"
]);

// flags: bit0 solid, bit1 deadly, bit2 goal
for (const t of [16, 17, 18, 19, 23]) flags[t] |= 1;
flags[8] |= 2;
flags[9] |= 4;

// ------------------------------------------------ title banner (sprites 32+)
// Render "EMBER QUEST" with the console's own 3x5 font, scaled x2, into
// sheet rows 16..17 (sprites 32..47 / 48..63 region, cols 0..11).
const FONT = {
  A: [7,5,7,5,5], B: [6,5,6,5,6], C: [7,4,4,4,7], D: [6,5,5,5,6], E: [7,4,6,4,7],
  F: [7,4,6,4,4], G: [7,4,5,5,7], H: [5,5,7,5,5], I: [7,2,2,2,7], J: [7,1,1,5,7],
  K: [5,5,6,5,5], L: [4,4,4,4,7], M: [7,7,5,5,5], N: [6,5,5,5,5], O: [7,5,5,5,7],
  P: [7,5,7,4,4], Q: [7,5,5,7,1], R: [7,5,6,5,5], S: [7,4,7,1,7], T: [7,2,2,2,2],
  U: [5,5,5,5,7], V: [5,5,5,5,2], W: [5,5,5,7,7], X: [5,5,2,5,5], Y: [5,5,7,2,2],
  Z: [7,1,2,4,7], " ": [0,0,0,0,0]
};
function drawBanner(text, sheetX, sheetY) {
  let cx = sheetX;
  for (const ch of text) {
    const rows = FONT[ch] || FONT[" "];
    for (let r = 0; r < 5; r++) {
      for (let b = 0; b < 3; b++) {
        if (rows[r] & (4 >> b)) {
          for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
            const x = cx + b * 2 + dx, y = sheetY + r * 2 + dy;
            gfx[y * SHEET_W + x] = r < 3 ? 10 : 9; // yellow top, orange bottom
          }
        }
      }
    }
    cx += 8;
  }
  return cx - sheetX;
}
// sprites 32.. start at sprite-row 2 => sheet pixel y = 16
const bannerW = drawBanner("EMBER QUEST", 0, 16);
if (bannerW > 96) throw new Error("banner too wide: " + bannerW);

// ------------------------------------------------------------------ level
const T_GRASS = 16, T_DIRT = 17, T_STONE = 18, T_BRICK = 19, T_CRATE = 23;
const T_SPIKE = 8, T_FLAG = 9, T_BUSH = 20, T_FLOWER = 21, T_CLOUD = 22;

const mset = (x, y, t) => { map[y * MAP_W + x] = t; };
const groundAt = []; // gy per column, -1 = pit

function ground(x0, x1, gy) {
  for (let x = x0; x <= x1; x++) {
    mset(x, gy, T_GRASS);
    for (let y = gy + 1; y <= 13; y++) mset(x, y, T_DIRT);
    for (let y = 14; y <= 15; y++) mset(x, y, T_STONE);
    groundAt[x] = gy;
  }
}
function pit(x0, x1) { for (let x = x0; x <= x1; x++) groundAt[x] = -1; }
function bricks(x0, x1, y) { for (let x = x0; x <= x1; x++) mset(x, y, T_BRICK); }

const gemspots = [];   // [tx, ty]
const enemyspots = []; // [tx, ty]  (ty = row the enemy stands IN, feet on ty+1)
const checkspots = []; // [tx, ty]
const gem = (x, y) => gemspots.push([x, y]);
const enemy = x => enemyspots.push([x, groundAt[x] - 1]);
const checkpoint = x => checkspots.push([x, groundAt[x] - 1]);

// terrain
ground(0, 11, 12);
pit(12, 14);
ground(15, 22, 12);
ground(23, 24, 12); mset(23, 11, T_SPIKE); mset(24, 11, T_SPIKE);
ground(25, 26, 12); mset(25, 11, T_CRATE); mset(26, 11, T_CRATE);
ground(27, 31, 10);
pit(32, 33);
ground(34, 43, 10);
ground(44, 44, 11);
ground(45, 46, 12); mset(46, 11, T_SPIKE);
pit(47, 48);
// floating section (pit below)
pit(49, 60);
bricks(49, 52, 10);
bricks(55, 58, 10);
ground(61, 72, 12); mset(66, 11, T_SPIKE); mset(67, 11, T_SPIKE);
pit(73, 75); mset(74, 10, T_CRATE);
ground(76, 88, 11);
bricks(80, 82, 8);
ground(89, 91, 11); mset(89, 10, T_SPIKE);
pit(92, 93);
ground(94, 108, 12);
ground(109, 110, 11);
ground(111, 112, 10);
ground(113, 127, 10);
mset(122, 9, T_FLAG);
// closing wall
for (let y = 6; y <= 9; y++) { mset(126, y, T_STONE); mset(127, y, T_STONE); }

// decorations
for (const x of [3, 20, 40, 70, 83, 105, 117]) if (groundAt[x] > 0) mset(x, groundAt[x] - 1, T_BUSH);
for (const x of [5, 37, 78, 102, 119, 124]) if (groundAt[x] > 0) mset(x, groundAt[x] - 1, T_FLOWER);
for (const [x, y] of [[6, 2], [19, 3], [33, 2], [48, 4], [63, 2], [77, 3], [96, 2], [112, 3], [124, 2]]) {
  mset(x, y, T_CLOUD);
}

// gems (>= 8 required; we place plenty)
gem(8, 10); gem(9, 9); gem(10, 10);            // intro arc
bricks(16, 18, 9); gem(16, 8); gem(17, 7); gem(18, 8);
gem(30, 8);
bricks(36, 38, 7); gem(36, 6); gem(37, 5); gem(38, 6);
gem(51, 8); gem(54, 6); gem(56, 8); gem(60, 7);
gem(68, 10); gem(71, 10);
gem(80, 6); gem(81, 5); gem(82, 6);
gem(97, 10); gem(99, 9); gem(101, 10);
gem(115, 8); gem(118, 8);

// enemies (patrolling, stompable)
enemy(18); enemy(100); enemy(104);

// checkpoints
checkpoint(42); checkpoint(86);

// sanity checks
if (gemspots.length < 8) throw new Error("need >= 8 gems, have " + gemspots.length);
if (enemyspots.length < 1) throw new Error("need an enemy");
const levelWidth = 128;
if (levelWidth < 48) throw new Error("level too narrow");

// ------------------------------------------------------------------ audio
function newSfx() {
  return { speed: 16, notes: Array.from({ length: 32 }, () => [-1, 0, 5]) };
}
const sfx = Array.from({ length: 64 }, newSfx);

// note name -> semitone (C0 = 0 .. B5 = 71)
function N(name) {
  const m = /^([a-g])(#?)(\d)$/.exec(name);
  if (!m) throw new Error("bad note " + name);
  const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1]];
  return base + (m[2] ? 1 : 0) + 12 * (+m[3]);
}
// fill an sfx from a compact score: array of [step, note, wave, vol]
function score(idx, speed, rows) {
  sfx[idx].speed = speed;
  for (const [step, note, wave, vol, fx] of rows) {
    sfx[idx].notes[step] = [typeof note === "string" ? N(note) : note, wave, vol, fx || 0];
  }
}

// --- effects ---
score(0, 2, [ // jump: rising chirp, slid smooth between steps
  [0, "c2", 0, 6], [1, "e2", 0, 6, 1], [2, "g2", 0, 5, 1], [3, "c3", 0, 5, 1], [4, "e3", 0, 4, 1], [5, "g3", 0, 3, 1]
]);
score(1, 2, [ // collect: sparkle arp (pulse)
  [0, "e3", 1, 6], [1, "g3", 1, 6], [2, "b3", 1, 6], [3, "e4", 1, 7], [4, "b3", 1, 4], [5, "e4", 1, 3]
]);
score(2, 3, [ // hurt: falling saw
  [0, "e3", 3, 7], [1, "c3", 3, 7], [2, "a2", 3, 6], [3, "f2", 3, 6], [4, "d2", 3, 5], [5, "c2", 3, 4], [6, "b1", 3, 3]
]);
score(3, 2, [ // stomp: noise thud
  [0, "c3", 4, 7], [1, "c2", 4, 6], [2, "c1", 4, 5], [3, "c1", 0, 4]
]);
score(4, 6, [ // win fanfare, vibrato on the held tail notes
  [0, "c3", 1, 6], [2, "e3", 1, 6], [4, "g3", 1, 6], [6, "c4", 1, 7],
  [8, "g3", 1, 5], [10, "c4", 1, 7], [12, "e4", 1, 7], [16, "c4", 2, 6, 2], [20, "e4", 2, 7, 2]
]);
score(5, 2, [ // checkpoint chime
  [0, "a3", 2, 6], [2, "e4", 2, 7], [4, "a4", 2, 5]
]);

// --- music instruments (patterns share speed 14) ---
// melody A (pulse), key A minor pentatonic
score(8, 14, [
  [0, "a2", 1, 5], [2, "c3", 1, 4], [4, "e3", 1, 5], [6, "d3", 1, 4],
  [8, "c3", 1, 5], [10, "a2", 1, 4], [12, "c3", 1, 5], [14, "e3", 1, 4],
  [16, "g3", 1, 5], [18, "e3", 1, 4], [20, "d3", 1, 5], [22, "c3", 1, 4],
  [24, "a2", 1, 5], [26, "c3", 1, 4], [28, "d3", 1, 5], [30, "e3", 1, 3]
]);
// bass A (triangle)
score(9, 14, [
  [0, "a1", 2, 6], [4, "a1", 2, 4], [8, "f1", 2, 6], [12, "f1", 2, 4],
  [16, "g1", 2, 6], [20, "g1", 2, 4], [24, "a1", 2, 6], [28, "e1", 2, 4]
]);
// melody B (answers phrase, higher)
score(10, 14, [
  [0, "e3", 1, 5], [2, "g3", 1, 4], [4, "a3", 1, 5], [6, "g3", 1, 4],
  [8, "e3", 1, 5], [10, "d3", 1, 4], [12, "c3", 1, 5], [14, "d3", 1, 4],
  [16, "e3", 1, 5], [18, "g3", 1, 4], [20, "a3", 1, 5], [22, "c4", 1, 5],
  [24, "a3", 1, 5], [26, "g3", 1, 4], [28, "e3", 1, 5], [30, "d3", 1, 3]
]);
// bass B
score(11, 14, [
  [0, "c2", 2, 6], [4, "c2", 2, 4], [8, "d2", 2, 6], [12, "d2", 2, 4],
  [16, "e2", 2, 6], [20, "e2", 2, 4], [24, "a1", 2, 6], [28, "a1", 2, 4]
]);
// melody C (sparse, floaty variation)
score(12, 14, [
  [0, "a3", 2, 5], [4, "g3", 2, 4], [8, "e3", 2, 5], [12, "d3", 2, 4],
  [16, "c3", 2, 5], [20, "d3", 2, 4], [24, "e3", 2, 5], [28, "g3", 2, 3]
]);
// drums (noise): kick on beats, hats off-beats
score(13, 14, [
  [0, "c1", 4, 6], [4, "a4", 4, 2], [8, "c1", 4, 5], [12, "a4", 4, 2],
  [16, "c1", 4, 6], [20, "a4", 4, 2], [24, "c1", 4, 5], [28, "a4", 4, 2], [30, "b4", 4, 2]
]);

// --- music patterns: loop 0..3 ---
function newPat() { return { ch: [-1, -1, -1, -1], loopStart: false, loopEnd: false, stop: false }; }
const music = Array.from({ length: 32 }, newPat);
music[0] = { ch: [8, 9, 13, -1], loopStart: true, loopEnd: false, stop: false };
music[1] = { ch: [10, 11, 13, -1], loopStart: false, loopEnd: false, stop: false };
music[2] = { ch: [12, 9, 13, -1], loopStart: false, loopEnd: false, stop: false };
music[3] = { ch: [10, 11, 13, -1], loopStart: false, loopEnd: true, stop: false };

// ------------------------------------------------------------------ code
const lua = (arr, fmt) => arr.map(fmt).join(",\n  ");
const code = `-- ======================================
--  EMBER QUEST
--  collect the embers, reach the flag!
--  arrows move - z/space jumps - x starts
-- ======================================

-- generated level entities (tile coords)
gemspots = {
  ${lua(gemspots, g => `{${g[0]}, ${g[1]}}`)}
}
enemyspots = {
  ${lua(enemyspots, e => `{${e[0]}, ${e[1]}}`)}
}
checkspots = {
  ${lua(checkspots, c => `{${c[0]}, ${c[1]}, false}`)}
}

-- tuning
acc = 0.22
fric = 0.82
maxv = 1.7
grav = 0.24
jumpv = -4.0
startx = 16
starty = 88

state = "title"
tick = 0
lives = 3
gems = 0
gemtotal = 0
timer = 0
px = 0 py = 0 vx = 0 vy = 0
grounded = false
facing = 1
inv = 0
jbuf = 0    -- jump buffer: a press slightly before landing still jumps
coyote = 0  -- coyote time: a press slightly after a ledge still jumps
rx = 0 ry = 0
camx = 0
endtick = 0
gemlist = {}
enemies = {}
sparks = {}
stars = {}

function _init()
  srand(8)
  for i = 1, 44 do
    add(stars, {x = flr(rnd(128)), y = flr(rnd(64)), c = 5 + flr(rnd(2)) * 8})
  end
  go_title()
end

function go_title()
  state = "title"
  music(0)
end

function begin_game()
  state = "play"
  lives = 3
  timer = 0
  rx = startx
  ry = starty
  gems = 0
  gemtotal = 0
  gemlist = {}
  foreach(gemspots, function(g)
    add(gemlist, {x = g[1] * 8, y = g[2] * 8, got = false, bob = rnd(6)})
    gemtotal += 1
  end)
  enemies = {}
  foreach(enemyspots, function(e)
    add(enemies, {x = e[1] * 8, y = e[2] * 8, dir = 1, alive = true, a = 0})
  end)
  foreach(checkspots, function(c) c[3] = false end)
  sparks = {}
  spawn_player()
end

function spawn_player()
  px = rx
  py = ry
  vx = 0
  vy = 0
  grounded = false
  facing = 1
  inv = 90
  jbuf = 0
  coyote = 0
end

-- tile queries -------------------------------------------------
function solid(x, y)
  return fget(mget(flr(x / 8), flr(y / 8)), 0)
end
function deadly(x, y)
  return fget(mget(flr(x / 8), flr(y / 8)), 1)
end
function at_goal(x, y)
  return fget(mget(flr(x / 8), flr(y / 8)), 2)
end

-- movement (pixel-stepped, axis separated) ----------------------
function try_move_x(d)
  local s = sgn(d)
  local n = abs(d)
  while n > 0 do
    local step = min(n, 1)
    local nx = px + s * step
    if solid(nx + 2, py + 1) or solid(nx + 6, py + 1)
       or solid(nx + 2, py + 7) or solid(nx + 6, py + 7) then
      vx = 0
      return
    end
    px = nx
    n -= step
  end
end

function try_move_y(d)
  local s = sgn(d)
  local n = abs(d)
  while n > 0 do
    local step = min(n, 1)
    local ny = py + s * step
    if s > 0 then
      if solid(px + 2, ny + 8) or solid(px + 6, ny + 8) then
        py = flr((ny + 8) / 8) * 8 - 8
        vy = 0
        grounded = true
        return
      end
    else
      if solid(px + 2, ny) or solid(px + 6, ny) then
        vy = 0
        return
      end
    end
    py = ny
    n -= step
  end
end

-- gameplay -------------------------------------------------------
function hurt()
  if inv > 0 then return end
  sfx(2)
  lives -= 1
  add_sparks(px + 4, py + 4, 8)
  if lives <= 0 then
    state = "over"
    endtick = tick
    music(-1)
  else
    spawn_player()
  end
end

function add_sparks(x, y, c)
  for i = 1, 7 do
    add(sparks, {x = x, y = y, vx = rnd(2) - 1, vy = rnd(2) - 1.6,
                 life = 14 + rnd(12), c = c})
  end
end

function upd_player()
  if btn(0) then
    vx -= acc
    facing = -1
  end
  if btn(1) then
    vx += acc
    facing = 1
  end
  if not btn(0) and not btn(1) then vx *= fric end
  vx = mid(-maxv, vx, maxv)
  if btnp(4) then
    jbuf = 7
  elseif jbuf > 0 then
    jbuf -= 1
  end
  if jbuf > 0 and coyote > 0 then
    vy = jumpv
    grounded = false
    coyote = 0
    jbuf = 0
    sfx(0)
  end
  if not btn(4) and vy < -1.2 then
    vy = -1.2 -- releasing the jump key cuts the jump short (variable height)
  end
  vy += grav
  vy = min(vy, 4)
  grounded = false
  try_move_x(vx)
  try_move_y(vy)
  if grounded then
    coyote = 6
  elseif coyote > 0 then
    coyote -= 1
  end
  if inv > 0 then inv -= 1 end
  -- hazards
  if deadly(px + 4, py + 7) or deadly(px + 2, py + 7) or deadly(px + 6, py + 7) then
    hurt()
  end
  if py > 132 then
    inv = 0
    hurt()
  end
  -- goal
  if at_goal(px + 4, py + 4) or at_goal(px + 4, py + 7) then
    state = "win"
    endtick = tick
    music(-1)
    sfx(4)
  end
end

function upd_gems()
  foreach(gemlist, function(g)
    if not g.got then
      g.bob += 0.09
      if abs(px + 4 - g.x - 4) < 7 and abs(py + 4 - g.y - 4) < 8 then
        g.got = true
        gems += 1
        sfx(1)
        add_sparks(g.x + 4, g.y + 4, 10)
      end
    end
  end)
end

function upd_enemies()
  foreach(enemies, function(e)
    if e.alive then
      e.a += 0.12
      local nx = e.x + e.dir * 0.4
      local front = nx + 4 + e.dir * 4
      if solid(front, e.y + 4) or not solid(front, e.y + 9) then
        e.dir = -e.dir
      else
        e.x = nx
      end
      if abs(px - e.x) < 7 and abs(py - e.y) < 7 then
        if vy > 0.3 and py + 5 < e.y then
          e.alive = false
          vy = -2.6
          sfx(3)
          add_sparks(e.x + 4, e.y + 4, 5)
        else
          hurt()
        end
      end
    end
  end)
end

function upd_checkpoints()
  foreach(checkspots, function(c)
    if not c[3] and abs(px - c[1] * 8) < 8 and abs(py - c[2] * 8) < 12 then
      c[3] = true
      rx = c[1] * 8
      ry = c[2] * 8
      sfx(5)
      add_sparks(c[1] * 8 + 4, c[2] * 8 + 2, 10)
    end
  end)
end

function upd_sparks()
  foreach(sparks, function(s)
    s.x += s.vx
    s.y += s.vy
    s.vy += 0.06
    s.life -= 1
    if s.life <= 0 then del(sparks, s) end
  end)
end

function _update()
  tick += 1
  if state == "title" then
    if btnp(5) then begin_game() end
    if tick % 3 == 0 then
      add(sparks, {x = rnd(128), y = 130, vx = 0, vy = -0.4 - rnd(0.6),
                   life = 60, c = 9})
    end
    upd_sparks()
  elseif state == "play" then
    timer += 1 / 60
    upd_player()
    if state == "play" then
      upd_gems()
      upd_enemies()
      upd_checkpoints()
      upd_sparks()
      camx = mid(0, px - 60, 896)
    end
  else
    -- win / game over screens
    upd_sparks()
    if tick - endtick > 30 and (btnp(4) or btnp(5)) then go_title() end
  end
end

-- drawing --------------------------------------------------------
function draw_stars(f)
  foreach(stars, function(s)
    pset((s.x - camx * f) % 128, s.y, s.c)
  end)
end

function draw_sparks()
  foreach(sparks, function(s)
    if s.life > 8 then
      circfill(s.x, s.y, 1, s.c)
    else
      pset(s.x, s.y, s.c)
    end
  end)
end

function draw_hud()
  for i = 1, 3 do
    if i <= lives then
      spr(11, (i - 1) * 9 + 2, 1)
    end
  end
  spr(5, 92, 0)
  print(gems .. "/" .. gemtotal, 102, 2, 7)
  print(flr(timer) .. "s", 102, 9, 6)
end

function draw_title()
  cls(0)
  camx = 0
  draw_stars(0)
  draw_sparks()
  spr(32, 16, 26, 12, 2)
  spr(10, 4, 24)
  spr(10, 116, 24)
  print("a tiny platformer for fable-8", 6, 52, 6)
  if tick % 45 < 30 then
    print("press x to start", 33, 74, 10)
  end
  spr(2 + flr(tick / 8) % 2, 60, 96)
  print("z or space = jump", 31, 108, 5)
  print("collect embers, stomp soots,", 8, 118, 13)
  print("spikes are hot!", 35, 124, 13)
end

function draw_play()
  cls(1)
  draw_stars(0.4)
  camera(camx, 0)
  map(0, 0, 0, 0, 128, 16)
  foreach(checkspots, function(c)
    if c[3] then
      spr(25, c[1] * 8, c[2] * 8)
    else
      spr(24, c[1] * 8, c[2] * 8)
    end
  end)
  foreach(gemlist, function(g)
    if not g.got then
      spr(5, g.x, g.y + sin(g.bob) * 1.5)
    end
  end)
  foreach(enemies, function(e)
    if e.alive then
      spr(6 + flr(e.a) % 2, e.x, e.y, 1, 1, e.dir < 0)
    end
  end)
  if inv <= 0 or tick % 6 < 3 then
    local f = 1
    if not grounded then
      f = 4
    elseif abs(vx) > 0.3 then
      f = 2 + flr(tick / 5) % 2
    end
    spr(f, px, py, 1, 1, facing < 0)
  end
  draw_sparks()
  camera()
  draw_hud()
end

function draw_win()
  cls(1)
  camx = 0
  draw_stars(0)
  spr(32, 16, 20, 12, 2)
  rectfill(20, 44, 107, 92, 0)
  rect(20, 44, 107, 92, 9)
  print("you carried the flame!", 22, 50, 10)
  spr(5, 30, 60)
  print(gems .. "/" .. gemtotal .. " embers", 42, 62, 7)
  print("time: " .. flr(timer * 10) / 10 .. "s", 42, 72, 7)
  if tick % 45 < 30 then
    print("press x for title", 31, 100, 6)
  end
end

function draw_over()
  cls(0)
  camx = 0
  draw_stars(0)
  print("the flame went out...", 22, 44, 8)
  spr(1, 60, 58)
  print("embers: " .. gems .. "/" .. gemtotal, 34, 74, 6)
  if tick % 45 < 30 then
    print("press x for title", 31, 96, 6)
  end
end

function _draw()
  if state == "title" then
    draw_title()
  elseif state == "play" then
    draw_play()
  elseif state == "win" then
    draw_win()
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
  meta: { title: "EMBER QUEST", author: "FABLE-8" },
  code,
  gfx: nibblesToHex(gfx),
  flags: Array.from(flags),
  map: Buffer.from(map).toString("base64"),
  sfx,
  music
};
const json = JSON.stringify(cartObj);
const b64 = Buffer.from(json, "utf8").toString("base64");
writeFileSync(new URL("./demo.json", import.meta.url), JSON.stringify(cartObj, null, 1));
writeFileSync(new URL("./demo.b64", import.meta.url), b64);

// stats
const codeLines = code.split("\n").length;
console.log("EMBER QUEST cart built:");
console.log("  code lines:  " + codeLines);
console.log("  gems:        " + gemspots.length);
console.log("  enemies:     " + enemyspots.length);
console.log("  checkpoints: " + checkspots.length);
console.log("  json bytes:  " + json.length);
console.log("  b64 bytes:   " + b64.length);
if (codeLines < 200 || codeLines > 450) console.log("  !! code line count outside 200-400ish");
