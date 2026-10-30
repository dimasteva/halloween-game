# Tasks: Halloween Edition

Five vertical slices. After each slice the game still boots, `npm test` still passes, and a new visible slice of Halloween behaviour has landed. Slice order is also fallback order: dropping Slice 4 still leaves a full Tier 1 feature (pumpkins + night sky + darkness ramp + event reactions + a new unit test); dropping Slices 3 and 4 still leaves pumpkins and the night sky.

---

- [x] **Slice 1: Pumpkins replace cacti, Halloween palette applied**

  _Smallest user-visible step: the game still runs exactly as before, but the obstacles look like jack-o-lanterns and the colours are Halloween. No gameplay change, no new events. Covers functional-spec AC 2.1a/b/c._

  - [x] Add `PUMPKIN_SMALL` and `PUMPKIN_LARGE` bitmaps to `src/sprites.ts`, with the **same width, height and hitbox** as the existing `CACTUS_SMALL` and `CACTUS_LARGE`. Expose them as `Sprites.pumpkinSmall` and `Sprites.pumpkinLarge`. Grow `obstacleSprite(kind)` so `'small'` returns `pumpkinSmall` and `'large'` returns `pumpkinLarge`. Delete the `CACTUS_SMALL`, `CACTUS_LARGE`, `Sprites.cactusSmall`, `Sprites.cactusLarge` entries — nothing outside this spec references them. **[Agent: typescript-game]**
  - [x] Add `HALLOWEEN_PALETTE` to `src/tuning.ts` (dark indigo background, pale cream for sky accents, orange for pumpkin body, deep orange face, dark grey ground tint). Update the renderer to read background colour from `HALLOWEEN_PALETTE.bg` instead of `PALETTE.bg`. Keep `PALETTE.fg` for the dino and HUD text. **[Agent: typescript-game]**
  - [x] Update or add tests in `tests/sprites.test.ts`: assert `obstacleSprite('small') === Sprites.pumpkinSmall`, assert pumpkin bitmap dimensions equal the former cactus bitmap dimensions (hitbox-preserving swap), and remove any assertions that referenced `cactusSmall`/`cactusLarge` by name. **[Agent: typescript-game]**
  - [x] Verify: run `npm test` (both type-check programs and Vitest). Start `npm run dev`, open the page in the browser, confirm pumpkins appear instead of cacti and the background is dark indigo, then stop the dev server (kill by PID) and delete any screenshots created during the check. **[Agent: typescript-game]**

- [x] **Slice 2: Night sky with moon and drifting clouds**

  _Adds a self-contained cosmetic feature. No gameplay change. Covers AC 2.2a–e._

  - [ ] Add `MOON`, `CLOUD_SMALL`, `CLOUD_LARGE` decorative sprites to `src/sprites.ts` (pure data, no hitbox used in gameplay — use a nominal 1x1 hitbox since they never collide). **[Agent: typescript-game]**
  - [ ] Add new named constants to `src/tuning.ts`: `MOON_POSITION = { x: 650, y: 50 }`, `CLOUD_COUNT = 3`, `CLOUD_DRIFT_PX_PER_FRAME = 0.3`, `CLOUD_SALT = 0x5A17`. **[Agent: typescript-game]**
  - [ ] Create `src/features/night-sky.ts`: `installNightSky({ game, renderer })`, following the shape of `installPuddle`. Registers a `background` layer draw that fills the canvas with `HALLOWEEN_PALETTE.bg`, draws the moon at `MOON_POSITION`, and draws `CLOUD_COUNT` clouds whose x advances by `CLOUD_DRIFT_PX_PER_FRAME` on every `RenderFrame` and wraps modulo `CANVAS.width`. Initial x and y for each cloud come from the feature's own `createRng(state.seed ^ CLOUD_SALT)`, re-seeded on every `start` and `restart` event (fall back to seed `0` when `state.seed` is `null`). Returns a `dispose()` that detaches both subscriptions and the layer. **[Agent: typescript-game]**
  - [ ] Install the feature from `src/main.ts` alongside `installPuddle`. **[Agent: typescript-game]**
  - [ ] Add `tests/features/night-sky.test.ts`: install the feature on a recording `DrawContext` and a stub `game.on`, assert the moon's draw position stays constant over 60 render frames, assert the first cloud's x moves by `60 * CLOUD_DRIFT_PX_PER_FRAME` after 60 frames, and assert clouds still move while `phase === 'dead'`. **[Agent: typescript-game]**
  - [ ] Verify: run `npm test`. Start `npm run dev`, open the page, watch for 10 seconds without pressing a key, confirm at least two clouds visibly drift sideways in the same direction and the moon stays fixed, then stop the dev server (kill by PID) and delete any screenshots created during the check. **[Agent: typescript-game]**

