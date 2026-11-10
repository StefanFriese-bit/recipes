import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../src/data/ingredients';
import { LIBRARY_COUNT, RECIPES, recipeById } from '../src/data/recipes';
import { ALIAS_TARGETS, matchIngredient, parseIngredientLine, parseRecipeText } from '../src/lib/import-parse';
import { lineText } from '../src/lib/lines';
import { fridgeMatches } from '../src/lib/match';
import { shoppingList } from '../src/lib/shopping';
import { addOwnStock, deleteImported, emptyState, getState, parseState, replaceState, saveImported, toggleFavourite } from '../src/lib/store';
import type { ImportedRecipe } from '../src/types';

// What the phone's reader gives back for a Facebook screenshot: the post, plus the screen around it.
const FACEBOOK = `9:41
Tasty Home Cooking · Follow
2d ·
Creamy Garlic Butter Chicken 🍗
This is the easiest weeknight dinner, my family loves it!
Serves 4 | Prep 10 min | Cook 25 min
Ingredients:
• 4 chicken breasts
• 2 tbsp olive oil
• 3 tbsp butter
• 6 garlic cloves, minced
• 1 cup heavy cream
• ½ cup grated parmesan
• 1 tsp dried oregano
• Salt and pepper to taste
• Fresh parsley, chopped
Instructions:
1. Season the chicken with salt and pepper. Heat the oil in a large
pan over medium heat and cook the chicken 6-7 minutes per side.
2. Remove the chicken, melt the butter and add the garlic.
3. Pour in the cream and parmesan, simmer 3 minutes, return the
chicken and sprinkle with parsley.
1.2K Likes   340 Comments
Like
Comment
Share`;

const PASTED_NO_HEADINGS = `Quick Peanut Noodles
200g egg noodles
3 tbsp peanut butter
2 tbsp soy sauce
1 tbsp honey
1 lime, juiced
2 spring onions, sliced

Cook the noodles. Mix the peanut butter, soy, honey and lime with 3 tbsp hot water.
Toss everything together and top with spring onions.`;

// A cookbook page: the method as one paragraph that wraps, a "For the sauce:" heading, a line that runs over.
const COOKBOOK = `Harissa lamb meatballs
MAKES 20 · TOTAL 45 MINS
What you need
500g lamb mince
1 onion, grated
2 tsp harissa paste
For the sauce:
1 x 400g tin chopped tomatoes
2 tablespoons olive oil, plus extra
for frying
Method
Mix the lamb, onion and harissa with a good pinch of salt and roll into
20 small balls. Fry in batches until browned all over, then add the
tomatoes and simmer for 15 minutes until cooked through.`;

