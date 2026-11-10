import { describe, expect, it } from 'vitest';
import { RECIPES, recipeById } from '../src/data/recipes';
import { coverEmoji, coverHue } from '../src/lib/cover';
import { clock, splitTimes } from '../src/lib/timers';

describe('recipe covers', () => {
  it('every recipe gets a dish picture; the right one for some well-known dishes', () => {
    for (const r of RECIPES) expect(coverEmoji(r), r.id).toMatch(/\p{Extended_Pictographic}/u);
    const e = (id: string) => coverEmoji(recipeById(id)!);
    expect(e('lentil-bolognese')).toBe('🍝');
    expect(e('thai-green-curry')).toBe('🍛');
    expect(e('pho')).toBe('🍲'); // a soup
    expect(e('cilbir')).toBe('🍳');
  });
  it('one cuisine, one colour', () => {
    const it = RECIPES.filter((r) => r.cuisine === 'Italian');
    expect(new Set(it.map(coverHue)).size).toBe(1);
  });
});

describe('timers in the steps', () => {
  it('finds the times a step names, a range at its first figure', () => {
    const parts = splitTimes('Simmer 30–35 minutes, then rest for an hour. Fry 6-7 mins a side.');
    expect(parts.filter((p) => p.seconds).map((p) => [p.text, p.seconds])).toEqual([['30–35 minutes', 1800], ['an hour', 3600], ['6-7 mins', 360]]);
    expect(parts.map((p) => p.text).join('')).toBe('Simmer 30–35 minutes, then rest for an hour. Fry 6-7 mins a side.');
    expect(splitTimes('Bake for 1.5 hours')[1].seconds).toBe(5400);
    expect(splitTimes('Add 2 onions').every((p) => !p.seconds)).toBe(true);
  });
  it('shows time left like a kitchen timer', () => {
    expect(clock(65)).toBe('1:05');
    expect(clock(3725)).toBe('1:02:05');
    expect(clock(-3)).toBe('0:00');
  });
});
