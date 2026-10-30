// Easter-egg "Spooky Mode" visuals (Exercise 8). Switched on and off by the
// Konami code in main.ts. A cosmetic feature in the shape architecture 2.2
// describes: owns its own state (which here is only the two layer handles),
// never writes to GameState, uses frame.count for animation so it keeps
// pulsing while the game is frozen on the game-over screen.

import type { Renderer } from '../render.js';
import { CANVAS } from '../tuning.js';
import type { LayerDraw } from '../types.js';

export interface SecretModeDeps {
  readonly renderer: Pick<Renderer, 'addLayer'>;
  /** Called every frame; the overlay only draws when it returns true. */
  readonly isActive: () => boolean;
}

/** Palette the banner cycles through while the mode is on. */
const BANNER_COLORS = ['#ff5fa2', '#ffb84d', '#9b5cff', '#5cf0ff'] as const;

/** Colour of the translucent background tint. */
const TINT_COLOR = '#2a0a4a';

/** Alpha the background tint is painted at (0..1). */
const TINT_ALPHA = 0.35;

/** Frames between banner-colour swaps. */
const COLOR_SWAP_FRAMES = 12;

/** Banner text; painted centred at this logical y, roughly a sixth from the top. */
const BANNER_TEXT = 'SPOOKY MODE';
const BANNER_Y = 44;
const BANNER_FONT = 'bold 28px monospace';

export function installSecretMode({
  renderer,
  isActive,
}: SecretModeDeps): () => void {
  const drawTint: LayerDraw = (ctx) => {
    if (!isActive()) return;
    ctx.globalAlpha = TINT_ALPHA;
    ctx.fillStyle = TINT_COLOR;
    ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  };

  const drawBanner: LayerDraw = (ctx, _state, frame) => {
    if (!isActive()) return;
    const colorIndex =
      Math.floor(frame.count / COLOR_SWAP_FRAMES) % BANNER_COLORS.length;
    const color = BANNER_COLORS[colorIndex];
    if (color === undefined) return;
    // Pulse: full opacity most of the time, dip briefly for a flicker.
    const pulse = 0.75 + 0.25 * Math.abs(Math.sin(frame.count / 10));
    ctx.globalAlpha = pulse;
    ctx.fillStyle = color;
    ctx.font = BANNER_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(BANNER_TEXT, CANVAS.width / 2, BANNER_Y);
  };

  const removeTint = renderer.addLayer('background', drawTint);
  const removeBanner = renderer.addLayer('hud', drawBanner);

  return () => {
    removeTint();
    removeBanner();
  };
}