describe('reading a whole recipe', () => {
  it('a Facebook screenshot: drops the screen furniture, finds name, serves, time, ingredients and numbered steps', () => {
    const d = parseRecipeText(FACEBOOK);
    expect(d.title).toBe('Creamy Garlic Butter Chicken');
    expect(d.serves).toBe(4);
    expect(d.minutes).toBe(35);
    expect(d.notes).toBe('This is the easiest weeknight dinner, my family loves it!');
    expect(d.ingredients).toEqual(['4 chicken breasts', '2 tbsp olive oil', '3 tbsp butter', '6 garlic cloves, minced', '1 cup heavy cream',
      '½ cup grated parmesan', '1 tsp dried oregano', 'Salt and pepper to taste', 'Fresh parsley, chopped']);
    expect(d.steps).toEqual([
      'Season the chicken with salt and pepper. Heat the oil in a large pan over medium heat and cook the chicken 6-7 minutes per side.',
      'Remove the chicken, melt the butter and add the garlic.',
      'Pour in the cream and parmesan, simmer 3 minutes, return the chicken and sprinkle with parsley.',
    ]);
  });
  it('pasted text without headings: amounts are ingredients, sentences are steps', () => {
    const d = parseRecipeText(PASTED_NO_HEADINGS);
    expect(d.title).toBe('Quick Peanut Noodles');
    expect(d.serves).toBe(4); // not given: the app's usual
    expect(d.ingredients).toHaveLength(6);
    expect(d.steps).toEqual(['Cook the noodles. Mix the peanut butter, soy, honey and lime with 3 tbsp hot water.', 'Toss everything together and top with spring onions.']);
  });
  it('a cookbook page: "What you need", a section heading, a wrapped ingredient, a paragraph method', () => {
    const d = parseRecipeText(COOKBOOK);
    expect(d.title).toBe('Harissa lamb meatballs');
    expect(d.serves).toBe(20);
    expect(d.minutes).toBe(45);
    expect(d.ingredients).toEqual(['500g lamb mince', '1 onion, grated', '2 tsp harissa paste', '1 x 400g tin chopped tomatoes', '2 tablespoons olive oil, plus extra for frying']);
    expect(d.steps.join(' ')).toContain('roll into 20 small balls');
    expect(d.steps.length).toBeGreaterThanOrEqual(1);
  });
  it('never fails on rubbish: gives an empty draft to fill in', () => {
    const d = parseRecipeText('Like\nShare\n12:01\n');
    expect(d.title).toBe('Imported recipe');
    expect(d.ingredients).toEqual([]);
    expect(d.steps).toEqual([]);
  });
});

describe('reading one ingredient line', () => {
  const p = (t: string) => parseIngredientLine(t).line;
  it('amounts, units and the ingredient it is', () => {
    expect(p('4 chicken breasts')).toMatchObject({ ing: 'chicken-breast', qty: 4, unit: 'pc' });
    expect(p('200g egg noodles')).toMatchObject({ ing: 'egg-noodles', qty: 200, unit: 'g', label: 'egg noodles' });
    expect(p('1 ½ cups plain flour')).toMatchObject({ ing: 'plain-flour', qty: 1.5, unit: 'cup' });
    expect(p('1½ cups flour')).toMatchObject({ ing: 'plain-flour', qty: 1.5, unit: 'cup' });
    expect(p('1/2 tsp cumin')).toMatchObject({ qty: 0.5, unit: 'tsp' });
    expect(p('2-3 tbsp oil')).toMatchObject({ ing: 'sunflower-oil', qty: 2, unit: 'tbsp' });
    expect(p('8 oz cheddar')).toMatchObject({ ing: 'cheddar', unit: 'g' });
    expect(p('8 oz cheddar').qty).toBeCloseTo(226.8);
    expect(p('a pinch of salt')).toMatchObject({ ing: 'salt', qty: 1, unit: 'pinch', label: 'salt' });
    expect(p('Two red onions')).toMatchObject({ ing: 'red-onion', qty: 2, unit: 'pc' });
    expect(p('6 garlic cloves, minced')).toMatchObject({ ing: 'garlic', qty: 6, unit: 'clove' });
    expect(p('1 x 400g tin chopped tomatoes')).toMatchObject({ ing: 'chopped-tomatoes', qty: 1 });
    expect(p('Salt and pepper to taste')).toMatchObject({ unit: 'taste', qty: 0 });
    expect(p('Fresh parsley, chopped')).toMatchObject({ ing: 'parsley', unit: 'taste' });
    expect(p('2 tbsp butter (optional)').optional).toBe(true);
  });
  it('the longest name wins: red onion is not onion, cream cheese is not cream', () => {
    expect(matchIngredient('2 large red onions')).toBe('red-onion');
    expect(matchIngredient('250 g cream cheese, soft')).toBe('cream-cheese');
  });
  it('something the app does not know keeps its own name (same id as an own item on the stock list)', () => {
    const r = parseIngredientLine('2 tsp liquid smoke');
    expect(r.known).toBe(false);
    expect(r.line.ing).toBe('own:liquid smoke');
    expect(parseIngredientLine('1 packet cream crackers, crushed').line.ing).toBe('own:cream crackers');
  });
  it('shows in its own words with the amount scaled', () => {
    expect(lineText(p('6 garlic cloves, minced'))).toBe('6 garlic cloves, minced');
    expect(lineText({ ...p('2 large red onions, chopped'), qty: 3 })).toBe('3 large red onions, chopped');
    expect(lineText({ ...p('1 cup heavy cream'), qty: 1.5 })).toBe('1½ cups heavy cream');
    expect(lineText(p('Salt and pepper to taste'))).toBe('Salt and pepper to taste');
  });
  it('every alias points at an ingredient the app has', () => {
    for (const id of ALIAS_TARGETS) expect(INGREDIENTS[id], id).toBeDefined();
  });
});

