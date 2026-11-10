import { INGREDIENTS } from '../data/ingredients';
import type { ImportedRecipe } from '../types';
import { syncImported } from './imported';

// Everything the app remembers lives on the phone only (localStorage). A backup is one file the user saves to iCloud.
// date YYYY-MM-DD, null = "some day"; meat = meat-eaters to cook the meat-on-the-side for (vegetarian dishes that have one)
export interface Plan { id: string; date: string | null; serves: number; meat?: number }
export type Place = 'pantry' | 'fridge' | 'freezer';
/** Something the kitchen normally has. `out` = run out for now: stays on the list, not counted as there. */
export interface StockItem { ing: string; place: Place; out?: boolean; name?: string }
/** Something typed in that is not on the ingredient list. Its id starts with "own:"; recipes never use it. */
export const isOwn = (ing: string) => ing.startsWith('own:');
export interface State {
  v: 2;
  stock: StockItem[];
  favourites: string[];
  hidden: string[]; // "I know this one" / "not for me": kept out of suggestions
  cooked: { id: string; date: string }[];
  plans: Plan[];
  shopping: { checked: string[] };
  serves: Record<string, number>;
  defaultServes: number;
  /** How many at the table eat meat: the meat on the side of a vegetarian dish is cooked for them. */
  meatEaters: number;
  /** Recipes read from screenshots, photos or pasted text (their pictures are kept apart, in src/lib/photos.ts). */
  imported: ImportedRecipe[];
}

const KEY = 'recipes-state-v1';
export const emptyState = (): State => ({ v: 2, stock: [], favourites: [], hidden: [], cooked: [], plans: [], shopping: { checked: [] }, serves: {}, defaultServes: 4, meatEaters: 2, imported: [] });

/** Reads a stored or backed-up state, keeping only what it understands. Throws on something that is not ours. */
export function parseState(text: string): State {
  const raw = JSON.parse(text);
  if (!raw || (raw.v !== 1 && raw.v !== 2)) throw new Error('This is not a recipe app backup.');
  const base = emptyState();
  const arr = (x: unknown) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string') : []);
  return {
    v: 2,
    // Version 1 kept a plain "fridge" list: it becomes the stock list, each item in its usual place.
    stock: raw.v === 1
      ? arr(raw.fridge).map((ing) => ({ ing, place: defaultPlace(ing) }))
      : (Array.isArray(raw.stock) ? raw.stock : [])
        .filter((x: any) => x && typeof x.ing === 'string' && PLACES.includes(x.place)
          && (!isOwn(x.ing) || (typeof x.name === 'string' && x.name.trim() !== '')))
        .map((x: any): StockItem => ({
          ing: x.ing, place: x.place,
          ...(x.out ? { out: true } : {}),
          ...(isOwn(x.ing) ? { name: String(x.name).trim().slice(0, 60) } : {}),
        })),
    favourites: arr(raw.favourites),
    hidden: arr(raw.hidden),
    cooked: Array.isArray(raw.cooked) ? raw.cooked.filter((c: any) => c && typeof c.id === 'string' && typeof c.date === 'string') : [],
    plans: Array.isArray(raw.plans)
      ? raw.plans.filter((p: any) => p && typeof p.id === 'string' && (p.date === null || typeof p.date === 'string') && p.serves > 0)
        .map((p: any): Plan => ({ id: p.id, date: p.date, serves: p.serves, ...(typeof p.meat === 'number' && p.meat >= 0 ? { meat: p.meat } : {}) }))
      : [],
    shopping: { checked: arr(raw.shopping?.checked) },
    serves: raw.serves && typeof raw.serves === 'object' ? Object.fromEntries(Object.entries(raw.serves).filter(([, n]) => typeof n === 'number' && n > 0)) as Record<string, number> : {},
    defaultServes: typeof raw.defaultServes === 'number' && raw.defaultServes > 0 ? raw.defaultServes : base.defaultServes,
    meatEaters: typeof raw.meatEaters === 'number' && raw.meatEaters >= 0 ? raw.meatEaters : base.meatEaters,
    imported: Array.isArray(raw.imported) ? raw.imported.map(parseImported).filter((x: ImportedRecipe | null): x is ImportedRecipe => x !== null) : [],
  };
}

