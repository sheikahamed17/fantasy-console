# FABLE-8 — Fantasy Console Build Spec

**You are Claude Code. Implement this spec completely.** You are building **FABLE-8**: a full browser-based fantasy console (in the spirit of PICO-8/TIC-80, but entirely original) including its runtime, a custom scripting language, a complete development studio (code, sprite, map, SFX, and music editors), a cartridge save format, and a finished playable demo game — all inside **one single HTML file with zero external dependencies**.

Every numbered requirement below is mandatory unless explicitly marked *stretch*. Do not silently reduce scope. If a detail is ambiguous, make a sensible decision, implement it, and record it in the README under "Design decisions" — do not stall.

---

## 0. Process rules (how you must work)

1. Build in the phase order defined in §10. Do not start a phase until the previous phase's "done when" condition is met.
2. **No stubs.** The final deliverable must contain no `TODO`, `FIXME`, `not implemented`, or placeholder branches. A grep for these must return nothing.
3. **No eval.** FableScript (the user-facing language, §3) must be executed by your own tree-walking interpreter. The final file must not contain `eval(` or `new Function` anywhere. Regex-transpiling FableScript to JavaScript is also forbidden — real lexer, real parser, real AST, real interpreter.
4. During development you may create scratch files, generator scripts, or Node-based unit tests in a `dev/` folder, but the **final product is `index.html` alone** and must work with `dev/` deleted.
5. Maintain the in-app self-test suite (§9) as you build. If a headless browser tool is available in your environment, run `index.html#selftest` after every phase; if not, pause at each phase checkpoint and ask the user to open it and report the results before continuing.
6. Keep pure logic (lexer, parser, interpreter, serialization, audio data structures) DOM-free inside the file so it is testable; keep DOM glue thin.
7. Do not minify. Expect the final file to be large (likely 8,000–15,000+ lines). That is acceptable.

---

## 1. Hard constraints

1. **Exactly one product file: `index.html`.** All CSS and JS inline. No frameworks, no libraries, no CDN links, no web fonts, no external images, no `fetch`/XHR of any kind.
2. Must run fully offline by double-clicking the file (`file://` protocol) in current Chrome/Edge/Firefox.
3. Vanilla JavaScript (ES2020+ fine), Canvas 2D, Web Audio API. No WebGL required.
4. Keyboard-only is acceptable (mobile/touch and gamepads are non-goals, §13).
5. The only permitted persistence APIs are `localStorage` (autosave) and file download/upload + copy-paste text (cartridge import/export, §7).

---

## 2. Console hardware spec

1. **Display:** 128 × 128 virtual pixels, rendered to a canvas scaled up with nearest-neighbor **integer scaling** (largest integer multiple that fits the window, centered, dark letterbox).
2. **Palette:** fixed 16 colors, indices 0–15:

   | # | Hex | | # | Hex |
   |---|--------|---|---|--------|
   | 0 | `#101018` (black) | | 8 | `#e83b4e` (red) |
   | 1 | `#2b2f66` (deep blue) | | 9 | `#f07f2f` (orange) |
   | 2 | `#83266f` (plum) | | 10 | `#f5d93b` (yellow) |
   | 3 | `#1e8f6e` (dark green) | | 11 | `#3ddc5a` (green) |
   | 4 | `#a05038` (brown) | | 12 | `#3fa7f5` (blue) |
   | 5 | `#5d5a66` (dark gray) | | 13 | `#8577a8` (lavender) |
   | 6 | `#c2c3cc` (light gray) | | 14 | `#f57fb0` (pink) |
   | 7 | `#f5f4f0` (white) | | 15 | `#f0c8a0` (peach) |

