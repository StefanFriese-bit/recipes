import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../src/data/ingredients';
import { MEAT_SIDES } from '../src/data/meat-sides';
import { RECIPES, recipeById } from '../src/data/recipes';
import { lineText } from '../src/lib/lines';
import { discover, freeRein, fridgeMatches } from '../src/lib/match';
import { shoppingList } from '../src/lib/shopping';
import { emptyState, parseState } from '../src/lib/store';
import { scaleLine } from '../src/lib/units';

describe('meat on the side (data)', () => {
  it('sits only on vegetarian dishes that exist, and is real meat or fish with known ingredients', () => {
    for (const [id, side] of Object.entries(MEAT_SIDES)) {
      const r = recipeById(id);
      expect(r, id).toBeDefined();
      expect(r!.tags, id).toContain('vegetarian');
      expect(r!.meatSide).toBe(side);
      for (const l of side.lines) expect(INGREDIENTS[l.ing], `${id}: ${l.ing}`).toBeDefined();
      expect(side.lines.some((l) => ['meat', 'fish'].includes(INGREDIENTS[l.ing].aisle)), id).toBe(true);
      expect(side.steps.length, id).toBeGreaterThan(0);
    }
    expect(Object.keys(MEAT_SIDES).length).toBeGreaterThanOrEqual(30);
    expect(RECIPES.filter((r) => r.meatSide && !r.tags.includes('vegetarian'))).toEqual([]);
  });
  it('amounts are per meat-eater and scale with how many there are', () => {
    const side = recipeById('mushroom-stroganoff')!.meatSide!;
    expect(lineText(scaleLine(side.lines[0], 2))).toBe('300 g beef steak (rump or sirloin)');
  });
});

describe('meat on the side (finding and planning)', () => {
  it('Vegetarian shows vegetarian dishes; Veg + meat on the side only those that take a meat side', () => {
    const veg = discover({ diet: 'veg' });
    const flex = discover({ diet: 'flex' });
    expect(veg.every((r) => r.tags.includes('vegetarian'))).toBe(true);
    expect(flex.every((r) => r.tags.includes('vegetarian') && r.meatSide)).toBe(true);
    expect(flex.length).toBe(Object.keys(MEAT_SIDES).length);
    expect(veg.length).toBeGreaterThan(flex.length);
    // the first version stored the Vegetarian chip as vegetarian: true
    expect(discover({ vegetarian: true }).length).toBe(veg.length);
  });
  it('with meat on the side, the meat counts as something to buy', () => {
    const plain = freeRein({ diet: 'veg', text: 'stroganoff' }, [])[0];
    const flex = freeRein({ diet: 'flex', text: 'stroganoff' }, [])[0];
    expect(plain.missing.some((l) => l.ing === 'beef-steak')).toBe(false);
    expect(flex.missing.some((l) => l.ing === 'beef-steak')).toBe(true);
    const fromStock = fridgeMatches(['mushrooms', 'onion', 'garlic', 'sour-cream', 'paprika', 'rice', 'butter', 'parsley', 'dijon'], [], 3, 'flex');
    expect(fromStock.every((m) => m.recipe.meatSide)).toBe(true);
  });
  it('a planned dish puts the meat on the shopping list for the planned meat-eaters only', () => {
    const none = shoppingList([{ id: 'mushroom-stroganoff', date: null, serves: 5 }], []);
    expect(none.some((i) => i.ing === 'beef-steak')).toBe(false);
    const two = shoppingList([{ id: 'mushroom-stroganoff', date: null, serves: 5, meat: 2 }], []);
    expect(two.find((i) => i.ing === 'beef-steak')!.text).toBe('300 g beef steak (rump or sirloin)');
  });
  it('the number of meat-eaters and a plan\'s meat survive a backup; 2 meat-eaters to start', () => {
    expect(emptyState().meatEaters).toBe(2);
    const s = parseState(JSON.stringify({ ...emptyState(), meatEaters: 3, plans: [{ id: 'pasta-e-ceci', date: null, serves: 5, meat: 2 }] }));
    expect(s.meatEaters).toBe(3);
    expect(s.plans).toEqual([{ id: 'pasta-e-ceci', date: null, serves: 5, meat: 2 }]);
    expect(parseState(JSON.stringify({ v: 2 })).meatEaters).toBe(2);
  });
});