const strs = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : []);
function parseImported(x: any): ImportedRecipe | null {
  if (!x || typeof x.id !== 'string' || !x.id.startsWith('imp-') || typeof x.title !== 'string' || !x.title.trim()) return null;
  return {
    id: x.id, title: x.title.trim().slice(0, 120), serves: typeof x.serves === 'number' && x.serves > 0 ? x.serves : 4,
    ...(typeof x.minutes === 'number' && x.minutes > 0 ? { minutes: x.minutes } : {}),
    ...(x.vegetarian === true ? { vegetarian: true } : {}),
    ingredients: strs(x.ingredients), steps: strs(x.steps),
    ...(typeof x.notes === 'string' && x.notes.trim() ? { notes: x.notes.trim() } : {}),
    added: typeof x.added === 'string' ? x.added : today(),
    ...(typeof x.photos === 'number' && x.photos > 0 ? { photos: x.photos } : {}),
  };
}

export const PLACES: Place[] = ['pantry', 'fridge', 'freezer'];
// Kept out of the fridge even though they are fruit and veg.
const DRY_VEG = new Set(['onion', 'red-onion', 'shallot', 'garlic', 'potato', 'sweet-potato', 'butternut', 'pumpkin', 'banana']);
export function defaultPlace(ing: string): Place {
  const a = INGREDIENTS[ing]?.aisle;
  if (a === 'frozen') return 'freezer';
  if (a === 'veg') return DRY_VEG.has(ing) ? 'pantry' : 'fridge';
  if (a === 'dairy' || a === 'meat' || a === 'fish') return 'fridge';
  return 'pantry';
}

let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  let s: State;
  try {
    const t = globalThis.localStorage?.getItem(KEY);
    s = t ? parseState(t) : emptyState();
  } catch {
    s = emptyState();
  }
  syncImported(s.imported);
  return s;
}

export const getState = () => state;
export function setState(change: (s: State) => State) {
  state = change(state);
  syncImported(state.imported); // before anyone redraws, so imported recipes are already in the recipe list
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(state)); } catch { /* full or blocked: keeps working for this visit */ }
  for (const l of listeners) l();
}
export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function replaceState(s: State) { setState(() => s); }

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
/** The ingredient a typed name means, if the list has it ("Leeks", "leek", "Crème fraîche"). */
export function knownIngredient(typed: string): string | undefined {
  const t = norm(typed);
  if (!t) return undefined;
  const forms = new Set([t, t.replace(/es$/, ''), t.replace(/s$/, '')]);
  return Object.values(INGREDIENTS).find((i) => forms.has(norm(i.name)) || forms.has(norm(i.plural)))?.id;
}
/** The name to show for a stock item. */
export const stockName = (x: StockItem) => INGREDIENTS[x.ing]?.name ?? x.name ?? x.ing;
/** Back in stock: the same item without the "run out" mark. */
const back = (x: StockItem): StockItem => (x.name ? { ing: x.ing, place: x.place, name: x.name } : { ing: x.ing, place: x.place });
/**
 * Adds something typed in. If the list knows it, the real ingredient goes on (so recipes count it);
 * otherwise it goes on as your own item. Returns the id that is now on the list.
 */
