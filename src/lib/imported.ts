import { setExtraIngredients } from '../data/ingredients';
import { setImportedRecipes } from '../data/recipes';
import type { ImportedRecipe, Ingredient, Recipe } from '../types';
import { ownIngredient, parseIngredientLine } from './import-parse';

/** An imported recipe as the rest of the app sees it: scaled, shopped for and matched to stock like any other. */
export function importedToRecipe(x: ImportedRecipe): { recipe: Recipe; extras: Ingredient[] } {
  const extras: Ingredient[] = [];
  const lines = x.ingredients.map((raw) => {
    const { line, known } = parseIngredientLine(raw);
    if (!known) extras.push(ownIngredient(line.ing, line.label ?? raw));
    return line;
  });
  const recipe: Recipe = {
    id: x.id, title: x.title, cuisine: 'Imported', minutes: x.minutes ?? 0, effort: 1, course: 'main', serves: x.serves,
    blurb: x.notes ?? '', twistOf: [], tags: ['imported', ...(x.vegetarian ? ['vegetarian'] : [])], lines, steps: x.steps,
  };
  return { recipe, extras };
}

let last: ImportedRecipe[] | null = null;
/** Puts the imports into the app's recipe list (called by the store whenever they change). */
export function syncImported(list: ImportedRecipe[]) {
  if (list === last) return;
  last = list;
  const extras = new Map<string, Ingredient>();
  const recipes = list.map((x) => {
    const r = importedToRecipe(x);
    for (const e of r.extras) if (!extras.has(e.id)) extras.set(e.id, e);
    return r.recipe;
  });
  setExtraIngredients([...extras.values()]);
  setImportedRecipes(recipes);
}