3. **Game loop:** fixed 60 FPS logical timestep. Each frame calls the cart's `_update()` then `_draw()`. `_init()` is called once at cart start. Missing callbacks are simply skipped. Use `requestAnimationFrame` with an accumulator so logic stays at 60 Hz even if rendering drops frames.
4. **Input mapping:** button indices — 0 left, 1 right, 2 up, 3 down (arrow keys), 4 = **Z** ("O" button), 5 = **X** ("X" button). **Enter** opens the pause menu (Resume / Restart cart / Quit to editor / Mute toggle). **Esc** stops the cart and returns to the editor.
5. **Sprite sheet:** 128 × 128 pixels = 256 sprites of 8 × 8, numbered 0–255 row-major. Each sprite has an 8-bit flag byte (bits 0–7) for game logic (e.g., "solid").
6. **Map:** 128 × 32 cells, each cell stores a sprite number 0–255. Tile 0 conventionally means empty.
7. **Frame buffer** is an indexed-color byte array (not raw canvas pixels); all draw ops write palette indices, and the buffer is blitted to canvas once per frame. `pget` reads from this buffer.

---

## 3. FableScript — the custom language

A small Lua-flavored language. This is the heart of the challenge.

### 3.1 Required implementation

1. **Pipeline:** lexer → recursive-descent parser → AST → tree-walking interpreter. All hand-written.
2. **Error reporting:**
   - Syntax errors: reported before run with message + **correct line number** (e.g., `line 12: expected 'end' to close 'if'`).
   - Runtime errors: halt the cart and show message + correct line (e.g., `line 42: attempt to call nil value 'sprr'`). Clicking the error jumps the code editor to that line.
3. **Frame budget guard:** the interpreter counts operations; if a single `_update`/`_draw`/`_init` call exceeds ~8,000,000 ops, halt with `script exceeded frame budget (infinite loop?) at line N`. The page must stay responsive — test with `while true do end`.

### 3.2 Syntax and semantics

- **Keywords:** `function end if then elseif else while do for return break local true false nil and or not`
- **Comments:** `--` to end of line.
- **Types:** number (IEEE-754 double), string, boolean, `nil`, table, function.
- **Operators:** `+ - * / %`, unary `-`, comparison `== != < <= > >=`, logical `and or not` (short-circuit; `nil`/`false` falsy, everything else truthy), string concat `..` (numbers coerce to strings), unary `#` (length of string or table array-part), compound assignment `+= -= *= /=`.
- **Standard precedence** (or > and > comparison > concat > add > mul > unary > call/index). Must be covered by parser tests.
- **Variables:** globals by default; `local` declares block-scoped locals. Proper lexical scoping.
- **Functions:** first-class values, parameters, `return` (single value is enough), recursion, and **closures** (inner functions capture enclosing locals). Anonymous functions: `function(x) ... end` as an expression.
- **Control flow:** `if/elseif/else`, `while`, numeric `for i = a, b [, step] do ... end` (inclusive of `b`), `break`.
- **Tables:** the single composite type. Literals `{1, 2, 3}` (array part, **1-indexed**) and `{x = 1, y = 2}` and mixed. Access via `t[expr]` and `t.name`. Assignment to new keys allowed.

### 3.3 Canonical sample (must parse and run)

```lua
-- ember quest snippet
local px = 16
local py = 96
local vy = 0
local score = 0
local coins = {}

function _init()
  for i = 1, 5 do
    add(coins, {x = 16 + i * 16, y = 80, got = false})
  end
end

function solid(x, y)
  return fget(mget(flr(x / 8), flr(y / 8)), 0)
end

function _update()
  if btn(0) then px -= 1 end
  if btn(1) then px += 1 end
  vy += 0.35
  if btnp(4) and solid(px + 4, py + 8) then
    vy = -4.5
    sfx(0)
  end
  py += vy
  if solid(px + 4, py + 8) and vy > 0 then
    py = flr(py / 8) * 8
    vy = 0
  end
  foreach(coins, function(c)
    if not c.got and abs(c.x - px) < 6 and abs(c.y - py) < 6 then
      c.got = true
      score += 1
      sfx(1)
    end
  end)
end

function _draw()
  cls(1)
  map(0, 0, 0, 0, 16, 16)
  foreach(coins, function(c)
    if not c.got then spr(2, c.x, c.y) end
  end)
  spr(1, px, py)
  print("score:" .. score, 2, 2, 7)
end
```

