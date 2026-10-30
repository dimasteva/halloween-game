# Technical Specification: Halloween Edition

- **Functional Specification:** `context/spec/002-halloween-edition/functional-spec.md`
- **Status:** Draft
- **Author(s):** AWOS /awos:tech

---

## 1. High-Level Technical Approach

Everything the Halloween edition adds — pumpkins, the night sky, the darkness ramp, the four event reactions, bats and ducking — fits inside the extension points the architecture already exposes:

- **Pure sprite swaps** (pumpkins, bats, moon, clouds) are added to `src/sprites.ts` as new `Sprite` entries with their own hitboxes. The existing `obstacleSprite(kind)` switch grows a `'bat'` arm.
- **Cosmetic overlays** (night sky, drifting clouds, darkness ramp, jump dust, land dust, death screen-shake, milestone flash) each live in their own `src/features/*.ts` module in the shape `installX({ game, renderer })` and own all of their own state. They subscribe to the typed event bus and draw from the appropriate layer. The game loop never knows they exist.
- **Gameplay extensions** (bats as a flying obstacle, ducking) touch five pure modules — `types.ts`, `tuning.ts`, `sprites.ts`, `input.ts`, `game.ts`, `obstacles.ts`, `collision.ts` — but keep the frozen testing contract intact: `ObstacleKind` grows `'bat'`, `DinoPose` grows `'duck'`, and `Game` grows a new `setDuck(hold: boolean)` method. The architecture's "Growth" note (section 3) explicitly allows this.
- **Deterministic by construction** stays true: bat choice happens through the run's `Rng`, cloud and dust randomness goes through each feature's own `createRng(state.seed ^ SALT)`, and no new module touches a wall clock or `Math.random`. Features that must animate on the frozen game-over screen use the `RenderFrame` counter.

The work splits cleanly into **six slices**, matching the six slice ceiling the exercise imposes. The slices are ordered so that each one can be committed with the full test suite green, and so dropping Slice 5 (bats + ducking) still leaves a complete Tier 1 feature.

---

## 2. Proposed Solution & Implementation Plan

### 2.1 Changes to the frozen testing contract (growth only)

The frozen contract in `architecture.md` section 3 allows additive growth. These three additions are the only changes to it:

| Where | Growth | Why |
|---|---|---|
| `type ObstacleKind` | `+ 'bat'` | A new flying obstacle kind. |
| `type DinoPose` | `+ 'duck'` | A new dinosaur pose while crouching. |
| `interface Game` | `+ setDuck(hold: boolean): void` | A held, state-based input (not an edge-triggered intent), updated from `input-dom.ts` on `keydown`/`keyup`. Dispatching through the one-shot `Intent` queue would conflate "press down" and "release down" with jump taps and makes rapid-tap semantics awkward; a direct setter is clearer. |

The `Intent` union stays `'primary'`. The `GameEvent` union, `GameState`, `GameDeps`, and every other public name stay unchanged.

### 2.2 Module changes

