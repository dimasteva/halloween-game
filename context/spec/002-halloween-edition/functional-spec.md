# Functional Specification: Halloween Edition

- **Topic:** A Halloween-themed visual and gameplay overlay to the Dino Runner, for the week of October 31.
- **Status:** Draft
- **Author:** AWOS /awos:spec

---

## 1. Overview and Rationale (The "Why")

Marketing asked for a Halloween edition of the game for the week of October 31. The brief is deliberately broad — a theme, new flying obstacles, and a power-up chain — and part of this spec's job is to scope it so the result is testable, stays fair, and still feels like the original game.

**What the player gets.** When a player opens the game between October 25 and November 1, they immediately recognise that it is Halloween-themed: cacti are replaced by pumpkins; the sky is a dark night sky with a moon and drifting clouds; the longer they survive the darker the world becomes; and when they jump, land, die, or reach a score milestone the world reacts with a small Halloween-flavoured flourish. Once they get past the first stretch, bats join the obstacle mix as a flying hazard they must duck under, raising the skill ceiling without changing how the base run and jump feel.

**What is deliberately deferred.** The witch's hat power-up, the candy pickups it enables, and the hearts that would soften a crash are left for a follow-up spec. They are the next natural step after this one, and leaving them out keeps this spec small enough to implement and verify end-to-end in one sitting.

**How we measure success.**
- A new player can tell this is Halloween within two seconds of the page loading, before pressing any key.
- The game still passes every pre-existing acceptance test, with the single documented exception of the regression test about ducking, which this spec rewrites to match the new rules.
- The core restart loop still runs within one second of pressing the restart key.
- Every acceptance criterion below is covered either by a unit test or by a one-minute manual playthrough that a non-developer could follow.

**Why now.** The game's architecture was designed to accept visual and gameplay overlays as isolated feature modules, so a seasonal edition is the natural first large exercise in extending the game. Marketing has a seasonal moment to anchor it to.

---

## 2. Functional Requirements (The "What")

### 2.1 Pumpkins replace cacti

- **As a** player, **I want** the obstacles I jump over to look like pumpkins instead of cacti, **so that** the game clearly reads as Halloween from the first screen.
  - **Acceptance Criteria:**
    - [ ] When the player opens the page, then every ground obstacle shown is a pumpkin (a jack-o-lantern with a carved face), not a cactus.
    - [ ] When the player starts a run and survives at least one obstacle, then that obstacle keeps the same timing and jump windows the previous (cactus) version had, so the game still feels fair.
    - [ ] When the player loads the page with a specific seed in the address and runs it, then the exact same sequence of pumpkins appears at the exact same positions as the previous (cactus) version would have shown cacti.

### 2.2 Night sky with moon and drifting clouds

- **As a** player, **I want** the sky to be a night sky with a moon and drifting clouds, **so that** the Halloween mood is set from the first frame.
  - **Acceptance Criteria:**
    - [ ] When the player opens the page, then the background is a dark night-sky colour (deep purple/indigo), not the original light tone.
    - [ ] When the player opens the page, then a single moon is visible in the upper region of the screen and stays in that position without moving.
    - [ ] When the player opens the page and watches for ten seconds without pressing a key, then at least two clouds visibly drift sideways across the sky in the same direction.
    - [ ] When the player presses space and starts a run, then the clouds keep drifting at the same visual speed as before, independent of how fast the ground scrolls.
    - [ ] When the player dies and the game-over screen is shown, then the clouds continue to drift (the sky never freezes).

### 2.3 Progressive spookiness — darker the longer you survive

- **As a** player, **I want** the world to grow darker the longer my run lasts, **so that** survival feels like a descent into Halloween night.
  - **Acceptance Criteria:**
    - [ ] When the player starts a new run, then the scene is at its lightest (the baseline night sky with no extra darkness overlay).
    - [ ] When the player survives for about 60 seconds in a single run, then a dark overlay has gradually built up so the scene is noticeably darker than at the start of the run — the overlay reaches roughly 35 percent opacity at that point and stops darkening further after that.
    - [ ] When the player dies and starts a new run, then the darkness overlay resets to the lightest baseline for the new run.
    - [ ] When the darkness is at its maximum, then the pumpkins, the dinosaur, the HUD, the moon and the ground all remain clearly visible so the game stays fair.

### 2.4 Event reactions — the world responds to jump, land, die and milestone

