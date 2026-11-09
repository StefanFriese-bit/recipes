import { FAMILIAR } from '../data/familiar';
import { INGREDIENTS } from '../data/ingredients';
import { RECIPES } from '../data/recipes';
import type { Familiar, Line, Recipe, Swap } from '../types';
/** veg = vegetarian dishes only; flex = vegetarian dishes that take meat cooked on the side for the meat-eaters. */
export type Diet = 'veg' | 'flex';
const fitsDiet = (r: Recipe, d?: Diet) => !d || (r.tags.includes('vegetarian') && (d === 'veg' || !!r.meatSide));
import { swapsFor } from './lines';

const isStaple = (ing: string) => INGREDIENTS[ing]?.staple ?? false;
/** The lines you actually have to have: not optional, not salt/pepper/oil/water. */
export const neededLines = (r: Recipe, withMeat = false): Line[] => {
  const seen = new Set<string>();
  return [...r.lines, ...(withMeat && r.meatSide ? r.meatSide.lines : [])].filter((l) => !l.optional && !isStaple(l.ing) && !seen.has(l.ing) && (seen.add(l.ing), true));
};

export interface FridgeMatch {
  recipe: Recipe;
  used: string[]; // stock items the recipe uses
  covered: { line: Line; swap: Swap }[]; // missing, but a swap from what you have works
  missing: Line[];
}

/** What a recipe needs that you have, can swap from what you have, or would have to buy. */
export function analyse(recipe: Recipe, got: Set<string>, withMeat = false): Omit<FridgeMatch, 'recipe'> {
  const ok = (ing: string) => got.has(ing) || isStaple(ing);
  const used: string[] = [];
  const covered: FridgeMatch['covered'] = [];
  const missing: Line[] = [];
  for (const line of neededLines(recipe, withMeat)) {
    if (got.has(line.ing)) { used.push(line.ing); continue; }
    const swap = swapsFor(line.ing).find((s) => !s.limited && s.parts.every((p) => ok(p.ing)));
    if (swap) covered.push({ line, swap });
    else missing.push(line);
  }
  return { used, covered, missing };
}

/** Recipes you can (nearly) make from what you have. Sorted: fewest missing, then most of your things used. */
export function fridgeMatches(have: Iterable<string>, hidden: Iterable<string> = [], maxMissing = 3, diet?: Diet): FridgeMatch[] {
  const got = new Set(have);
  const hide = new Set(hidden);
  if (got.size === 0) return [];
  const out: FridgeMatch[] = [];
  for (const recipe of RECIPES) {
    if (hide.has(recipe.id) || !fitsDiet(recipe, diet)) continue;
    const a = analyse(recipe, got, diet === 'flex');
    if (a.used.length === 0 || a.missing.length > maxMissing) continue;
    out.push({ recipe, ...a });
  }
  return out.sort((a, b) => a.missing.length - b.missing.length || b.used.length - a.used.length || a.covered.length - b.covered.length
    || a.recipe.title.localeCompare(b.recipe.title));
}

