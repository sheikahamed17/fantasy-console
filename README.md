# Fantasy Console

**Fantasy Console** is an open-source, browser-based fantasy console in the
spirit of PICO-8/TIC-80. The console it implements — **FABLE-8** — lives
entirely in **one dependency-free `index.html`**: a 128×128 / 16-color virtual
machine, a custom scripting language (**FableScript**) with a hand-written
lexer, parser and tree-walking interpreter, a full development studio (code,
sprite, map, SFX and music editors), a Web Audio chip-tune engine, a JSON
cartridge format, and four playable demo carts led by the platformer
**EMBER QUEST**.

No build step, no server, no dependencies: download `index.html`,
double-click it, and you have the whole console and its studio.

## Quickstart

1. Double-click `index.html` (works fully offline over `file://` in current
   Chrome / Edge / Firefox).
2. EMBER QUEST boots straight to its title screen. Press any key once to enable
   sound (browsers require a user gesture), then **X** to start playing.
3. Press **Esc** to stop the cart and drop into the editors. Press **▶ RUN**
   (or Ctrl+Enter / Ctrl+R) to run whatever is in the editor.
4. Open **? HELP** for the searchable API reference and the FableScript syntax
   summary. Open `index.html#selftest` (or Help → "Run self-tests") for the
   in-page test suite.

## Controls (in a running cart)

| key | meaning |
|---|---|
| arrow keys | buttons 0–3 (left, right, up, down) |
| **Z** or **Space** | button 4 — the "O" button (jump in EMBER QUEST, fire in STARFALL) |
| **X** | button 5 — the "X" button (start / confirm) |
| **E S D F** | player 2 buttons 2/0/3/1 (up/left/down/right) |
| **Q** / **A** | player 2 "O" / "X" buttons |
| **gamepads** | pad 1 → player 1, pad 2 → player 2: d-pad or left stick moves, A/X = O button, B/Y = X button, **Start** = pause |
| **touch** | on touch devices an on-screen d-pad + O/X buttons appear over the game after the first touch (works in exported player HTML too — games are phone-playable) |
| **mouse** | carts can read the pointer with `mx() my() mbtn() mbtnp()`; touches on the screen count as the left button |
| **Enter** | pause menu (Resume · Restart cart · Quit to editor · Mute) |
| **Esc** | stop the cart and return to the editor |

Z and X are matched by the letter you type as well as the physical key, so
AZERTY / QWERTZ / Dvorak layouts work either way. If the cart is stopped,
clicking the **RUN** tab (or the screen itself) starts it — a stopped run view
never just sits there looking playable. If keys seem dead, click the page once
first: the browser may still have keyboard focus on its address bar.

EMBER QUEST: run with the arrows, jump with **Z or Space** (hold to jump higher —
release to cut the jump short), stomp soot crawlers, avoid spikes, collect embers,
light checkpoint posts, and reach the flag. You have 3 lives.

Click the **FABLE-8 logo** (or CART → "Browse all carts") for the game
gallery: every built-in cart shown with a live-rendered screenshot of its
actual title screen (the engine runs each cart invisibly for a few frames to
take the picture), plus everything in your library. Arrows browse, Enter
plays.

Four carts ship built-in (CART menu):

- **EMBER QUEST** — the flagship platformer (boots on load).
- **STARFALL** — mini shooter; arrows steer, Z/Space fires. Its high score
  persists via the `cartdata` API.
- **EMBER VOLLEY** — local 2-player volley: P1 uses the up/down arrows
  (right paddle), P2 uses **E/D** (left paddle). First to 5.
- **LEARN FABLESCRIPT** — an interactive 8-page tutorial written in
  FableScript itself; finish it, press Esc, and read its own code.

