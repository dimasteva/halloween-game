// Tests for the death shake feature (Halloween Edition spec 2.4).

import { describe, expect, it } from 'vitest';
import { installDeathShake } from '../../src/features/death-shake.js';
import { collect, makeGame, pressPrimary } from '../helpers.js';

describe('death shake', () => {
  it('subscribes to die events', () => {
    const { game } = makeGame(42);
    installDeathShake({ game, renderer: { setCamera: () => {} } });

    const deaths = collect(game, 'die');

    pressPrimary(game);
    game.tick();

    // Wait for death
    while (game.view().phase === 'running' && game.view().tick < 600) {
      game.tick();
    }
    expect(deaths.length).toBe(1);
  });

  it('sets a camera function', () => {
    const { game } = makeGame(42);
    let cameraSet = false;
    installDeathShake({
      game,
      renderer: {
        setCamera: (fn) => {
          expect(typeof fn).toBe('function');
          cameraSet = true;
        },
      },
    });
    expect(cameraSet).toBe(true);
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

    installDeathShake({ game, renderer: { setCamera: () => {} } });

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
    const dispose = installDeathShake({
      game,
      renderer: { setCamera: () => {} },
    });
    expect(typeof dispose).toBe('function');
    // Should not throw
    dispose();
  });
});