/** Free rein: every recipe that fits the filters, whatever is in stock, each with what you would have to buy. */
export function freeRein(f: Filters, have: Iterable<string>, hidden: Iterable<string> = []): FridgeMatch[] {
  const got = new Set(have);
  return discover(f, hidden).map((recipe) => ({ recipe, ...analyse(recipe, got, dietOf(f) === 'flex') }));
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** The familiar dish a typed text means ("spag bol" -> Spaghetti bolognese), or undefined. */
export function findFamiliar(text: string): Familiar | undefined {
  const q = norm(text);
  if (q.length < 3) return undefined;
  let best: { f: Familiar; score: number } | undefined;
  for (const f of FAMILIAR) {
    for (const name of [f.name, ...f.aliases]) {
      const n = norm(name);
      let score = 0;
      if (n === q) score = 100;
      else if (n.includes(q) || q.includes(n)) score = 50 + Math.min(n.length, q.length);
      else {
        const qw = q.split(' ').filter((w) => w.length > 2);
        const hits = qw.filter((w) => n.split(' ').some((nw) => nw.startsWith(w) || w.startsWith(nw))).length;
        if (hits) score = (hits / qw.length) * 40;
      }
      if (score > (best?.score ?? 20)) best = { f, score };
    }
  }
  return best?.f;
}

/** Ingredients named in free text ("chicken and leeks" -> chicken-*, leek). */
export function ingredientsInText(text: string): string[] {
  const q = ` ${norm(text)} `;
  const found: string[] = [];
  for (const i of Object.values(INGREDIENTS)) {
    if (i.staple) continue;
    const names = [i.name, i.plural, i.id.replace(/-/g, ' ')].map(norm);
    const first = norm(i.name.split(' (')[0]);
    if (names.some((n) => n.length > 2 && q.includes(` ${n} `)) || (first.length > 3 && q.includes(` ${first}`))) found.push(i.id);
  }
  // "chicken" alone means any chicken cut, "beef" any beef etc.
  for (const word of ['chicken', 'beef', 'lamb', 'pork', 'fish', 'salmon', 'prawn']) {
    if (q.includes(` ${word}`)) for (const i of Object.values(INGREDIENTS)) if (norm(i.name).includes(word) && !found.includes(i.id)) found.push(i.id);
  }
  return found;
}

export interface Twist { recipe: Recipe; why: string; score: number }

/** New dishes as a change from a familiar one: hand-picked first, then those sharing its main ingredients. */
export function somethingDifferent(text: string, hidden: Iterable<string> = []): { familiar?: Familiar; results: Twist[] } {
  const hide = new Set(hidden);
  const familiar = findFamiliar(text);
  const key = familiar ? familiar.key : ingredientsInText(text);
  if (!familiar && key.length === 0) return { results: [] };
  const results: Twist[] = [];
  for (const recipe of RECIPES) {
    if (hide.has(recipe.id)) continue;
    const ings = new Set(recipe.lines.map((l) => l.ing));
    const shared = key.filter((k) => ings.has(k));
    let score = shared.length * 3;
    let why = '';
    if (familiar && recipe.twistOf.includes(familiar.id)) { score += 10; why = `A change from ${familiar.name.toLowerCase()}`; }
    if (familiar && recipe.cuisine !== familiar.cuisine) score += 1;
    if (!why && shared.length) why = `Uses ${shared.map((s) => INGREDIENTS[s].name).join(', ')}`;
    if (score >= (familiar ? 6 : 3)) results.push({ recipe, why, score });
  }
  results.sort((a, b) => b.score - a.score || a.recipe.minutes - b.recipe.minutes);
  return { familiar, results };
}

/** `vegetarian: true` is how the first version stored "Vegetarian"; it reads as diet 'veg'. */
export interface Filters { cuisine?: string; maxMinutes?: number; effort?: 1 | 3; course?: string; diet?: Diet; vegetarian?: boolean; text?: string }
export const dietOf = (f: Filters): Diet | undefined => f.diet ?? (f.vegetarian ? 'veg' : undefined);

export function discover(f: Filters, hidden: Iterable<string> = []): Recipe[] {
  const hide = new Set(hidden);
  const t = f.text ? norm(f.text) : '';
  return RECIPES.filter((r) => !hide.has(r.id)
    && (!f.cuisine || r.cuisine === f.cuisine)
    && (!f.maxMinutes || r.minutes <= f.maxMinutes)
    && (!f.effort || (f.effort === 1 ? r.effort === 1 : r.effort === 3))
    && (!f.course || r.course === f.course)
    && fitsDiet(r, dietOf(f))
    && (!t || norm(`${r.title} ${r.cuisine} ${r.blurb} ${r.lines.map((l) => INGREDIENTS[l.ing].name).join(' ')}`).includes(t)));
}

export const CUISINES = [...new Set(RECIPES.map((r) => r.cuisine))].sort();

export function surprise(hidden: Iterable<string>, rand = Math.random): Recipe | undefined {
  const pool = discover({}, hidden).filter((r) => r.course !== 'side');
  return pool[Math.floor(rand() * pool.length)];
}
