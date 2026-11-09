import { describe, expect, it } from 'vitest';
import { FAMILIAR } from '../src/data/familiar';
import { discover, findFamiliar, freeRein, fridgeMatches, ingredientsInText, somethingDifferent, surprise } from '../src/lib/match';

describe('fridge', () => {
  it('nothing ticked = nothing suggested', () => {
    expect(fridgeMatches([])).toEqual([]);
  });
  it('finds what you can make, fewest missing first, and never counts salt/oil as missing', () => {
    const have = ['eggs', 'feta', 'greek-yoghurt', 'butter', 'chilli-flakes', 'smoked-paprika', 'garlic', 'sourdough'];
    const m = fridgeMatches(have);
    expect(m[0].recipe.id).toBe('cilbir');
    expect(m[0].missing).toEqual([]);
    expect(m.every((x) => x.missing.length <= 3)).toBe(true);
    expect(m.flatMap((x) => x.missing).some((l) => ['salt', 'sunflower-oil', 'olive-oil', 'water'].includes(l.ing))).toBe(false);
  });
  it('a missing ingredient you can swap from what you have is covered, not missing', () => {
    // Cilbir without Greek yoghurt: plain yoghurt stands in.
    const m = fridgeMatches(['eggs', 'plain-yoghurt', 'butter', 'chilli-flakes', 'smoked-paprika', 'garlic', 'sourdough']);
    const c = m.find((x) => x.recipe.id === 'cilbir')!;
    expect(c.missing).toEqual([]);
    expect(c.covered.map((x) => x.line.ing)).toEqual(['greek-yoghurt']);
  });
  it('a limited swap (yoghurt for egg) never makes a recipe count as makeable', () => {
    const m = fridgeMatches(['greek-yoghurt', 'butter', 'chilli-flakes', 'smoked-paprika', 'garlic', 'sourdough'], [], 0);
    expect(m.some((x) => x.recipe.id === 'cilbir')).toBe(false);
  });
  it('hidden recipes stay hidden', () => {
    const have = ['eggs', 'greek-yoghurt', 'butter', 'chilli-flakes', 'smoked-paprika', 'garlic', 'sourdough'];
    expect(fridgeMatches(have, ['cilbir']).some((x) => x.recipe.id === 'cilbir')).toBe(false);
  });
});

describe('something different', () => {
  it('understands everyday names', () => {
    expect(findFamiliar('spag bol')?.id).toBe('bolognese');
    expect(findFamiliar('Bolognaise')?.id).toBe('bolognese');
    expect(findFamiliar('shepherds pie')?.id).toBe('cottage-pie');
    expect(findFamiliar('roast chicken and potatoes')?.id).toBe('roast-chicken');
    expect(findFamiliar('braai')?.id).toBe('braai');
    expect(findFamiliar('xy')).toBeUndefined();
  });
  it('hand-picked changes come first and the familiar dish itself is not offered', () => {
    const { familiar, results } = somethingDifferent('spaghetti bolognese');
    expect(familiar?.id).toBe('bolognese');
    expect(results.length).toBeGreaterThan(5);
    expect(results.slice(0, 5).every((r) => r.recipe.twistOf.includes('bolognese'))).toBe(true);
  });
  it('every familiar dish gets at least 3 ideas', () => {
    const thin = FAMILIAR.filter((f) => somethingDifferent(f.name).results.length < 3).map((f) => f.id);
    expect(thin).toEqual([]);
  });
  it('falls back to ingredients in the text', () => {
    expect(ingredientsInText('something with leeks and chickpeas')).toEqual(expect.arrayContaining(['leek', 'chickpeas']));
    const { familiar, results } = somethingDifferent('chickpeas');
    expect(familiar).toBeUndefined();
    expect(results.length).toBeGreaterThan(3);
  });
});

describe('discover', () => {
  it('filters by time, effort, vegetarian and text', () => {
    expect(discover({ maxMinutes: 30 }).every((r) => r.minutes <= 30)).toBe(true);
    expect(discover({ effort: 3 }).every((r) => r.effort === 3)).toBe(true);
    expect(discover({ vegetarian: true }).every((r) => r.tags.includes('vegetarian'))).toBe(true);
    expect(discover({ text: 'aubergine' }).map((r) => r.id)).toContain('pasta-norma');
  });
  it('surprise never picks a hidden one or a side dish', () => {
    for (let i = 0; i < 50; i++) {
      const r = surprise(['cilbir'], () => i / 50)!;
      expect(r.id).not.toBe('cilbir');
      expect(r.course).not.toBe('side');
    }
  });
});

describe('free rein', () => {
  it('lists every recipe that fits the filters, each with what to buy given the stock', () => {
    const all = freeRein({}, []);
    expect(all.length).toBe(150);
    const quick = freeRein({ maxMinutes: 30 }, ['eggs', 'greek-yoghurt', 'butter', 'chilli-flakes', 'smoked-paprika', 'garlic', 'sourdough']);
    expect(quick.every((m) => m.recipe.minutes <= 30)).toBe(true);
    expect(quick.find((m) => m.recipe.id === 'cilbir')!.missing).toEqual([]);
    expect(quick.find((m) => m.recipe.id === 'cacio-e-pepe')!.missing.map((l) => l.ing)).toEqual(['spaghetti', 'parmesan']);
  });
});
