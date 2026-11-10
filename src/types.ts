export type Aisle = 'veg' | 'meat' | 'fish' | 'dairy' | 'bakery' | 'pantry' | 'spice' | 'world' | 'frozen' | 'other';

export interface Ingredient {
  id: string;
  name: string;
  plural: string;
  aisle: Aisle;
  /** Assumed to be in every kitchen (salt, pepper, oil, water): never "missing", never on the shopping list. */
  staple: boolean;
}

export type Unit =
  | 'g' | 'kg' | 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup'
  | 'pc' | 'clove' | 'tin' | 'bunch' | 'handful' | 'pinch' | 'slice' | 'sprig' | 'sheet' | 'stalk' | 'cm' | 'taste';

export interface Line {
  ing: string;
  qty: number; // 0 for "to taste"
  unit: Unit;
  note?: string;
  optional?: boolean;
  /** Imported recipes: the line's own words after the amount ("red onions, finely chopped"), shown instead of the ingredient name. */
  label?: string;
}

export type Effort = 1 | 2 | 3; // 1 easy, 2 a bit of work, 3 weekend project
export type Course = 'main' | 'side' | 'starter' | 'dessert' | 'breakfast' | 'bake' | 'soup' | 'salad';

export interface Recipe {
  id: string;
  title: string;
  cuisine: string;
  minutes: number;
  effort: Effort;
  course: Course;
  serves: number;
  blurb: string;
  /** Familiar dishes (src/data/familiar.ts ids) this is a good change from. */
  twistOf: string[];
  tags: string[];
  lines: Line[];
  steps: string[];
  tip?: string;
  /** Vegetarian dish only: meat or fish cooked in its own pan for the meat-eaters (src/data/meat-sides.ts). */
  meatSide?: MeatSide;
}

/** Amounts are for ONE meat-eater. */
export interface MeatSide { name: string; lines: Line[]; steps: string[] }

export interface SwapPart {
  ing: string;
  /** Multiplier on the line's amount, after it is converted into `u` (or kept in the line's unit). */
  f: number;
  u?: Unit;
  /** Amount per piece when the recipe line is a count (cloves, bunches, pieces); defaults to f. */
  fc?: number;
}
export interface Swap {
  parts: SwapPart[];
  note: string;
  /** Only works in some dishes (egg for binding): shown on the recipe, never counted as "you can make it". */
  limited?: boolean;
}

export interface Familiar {
  id: string;
  name: string;
  aliases: string[];
  cuisine: string;
  key: string[];
}

/** A recipe read from a screenshot, a photo or pasted text. Kept in its own words; turned into a Recipe on load. */
export interface ImportedRecipe {
  id: string; // "imp-…"
  title: string;
  serves: number;
  minutes?: number;
  vegetarian?: boolean;
  /** One ingredient per line, as written ("2 large red onions, chopped"). */
  ingredients: string[];
  steps: string[];
  notes?: string;
  /** YYYY-MM-DD */
  added: string;
  /** How many pictures are kept with it on the phone. */
  photos?: number;
}
