// Pure keyboard reducer (architecture 2.2 Input model, section 3 `createKeyboard`).
// No DOM: input-dom.ts feeds it `KeyboardEvent.code` values and forwards intents.

import type { Intent } from './types.js';

/**
 * Key codes that mean "primary" (start, jump, restart). The DOM adapter also
 * stops their default action, so Space never scrolls the page.
 */
export const PRIMARY_CODES: ReadonlySet<string> = new Set(['Space', 'ArrowUp']);

/**
 * Key codes for ducking. The DOM adapter stops their default action and
 * forwards the held state to the game.
 */
export const DUCK_CODES: ReadonlySet<string> = new Set(['ArrowDown', 'KeyS']);

export interface Keyboard {
  /** `'primary'` on a fresh, non-repeat press of Space or ArrowUp; otherwise `null`. */
  keyDown(code: string, repeat: boolean): Intent | null;
  /** Releases `code`, so its next press counts again. */
  keyUp(code: string): void;
  /** Releases every held key (window blur, page hidden). */
  reset(): void;
  /** True when any DUCK_CODES key is held. */
  isDuckHeld(): boolean;
}

export function createKeyboard(): Keyboard {
  // Held state is tracked per code, so holding Space does not block ArrowUp,
  // and duck keys are tracked alongside primary keys.
  const held = new Set<string>();
  return {
    keyDown(code, repeat) {
      // Track duck keys in the held set.
      if (DUCK_CODES.has(code)) {
        if (!repeat) held.add(code);
        return null;
      }
      // Primary intent only for PRIMARY_CODES.
      if (!PRIMARY_CODES.has(code) || repeat || held.has(code)) return null;
      held.add(code);
      return 'primary';
    },
    keyUp(code) {
      held.delete(code);
    },
    reset() {
      held.clear();
    },
    isDuckHeld() {
      for (const code of held) {
        if (DUCK_CODES.has(code)) return true;
      }
      return false;
    },
  };
}
