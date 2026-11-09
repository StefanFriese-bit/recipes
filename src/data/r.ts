import type { Course, Effort, Recipe } from '../types';
import { parseLine } from '../lib/units';

interface Src {
  id: string; t: string; c: string; m: number; e: Effort; k: Course; d: string;
  w?: string[]; g?: string[]; i: string[]; s: string[]; tip?: string; serves?: number;
}
/** Compact recipe source -> Recipe. Lines use the src/lib/units.ts parseLine syntax. */
export const r = (x: Src): Recipe => ({
  id: x.id, title: x.t, cuisine: x.c, minutes: x.m, effort: x.e, course: x.k, serves: x.serves ?? 4,
  blurb: x.d, twistOf: x.w ?? [], tags: x.g ?? [], lines: x.i.map(parseLine), steps: x.s, ...(x.tip ? { tip: x.tip } : {}),
});