| Module | Change |
|---|---|
| `src/sprites.ts` | Add `PUMPKIN_SMALL` and `PUMPKIN_LARGE` bitmaps (same dimensions and hitboxes as `CACTUS_SMALL` and `CACTUS_LARGE` — see 2.4 below). Add a `BAT` bitmap with its own hitbox. Add `MOON`, `CLOUD_SMALL`, `CLOUD_LARGE` decorative sprites (no gameplay use). Grow `obstacleSprite(kind)` with a `'bat'` arm. |
| `src/tuning.ts` | Add new named constants: `BAT_FLIGHT_Y`, `BAT_PROBABILITY`, `BAT_UNLOCK_SCORE`, `DUCK_HITBOX`, `DUCK_KEY_CODES`, `DARKNESS_MAX_OPACITY`, `DARKNESS_RAMP_TICKS`, `CLOUD_COUNT`, `CLOUD_DRIFT_PX_PER_FRAME`, `SHAKE_FRAMES`, `SHAKE_AMPLITUDE_PX`, `JUMP_DUST_FRAMES`, `LAND_DUST_FRAMES`, `MILESTONE_FLASH_FRAMES`, `NIGHT_PALETTE`. Keep every existing constant; retune nothing. |
| `src/types.ts` | Grow `ObstacleKind` and `DinoPose` as above; grow `Game` with `setDuck`. |
| `src/input.ts` | Grow `createKeyboard()` with `isDuckHeld(): boolean`, driven by the same `held` set. Export `DUCK_CODES: ReadonlySet<string>` ( `'ArrowDown'`, `'KeyS'`). The reducer stays pure. |
| `src/input-dom.ts` | On `keydown`/`keyup` for a `DUCK_CODES` code, `preventDefault()` (so the page never scrolls) and call `onDuckChange(keyboard.isDuckHeld())` so the DOM layer forwards the current held state to the game. On `reset()` (blur/visibility) also call `onDuckChange(false)`. The signature grows one callback: `attachKeyboard(target, keyboard, { onIntent, onDuckChange })`. |
| `src/main.ts` | Wire `onDuckChange: (held) => game.setDuck(held)`. Install the new feature modules alongside `installPuddle`. |
| `src/obstacles.ts` | Grow `makeGroup` so that, once `BAT_UNLOCK_SCORE` has been passed, each new group has an independent `BAT_PROBABILITY` chance of being a single-obstacle bat group placed at `BAT_FLIGHT_Y` instead of ground level. The bat check consumes exactly one extra `Rng` draw ahead of the existing two, so a seed that currently reproduces a cactus sequence keeps that same sequence until the score passes the unlock, after which bats enter deterministically from the same `Rng` state. The group-size and size-forcing logic is unchanged for pumpkin groups. |
| `src/collision.ts` | No logic change: it already takes the dino's `hitbox` from `GameState`. The reduced duck hitbox is projected by `game.ts`. |
| `src/game.ts` | Add private `duckHeld: boolean` to `createGame`, exposed by `setDuck(hold)`. On every running step, if `duckHeld && isOnGround(dino) && intent !== 'primary'`, the projected pose is `'duck'` and the projected `hitbox` is `DUCK_HITBOX` applied to the dino's position. The dino's `y` and `onGround` are unchanged (the crouch is purely a hitbox and pose change; the sprite anchors to the ground). Jump handling: if `duckHeld && intent === 'primary' && isOnGround(dino)`, the primary is **ignored this step** (crouch overrides jump, as the spec requires), no `jump` event fires, and the player must either release the duck or press space again on a later step. On `start` and `restart`, `duckHeld` is forced to `false`. |
| `src/features/night-sky.ts` *(new)* | Installs `background`-layer draws: a flat dark-indigo fill, the moon at a fixed logical position (e.g. `x = 650, y = 50`), and `CLOUD_COUNT = 3` clouds whose x drifts by `CLOUD_DRIFT_PX_PER_FRAME` on every `RenderFrame`, wrapping modulo canvas width. Clouds use the feature's own `createRng(seed ^ CLOUD_SALT)` seeded on `start` and `restart`, so their initial offsets are reproducible per seed. Clouds continue to drift on the game-over screen (they key off `RenderFrame`, not `tick`). |
| `src/features/darkness.ts` *(new)* | Installs a `foreground`-layer draw: a semi-transparent black `fillRect` across the full canvas, with `globalAlpha = min(DARKNESS_MAX_OPACITY, DARKNESS_MAX_OPACITY * tick / DARKNESS_RAMP_TICKS)`. Reads `state.tick` and `state.phase` (opacity is held at its last value while `dead`, so the game-over screen does not suddenly brighten). Resets to zero on `start`/`restart` naturally because `tick` resets. |
| `src/features/jump-land-dust.ts` *(new)* | Subscribes to `jump` and `land` events. Each event starts a short render-frame-counted puff (`JUMP_DUST_FRAMES`, `LAND_DUST_FRAMES`) at the dino's current foot position (read from the live `view()` inside the subscriber, or stored and drawn in a `parallax` layer). Pure visual; no state write. |
| `src/features/milestone-flash.ts` *(new)* | Subscribes to `milestone`. Draws a jack-o-lantern silhouette for `MILESTONE_FLASH_FRAMES` render frames, somewhere near the top-centre of the canvas (fixed position, no overlap with the HUD). |
| `src/features/death-shake.ts` *(new)* | Subscribes to `die`. For the next `SHAKE_FRAMES` render frames, installs a camera via `renderer.setCamera(fn)` that returns a small random offset (feature-local `Rng`). After the window, restores a zero-offset camera. (Only one camera callback is active at a time: this feature wraps/unwraps `setCamera` safely because no other feature claims it.) |
| `tests/regression.acceptance.test.ts` | Remove `'ArrowDown'` from `OTHER_KEYS`: with ducking live, pressing ArrowDown is **not** an "other" key — it is a defined control. The two regression tests then still assert that non-primary, non-duck keys change nothing on the start screen and game-over screen. Note this edit in the spec's Change Log. |

