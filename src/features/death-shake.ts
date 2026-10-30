// Death screen shake (Halloween Edition functional spec 2.4).
//
// Subscribes to 'die' and installs a camera offset for SHAKE_FRAMES render frames,
// using feature-local randomness (createRng seeded from state.seed ^ SHAKE_SALT)
// with amplitude damping linearly from SHAKE_AMPLITUDE_PX to 0.

import { createRng } from '../rng.js';
import type { CameraFn, Renderer } from '../render.js';
import { SHAKE_AMPLITUDE_PX, SHAKE_FRAMES, SHAKE_SALT } from '../tuning.js';
import type { Game } from '../types.js';

export interface DeathShakeDeps {
  readonly game: Pick<Game, 'on' | 'view'>;
  readonly renderer: Pick<Renderer, 'setCamera'>;
}

/** Installs the death shake; the returned function removes it. */
export function installDeathShake({ game, renderer }: DeathShakeDeps): () => void {
  let rng = createRng(0);
  let shakeStartedAt: number | null = null;

  const reset = () => {
    shakeStartedAt = null;
    renderer.setCamera(() => ({ x: 0, y: 0 }));
  };

  const onDie = () => {
    const state = game.view();
    rng = createRng((state.seed ?? 0) ^ SHAKE_SALT);
    shakeStartedAt = -1; // will be set to frame.count on first camera call
  };

  const camera: CameraFn = (state, frame) => {
    if (shakeStartedAt === null) {
      return { x: 0, y: 0 };
    }

    // Set start frame on first call after die event
    if (shakeStartedAt < 0) {
      shakeStartedAt = frame.count;
    }

    const age = frame.count - shakeStartedAt;
    if (age >= SHAKE_FRAMES) {
      shakeStartedAt = null;
      return { x: 0, y: 0 };
    }

    // Linear damping: full amplitude at start, zero at end
    const progress = age / SHAKE_FRAMES;
    const amplitude = SHAKE_AMPLITUDE_PX * (1 - progress);

    const x = (rng.next() - 0.5) * 2 * amplitude;
    const y = (rng.next() - 0.5) * 2 * amplitude;

    return { x, y };
  };

  renderer.setCamera(camera);

  const offStart = game.on('start', reset);
  const offRestart = game.on('restart', reset);
  const offDie = game.on('die', onDie);

  return () => {
    offStart();
    offRestart();
    offDie();
    renderer.setCamera(() => ({ x: 0, y: 0 }));
  };
}
