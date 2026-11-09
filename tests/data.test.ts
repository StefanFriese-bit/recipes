import { describe, expect, it } from 'vitest';
import { FAMILIAR } from '../src/data/familiar';
import { INGREDIENTS } from '../src/data/ingredients';
import { RECIPES } from '../src/data/recipes';
import { SWAPS } from '../src/data/swaps';
import { partAmount, swapsFor } from '../src/lib/lines';

const MEATY = new Set(['chicken-stock', 'beef-stock', 'anchovies', 'fish-sauce', 'oyster-sauce', 'worcestershire']);
const ANIMAL = new Set(['eggs', 'butter', 'milk', 'cream', 'sour-cream', 'creme-fraiche', 'greek-yoghurt', 'plain-yoghurt', 'buttermilk', 'cheddar', 'parmesan',
  'mozzarella', 'feta', 'halloumi', 'ricotta', 'goats-cheese', 'gruyere', 'cream-cheese', 'paneer', 'honey', 'egg-noodles']);

describe('recipe data', () => {
  it('has unique ids', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
  it('uses only known ingredients and familiar dishes', () => {
    const bad: string[] = [];
    for (const r of RECIPES) {
      for (const l of r.lines) if (!INGREDIENTS[l.ing]) bad.push(`${r.id}: ${l.ing}`);
      for (const w of r.twistOf) if (!FAMILIAR.some((f) => f.id === w)) bad.push(`${r.id}: twist ${w}`);
    }
    expect(bad).toEqual([]);
  });
  it('every recipe has a blurb, steps, a cuisine, a time and at least 3 ingredients', () => {
    for (const r of RECIPES) {
      expect(r.blurb.length, r.id).toBeGreaterThan(20);
      expect(r.steps.length, r.id).toBeGreaterThan(1);
      expect(r.lines.length, r.id).toBeGreaterThan(2);
      expect(r.minutes, r.id).toBeGreaterThan(0);
      expect(r.cuisine, r.id).not.toBe('');
    }
  });
  it('a recipe tagged vegetarian has no meat, fish or meat stock; vegan has no animal products either', () => {
    const bad: string[] = [];
    for (const r of RECIPES) {
      const veg = r.tags.includes('vegetarian');
      const vegan = r.tags.includes('vegan');
      for (const l of r.lines) {
        const i = INGREDIENTS[l.ing];
        if (!i || l.optional) continue;
        const meaty = i.aisle === 'meat' || i.aisle === 'fish' || MEATY.has(l.ing) || l.ing === 'tuna-tin';
        if ((veg || vegan) && meaty) bad.push(`${r.id}: ${l.ing}`);
        if (vegan && ANIMAL.has(l.ing)) bad.push(`${r.id} (vegan): ${l.ing}`);
      }
      if (vegan && !veg) bad.push(`${r.id}: vegan but not tagged vegetarian`);
    }
    expect(bad).toEqual([]);
  });
  it('the same ingredient is not listed twice in one recipe without a note to tell them apart', () => {
    const bad: string[] = [];
    for (const r of RECIPES) {
      const seen = new Map<string, number>();
      for (const l of r.lines) seen.set(l.ing, (seen.get(l.ing) ?? 0) + 1);
      for (const [ing, n] of seen) if (n > 1 && r.lines.filter((l) => l.ing === ing).some((l) => !l.note)) bad.push(`${r.id}: ${ing}`);
    }
    expect(bad).toEqual([]);
  });
  it('swaps point at known ingredients and never at themselves', () => {
    const bad: string[] = [];
    for (const [from, list] of Object.entries(SWAPS)) {
      if (!INGREDIENTS[from]) bad.push(`from ${from}`);
      for (const s of list) for (const p of s.parts) {
        if (!INGREDIENTS[p.ing]) bad.push(`${from} -> ${p.ing}`);
        if (p.ing === from) bad.push(`${from} -> itself`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('every swap on a recipe line gives a positive amount', () => {
    const bad: string[] = [];
    for (const r of RECIPES) for (const l of r.lines) for (const s of swapsFor(l.ing)) for (const p of s.parts) {
      const a = partAmount(l, p);
      if (l.unit !== 'taste' && (!a || !(a.qty > 0))) bad.push(`${r.id}: ${l.ing} -> ${p.ing}`);
    }
    expect(bad).toEqual([]);
  });
  it('familiar dishes use known ingredients', () => {
    for (const f of FAMILIAR) for (const k of f.key) expect(INGREDIENTS[k], `${f.id}: ${k}`).toBeTruthy();
  });
});