### 2.3 Pumpkin sprite swap (pumpkins = cacti behaviour)

The functional spec requires that for a given seed, pumpkins appear in the exact same positions cacti would have. The simplest and safest way to guarantee this is to make pumpkins **structurally identical** to cacti: same bitmap width and height, same hitbox, same `ObstacleKind` values (`'small'` and `'large'`). Only the pixel art inside the bitmap changes — a pumpkin silhouette with a carved face instead of a cactus trunk and arms. `obstacleSprite('small')` returns `Sprites.pumpkinSmall` instead of `Sprites.cactusSmall`, etc. The `CACTUS_SMALL` and `CACTUS_LARGE` constants and `Sprites.cactusSmall`/`Sprites.cactusLarge` entries are **removed** (nothing outside this spec references them by name, so the removal is safe — grep confirmed `obstacleSprite` is the only caller). This keeps the whole obstacle-spawning path (`makeGroup`, `missingKind`, gap math) byte-for-byte unchanged, and the "same positions for the same seed" acceptance criterion falls out for free.

### 2.4 Bat obstacle and ducking

**Bat sprite.** About 40 px wide, 20 px tall, with a hitbox inset slightly (e.g. `{ x: 4, y: 4, width: 32, height: 12 }`). Hitbox height is deliberately smaller than the dino's normal hitbox height but larger than the duck hitbox, so a running dino collides and a crouching dino does not.

**Flight height.** `BAT_FLIGHT_Y` is chosen so that:
- The bat hitbox's bottom edge is **above** the dino's duck hitbox top edge (passes over a crouching dino).
- The bat hitbox's bottom edge is **below** the dino's normal hitbox top edge (hits a standing dino).
- The bat hitbox's top edge is **above** the peak of a jump, so jumping cannot clear it. With `JUMP_HEIGHT_PX = 70` and the dino's standing hitbox top at roughly `y = 2 + (GROUND_Y - 47) = 215`, the jump peak hitbox top is roughly `y = 145`. The bat sits a bit higher: hitbox top around `y = 130`, hitbox bottom around `y = 142`.

**Spawning.** The spawn loop in `obstacles.ts#makeGroup` grows one extra `Rng` draw at the top: if `score >= BAT_UNLOCK_SCORE` and the draw is below `BAT_PROBABILITY`, this group is a single bat at `BAT_FLIGHT_Y`; otherwise the existing pumpkin (ex-cactus) draws run exactly as today. The extra draw is **unconditional** (it always happens, even when `score < BAT_UNLOCK_SCORE` and the result is discarded), so a seed produces the same `Rng` state after each group whether or not bats were eligible. This keeps replay reproducible once bats appear.

