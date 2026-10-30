// Milestone flash jack-o-lantern (Halloween Edition functional spec 2.4).
//
// Subscribes to 'milestone' and draws a pumpkin silhouette for
// MILESTONE_FLASH_FRAMES render frames, centred near the top of the canvas.

import type { Renderer } from '../render.js';
import { Sprites, type Sprite } from '../sprites.js';
import { MILESTONE_FLASH_FRAMES } from '../tuning.js';
import type { DrawContext, Game, LayerDraw } from '../types.js';

export interface MilestoneFlashDeps {
  readonly game: Pick<Game, 'on'>;
  readonly renderer: Pick<Renderer, 'addLayer'>;
}

/** Draws a sprite with a custom fill colour. */
function drawSpriteColoured(
  ctx: DrawContext,
  sprite: Sprite,
  x: number,
  y: number,
  colour: string,
): void {
  const originX = Math.round(x);
  const originY = Math.round(y);
  ctx.fillStyle = colour;
  for (const run of sprite.runs) {
    ctx.fillRect(originX + run.x, originY + run.y, run.width, run.height);
  }
}

/** Installs the milestone flash; the returned function removes it. */
export function installMilestoneFlash({ game, renderer }: MilestoneFlashDeps): () => void {
  let flashStartedAt: number | null = null;

  const reset = () => {
    flashStartedAt = null;
  };

  const onMilestone = () => {
    // Will be set to frame.count on first draw
    flashStartedAt = -1;
  };

  const draw: LayerDraw = (ctx, state, frame) => {
    if (flashStartedAt === null) return;

    // Set start frame on first render after event
    if (flashStartedAt < 0) {
      flashStartedAt = frame.count;
    }

    const age = frame.count - flashStartedAt;
    if (age >= MILESTONE_FLASH_FRAMES) {
      flashStartedAt = null;
      return;
    }

    // Draw the pumpkin sprite centred at x=400, y=30
    const sprite = Sprites.pumpkinSmall;
    const x = 400 - sprite.width / 2;
    const y = 30;
    drawSpriteColoured(ctx, sprite, x, y, '#ff8c42');
  };

  const offStart = game.on('start', reset);
  const offRestart = game.on('restart', reset);
  const offMilestone = game.on('milestone', onMilestone);
  const removeLayer = renderer.addLayer('foreground', draw);

  return () => {
    offStart();
    offRestart();
    offMilestone();
    removeLayer();
  };
}
