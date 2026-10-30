// Pure Konami-code detector (Exercise 8). No DOM. Eats KeyboardEvent.code
// strings and returns true exactly on the keypress that completes the
// sequence. A wrong key resets the match, but if that key is the first code
// of the sequence it starts a fresh attempt (so a stray ArrowUp mid-match
// does not require Space to clear).

export const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
] as const;

export interface KonamiDetector {
  /** `true` exactly on the keypress that completes the full sequence. */
  press(code: string): boolean;
}

export function createKonamiDetector(): KonamiDetector {
  let matched = 0;
  return {
    press(code) {
      if (code === KONAMI_SEQUENCE[matched]) {
        matched += 1;
      } else if (code === KONAMI_SEQUENCE[0]) {
        matched = 1;
      } else {
        matched = 0;
      }
      if (matched === KONAMI_SEQUENCE.length) {
        matched = 0;
        return true;
      }
      return false;
    },
  };
}
