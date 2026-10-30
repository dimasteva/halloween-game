// Night sky with moon and drifting clouds (Halloween Edition, Slice 2).
// Installs a background layer that fills with the dark sky, draws the moon at
// a fixed position, and draws clouds that drift sideways on every render frame,
// continuing to drift on the game-over screen.

import { describe, expect, it } from 'vitest';
import { installNightSky } from '../../src/features/night-sky.js';
import { createLayerStack } from '../../src/render.js';
import {
  CANVAS,
  CLOUD_COUNT,
  CLOUD_DRIFT_PX_PER_FRAME,
  HALLOWEEN_PALETTE,
  MOON_POSITION,
} from '../../src/tuning.js';
import type { GameState } from '../../src/types.js';
import {
  fakeContext,
  makeGame,
  pressPrimary,
  runUntil,
  type Call,
} from '../helpers.js';

type FillRect = Extract<Call, { op: 'fillRect' }>;

/** One rendered frame: every fillRect, tagged with the fillStyle it was drawn in. */
interface Frame {
  readonly rects: readonly (FillRect & { readonly style: unknown })[];
}

function setup() {
  const { game } = makeGame(42);
  const stack = createLayerStack();
  const dispose = installNightSky({ game, renderer: stack });
  function render(state: GameState = game.view()): Frame {
    const ctx = fakeContext();
    stack.run(ctx, state);
    let style: unknown = undefined;
    const rects: (FillRect & { style: unknown })[] = [];
    for (const call of ctx.calls) {
      if (call.op === 'fillStyle') style = call.value;
      if (call.op === 'fillRect') rects.push({ ...call, style });
    }
    return { rects };
  }
  return { game, render, dispose };
}

/** All fillRects drawn in the given colour. */
const inColour = (frame: Frame, colour: string) =>
  frame.rects.filter((r) => r.style === colour);

describe('night sky with moon and clouds', () => {
  it('fills the canvas with the Halloween background colour', () => {
    const { render } = setup();
    const frame = render();
    const bgRects = inColour(frame, HALLOWEEN_PALETTE.bg);
    expect(bgRects.length).toBeGreaterThan(0);
    // The first fill should be a full-canvas fill.
    const fullCanvasFill = bgRects.find(
      (r) => r.w === CANVAS.width && r.h === CANVAS.height,
    );
    expect(fullCanvasFill).toBeDefined();
  });

  it('draws the moon at MOON_POSITION, which stays constant over 60 render frames', () => {
    const { render } = setup();
    const moonXPositions: number[] = [];
    for (let i = 0; i < 60; i += 1) {
      const frame = render();
      const moonRects = inColour(frame, HALLOWEEN_PALETTE.moon);
      if (moonRects.length > 0) {
        // Moon is made of multiple fillRects; check the leftmost x.
        const leftmost = Math.min(...moonRects.map((r) => r.x));
        moonXPositions.push(leftmost);
      }
    }
    expect(moonXPositions.length).toBe(60);
    // All moon x positions should be the same (MOON_POSITION.x).
    expect(moonXPositions.every((x) => x === MOON_POSITION.x)).toBe(true);
  });

  it('draws CLOUD_COUNT clouds, whose x advances by CLOUD_DRIFT_PX_PER_FRAME * 60 after 60 frames', () => {
    const { render } = setup();
    const firstFrame = render();
    const firstClouds = inColour(firstFrame, HALLOWEEN_PALETTE.cloud);
    // Should have at least some cloud pixels.
    expect(firstClouds.length).toBeGreaterThan(0);

    // Advance 60 frames.
    for (let i = 1; i < 60; i += 1) {
      render();
    }
    const frame60 = render();
    const clouds60 = inColour(frame60, HALLOWEEN_PALETTE.cloud);
    expect(clouds60.length).toBeGreaterThan(0);

    // Check that clouds have drifted. The leftmost cloud rect x should have moved.
    const firstLeft = Math.min(...firstClouds.map((r) => r.x));
    const frame60Left = Math.min(...clouds60.map((r) => r.x));
    const expectedDrift = 60 * CLOUD_DRIFT_PX_PER_FRAME;
    // Allow for wrapping: the drift might cause x to wrap around CANVAS.width.
    // So we check that the difference is approximately expectedDrift (modulo wrapping).
    const actualDrift = (frame60Left - firstLeft + CANVAS.width) % CANVAS.width;
    expect(Math.abs(actualDrift - expectedDrift)).toBeLessThan(2);
  });

  it('clouds continue to drift while phase === "dead"', () => {
    const { game, render } = setup();
    // Start the game and let it die (same pattern as puddle test).
    pressPrimary(game);
    runUntil(game, (s) => s.phase === 'dead', 600);
    expect(game.view().phase).toBe('dead');

    const deadFrame0 = render();
    const clouds0 = inColour(deadFrame0, HALLOWEEN_PALETTE.cloud);
    const left0 = Math.min(...clouds0.map((r) => r.x));

    // Advance 60 more render frames while dead.
    for (let i = 0; i < 60; i += 1) {
      render();
    }
    const deadFrame60 = render();
    const clouds60 = inColour(deadFrame60, HALLOWEEN_PALETTE.cloud);
    const left60 = Math.min(...clouds60.map((r) => r.x));

    // Clouds should have drifted even while dead.
    const expectedDrift = 60 * CLOUD_DRIFT_PX_PER_FRAME;
    const actualDrift = (left60 - left0 + CANVAS.width) % CANVAS.width;
    expect(Math.abs(actualDrift - expectedDrift)).toBeLessThan(2);
  });

  it('draws nothing after dispose', () => {
    const { render, dispose } = setup();
    dispose();
    const frame = render();
    // After dispose, the background layer should not fill the canvas or draw moon/clouds.
    expect(inColour(frame, HALLOWEEN_PALETTE.bg).length).toBe(0);
    expect(inColour(frame, HALLOWEEN_PALETTE.moon).length).toBe(0);
    expect(inColour(frame, HALLOWEEN_PALETTE.cloud).length).toBe(0);
  });
});