export function addOwnStock(typed: string, place: Place): string | undefined {
  const name = typed.trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!name) return undefined;
  const known = knownIngredient(name);
  if (known) { addStock(known, place); moveStock(known, place); return known; }
  const ing = `own:${norm(name)}`;
  setState((s) => (onList(s, ing) ? { ...s, stock: s.stock.map((x) => (x.ing === ing ? { ...back(x), place } : x)) } : { ...s, stock: [...s.stock, { ing, place, name }] }));
  return ing;
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
/** Ingredient ids that are in the kitchen right now (on the stock list and not marked out). */
export const inStock = (s: State): string[] => s.stock.filter((x) => !x.out).map((x) => x.ing);
export const onList = (s: State, ing: string) => s.stock.some((x) => x.ing === ing);
export const addStock = (ing: string, place: Place = defaultPlace(ing)) =>
  setState((s) => (onList(s, ing) ? { ...s, stock: s.stock.map((x) => (x.ing === ing ? back(x) : x)) } : { ...s, stock: [...s.stock, { ing, place }] }));
export const addManyStock = (ings: string[]) =>
  setState((s) => ({ ...s, stock: [...s.stock, ...ings.filter((i) => !onList(s, i)).map((ing) => ({ ing, place: defaultPlace(ing) }))] }));
export const removeStock = (ing: string) => setState((s) => ({ ...s, stock: s.stock.filter((x) => x.ing !== ing) }));
export const toggleOut = (ing: string) => setState((s) => ({ ...s, stock: s.stock.map((x) => (x.ing === ing ? (x.out ? back(x) : { ...x, out: true }) : x)) }));
export const moveStock = (ing: string, place: Place) => setState((s) => ({ ...s, stock: s.stock.map((x) => (x.ing === ing ? { ...x, place } : x)) }));
export const allBackIn = () => setState((s) => ({ ...s, stock: s.stock.map(back) }));
export const toggleFavourite = (id: string) => setState((s) => ({ ...s, favourites: toggle(s.favourites, id) }));
export const toggleHidden = (id: string) => setState((s) => ({ ...s, hidden: toggle(s.hidden, id) }));
export const setServes = (id: string, n: number) => setState((s) => ({ ...s, serves: { ...s.serves, [id]: Math.max(1, Math.min(24, n)) } }));
export const setMeatEaters = (n: number) => setState((s) => ({ ...s, meatEaters: Math.max(0, Math.min(12, n)) }));
// An imported recipe opens at its own amount ("makes 12"); the app's own recipes at your usual number.
export const servesFor = (s: State, id: string) => s.serves[id] ?? s.imported.find((x) => x.id === id)?.serves ?? s.defaultServes;
export const addPlan = (p: Plan) => setState((s) => ({ ...s, plans: [...s.plans.filter((x) => x.id !== p.id), p] }));
export const removePlan = (id: string) => setState((s) => ({ ...s, plans: s.plans.filter((x) => x.id !== id) }));
export const markCooked = (id: string, date: string) => setState((s) => ({ ...s, cooked: [...s.cooked, { id, date }], plans: s.plans.filter((x) => x.id !== id) }));
export const toggleChecked = (key: string) => setState((s) => ({ ...s, shopping: { checked: toggle(s.shopping.checked, key) } }));
export const clearChecked = () => setState((s) => ({ ...s, shopping: { checked: [] } }));

// Function declarations (not consts): the stored state is read while this file is still loading, and it may need today().
export function today(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return today(new Date(y, m - 1, d + n));
}

/** Saves a new or changed imported recipe. */
export const saveImported = (x: ImportedRecipe) =>
  setState((s) => ({ ...s, imported: s.imported.some((y) => y.id === x.id) ? s.imported.map((y) => (y.id === x.id ? x : y)) : [...s.imported, x] }));
/** Deletes an imported recipe, and takes it off favourites, the plan and the hidden list (what you cooked stays in the history). */
export const deleteImported = (id: string) => setState((s) => ({
  ...s, imported: s.imported.filter((y) => y.id !== id), favourites: s.favourites.filter((f) => f !== id),
  plans: s.plans.filter((p) => p.id !== id), hidden: s.hidden.filter((h) => h !== id),
}));
export const newImportId = () => `imp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