- [x] **Slice 3: Progressive darkness + four event reactions**

  _Covers AC 2.3 and AC 2.4. Each reaction is its own small feature module; dropping any one of them still leaves a working game._

  - [ ] Add tuning constants to `src/tuning.ts`: `DARKNESS_MAX_OPACITY = 0.35`, `DARKNESS_RAMP_TICKS = 3600` (60 s at 60 Hz), `JUMP_DUST_FRAMES = 10`, `LAND_DUST_FRAMES = 12`, `SHAKE_FRAMES = 18`, `SHAKE_AMPLITUDE_PX = 4`, `MILESTONE_FLASH_FRAMES = 20`, and the salts the features use (`DUST_SALT`, `SHAKE_SALT`). **[Agent: typescript-game]**
  - [ ] Create `src/features/darkness.ts`: a `foreground`-layer feature that draws a full-canvas semi-transparent black rect at `globalAlpha = Math.min(DARKNESS_MAX_OPACITY, DARKNESS_MAX_OPACITY * state.tick / DARKNESS_RAMP_TICKS)`. Resets naturally because `state.tick` resets on start/restart. **[Agent: typescript-game]**
  - [ ] Create `src/features/jump-land-dust.ts`: subscribes to `'jump'` and `'land'` events; each event starts a short `RenderFrame`-counted particle puff at the dino's foot position, drawn on the `parallax` layer. Uses the feature's own `createRng(state.seed ^ DUST_SALT)`. **[Agent: typescript-game]**
  - [ ] Create `src/features/milestone-flash.ts`: subscribes to `'milestone'`; draws a jack-o-lantern silhouette (reuses the small pumpkin sprite, scaled visually by pixel-doubling the row runs) centred near the top of the canvas for `MILESTONE_FLASH_FRAMES` render frames. Drawn on the `foreground` layer. **[Agent: typescript-game]**
  - [ ] Create `src/features/death-shake.ts`: subscribes to `'die'`; for `SHAKE_FRAMES` render frames after the event, installs `renderer.setCamera(fn)` where `fn` returns a small offset drawn from the feature's own `createRng(state.seed ^ SHAKE_SALT)` with amplitude damping linearly to zero over the window. After the window, restores a zero-offset camera callback. **[Agent: typescript-game]**
  - [ ] Install all four features from `src/main.ts`. **[Agent: typescript-game]**
  - [ ] Add `tests/features/darkness.test.ts`, `tests/features/jump-land-dust.test.ts`, `tests/features/milestone-flash.test.ts`, `tests/features/death-shake.test.ts`: for each feature, assert the recorded `globalAlpha`, `fillRect` or camera-offset values match the expected opacity ramp, frame count or amplitude. **[Agent: typescript-game]**
  - [ ] Verify: run `npm test`. Start `npm run dev`, play a run of at least a minute, confirm by eye that the scene gradually darkens, dust puffs appear on jump and land, a jack-o-lantern flashes every 100 points, and the screen shakes on death. Stop the dev server (kill by PID) and delete any screenshots. **[Agent: typescript-game]**

