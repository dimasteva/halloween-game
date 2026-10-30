// DOM keyboard adapter (technical considerations 2.2, risk "Keyboard focus").
// Listens on the window so the canvas needs no focus, and feeds the pure reducer.

import { DUCK_CODES, PRIMARY_CODES, type Keyboard } from './input.js';
import type { Intent } from './types.js';

/** The slice of `KeyboardEvent` the adapter reads. */
export interface KeyEventLike {
  readonly code: string;
  readonly repeat: boolean;
  preventDefault(): void;
}

/**
 * The slice of `Window` the adapter uses. `window` satisfies it; tests pass a
 * plain fake, so the adapter is unit-testable in Node without casts.
 */
export interface KeyboardTarget {
  addEventListener(
    type: 'keydown' | 'keyup',
    listener: (event: KeyEventLike) => void,
  ): void;
  addEventListener(type: 'blur', listener: () => void): void;
  removeEventListener(
    type: 'keydown' | 'keyup',
    listener: (event: KeyEventLike) => void,
  ): void;
  removeEventListener(type: 'blur', listener: () => void): void;
  readonly document: {
    readonly visibilityState: string;
    addEventListener(type: 'visibilitychange', listener: () => void): void;
    removeEventListener(type: 'visibilitychange', listener: () => void): void;
  };
}

export function attachKeyboard(
  target: KeyboardTarget,
  keyboard: Keyboard,
  callbacks: {
    readonly onIntent: (intent: Intent) => void;
    readonly onDuckChange: (held: boolean) => void;
  },
): { dispose(): void } {
  const { onIntent, onDuckChange } = callbacks;
  // Space, ArrowUp, ArrowDown and KeyS never scroll the page.
  const onKeyDown = (event: KeyEventLike): void => {
    if (PRIMARY_CODES.has(event.code)) event.preventDefault();
    if (DUCK_CODES.has(event.code)) {
      event.preventDefault();
      keyboard.keyDown(event.code, event.repeat);
      onDuckChange(keyboard.isDuckHeld());
      return;
    }
    const intent = keyboard.keyDown(event.code, event.repeat);
    if (intent !== null) onIntent(intent);
  };
  const onKeyUp = (event: KeyEventLike): void => {
    if (PRIMARY_CODES.has(event.code)) event.preventDefault();
    if (DUCK_CODES.has(event.code)) {
      event.preventDefault();
      keyboard.keyUp(event.code);
      onDuckChange(keyboard.isDuckHeld());
      return;
    }
    keyboard.keyUp(event.code);
  };
  // A keyup during alt-tab is never delivered, so forget held keys on blur/hide.
  const onBlur = (): void => {
    keyboard.reset();
    onDuckChange(false);
  };
  const onVisibility = (): void => {
    if (target.document.visibilityState === 'hidden') {
      keyboard.reset();
      onDuckChange(false);
    }
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);
  target.document.addEventListener('visibilitychange', onVisibility);

  return {
    dispose() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
      target.document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