describe('an imported recipe in the app', () => {
  const imp: ImportedRecipe = {
    id: 'imp-test1', title: 'Harissa lamb meatballs', serves: 4, ingredients: ['500g lamb mince', '1 onion, grated', '2 tsp liquid smoke', 'Salt'],
    steps: ['Mix and roll.', 'Fry.'], added: '2026-11-10',
  };
  it('joins the recipe list, is a favourite like any other, and goes again when deleted', () => {
    replaceState(emptyState());
    saveImported(imp);
    expect(RECIPES.length).toBe(LIBRARY_COUNT + 1);
    const r = recipeById('imp-test1')!;
    expect(r.tags).toContain('imported');
    expect(r.lines.map((l) => l.ing)).toEqual(['lamb-mince', 'onion', 'own:liquid smoke', 'salt']);
    toggleFavourite('imp-test1');
    expect(getState().favourites).toEqual(['imp-test1']);
    deleteImported('imp-test1');
    expect(recipeById('imp-test1')).toBeUndefined();
    expect(RECIPES.length).toBe(LIBRARY_COUNT);
    expect(getState().favourites).toEqual([]);
  });
  it('scales on the shopping list, with the new ingredient under Other', () => {
    replaceState(emptyState());
    saveImported(imp);
    const list = shoppingList([{ id: 'imp-test1', date: null, serves: 8 }], []);
    expect(list.find((i) => i.ing === 'lamb-mince')!.text).toBe('1 kg lamb mince');
    const own = list.find((i) => i.ing === 'own:liquid smoke')!;
    expect(own.aisle).toBe('other');
    expect(own.text).toBe('1⅓ tbsp liquid smoke');
    expect(list.some((i) => i.ing === 'salt')).toBe(false);
  });
  it('counts against the stock list, own items included', () => {
    replaceState(emptyState());
    saveImported(imp);
    addOwnStock('Liquid smoke', 'pantry');
    addOwnStock('onion', 'pantry');
    const before = fridgeMatches(['onion', 'own:liquid smoke'], [], 3).find((m) => m.recipe.id === 'imp-test1')!;
    expect(before.missing.map((l) => l.ing)).toEqual(['lamb-mince']);
    expect(fridgeMatches(['lamb-mince', ...getState().stock.map((x) => x.ing)], [], 0).some((m) => m.recipe.id === 'imp-test1')).toBe(true);
  });
  it('opens at its own amount until you change it', async () => {
    const { servesFor, setServes } = await import('../src/lib/store');
    replaceState(emptyState());
    saveImported({ ...imp, serves: 12 });
    expect(servesFor(getState(), 'imp-test1')).toBe(12);
    setServes('imp-test1', 6);
    expect(servesFor(getState(), 'imp-test1')).toBe(6);
    expect(servesFor(getState(), 'pho')).toBe(4);
  });
  it('survives the backup file; a broken entry is dropped', () => {
    const s = { ...emptyState(), imported: [imp, { id: 'imp-x' }, { id: 'nope', title: 'x' }] };
    const back = parseState(JSON.stringify(s));
    expect(back.imported).toEqual([imp]);
    // an old backup without imports still reads
    expect(parseState(JSON.stringify({ ...emptyState(), imported: undefined })).imported).toEqual([]);
  });
});