---

## 4. Built-in API (the contract)

Every function below must work, appear in autocomplete, and appear in the Docs panel. Store signatures + one-line descriptions in **one data structure** that drives both autocomplete and docs.

**Graphics:** `cls([c=0])` · `pset(x,y,c)` · `pget(x,y)` · `line(x0,y0,x1,y1,c)` · `rect(x0,y0,x1,y1,c)` · `rectfill(...)` · `circ(x,y,r,c)` · `circfill(...)` · `spr(n,x,y,[w=1,h=1,flip_x,flip_y])` (draws w×h sprite block; palette index 0 transparent by default) · `map(cel_x,cel_y,px,py,cel_w,cel_h,[flag])` (if `flag` given, draw only tiles whose sprite has that flag bit set) · `print(str,x,y,[c=7])` (built-in bitmap font: uppercase A–Z, digits, common punctuation; lowercase input renders as uppercase; ~4px advance, 6px line height; font defined as data in code) · `camera([x=0,y=0])` (offsets all subsequent draws except `cls`) · `pal(c0,c1)` / `pal()` reset · `palt(c,bool)` / `palt()` reset.

**Sprite/map data:** `mget(x,y)` · `mset(x,y,n)` · `fget(n,[b])` (byte, or boolean of bit `b`) · `fset(n,b,v)`.

**Input:** `btn(i)` (held) · `btnp(i)` (true only on the frame the button goes down).

**Audio:** `sfx(n,[channel])` (`sfx(-1)` stops all sfx) · `music(n)` starts pattern `n` · `music(-1)` stops music.

**Math:** `flr ceil abs sgn max min sqrt` · `mid(a,b,c)` (median/clamp) · `sin(r) cos(r) atan2(dy,dx)` (**radians**) · `rnd([n=1])` (float in `[0,n)`) · `srand(seed)`.

**Tables/strings/values:** `add(t,v)` · `del(t,v)` (removes first match, shifts down) · `count(t)` · `foreach(t,fn)` · `sub(s,i,[j])` · `tostr(v)` · `tonum(s)` (`nil` on failure) · `type(v)`.

**System:** `time()` (seconds since cart start, float).

---

## 5. The IDE

Top-level UI: a header bar (logo, cart title field, ▶ Run, ⏹ Stop, Save/Load/Export menu, Mute, Help) plus tabs: **Code · Sprites · Map · SFX · Music · Run**. Dark theme, crisp pixel aesthetic, all styling hand-written CSS.

### 5.1 Code editor (from scratch — no CodeMirror/Monaco)

1. The overlay architecture (transparent `textarea` synced over a highlighted `pre`) is explicitly allowed and recommended.
2. Line numbers gutter; current-line highlight; auto-indent on Enter; Tab inserts two spaces; native undo/redo must keep working.
3. **Syntax highlighting** for keywords, built-in API names, numbers, strings, comments.
4. **Error marking:** after a failed parse/run, the offending line gets a visible red marker in the gutter and the error message bar appears; clicking it scrolls/jumps the cursor to that line.
5. **Autocomplete:** after typing 2+ identifier characters, show a popup of matching API functions with signatures; ↑/↓ to navigate, Tab/Enter to accept, Esc to dismiss.
6. Must stay smooth (typing latency imperceptible) at 2,000 lines.

### 5.2 Sprite editor

Zoomed 8×8 pixel grid editor; 16-color palette picker; tools: pencil, flood fill, line, rectangle, eyedropper (right-click paints color 0 as quick-erase); 16×16 sprite-sheet navigator with current sprite highlighted; sprite number display; 8 flag checkboxes per sprite; copy/paste sprite; per-editor undo (≥30 steps).