Under the Run view: **CRT: ON/OFF** (scanline + vignette look, remembered),
**● GIF** (saves the last ~8 seconds of gameplay as an animated GIF),
**● REC** (records a WebM video *with the cart's sound* until clicked again),
and **WATCH** (live view of the running cart's globals plus an update/draw
ops-and-milliseconds profiler).

The CART menu's **Cart library** keeps any number of named carts in the
browser, each with a screenshot thumbnail — save, reload, or delete them
without touching files. (The old single "save to browser" slot migrates in
automatically.)

## Sharing your games

- **Export PNG cartridge** — the whole cart is hidden steganographically in
  the low bits of a cartridge-label image (with a live screenshot on it).
  The picture *is* the game: drag any `.f8.png` back onto FABLE-8 to play it.
- **Export game (player HTML)** — emits a standalone HTML file that boots
  straight into your game, no editors visible. Anyone can double-click it.
  (Easter egg: the pause menu's "quit to editor" unlocks the full studio
  inside the exported file — every shared game is remixable.)
- **● GIF** — share moments; the recorder is always rolling while a cart runs.
- Plus the classic paths: `.f8.json` export/import, copy-as-text (base64),
  and drag-and-drop of either cart format onto the window.

## The IDE

- **CODE** — hand-rolled overlay editor: syntax highlighting, line numbers,
  current-line highlight, auto-indent, Tab = 2 spaces, native undo/redo,
  autocomplete after 2+ characters (↑/↓ navigate, Tab/Enter accept, Esc dismiss),
  red gutter marker + clickable error bar that jumps to the offending line,
  find/replace with **Ctrl+F** (Enter/Shift+Enter cycle matches, replace-all is
  a single undo step), **Ctrl+/** comment-toggle and multi-line **Tab /
  Shift+Tab** indent/dedent (each one undo step). Stays smooth at 2,000+
  lines (single-keystroke ≈ 6 ms).
- **SPRITES** — 8×8 editor at 24× zoom: pencil / flood fill / line / rectangle /
  eyedropper, right-click erases (paints color 0), whole-sprite transforms
  (flip H/V, rotate 90°, wrap-shift in 4 directions, clear), 16-color picker,
  16×16 sheet navigator, 8 flag checkboxes per sprite, copy/paste, undo
  (Ctrl+Z, 64 steps). **SHEET ↑/↓** exports the whole sheet as a 128×128 PNG
  and imports any PNG back (scaled to 128×128, colors snapped to the palette,
  undoable) — draw your art in Aseprite or Photoshop if you prefer. An
  **animation preview** panel plays the current sprite plus the next N at an
  adjustable FPS while you draw.
- **MAP** — paint sprites onto the 128×32 map: drag paint, rectangle fill,
  right-click erase, tile picker strip (drag across it to grab up to a 6×6
  **multi-tile stamp**; rect-fill tiles the stamp as a repeating pattern),
  grid toggle (orange guides mark 16×16 screen boundaries), space/middle-drag
  pans, wheel scrolls, hover coordinates, undo (Ctrl+Z, 32 strokes).
- **SFX** — 64 slots × 32 steps: click-drag bar-graph pitch entry (C0–B5),
  waveform lane (square, 25% pulse, triangle, saw, noise), volume lane 0–7,
  an **FX lane** per step (Slide from the previous note, Vibrato, Drop,
  fade-In, fade-Out), transpose buttons (±1 semitone, ±1 octave), per-SFX
  speed 1–32, play/stop preview with a moving playhead, copy/paste.
- **MUSIC** — 32 patterns × 4 channels, loop-start / loop-end / stop-after flags,
  pattern copy/paste, play-from-pattern, live now-playing row + step indicator.
- **CART menu** — new cart, load demo, save/load in browser, export `.f8.json`,
  copy cart as text (base64), import from file or pasted text. The working cart
  autosaves to `localStorage` every 10 s and on every Run; a restore offer
  appears on the next load.

## FableScript in one page

```lua
-- comments run to end of line
local speed = 1.5          -- block-scoped local; assignments without
score = 0                  -- 'local' create/write globals

function _init() ... end   -- once, at cart start
function _update() ... end -- 60 times per second
function _draw() ... end   -- once per rendered frame
```

- **Types:** number (double), string, boolean, `nil`, table, function.
- **Long strings:** `[[ ... ]]` spans multiple lines with no escape processing
  (a newline right after `[[` is skipped) — combined with `split()` it makes
  readable in-code level maps and dialog blocks.
- **Operators:** `+ - * / %` (floor-mod), unary `-`, `== != < <= > >=`,
  `and or not` (short-circuit; only `false`/`nil` are falsy), `..` string concat
  (numbers coerce), `#` length, compound `+= -= *= /=`.
- **Control flow:** `if/elseif/else … end`, `while … do … end`,
  `for i = a, b [, step] do … end` (inclusive), `break`.
- **Tables** are the only composite type; array part is **1-indexed**:
  `t = {1, 2, 3}`, `p = {x = 1, y = 2}`, `t[k]`, `p.x`, `add/del/count/foreach`.
- **Functions** are first-class, support recursion and closures; anonymous
  functions: `function(x) return x * 2 end`.
- Syntax errors report before running with the exact line; runtime errors halt
  the cart with the line, a **call-site trace** ("called via line 6 ← line 9"),
  and click-to-jump. A callback exceeding ~8 million operations halts with
  `script exceeded frame budget (infinite loop?)` — `while true do end`
  cannot freeze the page. `log(...)` prints to the WATCH panel's log tail
  and the browser console for printf-style debugging.

## API cheatsheet

| group | functions |
|---|---|
| graphics | `cls([c])` `pset(x,y,c)` `pget(x,y)` `line(x0,y0,x1,y1,c)` `rect(…)` `rectfill(…)` `circ(x,y,r,c)` `circfill(…)` `spr(n,x,y,[w,h,flip_x,flip_y])` `sspr(sx,sy,sw,sh,dx,dy,[dw,dh,flip_x,flip_y])` `map(cel_x,cel_y,px,py,cel_w,cel_h,[flag])` `print(str,x,y,[c])` `camera([x,y])` `pal(c0,c1)/pal()` `palt(c,bool)/palt()` |
| sprite/map data | `mget(x,y)` `mset(x,y,n)` `fget(n,[b])` `fset(n,b,v)` |
| input | `btn(i,[p])` `btnp(i,[p])` — pass `p=1` for player 2 · `mx()` `my()` `mbtn([b])` `mbtnp([b])` devkit mouse/touch |
| audio | `sfx(n,[channel])` (`sfx(-1)` stops sfx) `music(n)` (`music(-1)` stops) |
| math | `flr ceil abs sgn max min sqrt` `mid(a,b,c)` `sin(r) cos(r) atan2(dy,dx)` (radians) `rnd([n])` `srand(seed)` |
| tables/strings | `add(t,v)` `del(t,v)` `count(t)` `foreach(t,fn)` `keys(t)` `sub(s,i,[j])` `split(s,[sep])` `join(t,[sep])` `chr(n)` `ord(s,[i])` `tostr(v)` `tonum(s)` `type(v)` |
| system | `time()` `shake(frames,[mag])` `cartdata(id)` `dset(i,v)` `dget(i)` (64 persistent numbers per save name) `log(...)` (debug log: WATCH panel tail + browser console) |

Full signatures, descriptions and examples live in the in-app Docs panel
(**? HELP**) — generated from the same registry that powers autocomplete.

## Cartridge format

A cart is one JSON object (exported as `<title>.f8.json`; "copy cart as text"
wraps the same JSON in base64):

```
{
  v: 1,
  meta:  { title, author },
  code:  "FableScript source",
  gfx:   "16384 hex nibbles — 128x128 sprite sheet, one digit per pixel",
  gfx2:  "optional second bank (sprites 256-511); omitted when unused",
  flags: [256 bytes — or 512 when bank-2 flags are used],
  map:   "base64 of 4096 bytes — 128x32 cells, row-major sprite numbers",
  sfx:   [64 x { speed: 1..32, notes: [[pitch -1..71, wave 0..4, vol 0..7] x 32] }],
  music: [32 x { ch: [sfx or -1 x 4], loopStart, loopEnd, stop }]
}
```

Import accepts either raw JSON or the base64 text; corrupt input is rejected
with a friendly `invalid cart: …` message.

## Console hardware

- 128×128 pixels, fixed 16-color palette, integer-scaled canvas with letterbox.
- Indexed-color framebuffer: all draw ops write palette indices; `pget` reads
  the buffer, and the buffer is blitted to canvas once per frame.
- Fixed 60 Hz logic (accumulator over `requestAnimationFrame` — logic stays at
  60 Hz even if rendering drops frames).
- **512 sprites** of 8×8 in two banks with an 8-bit flag byte each — bank 0
  (sprites 0–255) doubles as the map tile set; bank 1 (256–511) is extra art
  for `spr`/`sspr` (toggle banks in the sprite editor). 128×32 tile map
  (tile 0 = empty; map cells reference bank 0 only).
- Audio: 4 music channels + 4 SFX channels → master gain. A 25 ms lookahead
  timer schedules every note up to 120 ms ahead on `AudioContext.currentTime`
  (sample-accurate; never timer-driven playback). Waveforms: square, 25% pulse
  (PeriodicWave), triangle, saw, and pitched noise from a pre-generated buffer;
  every note gets a 5 ms attack/release envelope.

## Design decisions log

Decisions the spec left open, and what was chosen:

- **Boot flow vs. autosave restore** — the demo cart always boots and auto-runs
  (title screen in well under a second). If an autosave exists, a floating
  banner offers to restore it; restoring never blocks the boot.
- **`pget`/`pset` and the camera** — both are camera-adjusted (symmetric), so a
  `pset`→`pget` round-trip at the same coordinates always works.
- **`map()` and tile 0** — tile 0 is never drawn (it is the "empty" tile).
- **Sprite transparency** — color 0 is transparent for `spr`/`map` by default;
  `palt` can change that. `cls` ignores the camera.
- **Running carts share cart data** — `mset`/`fset` write directly to the open
  cart (so editors are live while a cart runs). Map edits made by a running
  cart persist until the cart is reloaded; EMBER QUEST deliberately keeps its
  entities in code tables instead of destructive `mset` calls.
- **Note pitch** — the tracker labels notes C0–B5, tuned so "C0" = 65.4 Hz
  (PICO-8-style): low enough for bass, audible on laptop speakers.
- **Music pattern timing** — a pattern plays its 4 channels in lockstep:
  32 steps at the speed of the first non-empty channel's SFX. After a
  "loop end" pattern, playback jumps to the nearest earlier "loop start";
  playback stops at a "stop after" pattern or the first empty one.
- **`%` is floor-mod** (sign of divisor, Lua-style): `(-1) % 128 == 127`.
- **`sgn(0)` is `0`**; `rnd()` uses a seedable mulberry32 PRNG.
- **`time()`** counts logic frames / 60 — deterministic, pauses with the pause menu.
- **Number → string** — integers print bare; floats round to 4 decimals.
- **`tostr` of tables/functions** — `[table]` / `[function]` (identity is not exposed).
- **Numbers in source** must start with a digit (`.5` is not a numeric literal);
  `1..2` lexes as `1 .. 2`.
- **`t[[data]]` is a long string**, not an index — write `t[ [[data]] ]` (with
  spaces) to index with one, same as Lua.
- **Single return value, single assignment** — `return a, b` and `a, b = 1, 2`
  are not part of the language (matching the spec's "single value is enough").
- **Recursion depth** is capped at 200 frames with a friendly
  `stack overflow (too much recursion)` error instead of a JS stack blowup.
- **Standalone `do … end`** blocks and `;` statement separators are accepted.
- **Deleted-while-iterating** — `foreach` iterates a snapshot, so `del(t, v)`
  inside the callback is safe.
- **Autosave hygiene** — autosave only fires once the cart differs from the
  last-loaded serialization, so merely playing the demo never creates one.

## Self-tests

`index.html#selftest` runs 69 tests against the real pipeline (no mocks):
lexer (8, including `[[ ]]` long strings), parser (10), interpreter (18), headless gfx/API/input (20, including
NaN/nil robustness, `sspr`/`shake`, keyboard layouts, `cartdata` persistence,
two-player input, keyboard/gamepad/touch source merging, the standard gamepad
mapping and devkit-mouse latching), serialization + sharing encoders (5: cart
round-trips incl. note FX, GIF structure, PNG steganography, standalone
builder), headless cart-preview rendering + palette quantizer + string/table
tools + log() + error traces + sprite-bank-2 compatibility (7),
frame-budget guard (2). All green = `PASS 69/69`.

## Stretch features (spec §14 — all implemented)

- `sspr(...)` scaled sprite-sheet blits (nearest-neighbor, flips, transparency).
- CRT filter toggle (scanlines + vignette, scale-aware, persisted).
- `shake(frames, [mag])` screen-shake helper — pure display effect.
- Find/replace in the code editor (Ctrl+F; literal, case-insensitive;
  replace-all as one undo step).
- A second demo cart: **STARFALL**, a mini shooter (~250 lines of FableScript).

## Known limitations

- No fixed-point math or networking (non-goals). Touch, mouse and gamepads
  are all supported.
- One code file per cart; no `#include`-style splitting.
- FableScript functions return a single value; multiple assignment is not supported.
- The pause menu pauses logic and rendering but music keeps playing (mute is a
  pause-menu item).
- `localStorage` quota (~5 MB) bounds autosave/browser-save; export to file for
  anything precious.
- The code editor's native undo history clears when a new cart is loaded into it
  (browser behavior when the textarea value is replaced programmatically).

## Repository layout

- `index.html` — the entire product. Open it; that's the console.
- `README.md` — this file.
- `dev/` — build-time tooling only (demo-cart generators, headless
  verification harness). The product does not reference it; deleting `dev/`
  changes nothing.
- `SPEC.md` — the build specification this project implements.
- `LICENSE` — MIT.

## Development

Everything ships inside `index.html`; the `dev/` folder holds the tooling
used to build and verify it (Node 18+ required):

```
cd dev && npm install          # puppeteer-core for the headless harness
node dev/build_demo.mjs && node dev/embed_demo.mjs        # rebuild EMBER QUEST
node dev/build_shooter.mjs && node dev/embed_shooter.mjs  # rebuild STARFALL
node dev/build_volley.mjs && node dev/embed_cart.mjs volley.b64 VOLLEY_CART_TEXT
node dev/build_learn.mjs  && node dev/embed_cart.mjs learn.b64 LEARN_CART_TEXT
node dev/verify.mjs selftest   # run the 69-test in-page suite headlessly
node dev/acceptance.mjs        # full acceptance sweep
```

The harness drives the real `index.html` over `file://` in headless
Chrome/Edge. `index.html#selftest` runs the same suite in any browser.

## Contributing

Issues and pull requests are welcome. The ground rules mirror how the
project is built:

- `index.html` stays a single file with **zero external dependencies** —
  no CDNs, no fetches, no frameworks, and no `eval`-style dynamic code.
- New behavior comes with a self-test (see the `[21] SELF-TESTS` section
  in `index.html`), and `node dev/verify.mjs selftest` must stay green.
- Old cartridges must keep loading: format changes need a
  backward-compatible reading path.

## License

MIT — see [LICENSE](LICENSE).
