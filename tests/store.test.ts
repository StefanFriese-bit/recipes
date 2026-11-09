import { describe, expect, it } from 'vitest';
import { shoppingList } from '../src/lib/shopping';
import { addDays, emptyState, inStock, parseState } from '../src/lib/store';

describe('backup file', () => {
  it('round-trips and drops what it does not understand', () => {
    const s = { ...emptyState(), favourites: ['pho', 3], plans: [{ id: 'pho', date: '2026-11-10', serves: 4 }, { id: 'x', serves: 0, date: null }], junk: 1 };
    const back = parseState(JSON.stringify(s));
    expect(back.favourites).toEqual(['pho']);
    expect(back.plans).toEqual([{ id: 'pho', date: '2026-11-10', serves: 4 }]);
    expect((back as any).junk).toBeUndefined();
  });
  it('refuses a file that is not ours', () => {
    expect(() => parseState('{"hello":1}')).toThrow(/not a recipe app backup/);
    expect(() => parseState('not json')).toThrow();
  });
  it('adds days across a month end', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });
});

describe('shopping list', () => {
  it('adds the same ingredient across recipes, scales to servings, leaves out staples and optional things', () => {
    const list = shoppingList([{ id: 'shakshuka', date: null, serves: 4 }, { id: 'cilbir', date: null, serves: 2 }], ['feta']);
    const eggs = list.find((i) => i.ing === 'eggs')!;
    expect(eggs.text).toBe('12 eggs'); // 8 + half of 8
    expect(eggs.forRecipes.length).toBe(2);
    expect(list.some((i) => i.ing === 'salt' || i.ing === 'olive-oil')).toBe(false);
    expect(list.some((i) => i.ing === 'feta')).toBe(false); // optional in shakshuka, not in cilbir
    const yog = list.find((i) => i.ing === 'greek-yoghurt')!;
    expect(yog.text).toBe('200 g Greek yoghurt');
  });
  it('starts with fruit and veg and rounds whole things up', () => {
    const list = shoppingList([{ id: 'shakshuka', date: null, serves: 4 }, { id: 'cilbir', date: null, serves: 2 }], []);
    expect(list[0].aisle).toBe('veg');
    expect(list.find((i) => i.ing === 'garlic')!.text).toBe('4 cloves garlic'); // 3 + half of 1
  });
  it('marks what you said is in the fridge', () => {
    const list = shoppingList([{ id: 'shakshuka', date: null, serves: 4 }], ['eggs']);
    expect(list.find((i) => i.ing === 'eggs')!.inFridge).toBe(true);
    expect(list.find((i) => i.ing === 'onion')!.inFridge).toBe(false);
  });
});

describe('stock list', () => {
  it('an old backup with a fridge list becomes the stock list, each item in its usual place', () => {
    const old = { v: 1, fridge: ['eggs', 'onion', 'peas', 'rice'], favourites: [], hidden: [], cooked: [], plans: [], shopping: { checked: [] }, serves: {}, defaultServes: 4 };
    const s = parseState(JSON.stringify(old));
    expect(s.v).toBe(2);
    expect(s.stock).toEqual([
      { ing: 'eggs', place: 'fridge' }, { ing: 'onion', place: 'pantry' }, { ing: 'peas', place: 'freezer' }, { ing: 'rice', place: 'pantry' },
    ]);
  });
  it('an item marked out stays on the list but does not count as in stock', () => {
    const s = parseState(JSON.stringify({ ...emptyState(), stock: [{ ing: 'eggs', place: 'fridge', out: true }, { ing: 'milk', place: 'fridge' }, { ing: 'x', place: 'garage' }] }));
    expect(s.stock.length).toBe(2);
    expect(inStock(s)).toEqual(['milk']);
  });
});