### 5.3 Map editor

Paint sprites onto the 128×32 map; scrollable/pannable viewport (space-drag or middle-drag); tile picker strip from the sprite sheet; drag to paint; rectangle-fill tool; erase to tile 0; grid toggle; hovered cell coordinates readout.

### 5.4 SFX editor

64 SFX slots. Each SFX = **32 steps**; per step: note (C0–B5 or off), waveform (0 square, 1 pulse-25%, 2 triangle, 3 saw, 4 noise), volume 0–7. Per-SFX speed (ticks per step, 1–32). Click-drag bar-graph pitch entry; waveform/volume lanes; play/stop preview with a moving playhead; copy/paste SFX.

### 5.5 Music editor

32 patterns; each pattern assigns an SFX (or empty) to each of **4 channels**, plus flags: loop-start, loop-end, stop. Sequence plays patterns in order respecting loops. Play-from-pattern button and a now-playing indicator.

### 5.6 Docs panel (Help)

Searchable API reference generated from the same data structure as autocomplete: signature, description, and a tiny example per function. Also a one-page FableScript syntax summary.

---

## 6. Audio engine (Web Audio)

1. One `AudioContext`, created/resumed on first user gesture (browsers block autoplay — the Run view must show "click / press any key to enable sound" until unlocked).
2. **Lookahead scheduler:** a ~25 ms timer that schedules all notes up to ~120 ms ahead using `AudioContext.currentTime` — sample-accurate timing, never `setInterval`-driven playback directly.
3. Waveforms via oscillators/periodic waves; noise via a pre-generated random `AudioBuffer`. Each note gets a short gain envelope (~5 ms attack/release) to prevent clicks.
4. Mixer: 4 music channels + ≥2 SFX channels → master gain; master mute button; `sfx()` on a busy channel steals the oldest.

---

## 7. Cartridge format & persistence

1. One JSON object: `{v:1, meta:{title, author}, code:string, gfx:<128×128 palette indices, hex or base64>, flags:number[256], map:<128×32 bytes, base64>, sfx:[...], music:[...]}`.
2. **Export:** download as `<title>.f8.json` **and** "Copy cart as text" (base64 of the JSON) to clipboard.
3. **Import:** file picker **and** a paste-text box. Corrupt input must fail with a friendly error, never a crash.
4. **Autosave** the working cart to `localStorage` every 10 s and on Run; offer to restore on next load.
5. "Load demo cart" is always available; the demo (§8) is embedded in `index.html` as a string constant and is the cart loaded on first-ever open.

---

## 8. The demo cartridge: **EMBER QUEST** (the kill shot)

A complete platformer written **in FableScript**, with all sprites, map, SFX, and music stored as ordinary cart data (fully viewable/editable in the editors). Requirements:

1. Title screen with game name, "PRESS X TO START", and music playing (after audio unlock).
2. A scrolling level ≥48 tiles wide (camera follows player) or ≥3 distinct screens.
3. Player with gravity, acceleration/friction, jumping; ≥2-frame run animation plus jump frame.
4. ≥8 collectible gems with a HUD counter and collect SFX.
5. ≥1 patrolling enemy type (stompable), plus spike tiles that kill on touch; 3 lives; respawn at level start or checkpoint.
6. Goal flag → win screen showing score and time; losing all lives → game-over screen; both return to title.
7. Audio: jump SFX, collect SFX, hurt SFX, and a music loop of ≥4 patterns using ≥2 channels (melody + bass).
8. Holds 60 FPS. Expected size: roughly 200–400 lines of FableScript.

**This game is the proof of the whole system. If it doesn't boot and play, the project is not done.**

---

## 9. Self-test mode

Opening `index.html#selftest` (also reachable from Help) runs an in-page suite against the **real** pipeline (no mocks) and renders a pass/fail table with a summary like `PASS 36/36`. Minimum coverage:

