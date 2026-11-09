export type Aisle = 'veg' | 'meat' | 'fish' | 'dairy' | 'bakery' | 'pantry' | 'spice' | 'world' | 'frozen';

export interface Ingredient {
  id: string;
  name: string;
  plural: string;
  aisle: Aisle;
  /** Assumed to be in every kitchen (salt, pepper, oil, water): never "missing", never on the shopping list. */
  staple: boolean;
}

export type Unit =
  | 'g' | 'kg' | 'ml' | 'l' | 'tsp' | 'tbsp'
  | 'pc' | 'clove' | 'tin' | 'bunch' | 'handful' | 'pinch' | 'slice' | 'sprig' | 'sheet' | 'stalk' | 'cm' | 'taste';

export interface Line {
  ing: string;
  qty: number; // 0 for "to taste"
  unit: Unit;
  note?: string;
  optional?: boolean;
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
}

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
}

export interface Familiar {
  id: string;
  name: string;
  aliases: string[];
  cuisine: string;
  key: string[];
}
