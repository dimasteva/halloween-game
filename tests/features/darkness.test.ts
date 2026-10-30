// Tests for the darkness overlay feature (Halloween Edition spec 2.3).

import { describe, expect, it } from 'vitest';
import { installDarkness } from '../../src/features/darkness.js';
import { createLayerStack } from '../../src/render.js';
import { DARKNESS_MAX_OPACITY, DARKNESS_RAMP_TICKS } from '../../src/tuning.js';
import type { GameState } from '../../src/types.js';
import { fakeContext, makeGame } from '../helpers.js';

function setup() {
  const { game } = makeGame(42);
  const stack = createLayerStack();
  const dispose = installDarkness({ game, renderer: stack });

  function render(state: GameState = game.view()): number | null {
    const ctx = fakeContext();
    stack.run(ctx, state);
    // Find the last globalAlpha set (darkness sets it just before drawing)
    return ctx.globalAlpha;
  }

  return { game, render, dispose };
}

describe('darkness overlay', () => {
  it('draws nothing on the idle screen', () => {
    const { game, render } = setup();
    expect(game.view().phase).toBe('idle');
    const alpha = render();
    // The feature itself doesn't draw on idle, but we check globalAlpha stays at 1
    expect(alpha).toBe(1);
  });

  it('starts at opacity 0 when the run begins', () => {
    const { game } = setup();
    game.dispatch('primary');
    game.tick();
    expect(game.view().phase).toBe('running');
    // At tick=0 (start of run), opacity should be 0
    const ctx = fakeContext();
    const stack = createLayerStack();
    installDarkness({ game, renderer: stack });
    stack.run(ctx, game.view());
    // Check that globalAlpha was set to a small value (or 0)
    expect(ctx.globalAlpha).toBeLessThan(0.01);
  });

  it('reaches max opacity at DARKNESS_RAMP_TICKS', () => {
    const { game } = setup();
    // Create the game with collisions disabled so we can reach DARKNESS_RAMP_TICKS
    const { game: gameNoCollisions } = makeGame(42, { deps: { collisions: false } });
    const stack = createLayerStack();
    installDarkness({ game: gameNoCollisions, renderer: stack });

    gameNoCollisions.dispatch('primary');
    gameNoCollisions.tick();
    // Advance to DARKNESS_RAMP_TICKS
    gameNoCollisions.tick(DARKNESS_RAMP_TICKS);
    expect(gameNoCollisions.view().tick).toBe(DARKNESS_RAMP_TICKS);

    const ctx = fakeContext();
    stack.run(ctx, gameNoCollisions.view());

    expect(ctx.globalAlpha).toBeCloseTo(DARKNESS_MAX_OPACITY, 2);
  });

  it('stays at max opacity after DARKNESS_RAMP_TICKS', () => {
    const { game: gameNoCollisions } = makeGame(42, { deps: { collisions: false } });
    const stack = createLayerStack();
    installDarkness({ game: gameNoCollisions, renderer: stack });

    gameNoCollisions.dispatch('primary');
    gameNoCollisions.tick();
    gameNoCollisions.tick(DARKNESS_RAMP_TICKS * 2);

    const ctx = fakeContext();
    stack.run(ctx, gameNoCollisions.view());

    expect(ctx.globalAlpha).toBe(DARKNESS_MAX_OPACITY);
  });

  it('holds opacity while dead so the game-over screen stays dark', () => {
    const { game } = setup();
    game.dispatch('primary');
    game.tick();
    game.tick(DARKNESS_RAMP_TICKS);

    // Let the game run until death (no jumps, so first obstacle kills)
    while (game.view().phase === 'running' && game.view().tick < 600) {
      game.tick();
    }
    expect(game.view().phase).toBe('dead');
    const tickAtDeath = game.view().tick;

    const ctx = fakeContext();
    const stack = createLayerStack();
    installDarkness({ game, renderer: stack });
    stack.run(ctx, game.view());
    const alphaAtDeath = ctx.globalAlpha;

    // Render 100 more frames while dead
    for (let i = 0; i < 100; i += 1) {
      const ctx2 = fakeContext();
      stack.run(ctx2, game.view());
      // Opacity should stay the same because tick doesn't advance when dead
      expect(ctx2.globalAlpha).toBe(alphaAtDeath);
    }
  });

  it('resets to zero opacity on restart', () => {
    const { game } = setup();
    const stack = createLayerStack();
    installDarkness({ game, renderer: stack });

    // Run and die
    game.dispatch('primary');
    game.tick();
    while (game.view().phase === 'running' && game.view().tick < 600) {
      game.tick();
    }
    expect(game.view().phase).toBe('dead');

    // Restart
    game.dispatch('primary');
    game.tick();
    expect(game.view().phase).toBe('running');

    const ctx = fakeContext();
    stack.run(ctx, game.view());

    // Should be back to very low opacity
    expect(ctx.globalAlpha).toBeLessThan(0.01);
  });
});