**Ducking hitbox.** `DUCK_HITBOX = { x: 12, y: 24, width: 22, height: 21 }` (half of the standing dino's hitbox height, anchored to the dino's feet). The dino's y position does not change while ducking; only the pose sprite (a shorter, flatter dinosaur) and the hitbox do. A new `Sprites.dinoDuck0` and `Sprites.dinoDuck1` pair gives the duck pose a two-frame run cycle, driven by the same `frame` toggle `nextRunFrame` already produces.

**Duck pose selection.** In `game.ts#projectDino`, the pose is `'duck'` whenever `phase === 'running' && isOnGround && duckHeld`. In the renderer, `dinoSprite` grows a `'duck'` arm that picks between the two duck frames the same way `'run'` picks.

**Space while ducking.** Per spec 2.5: pressing space while ducking does not jump on that press. Implemented as the `game.ts` rule in 2.2 above: when `duckHeld && intent === 'primary' && isOnGround`, the primary is discarded for this step and no `jump` event is emitted. The next primary press (after a down release, or on a later step while the duck is still held and the first press has already been consumed) still cannot jump as long as duck is held — which matches "release the duck to jump". This is a minor refinement of the spec's wording, which the Change Log will record.

### 2.5 Event-to-test mapping (ticks and state fields)

Every acceptance criterion in the functional spec maps to one of these tests. Numbers are indicative; the implementer tunes them against the actual bitmaps and constants.

| Spec AC | Test file | What is asserted | Fields / events |
|---|---|---|---|
| 2.1a — obstacles are pumpkins | `tests/sprites.test.ts` | `obstacleSprite('small') === Sprites.pumpkinSmall`; the bitmap includes at least one row distinct from `CACTUS_SMALL` | `Sprites.*` identity |
| 2.1b/c — same timing and sequence per seed | `tests/obstacles.acceptance.test.ts` | For 3 seeds, the sequence of `spawn` events (ticks + x positions) matches a snapshot taken **before** the sprite swap (snapshot committed from a one-off run of the current cactus code) | `state.obstacles[i].x`, `spawn` events |
| 2.2 — night sky, moon, clouds drift | `tests/features/night-sky.test.ts` | After installing the feature on a recording `DrawContext`, after 60 render frames (1 s at 60 Hz) the moon's draw calls appear at a stable x and the first cloud's draw calls appear at an x that has moved by `60 * CLOUD_DRIFT_PX_PER_FRAME` | `fillRect` calls recorded |
| 2.2d — clouds keep drifting on game-over | same | Compared to the moon, the cloud's x still advances after 60 extra render frames while `phase === 'dead'` | `fillRect` calls recorded |
| 2.3 — progressive darkness | `tests/features/darkness.test.ts` | At `tick = 0`, the darkness feature records `globalAlpha === 0`; at `tick = DARKNESS_RAMP_TICKS`, `globalAlpha === DARKNESS_MAX_OPACITY`; at `2 * DARKNESS_RAMP_TICKS`, still `DARKNESS_MAX_OPACITY` (clamped); after a `restart` event, alpha is 0 again on the first running step | recorded `globalAlpha` |
| 2.4 — jump/land/die/milestone reactions | `tests/features/*.test.ts` | For each reaction feature, after the event fires on a stubbed `Game`, the feature's `draw` produces at least one `fillRect` call for N render frames, and zero after | counted draws |
| 2.5a — bats appear past 200 | `tests/obstacles.test.ts` | With a seed where the first ten groups after score 200 would include at least one bat, assert the `spawnLog` contains a `'bat'` entry; and with the same code but `BAT_UNLOCK_SCORE = Infinity`, no `'bat'` entries | `state.spawnLog`, `obstacle.kind` |
| 2.5b/c — bat flight height and duck hitbox | `tests/collision.test.ts` | A bat at `BAT_FLIGHT_Y` and a non-ducking dino: `hasCollision` is `true`. The same bat and a ducking dino (hitbox swapped to `DUCK_HITBOX`): `false` | `hasCollision` |
| 2.5c/d — duck pose and hitbox from input | `tests/game.acceptance.test.ts` | After `game.setDuck(true)` and one tick in `running`, `state.dino.pose === 'duck'` and `state.dino.hitbox.height === DUCK_HITBOX.height`; after `game.setDuck(false)` and one tick, `pose === 'run'` and `hitbox.height` is the original | `state.dino` |
| 2.5f — crouching under a bat survives | `tests/game.acceptance.test.ts` | A full-run test: `setDuck(true)` from before the bat arrives through until it has passed; `phase` stays `'running'`, no `die` event | `phase`, events |
| 2.5g — space while ducking does not jump | `tests/game.acceptance.test.ts` | `setDuck(true)` then `dispatch('primary')` then `tick()`: no `jump` event, `dino.onGround` still true, `pose` still `'duck'` | events, `dino` |
| 2.5h — duck released on restart | `tests/game.acceptance.test.ts` | `setDuck(true)`, play into death, dispatch `'primary'` to restart, tick: `state.dino.pose === 'run'`, next tick's pose on the new run is `'run'` | `state.dino.pose` |
| 2.5i — seed replays bats | `tests/obstacles.acceptance.test.ts` | Two runs with the same seed produce the same ordered sequence of obstacle `kind`s past score 200 | `state.spawnLog` |
| 2.6 — at least one new test | all of the above | At least one new test file (practically ≥ 6) ships | n/a |