- [x] **Slice 4: Bats and ducking (Tier 2)**

  _Covers AC 2.5 and the new-unit-test criterion 2.6. This is the only slice that touches gameplay logic; the public contract grows in exactly three places (`ObstacleKind`, `DinoPose`, `Game.setDuck`) and the regression test is updated once._

  - [ ] Grow `src/types.ts`: add `'bat'` to `ObstacleKind`, `'duck'` to `DinoPose`, and `setDuck(hold: boolean): void` to the `Game` interface. **[Agent: typescript-game]**
  - [ ] Add `BAT`, `DINO_DUCK_0`, `DINO_DUCK_1` bitmaps to `src/sprites.ts` with their own hitboxes. Grow `obstacleSprite(kind)` with a `'bat'` arm (ending in `assertNever`). Expose `Sprites.bat`, `Sprites.dinoDuck0`, `Sprites.dinoDuck1`. **[Agent: typescript-game]**
  - [ ] Add tuning constants: `BAT_FLIGHT_Y`, `BAT_PROBABILITY = 0.3`, `BAT_UNLOCK_SCORE = 200`, `DUCK_HITBOX = { x: 12, y: 24, width: 22, height: 21 }`, `DUCK_CODES = new Set(['ArrowDown', 'KeyS'])`. Choose `BAT_FLIGHT_Y` so the bat hitbox clears a duck hitbox but hits a normal dino and cannot be jumped over (see tech-considerations 2.4). **[Agent: typescript-game]**
  - [ ] Modify `src/obstacles.ts#makeGroup`: pass `score: number` into the `GroupRequest` (grow the type), add an **unconditional** first `Rng` draw at the top; if `score >= BAT_UNLOCK_SCORE` and that draw is below `BAT_PROBABILITY`, emit a single bat at `BAT_FLIGHT_Y`; otherwise fall through to the existing two draws unchanged. Update `game.ts#stepObstacles` to pass `run.score` into `makeGroup`. **[Agent: typescript-game]**
  - [ ] Modify `src/game.ts`: add `let duckHeld = false` in `createGame`'s closure; expose `setDuck(hold)` on the returned `Game`. In `freshRun`, do not touch `duckHeld` (it is closure state, not run state), but reset it to `false` **inside `createGame`** on every `start` and `restart` event the game emits. In `projectDino`, when `run.phase === 'running' && run.dino.onGround && duckHeld`, set `pose = 'duck'` and project `hitbox` using `DUCK_HITBOX` offsets. In `stepRunning`, if `duckHeld && intent === 'primary' && isOnGround(run.dino)`, consume and discard the primary (no jump, no `'jump'` event). The duck frame cycle re-uses `nextRunFrame` on the ground. **[Agent: typescript-game]**
  - [ ] Modify `src/input.ts`: add `'ArrowDown'` and `'KeyS'` tracking to the held set alongside `PRIMARY_CODES`; expose `isDuckHeld(): boolean` returning whether any `DUCK_CODES` key is in the held set; export `DUCK_CODES`. The primary-intent logic is unchanged. **[Agent: typescript-game]**
  - [ ] Modify `src/input-dom.ts`: grow the signature to `attachKeyboard(target, keyboard, { onIntent, onDuckChange })`. On `keydown`/`keyup` of a `DUCK_CODES` code, call `event.preventDefault()` and then `onDuckChange(keyboard.isDuckHeld())`. On `blur` and `visibilitychange → hidden`, also call `onDuckChange(false)` after `keyboard.reset()`. **[Agent: typescript-game]**
  - [ ] Modify `src/main.ts`: wire `onDuckChange: (held) => game.setDuck(held)` into both the initial `attachKeyboard` call and the `bindKeyboard` on restart. **[Agent: typescript-game]**
  - [ ] Modify `src/render.ts#dinoSprite`: add a `'duck'` arm picking `Sprites.dinoDuck0` or `Sprites.dinoDuck1` based on `dino.frame` (ending in `assertNever`). **[Agent: typescript-game]**
  - [ ] Modify `tests/regression.acceptance.test.ts`: remove `'ArrowDown'` from `OTHER_KEYS`. Add a Change Log entry in `context/spec/002-halloween-edition/functional-spec.md` noting this and the "space while ducking is ignored" clarification. **[Agent: typescript-game]**
  - [ ] Add tests covering the new logic (at least one per bullet; existing files preferred where they match):
    - `tests/sprites.test.ts`: `Sprites.bat` and `Sprites.dinoDuck*` are valid sprites with the declared hitboxes.
    - `tests/collision.test.ts`: a bat at `BAT_FLIGHT_Y` collides with a running dino and does not collide with a dino projected using `DUCK_HITBOX`.
    - `tests/obstacles.test.ts`: with a seed and `score < BAT_UNLOCK_SCORE`, no bats spawn; with the same seed stepped past the unlock, at least one bat appears within the next ten groups; two identical seeded runs produce an identical `spawnLog` of kinds.
    - `tests/game.acceptance.test.ts`: `setDuck(true) → tick` yields `pose === 'duck'` and `hitbox.height === DUCK_HITBOX.height`; `setDuck(false) → tick` restores `pose === 'run'`; `setDuck(true) + dispatch('primary') + tick` emits no `'jump'`; `setDuck(true)` carried through a bat pass survives; `setDuck(true)` through a death and restart leaves `pose === 'run'` on the fresh run.
    **[Agent: typescript-game]**
  - [ ] Verify: run `npm test`. Start `npm run dev`, play a run past score 200, hold Down/S under a bat and confirm the dino crouches and survives, confirm pressing Space while crouched does not jump, die, press Space to restart, confirm the dino starts in run pose. Stop the dev server (kill by PID) and delete any screenshots. **[Agent: typescript-game]**

- [ ] **Slice 5: Feature Testing & Regression**

  > Verifies the whole feature end-to-end against functional-spec.md, run after all implementation slices are complete.
  - [ ] Read functional-spec.md acceptance criteria in full. Generate acceptance-level tests that verify the entire feature as a whole — not individual slices. Cover applicable layers (unit for pure logic, integration for service interactions, e2e for user flows) based on the project's testing stack. Write tests with RED validation (must fail before implementation is confirmed done). Annotate each test with `@spec: 002-halloween-edition` and `@regression` if suitable for long-term regression. **[Agent: testing-expert]**
  - [ ] Run all generated tests. All must pass. Fix any failures before proceeding. **[Agent: testing-expert]**
