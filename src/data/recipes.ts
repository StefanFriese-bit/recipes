import type { Recipe } from '../types';
import { MEAT_SIDES } from './meat-sides';
import { RECIPES_1 } from './recipes-1';
import { RECIPES_2 } from './recipes-2';
import { RECIPES_3 } from './recipes-3';
import { RECIPES_4 } from './recipes-4';
import { RECIPES_5 } from './recipes-5';
import { RECIPES_6 } from './recipes-6';

const LIBRARY: Recipe[] = [...RECIPES_1, ...RECIPES_2, ...RECIPES_3, ...RECIPES_4, ...RECIPES_5, ...RECIPES_6]
  .map((r) => (MEAT_SIDES[r.id] ? { ...r, meatSide: MEAT_SIDES[r.id] } : r));
/** Every recipe: the library written for the app, then your imported ones (added by src/lib/imported.ts). */
export const RECIPES: Recipe[] = [...LIBRARY];
export const LIBRARY_COUNT = LIBRARY.length;
export function setImportedRecipes(list: Recipe[]) {
  RECIPES.length = LIBRARY_COUNT;
  RECIPES.push(...list);
}
export const isImported = (r: Recipe) => r.id.startsWith('imp-');
export const recipeById = (id: string) => RECIPES.find((x) => x.id === id);
