import { INGREDIENTS } from '../data/ingredients';
import { recipeById } from '../data/recipes';
import type { Aisle, Unit } from '../types';
import { formatAmount, family, toBase } from './units';
import { nameFor } from './lines';
import type { Plan } from './store';

const ORDER: Aisle[] = ['veg', 'meat', 'fish', 'dairy', 'bakery', 'frozen', 'pantry', 'world', 'spice'];
// Whole things are bought whole: 3½ cloves of garlic means buying 4.
const WHOLE = new Set<Unit>(['pc', 'clove', 'tin', 'bunch', 'slice', 'sprig', 'sheet', 'stalk']);

export interface ShopItem { key: string; ing: string; aisle: Aisle; text: string; forRecipes: string[]; inFridge: boolean }

/** One line per ingredient (per kind of amount) across every planned recipe, scaled to the planned servings. */
export function shoppingList(plans: Plan[], fridge: string[]): ShopItem[] {
  const got = new Set(fridge);
  const acc = new Map<string, { ing: string; unit: Unit; qty: number; taste: boolean; recipes: Set<string> }>();
  for (const p of plans) {
    const r = recipeById(p.id);
    if (!r) continue;
    const f = p.serves / r.serves;
    for (const l of r.lines) {
      const i = INGREDIENTS[l.ing];
      if (!i || i.staple || l.optional) continue;
      const fam = l.unit === 'taste' ? 'taste' : family(l.unit);
      const unitKey = fam === 'count' ? l.unit : fam; // count units only add up with the same unit
      const key = `${l.ing}|${unitKey}`;
      const base: Unit = fam === 'mass' ? 'g' : fam === 'volume' ? 'ml' : l.unit;
      const qty = fam === 'mass' || fam === 'volume' ? toBase(l.qty * f, l.unit) : l.qty * f;
      const a = acc.get(key) ?? { ing: l.ing, unit: base, qty: 0, taste: fam === 'taste', recipes: new Set<string>() };
      a.qty += qty;
      a.recipes.add(r.title);
      acc.set(key, a);
    }
  }
  const items: ShopItem[] = [];
  for (const [key, a] of acc) {
    const i = INGREDIENTS[a.ing];
    let text: string;
    if (a.taste) text = i.name;
    else if (a.unit === 'ml' && a.qty < 45) text = `${formatAmount(a.qty / 5, 'tsp')} ${nameFor(a.ing, a.qty, 'tsp')}`;
    else {
      const q = WHOLE.has(a.unit) ? Math.ceil(a.qty - 1e-9) : a.qty;
      text = `${formatAmount(q, a.unit)} ${nameFor(a.ing, q, a.unit)}`;
    }
    items.push({ key, ing: a.ing, aisle: i.aisle, text: text.trim(), forRecipes: [...a.recipes], inFridge: got.has(a.ing) });
  }
  return items.sort((x, y) => ORDER.indexOf(x.aisle) - ORDER.indexOf(y.aisle) || INGREDIENTS[x.ing].name.localeCompare(INGREDIENTS[y.ing].name));
}
