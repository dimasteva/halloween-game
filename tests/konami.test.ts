import { describe, expect, it } from 'vitest';
import { KONAMI_SEQUENCE, createKonamiDetector } from '../src/konami.js';

describe('createKonamiDetector', () => {
  it('returns true exactly on the final keypress of the sequence', () => {
    const konami = createKonamiDetector();
    const results = KONAMI_SEQUENCE.map((code) => konami.press(code));
    expect(results.slice(0, -1).every((r) => !r)).toBe(true);
    expect(results.at(-1)).toBe(true);
  });

  it('ignores keys that are not part of the sequence (no match)', () => {
    const konami = createKonamiDetector();
    expect(konami.press('KeyX')).toBe(false);
    expect(konami.press('Space')).toBe(false);
    expect(konami.press('Enter')).toBe(false);
  });

  it('resets when a wrong key breaks the sequence mid-way', () => {
    const konami = createKonamiDetector();
    konami.press('ArrowUp');
    konami.press('ArrowUp');
    konami.press('ArrowDown');
    // Wrong key here resets the match.
    expect(konami.press('KeyX')).toBe(false);
    // Now a full fresh sequence must still work.
    for (const code of KONAMI_SEQUENCE.slice(0, -1)) {
      expect(konami.press(code)).toBe(false);
    }
    expect(konami.press(KONAMI_SEQUENCE.at(-1) ?? '')).toBe(true);
  });

  it('a stray ArrowUp mid-sequence still starts a fresh attempt (does not require Space to reset)', () => {
    const konami = createKonamiDetector();
    konami.press('ArrowUp');
    konami.press('ArrowUp');
    konami.press('ArrowDown');
    konami.press('ArrowDown');
    // At this point we expect ArrowLeft, but ArrowUp arrives (also jumps in-game).
    // That key is the first of the sequence, so it counts as a restart.
    expect(konami.press('ArrowUp')).toBe(false);
    // Now press ArrowUp again (second step of the sequence) then the rest.
    expect(konami.press('ArrowUp')).toBe(false);
    for (const code of KONAMI_SEQUENCE.slice(2, -1)) {
      expect(konami.press(code)).toBe(false);
    }
    expect(konami.press(KONAMI_SEQUENCE.at(-1) ?? '')).toBe(true);
  });

  it('fires again on a second full sequence (so the mode can be toggled off)', () => {
    const konami = createKonamiDetector();
    for (const code of KONAMI_SEQUENCE.slice(0, -1)) {
      konami.press(code);
    }
    expect(konami.press(KONAMI_SEQUENCE.at(-1) ?? '')).toBe(true);
    // Second pass.
    for (const code of KONAMI_SEQUENCE.slice(0, -1)) {
      expect(konami.press(code)).toBe(false);
    }
    expect(konami.press(KONAMI_SEQUENCE.at(-1) ?? '')).toBe(true);
  });
});