### 2.6 Visual style commitment

**One style, committed:** a dark-pastel pixel palette aligned with the existing sprite aesthetic. The night sky is `#1a0b2e` (deep indigo), the moon is `#f4e8c1` (pale cream), the clouds are a translucent cream, the pumpkins are an orange body (`#e86f1b`) with a dark carved face, the bats are a near-black silhouette (`#1a1a1a` on the sky, with lighter wing undersides for readability), the dinosaur stays dark grey against the new palette (sufficient contrast with the indigo at the maximum darkness overlay — verified in Risk 3 below), the ground gets a muted purple tint, and the darkness overlay is pure black at 35 percent opacity. The HUD text keeps the dark grey foreground, which stays legible on the new palette.

The palette is exported from `tuning.ts` as `NIGHT_PALETTE` alongside the existing `PALETTE`, so renderer code can switch to it without re-tuning. The simplest way to swap all drawing to the new palette is to **replace** the values of `PALETTE.bg` and `PALETTE.fg` at module scope rather than add a parallel palette — since no test asserts on the specific hex values, this stays within the "numbers in tuning" rule. The chosen approach: add `NIGHT_PALETTE`, flip the renderer to read it where background colour is used, keep `PALETTE` for places that still want the "dark on light" default (HUD text), and introduce a single palette object `HALLOWEEN_PALETTE` that the renderer and night-sky feature share.

### 2.7 Determinism

Each new feature creates its own `Rng` via `createRng(state.seed ^ SALT_X)` on `start`/`restart` (null seed before the first run is handled by using `seed ?? 0`, like the puddle), so visual randomness is reproducible per seed but never advances the game's `Rng`. The game's own `Rng` is advanced by exactly one additional draw per group (the bat-vs-pumpkin choice, 2.4) regardless of eligibility, so sequence reproducibility is preserved.

---

## 3. Impact and Risk Analysis

