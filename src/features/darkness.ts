// Progressive darkness overlay (Halloween Edition functional spec 2.3).
//
// Draws a semi-transparent black rectangle over the full canvas, gradually
// increasing in opacity as the run progresses. Opacity is keyed off state.tick,
// so it resets naturally on start/restart and holds at the last value when dead.

import type { Renderer } from '../render.js';
import { CANVAS, DARKNESS_MAX_OPACITY, DARKNESS_RAMP_TICKS } from '../tuning.js';
import type { Game, LayerDraw } from '../types.js';

export interface DarknessDeps {
  readonly game: Pick<Game, 'on'>;
  readonly renderer: Pick<Renderer, 'addLayer'>;
}

/** Installs the darkness overlay; the returned function removes it. */
export function installDarkness({ game, renderer }: DarknessDeps): () => void {
  const draw: LayerDraw = (ctx, state) => {
    // Only draw while running or dead, not on the idle screen.
    if (state.phase === 'idle') return;

    // Compute opacity from tick: ramps from 0 to DARKNESS_MAX_OPACITY over
    // DARKNESS_RAMP_TICKS, then stays at max. state.tick doesn't advance when
    // dead, so the opacity is held at whatever it was when the run ended.
    const progress = state.tick / DARKNESS_RAMP_TICKS;
    const opacity = Math.min(DARKNESS_MAX_OPACITY, DARKNESS_MAX_OPACITY * progress);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
    ctx.restore();
  };

  const removeLayer = renderer.addLayer('foreground', draw);

  return () => {
    removeLayer();
  };
}
