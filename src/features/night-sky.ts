// Night sky with moon and drifting clouds (Halloween Edition, Slice 2).
// Installs a background layer that fills with the dark sky, draws the moon at
// a fixed position, and draws clouds that drift sideways on every render frame.

import { createRng } from '../rng.js';
import type { Renderer } from '../render.js';
import { Sprites, type Sprite } from '../sprites.js';
import {
  CANVAS,
  CLOUD_COUNT,
  CLOUD_DRIFT_PX_PER_FRAME,
  CLOUD_SALT,
  HALLOWEEN_PALETTE,
  MOON_POSITION,
} from '../tuning.js';
import type { Game, LayerDraw } from '../types.js';

export interface NightSkyDeps {
  readonly game: Pick<Game, 'on' | 'view'>;
  readonly renderer: Pick<Renderer, 'addLayer'>;
}

interface Cloud {
  x: number;
  y: number;
  sprite: Sprite;
}

/**
 * Draws a sprite by filling its pixel runs with a given fillStyle color.
 * Similar to render.ts drawSprite but takes a color argument instead of using PALETTE.fg.
 */
function drawSpriteWithColor(
  ctx: { fillStyle: string | CanvasGradient | CanvasPattern; fillRect: (x: number, y: number, w: number, h: number) => void },
  sprite: Sprite,
  x: number,
  y: number,
  fillStyle: string,
): void {
  const originX = Math.round(x);
  const originY = Math.round(y);
  ctx.fillStyle = fillStyle;
  for (const run of sprite.runs) {
    ctx.fillRect(originX + run.x, originY + run.y, run.width, run.height);
  }
}

/** Installs the night sky; the returned function removes it again. */
export function installNightSky({ game, renderer }: NightSkyDeps): () => void {
  let clouds: Cloud[] = [];

  const resetClouds = (): void => {
    const state = game.view();
    const seed = state.seed ?? 0;
    const rng = createRng(seed ^ CLOUD_SALT);

    clouds = [];
    for (let i = 0; i < CLOUD_COUNT; i += 1) {
      // Alternate between small and large clouds.
      const sprite = i % 2 === 0 ? Sprites.cloudSmall : Sprites.cloudLarge;
      // Random x across the canvas width plus the cloud width.
      const x = rng.next() * (CANVAS.width + sprite.width);
      // Random y in the upper half of the canvas.
      const y = rng.next() * (CANVAS.height * 0.4);
      clouds.push({ x, y, sprite });
    }
  };

  const draw: LayerDraw = (ctx, state, frame) => {
    // Fill canvas with dark sky.
    ctx.fillStyle = HALLOWEEN_PALETTE.bg;
    ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);

    // Draw moon at fixed position.
    drawSpriteWithColor(
      ctx,
      Sprites.moon,
      MOON_POSITION.x,
      MOON_POSITION.y,
      HALLOWEEN_PALETTE.moon,
    );

    // Draw and drift clouds.
    for (const cloud of clouds) {
      // Wrap around canvas width plus cloud width.
      const wrapWidth = CANVAS.width + cloud.sprite.width;
      const wrappedX = cloud.x % wrapWidth;
      const screenX = wrappedX - cloud.sprite.width;

      drawSpriteWithColor(
        ctx,
        cloud.sprite,
        screenX,
        cloud.y,
        HALLOWEEN_PALETTE.cloud,
      );

      // Advance cloud x by drift amount (this mutates cloud.x per frame).
      cloud.x += CLOUD_DRIFT_PX_PER_FRAME;
    }
  };

  // Reset on start and restart.
  const offStart = game.on('start', resetClouds);
  const offRestart = game.on('restart', resetClouds);
  // Initialize clouds on install.
  resetClouds();

  const removeLayer = renderer.addLayer('background', draw);

  return () => {
    offStart();
    offRestart();
    removeLayer();
  };
}
