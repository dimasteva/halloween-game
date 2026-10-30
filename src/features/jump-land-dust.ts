// Jump and land dust puffs (Halloween Edition functional spec 2.4).
//
// Subscribes to 'jump' and 'land' events and draws short render-frame-counted
// particle puffs at the dino's foot position. Uses feature-local randomness
// (createRng seeded from state.seed ^ DUST_SALT) for puff variation.

import { createRng } from '../rng.js';
import type { Renderer } from '../render.js';
import { DUST_SALT, GROUND_Y, JUMP_DUST_FRAMES, LAND_DUST_FRAMES } from '../tuning.js';
import type { Game, LayerDraw } from '../types.js';

export interface JumpLandDustDeps {
  readonly game: Pick<Game, 'on' | 'view'>;
  readonly renderer: Pick<Renderer, 'addLayer'>;
}

interface PuffState {
  readonly x: number;
  readonly startedAt: number;
  readonly frames: number;
}

/** Installs the jump and land dust puffs; the returned function removes them. */
export function installJumpLandDust({ game, renderer }: JumpLandDustDeps): () => void {
  let rng = createRng(0);
  const puffs: PuffState[] = [];

  const reset = () => {
    puffs.length = 0;
    const state = game.view();
    rng = createRng((state.seed ?? 0) ^ DUST_SALT);
  };

  const onJump = () => {
    const state = game.view();
    puffs.push({
      x: state.dino.hitbox.x + state.dino.hitbox.width / 2,
      startedAt: -1, // will be set on first render
      frames: JUMP_DUST_FRAMES,
    });
  };

  const onLand = () => {
    const state = game.view();
    puffs.push({
      x: state.dino.hitbox.x + state.dino.hitbox.width / 2,
      startedAt: -1,
      frames: LAND_DUST_FRAMES,
    });
  };

  const draw: LayerDraw = (ctx, state, frame) => {
    // Remove expired puffs
    for (let i = puffs.length - 1; i >= 0; i -= 1) {
      const puff = puffs[i];
      if (puff === undefined) continue;
      const startedAt = puff.startedAt < 0 ? frame.count : puff.startedAt;
      const age = frame.count - startedAt;
      if (age >= puff.frames) {
        puffs.splice(i, 1);
      }
    }

    // Draw active puffs
    for (const puff of puffs) {
      const startedAt = puff.startedAt < 0 ? frame.count : puff.startedAt;
      // Update startedAt if this is the first render
      if (puff.startedAt < 0) {
        (puff as { startedAt: number }).startedAt = frame.count;
      }
      const age = frame.count - startedAt;
      const alpha = 1 - age / puff.frames;

      // Draw a few random particles around the foot position
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#d0d0d0';
      for (let i = 0; i < 5; i += 1) {
        const offsetX = (rng.next() - 0.5) * 8;
        const offsetY = (rng.next() - 0.5) * 4;
        const size = Math.ceil(rng.next() * 2 + 1);
        ctx.fillRect(
          Math.round(puff.x + offsetX),
          Math.round(GROUND_Y + offsetY),
          size,
          size,
        );
      }
      ctx.restore();
    }
  };

  const offStart = game.on('start', reset);
  const offRestart = game.on('restart', reset);
  const offJump = game.on('jump', onJump);
  const offLand = game.on('land', onLand);
  const removeLayer = renderer.addLayer('parallax', draw);

  return () => {
    offStart();
    offRestart();
    offJump();
    offLand();
    removeLayer();
  };
}
