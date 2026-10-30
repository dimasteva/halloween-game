// Tests for the jump and land dust puffs (Halloween Edition spec 2.4).

import { describe, expect, it } from 'vitest';
import { installJumpLandDust } from '../../src/features/jump-land-dust.js';
import { collect, makeGame, pressPrimary } from '../helpers.js';

describe('jump and land dust puffs', () => {
  it('subscribes to jump and land events', () => {
    const { game } = makeGame(42);
    const jumps = collect(game, 'jump');
    const lands = collect(game, 'land');

    installJumpLandDust({ game, renderer: { addLayer: () => () => {} } });

    pressPrimary(game);
    game.tick();

    // Jump a second time to be sure
    game.dispatch('primary');
    game.tick();
    expect(jumps.length).toBeGreaterThanOrEqual(1);

    // Wait for landing
    while (game.view().phase === 'running' && !game.view().dino.onGround) {
      game.tick();
    }
    expect(lands.length).toBeGreaterThanOrEqual(1);
  });

  it('installs a parallax layer', () => {
    const { game } = makeGame(42);
    let layerAdded = false;
    installJumpLandDust({
      game,
      renderer: {
        addLayer: (layer, draw) => {
          expect(layer).toBe('parallax');
          layerAdded = true;
          return () => {};
        },
      },
    });
    expect(layerAdded).toBe(true);
  });

  it('resets on start and restart events', () => {
    const { game } = makeGame(42);
    const startEvents: number[] = [];
    const restartEvents: number[] = [];

    game.on('start', () => {
      startEvents.push(1);
    });
    game.on('restart', () => {
      restartEvents.push(1);
    });

    installJumpLandDust({ game, renderer: { addLayer: () => () => {} } });

    pressPrimary(game);
    game.tick();
    expect(startEvents.length).toBe(1);

    // Die
    while (game.view().phase === 'running' && game.view().tick < 600) {
      game.tick();
    }
    expect(game.view().phase).toBe('dead');

    // Restart
    pressPrimary(game);
    expect(restartEvents.length).toBe(1);
  });

  it('returns a dispose function', () => {
    const { game } = makeGame(42);
    const dispose = installJumpLandDust({
      game,
      renderer: { addLayer: () => () => {} },
    });
    expect(typeof dispose).toBe('function');
    // Should not throw
    dispose();
  });
});