- **As a** player, **I want** the world to react when I do something significant, **so that** the game feels alive and spooky.
  - **Acceptance Criteria:**
    - [ ] When the dinosaur jumps, then a small puff of pale particles appears briefly under its feet.
    - [ ] When the dinosaur lands back on the ground after a jump, then a small cloud of dust kicks up briefly under its feet.
    - [ ] When the player dies by hitting an obstacle, then the screen shakes visibly for a short moment (less than half a second) before the game-over text settles.
    - [ ] When the player's score crosses a milestone (every 100 points), then a brief jack-o-lantern silhouette flashes somewhere on screen for about a third of a second.
    - [ ] When any of these reactions is active, then the gameplay itself (the dinosaur's hitbox, the obstacles, the scoring) is not affected — reactions are purely visual.

### 2.5 Bats you must duck under (Tier 2)

- **As a** player, **I want** bats to appear in the air that I have to duck under, **so that** the game adds a new kind of challenge beyond jumping.
  - **Acceptance Criteria:**
    - [ ] When the player's score passes 200 in a single run, then bats start appearing in the obstacle sequence alongside pumpkins.
    - [ ] When a bat appears, then it flies at a height such that an ordinary jump cannot clear it — the player must duck underneath it to survive.
    - [ ] When the player holds the down arrow (or the S key) while the dinosaur is on the ground, then the dinosaur crouches: its visible pose is a lower, hunched shape and its collision area is roughly half the normal height.
    - [ ] When the player releases the down arrow (or S), then the dinosaur returns to its normal running pose on the next step.
    - [ ] When the dinosaur is crouching and a bat is at its horizontal position, then the bat passes over the dinosaur without ending the run.
    - [ ] When the dinosaur is running normally (not crouching) and a bat is at its horizontal position, then the player dies with the same game-over screen that pumpkins trigger.
    - [ ] When the player presses space while already crouching, then the dinosaur cancels the crouch and does not jump on that press — the next press of space will jump as normal.
    - [ ] When the player restarts after dying, then any held duck is released and the dinosaur starts in the normal running pose.
    - [ ] When the player loads the page with a specific seed in the address and runs it, then the exact same sequence of bats and pumpkins appears at the exact same positions each time.

### 2.6 A new unit test for the new logic

- **As a** maintainer, **I want** the new Halloween logic to be covered by at least one new unit test, **so that** the game stays verifiable.
  - **Acceptance Criteria:**
    - [ ] When `npm test` is run, then it includes at least one brand-new test file (or at least one brand-new test case in an existing file) that proves a new piece of logic introduced by this spec — for example, that ducking halves the dinosaur's hitbox height, or that a bat obstacle only spawns past a given score, or that the darkness overlay reaches its target opacity at the expected tick.
    - [ ] When `npm test` is run, then the entire test suite passes with zero failures.
    - [ ] When the regression test file at `tests/regression.acceptance.test.ts` conflicts with the ducking rules in section 2.5, then that single regression test is rewritten to match the new rules, and the change is noted in the Change Log of this spec.

---

## 3. Scope and Boundaries

### In-Scope

- Visual replacement of cacti with pumpkins (jack-o-lanterns), keeping cactus hitboxes and spawn timings.
- A dark night-sky background with a single stationary moon.
- Two or more clouds drifting across the sky, continuing to drift on the game-over screen.
- A darkness overlay that grows from 0 to about 35 percent opacity over roughly 60 seconds of a run, resetting on each restart.
- Visual reactions on four events: jump, land, die, and milestone.
- Bats as a new flying obstacle, appearing from score 200 onward, requiring the player to duck under them.
- A ducking input: hold Down arrow or S to crouch, release to stand; crouch overrides a simultaneous jump press (cancels crouch, does not jump that press).
- At least one new unit test covering a new piece of logic.
- Rewriting the single conflicting regression test in `tests/regression.acceptance.test.ts` if ducking makes it fail, and recording that change in this spec's Change Log.

### Out-of-Scope

- The witch's hat power-up (deferred to a later spec).
- Candy pickups and the "hearts that soften a crash" mechanic (deferred to a later spec).
- Audio of any kind — no sound effects, no music.
- Mobile or touch controls; no new keyboard controls beyond Down arrow / S for ducking.
- Changes to the scoring formula, the high-score persistence, or the layout of the game-over screen.
- Any separate "normal" vs "Halloween" toggle — the Halloween edition is the only edition during its deployment window.
- Localisation of any new on-screen text (no new text is introduced).
- Changes to the dinosaur's jump height or jump duration (jump feel stays identical to the original).
- A dedicated end-to-end Playwright test for Halloween visuals — unit tests cover the new logic; the existing smoke test continues to prove wiring only.

---

## Change Log

### Slice 4 (Bats and Ducking)

**ArrowDown removed from regression test's OTHER_KEYS** (section 2.6): With ducking live, `ArrowDown` and `KeyS` are defined controls, not "other" keys. The regression tests at `tests/regression.acceptance.test.ts` previously asserted that pressing `ArrowDown` on the start or game-over screens changes nothing; with this change, those tests still assert that non-primary, non-duck keys change nothing.

**Space while ducking is ignored** (section 2.5): When the player holds down or S while the dinosaur is on the ground, pressing space does not jump on that press. The dinosaur must first release the duck key (returning to the run pose) before space will jump. This clarifies the spec's "cancels the crouch and does not jump on that press" wording: the cancel happens, but jumping still requires a fresh space press while not ducking.
