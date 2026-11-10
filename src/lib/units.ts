import type { Line, Unit } from '../types';

export type Family = 'mass' | 'volume' | 'count';
const BASE: Partial<Record<Unit, [Family, number]>> = {
  g: ['mass', 1], kg: ['mass', 1000],
  ml: ['volume', 1], l: ['volume', 1000], tsp: ['volume', 5], tbsp: ['volume', 15], cup: ['volume', 250],
};
export const UNITS: Unit[] = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pc', 'clove', 'tin', 'bunch', 'handful', 'pinch', 'slice', 'sprig', 'sheet', 'stalk', 'cm', 'taste'];
export const family = (u: Unit): Family => BASE[u]?.[0] ?? 'count';
export const toBase = (qty: number, u: Unit): number => qty * (BASE[u]?.[1] ?? 1);
/** Converts between units of one family; null when the families differ. */
export function convert(qty: number, from: Unit, to: Unit): number | null {
  if (family(from) !== family(to)) return null;
  if (family(from) === 'count') return from === to ? qty : null;
  return toBase(qty, from) / (BASE[to]![1]);
}

/** "400 g beef-mince | browned", "2 pc onion", "1/2 tsp cumin?", "taste salt". `?` after the id = optional. */
export function parseLine(src: string): Line {
  const [main, note] = src.split('|').map((s) => s.trim());
  const bits = main.split(/\s+/);
  let qty = 0;
  let unit: Unit;
  let rest: string[];
  if (bits[0] === 'taste') {
    unit = 'taste';
    rest = bits.slice(1);
  } else {
    qty = parseQty(bits[0]);
    unit = bits[1] as Unit;
    if (!UNITS.includes(unit)) throw new Error(`Unknown unit "${bits[1]}" in "${src}"`);
    rest = bits.slice(2);
  }
  if (rest.length !== 1) throw new Error(`Expected one ingredient id in "${src}"`);
  let ing = rest[0];
  const optional = ing.endsWith('?');
  if (optional) ing = ing.slice(0, -1);
  const line: Line = { ing, qty, unit };
  if (note) line.note = note;
  if (optional) line.optional = true;
  return line;
}

function parseQty(s: string): number {
  const m = /^(\d+)\/(\d+)$/.exec(s);
  const n = m ? Number(m[1]) / Number(m[2]) : Number(s);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Bad amount "${s}"`);
  return n;
}

const FRACTIONS: [number, string][] = [[0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']];
/** 1.5 → "1½", 0.33 → "⅓"; rounds to the nearest quarter or third. */
export function fraction(n: number): string {
  let best = Math.round(n);
  let bestStr = String(best);
  let bestErr = Math.abs(n - best);
  const whole = Math.floor(n);
  for (const [f, s] of FRACTIONS) {
    const err = Math.abs(n - (whole + f));
    if (err < bestErr - 1e-9) {
      bestErr = err;
      best = whole + f;
      bestStr = (whole ? String(whole) : '') + s;
    }
  }
  return best === 0 ? FRACTIONS[0][1] : bestStr;
}

function roundMetric(n: number): number {
  if (n < 10) return Math.round(n * 2) / 2 || 0.5;
  if (n < 100) return Math.round(n / 5) * 5;
  if (n < 1000) return Math.round(n / 10) * 10;
  return Math.round(n / 50) * 50;
}
const trim = (n: number) => String(Math.round(n * 100) / 100);

const COUNT_WORDS: Partial<Record<Unit, [string, string]>> = {
  clove: ['clove', 'cloves'], tin: ['tin', 'tins'], bunch: ['bunch', 'bunches'], handful: ['handful', 'handfuls'],
  pinch: ['pinch', 'pinches'], slice: ['slice', 'slices'], sprig: ['sprig', 'sprigs'], sheet: ['sheet', 'sheets'],
  stalk: ['stalk', 'stalks'], cm: ['cm', 'cm'],
};

/** The amount part of a line, as it is read out: "400 g", "1½ tbsp", "2", "3 cloves". "" for to-taste and pieces is the count only. */
export function formatAmount(qty: number, unit: Unit): string {
  if (unit === 'taste') return '';
  if (unit === 'g' || unit === 'kg') {
    const g = toBase(qty, unit);
    return g >= 1000 ? `${trim(roundMetric(g) / 1000)} kg` : `${trim(roundMetric(g))} g`;
  }
  if (unit === 'ml' || unit === 'l') {
    const ml = toBase(qty, unit);
    return ml >= 1000 ? `${trim(roundMetric(ml) / 1000)} l` : `${trim(roundMetric(ml))} ml`;
  }
  if (unit === 'tsp') {
    if (qty >= 2.9) return formatAmount(qty / 3, 'tbsp');
    return `${fraction(qty)} tsp`;
  }
  if (unit === 'tbsp') {
    if (qty > 8) return formatAmount(qty * 15, 'ml');
    if (qty < 1 / 3 - 0.01) return formatAmount(qty * 3, 'tsp');
    return `${fraction(qty)} tbsp`;
  }
  if (unit === 'cup') return `${fraction(qty)} ${qty > 1 + 1e-9 ? 'cups' : 'cup'}`;
  if (unit === 'pinch') {
    const n = Math.max(1, Math.round(qty));
    return `${n} ${n === 1 ? 'pinch' : 'pinches'}`;
  }
  if (unit === 'cm') return `${Math.max(1, Math.round(qty))} cm`;
  const shown = fraction(qty);
  const words = COUNT_WORDS[unit];
  if (!words) return shown;
  return `${shown} ${qty > 1 + 1e-9 ? words[1] : words[0]}`;
}

export function scaleLine(line: Line, factor: number): Line {
  return { ...line, qty: line.qty * factor };
}
