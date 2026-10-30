import { describe, expect, it } from 'vitest';
import {
  Sprites,
  computeRuns,
  makeSprite,
  obstacleSprite,
} from '../src/sprites.js';
import type { Sprite } from '../src/sprites.js';

const allSprites = Object.entries(Sprites);

/** Paints the runs onto a blank grid and returns it as bitmap rows. */
function paintRuns(sprite: Sprite): string[] {
  const grid = Array.from({ length: sprite.height }, () =>
    Array.from({ length: sprite.width }, () => '.'),
  );
  for (const run of sprite.runs) {
    const row = grid[run.y];
    if (row === undefined)
      throw new Error(`run outside sprite at y ${String(run.y)}`);
    for (let x = run.x; x < run.x + run.width; x += 1) {
      if (x >= sprite.width)
        throw new Error(`run outside sprite at x ${String(x)}`);
      if (row[x] === '#')
        throw new Error(`runs overlap at ${String(x)},${String(run.y)}`);
      row[x] = '#';
    }
  }
  return grid.map((row) => row.join(''));
}

describe('sprites', () => {
  it.each(allSprites)('%s has equal-length rows', (_name, sprite) => {
    for (const row of sprite.bitmap) {
      expect(row).toHaveLength(sprite.width);
    }
  });

  it.each(allSprites)(
    '%s derives width and height from its bitmap',
    (_name, sprite) => {
      expect(sprite.height).toBe(sprite.bitmap.length);
      expect(sprite.width).toBe(sprite.bitmap[0]?.length);
    },
  );

  it.each(allSprites)('%s runs cover exactly the # pixels', (_name, sprite) => {
    expect(sprite.runs.length).toBeGreaterThan(0);
    expect(paintRuns(sprite)).toEqual([...sprite.bitmap]);
    for (const run of sprite.runs) {
      expect(run.height).toBe(1);
      expect(run.width).toBeGreaterThan(0);
    }
  });

  it.each(allSprites)('%s hitbox lies inside the sprite', (_name, sprite) => {
    const { x, y, width, height } = sprite.hitbox;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + width).toBeLessThanOrEqual(sprite.width);
    expect(y + height).toBeLessThanOrEqual(sprite.height);
  });

  it('the standing dino is about 44 by 47 with an inset hitbox', () => {
    const dino = Sprites.dinoStand;
    expect(dino.width).toBe(44);
    expect(dino.height).toBe(47);
    // Inset on the left (tail) and on the right (head overhang).
    expect(dino.hitbox.x).toBeGreaterThan(0);
    expect(dino.hitbox.x + dino.hitbox.width).toBeLessThan(dino.width);
  });

  it.each([
    ['dinoRun0', Sprites.dinoRun0],
    ['dinoRun1', Sprites.dinoRun1],
  ] as const)(
    '%s has the standing dino size, hitbox and body',
    (_name, run) => {
      const stand = Sprites.dinoStand;
      expect(run.width).toBe(stand.width);
      expect(run.height).toBe(stand.height);
      expect(run.hitbox).toEqual(stand.hitbox);
      // Everything above the legs (rows 0 to 35) is the same body.
      expect(run.bitmap.slice(0, 36)).toEqual(stand.bitmap.slice(0, 36));
    },
  );

  it('the two run frames differ only in the legs, and each lifts a different one', () => {
    const { dinoRun0, dinoRun1, dinoStand } = Sprites;
    const legs = (sprite: Sprite): readonly string[] => sprite.bitmap.slice(36);
    expect(legs(dinoRun0)).not.toEqual(legs(dinoRun1));
    expect(legs(dinoRun0)).not.toEqual(legs(dinoStand));
    expect(legs(dinoRun1)).not.toEqual(legs(dinoStand));

    // On the bottom row the standing dino has both feet down; each run frame
    // keeps exactly one of them, and not the same one.
    const footColumns = (sprite: Sprite): number[] => {
      const bottom = sprite.bitmap[sprite.height - 1] ?? '';
      return [12, 24].filter((x) => bottom[x] === '#');
    };
    expect(footColumns(dinoStand)).toEqual([12, 24]);
    expect(footColumns(dinoRun0)).toEqual([24]);
    expect(footColumns(dinoRun1)).toEqual([12]);
  });

  it('the hit dino has the standing size, hitbox, body and legs, with an X for an eye', () => {
    const { dinoHit, dinoStand } = Sprites;
    expect(dinoHit.width).toBe(dinoStand.width);
    expect(dinoHit.height).toBe(dinoStand.height);
    expect(dinoHit.hitbox).toEqual(dinoStand.hitbox);
    // Below the head (rows 8 onward: neck, body, arm, tail, standing legs) it
    // is the standing dino.
    expect(dinoHit.bitmap.slice(8)).toEqual(dinoStand.bitmap.slice(8));

    // Functional spec 2.5: the eye (rows 2 to 7, columns 26 to 31) is an X of
    // light pixels, a 3 by 3 X drawn at double size like the rest of the dino.
    const eye = dinoHit.bitmap.slice(2, 8).map((row) => row.slice(26, 32));
    expect(eye).toEqual([
      '..##..',
      '..##..',
      '##..##',
      '##..##',
      '..##..',
      '..##..',
    ]);
    // The X is enclosed by the head: solid on both sides of it.
    for (const row of dinoHit.bitmap.slice(2, 8)) {
      expect(row.slice(22, 26)).toBe('####');
      expect(row.slice(32, 44)).toBe('#'.repeat(12));
    }
  });

  it.each([
    ['pumpkinSmall', Sprites.pumpkinSmall, 17, 35],
    ['pumpkinLarge', Sprites.pumpkinLarge, 25, 50],
  ] as const)('%s is %i by %i', (_name, pumpkin, width, height) => {
    expect(pumpkin.width).toBe(width);
    expect(pumpkin.height).toBe(height);
  });

  it.each([
    ['pumpkinSmall', Sprites.pumpkinSmall, { x: 2, y: 0, width: 13, height: 35 }],
    ['pumpkinLarge', Sprites.pumpkinLarge, { x: 3, y: 0, width: 19, height: 50 }],
  ] as const)(
    '%s has the expected hitbox',
    (_name, pumpkin, expectedHitbox) => {
      expect(pumpkin.hitbox).toEqual(expectedHitbox);
    },
  );

  it.each([
    ['pumpkinSmall', Sprites.pumpkinSmall],
    ['pumpkinLarge', Sprites.pumpkinLarge],
  ] as const)(
    '%s stands on its base and its hitbox excludes the outer edges',
    (_name, pumpkin) => {
      const { hitbox } = pumpkin;
      // The body reaches the bottom row, so the pumpkin sits on the ground.
      expect(pumpkin.bitmap[pumpkin.height - 1]).toContain('#');
      expect(hitbox.y + hitbox.height).toBe(pumpkin.height);
      // The hitbox is inset from the edges for grazing forgiveness.
      expect(hitbox.x).toBeGreaterThan(0);
      expect(hitbox.x + hitbox.width).toBeLessThan(pumpkin.width);
    },
  );

  it('obstacleSprite maps each kind to its pumpkin', () => {
    expect(obstacleSprite('small')).toBe(Sprites.pumpkinSmall);
    expect(obstacleSprite('large')).toBe(Sprites.pumpkinLarge);
  });

  it('the ground tile is a full-width line on top', () => {
    const ground = Sprites.ground;
    expect(ground.bitmap[0]).toBe('#'.repeat(ground.width));
  });
});

describe('computeRuns', () => {
  it('merges adjacent pixels into one run per stretch', () => {
    expect(computeRuns(['##.#', '....', '.###'])).toEqual([
      { x: 0, y: 0, width: 2, height: 1 },
      { x: 3, y: 0, width: 1, height: 1 },
      { x: 1, y: 2, width: 3, height: 1 },
    ]);
  });
});

describe('makeSprite', () => {
  const box = { x: 0, y: 0, width: 1, height: 1 };

  it('rejects rows of unequal length', () => {
    expect(() => makeSprite(['##', '#'], box)).toThrow(/row 1/);
  });

  it('rejects an empty bitmap', () => {
    expect(() => makeSprite([], box)).toThrow();
  });

  it('rejects characters other than # and .', () => {
    expect(() => makeSprite(['# '], box)).toThrow(/row 0/);
  });

  it('rejects a hitbox outside the bitmap', () => {
    expect(() =>
      makeSprite(['##'], { x: 1, y: 0, width: 2, height: 1 }),
    ).toThrow(/hitbox/);
  });
});
