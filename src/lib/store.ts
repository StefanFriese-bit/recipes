// Everything the app remembers lives on the phone only (localStorage). A backup is one file the user saves to iCloud.
export interface Plan { id: string; date: string | null; serves: number } // date YYYY-MM-DD, null = "some day"
export interface State {
  v: 1;
  fridge: string[];
  favourites: string[];
  hidden: string[]; // "I know this one" / "not for me": kept out of suggestions
  cooked: { id: string; date: string }[];
  plans: Plan[];
  shopping: { checked: string[] };
  serves: Record<string, number>;
  defaultServes: number;
}

const KEY = 'recipes-state-v1';
export const emptyState = (): State => ({ v: 1, fridge: [], favourites: [], hidden: [], cooked: [], plans: [], shopping: { checked: [] }, serves: {}, defaultServes: 4 });

/** Reads a stored or backed-up state, keeping only what it understands. Throws on something that is not ours. */
export function parseState(text: string): State {
  const raw = JSON.parse(text);
  if (!raw || raw.v !== 1) throw new Error('This is not a recipe app backup.');
  const base = emptyState();
  const arr = (x: unknown) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string') : []);
  return {
    v: 1,
    fridge: arr(raw.fridge),
    favourites: arr(raw.favourites),
    hidden: arr(raw.hidden),
    cooked: Array.isArray(raw.cooked) ? raw.cooked.filter((c: any) => c && typeof c.id === 'string' && typeof c.date === 'string') : [],
    plans: Array.isArray(raw.plans)
      ? raw.plans.filter((p: any) => p && typeof p.id === 'string' && (p.date === null || typeof p.date === 'string') && p.serves > 0)
      : [],
    shopping: { checked: arr(raw.shopping?.checked) },
    serves: raw.serves && typeof raw.serves === 'object' ? Object.fromEntries(Object.entries(raw.serves).filter(([, n]) => typeof n === 'number' && n > 0)) as Record<string, number> : {},
    defaultServes: typeof raw.defaultServes === 'number' && raw.defaultServes > 0 ? raw.defaultServes : base.defaultServes,
  };
}

let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  try {
    const t = globalThis.localStorage?.getItem(KEY);
    return t ? parseState(t) : emptyState();
  } catch {
    return emptyState();
  }
}

export const getState = () => state;
export function setState(change: (s: State) => State) {
  state = change(state);
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(state)); } catch { /* full or blocked: keeps working for this visit */ }
  for (const l of listeners) l();
}
export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function replaceState(s: State) { setState(() => s); }

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
export const toggleFridge = (ing: string) => setState((s) => ({ ...s, fridge: toggle(s.fridge, ing) }));
export const clearFridge = () => setState((s) => ({ ...s, fridge: [] }));
export const toggleFavourite = (id: string) => setState((s) => ({ ...s, favourites: toggle(s.favourites, id) }));
export const toggleHidden = (id: string) => setState((s) => ({ ...s, hidden: toggle(s.hidden, id) }));
export const setServes = (id: string, n: number) => setState((s) => ({ ...s, serves: { ...s.serves, [id]: Math.max(1, Math.min(24, n)) } }));
export const servesFor = (s: State, id: string) => s.serves[id] ?? s.defaultServes;
export const addPlan = (p: Plan) => setState((s) => ({ ...s, plans: [...s.plans.filter((x) => x.id !== p.id), p] }));
export const removePlan = (id: string) => setState((s) => ({ ...s, plans: s.plans.filter((x) => x.id !== id) }));
export const markCooked = (id: string, date: string) => setState((s) => ({ ...s, cooked: [...s.cooked, { id, date }], plans: s.plans.filter((x) => x.id !== id) }));
export const toggleChecked = (key: string) => setState((s) => ({ ...s, shopping: { checked: toggle(s.shopping.checked, key) } }));
export const clearChecked = () => setState((s) => ({ ...s, shopping: { checked: [] } }));

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return today(new Date(y, m - 1, d + n));
};
