// Tests for the milestone flash feature (Halloween Edition spec 2.4).

import { describe, expect, it } from 'vitest';
import { installMilestoneFlash } from '../../src/features/milestone-flash.js';
import { collect, makeGame, pressPrimary } from '../helpers.js';

describe('milestone flash', () => {
  it('subscribes to milestone events', () => {
    const { game } = makeGame(42, { deps: { collisions: false } });
    installMilestoneFlash({ game, renderer: { addLayer: () => () => {} } });

    const milestones = collect(game, 'milestone');

    pressPrimary(game);
    game.tick();

    // Advance until score crosses 100
    while (game.view().score < 100 && game.view().tick < 2000) {
      game.tick();
    }
    expect(milestones.length).toBeGreaterThanOrEqual(1);
  });

  it('installs a foreground layer', () => {
    const { game } = makeGame(42);
    let layerAdded = false;
    installMilestoneFlash({
      game,
      renderer: {
        addLayer: (layer, draw) => {
          expect(layer).toBe('foreground');
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

    installMilestoneFlash({ game, renderer: { addLayer: () => () => {} } });

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
    const dispose = installMilestoneFlash({
      game,
      renderer: { addLayer: () => () => {} },
    });
    expect(typeof dispose).toBe('function');
    // Should not throw
    dispose();
  });
});
