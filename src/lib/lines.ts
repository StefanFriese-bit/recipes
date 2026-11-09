import { ingredient } from '../data/ingredients';
import { SWAPS } from '../data/swaps';
import type { Line, Swap, SwapPart, Unit } from '../types';
import { convert, family, formatAmount } from './units';

const JUICY = new Set(['lemon', 'lime', 'orange']);
/** Ingredient name as it reads beside its amount: "onions" for 2 pc, "lemon juice" for a spoonful of lemon. */
export function nameFor(ing: string, qty: number, unit: Unit): string {
  const i = ingredient(ing);
  if (unit === 'pc') return qty > 1 + 1e-9 ? i.plural : i.name;
  if (JUICY.has(ing) && family(unit) === 'volume') return `${i.name} juice`;
  return i.name;
}

/** "400 g beef mince", "2 onions", "salt, to taste". The note is shown apart. */
export function lineText(line: Line): string {
  const name = nameFor(line.ing, line.qty, line.unit);
  if (line.unit === 'taste') return `${name[0].toUpperCase()}${name.slice(1)}, to taste`;
  return `${formatAmount(line.qty, line.unit)} ${name}`;
}

/** How much of a swap part replaces this line (already scaled). Null = no sensible amount (to-taste lines). */
export function partAmount(line: Line, part: SwapPart): { qty: number; unit: Unit } | null {
  if (line.unit === 'taste') return null;
  const target = part.u ?? line.unit;
  const lf = family(line.unit);
  if (lf === 'count') {
    if (target === line.unit) return { qty: line.qty * (part.fc ?? part.f), unit: target };
    return { qty: line.qty * (part.fc ?? part.f), unit: target };
  }
  const direct = convert(line.qty, line.unit, target);
  if (direct !== null) return { qty: direct * part.f, unit: target };
  const tf = family(target);
  // mass <-> volume: close enough for cooking at 1 g = 1 ml (butter to oil, flour to baking powder).
  if (tf === 'mass' || tf === 'volume') {
    const asBase = lf === 'mass' ? convert(line.qty, line.unit, 'g')! : convert(line.qty, line.unit, 'ml')!;
    const out = convert(asBase, tf === 'mass' ? 'g' : 'ml', target)!;
    return { qty: out * part.f, unit: target };
  }
  // into a count (sumac -> some lemon): per teaspoon, or per gram for a weight.
  const per = lf === 'volume' ? convert(line.qty, line.unit, 'tsp')! : convert(line.qty, line.unit, 'g')!;
  return { qty: per * part.f, unit: target };
}

export function swapText(line: Line, swap: Swap): string {
  return swap.parts
    .map((p) => {
      const a = partAmount(line, p);
      if (!a) return nameFor(p.ing, 1, 'g');
      return lineText({ ing: p.ing, qty: a.qty, unit: a.unit });
    })
    .join(' + ');
}

export const swapsFor = (ing: string): Swap[] => SWAPS[ing] ?? [];