- Lexer (≥5): tokens, strings with escapes, comments, `..` vs `.`, line tracking.
- Parser (≥6): precedence (`1+2*3==7`), `if/elseif`, numeric `for`, table literals, and ≥2 syntax-error cases asserting the **reported line number**.
- Interpreter (≥10): scoping/shadowing, closures (counter factory), recursion (`fib(20)==6765`), `break`, compound assignment, string concat/coercion, `#` length, table ops via `add/del/count`, `foreach` with anonymous function, truthiness of `and/or`.
- API headless (≥6): `pset/pget` round-trip, `cls`, `spr` transparency verified via `pget`, `mset/mget`, `fget/fset` bit ops, `camera` offset math.
- Serialization (≥2): cart → JSON → cart deep-equality; corrupt-input rejection.
- Guard (1): `while true do end` triggers the frame-budget error.

---

## 10. Build phases (with "done when")

1. **Console shell & renderer** — canvas, palette, indexed frame buffer, scaling, game loop, all §4 graphics ops implemented in JS, verified via a temporary JS test scene. *Done when a JS-driven scene shows sprites/shapes/text at 60 FPS.*
2. **FableScript** — lexer, parser, interpreter, closures, error line numbers, frame-budget guard; wire the full §4 API into the interpreter. *Done when §3.3 runs and the language self-tests pass.*
3. **Code editor & run flow** — editor per §5.1, Run/Stop, error overlay with click-to-line, pause menu. *Done when you can edit → run → hit an error → jump to the line.*
4. **Sprite & map editors** — per §5.2/§5.3, with their data live in `spr()`/`map()`. *Done when a sprite drawn in the editor appears in a running cart.*
5. **Audio** — synth + scheduler + SFX/music editors + `sfx()`/`music()`. *Done when a composed loop plays in sync with a playhead.*
6. **Cartridge I/O** — save/load/export/import/autosave per §7. *Done when save → refresh → load reproduces everything exactly.*
7. **EMBER QUEST** — build the demo per §8 inside your own tool. *Done when it's beatable.*
8. **Polish & verification** — Docs panel, autocomplete polish, full self-test suite green, acceptance checklist (§11) sweep, README.

---

## 11. Final acceptance checklist (all must pass)

1. Open `index.html` from disk → EMBER QUEST title screen within ~1 s; sound starts after first input.
2. Demo is playable start-to-finish: move, jump, collect (SFX), die on spike and respawn, defeat/avoid enemy, reach the flag, see the win screen.
3. Editor round-trip: draw a new sprite in an empty slot → `spr(n, 60, 60)` in code → Run → visible. Save cart → hard-refresh → Import → everything identical.
4. `sprr(1,0,0)` at line 30 → runtime error naming `sprr` **and line 30**; a missing `end` → syntax error with the correct line.
5. The `fib(20)` snippet prints `6765`; a closure-based counter works.
6. `while true do end` → guard error; the tab never freezes.
7. Performance: EMBER QUEST holds 60 FPS; a stress cart drawing 500 `spr()` calls per frame stays ≥55 FPS.
8. Typing in the code editor at 2,000 lines shows no visible lag; autocomplete and highlighting work.
9. `#selftest` shows all green.
10. Hygiene greps: no `eval(`, no `new Function`, no `fetch(`, no `http://`/`https://` resource loads, no `TODO`/`FIXME`.

---

## 12. Deliverables

1. `index.html` — the entire product.
2. `README.md` — quickstart, controls, FableScript syntax summary, API cheatsheet, cart format description, design decisions log, known limitations.

## 13. Non-goals (do not build)

Mobile/touch, gamepads, scaled sprite blits (`sspr`), fixed-point math, networking/multiplayer, plugin systems, minification.

## 14. Stretch goals (only if everything above is green)

`sspr`, a CRT filter toggle, screen-shake helper, find/replace in the editor, a second demo cart (mini shooter).
