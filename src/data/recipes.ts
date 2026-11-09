import type { Recipe } from '../types';
import { MEAT_SIDES } from './meat-sides';
import { RECIPES_1 } from './recipes-1';
import { RECIPES_2 } from './recipes-2';
import { RECIPES_3 } from './recipes-3';
import { RECIPES_4 } from './recipes-4';
import { RECIPES_5 } from './recipes-5';

export const RECIPES: Recipe[] = [...RECIPES_1, ...RECIPES_2, ...RECIPES_3, ...RECIPES_4, ...RECIPES_5]
  .map((r) => (MEAT_SIDES[r.id] ? { ...r, meatSide: MEAT_SIDES[r.id] } : r));
export const recipeById = (id: string) => RECIPES.find((x) => x.id === id);