- **System dependencies.** No new runtime dependencies. The feature touches only `src/*` and `tests/*`. No change to `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, or `.github/workflows/*`. All new code is TypeScript strict-compliant, uses no `any`, no `as` casts, no `@ts-ignore`, and every new `switch` on an extended union ends in `assertNever` (notably `obstacleSprite`, `dinoSprite`, and any new pose switch).

- **Potential risks and mitigations.**
  1. **Reproducible-seed regression.** Risk: changing `makeGroup` to insert a new `Rng` draw could shift all later cactus positions and break the "same positions per seed" criterion. Mitigation: the extra draw is **unconditional and happens before the existing two draws**, and `missingKind` is unchanged, so pumpkin positions depend on `Rng` state in the same way as before, offset by one draw. The acceptance test for 2.1b/c snapshots a pumpkin sequence from the first run of the new code and locks it in forward (we cannot snapshot the cactus sequence because the sprite swap is structural — the sprites are identical in geometry so the swap is zero-risk for timing).
  2. **Regression test breakage.** Risk: the two existing regression tests that enumerate "other keys" include `'ArrowDown'`. Mitigation: documented change — remove `'ArrowDown'` from `OTHER_KEYS` in `tests/regression.acceptance.test.ts`, log in the spec's Change Log. The CLAUDE.md explicitly permits this.
  3. **Darkness overlay fairness.** Risk: at full darkness the dinosaur or obstacles become hard to see. Mitigation: `DARKNESS_MAX_OPACITY` capped at 0.35; the HUD and the obstacles stay on the `foreground` or `hud` layer above the darkness; a unit test asserts the opacity ceiling.
  4. **Camera contention from death-shake.** Risk: another feature later might also call `renderer.setCamera`. Mitigation: today, puddle does not, and death-shake is the only Halloween feature that does — the first-mover rule is enough; a note in `features/death-shake.ts` warns future authors.
  5. **Ducking + mid-air.** Risk: pressing duck mid-jump could cause the hitbox to snap smaller mid-air and lead to confusing behaviour. Mitigation: the duck pose and hitbox only apply when `isOnGround` is true. In the air, `duckHeld` is honoured (state is updated) but the dino continues the normal jump pose and hitbox; on landing it goes directly into `'duck'` pose if the key is still held. Verified in `tests/game.acceptance.test.ts`.
  6. **`preventDefault` on ArrowDown.** Risk: scrolling the page by pressing ArrowDown is browser-default on some pages; the game's own canvas page already has no vertical overflow, but preventing default is still correct. Mitigation: add `'ArrowDown'` and `'KeyS'` to the key-codes the DOM adapter calls `preventDefault` on, same as it already does for `Space`/`ArrowUp`.

---

## 4. Testing Strategy

- **Unit tests.** Every new piece of logic is covered by at least one new test, as mapped in 2.5. Tests follow the existing patterns in the repo: Vitest in Node, driving `createGame` with `makeGame` from `tests/helpers.ts`, and recording fake `DrawContext` for feature draws. One new acceptance test (`tests/game.acceptance.test.ts` additions) proves the whole ducking cycle end to end on a stubbed seed.

- **Regression test maintenance.** `tests/regression.acceptance.test.ts` has `'ArrowDown'` removed from `OTHER_KEYS` (documented in Change Log). All other assertions in that file are expected to continue passing — the pumpkin swap is geometry-preserving, and ducking does not change the start/game-over behaviour against non-duck keys. The `playWellTimed` jump-timing test continues to pass because the pumpkin hitboxes equal the cactus hitboxes and bats only unlock at score 200, well past the 30-second mark the test exercises.

- **End-to-end.** The Playwright smoke test is **unchanged**. It proves wiring (canvas size, Space starts a run, score grows, death after no input, high score persistence, resize) — none of which the Halloween edition changes. Deliberately not adding a Halloween-specific smoke test keeps the e2e surface minimal (one test) and respects the spec's "no visual E2E" boundary.

- **Type-check as a test.** `npm test` continues to run `tsc --noEmit` for both `tsconfig.json` and `tsconfig.node.json` before Vitest, catching every missed `assertNever` arm and every leaked `any`.

- **Determinism tests.** The reproducibility criteria (2.1c and 2.5i) are proven by two tests that run the same seed twice through `tick(2000)` and compare `spawnLog` directly — a tight, byte-exact check that would fail immediately if any new `Math.random`, wall clock, or module-level mutable state slipped in.

- **Verification.** `/awos:verify` is run at the end of implementation, as the final step before commit, to map every acceptance criterion in the functional spec back to a test or a one-minute manual check and mark the spec Completed.
