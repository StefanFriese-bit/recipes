import { INGREDIENTS } from '../data/ingredients';
import type { Ingredient, Line, Unit } from '../types';

// Reading a recipe out of text: what the phone read off a screenshot or photo, or text pasted in.
// Two parts: (1) the whole text -> title, serves, time, ingredient lines, steps (a draft the user checks);
// (2) one ingredient line -> amount, unit, its own words, and the app ingredient it is (so stock and shopping work).

/** Same normalising as the stock list's own items, so "Harissa" typed there and in a recipe are one thing. */
export const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
export const ownId = (name: string) => `own:${norm(name)}`;

// ---- one ingredient line -------------------------------------------------------------------------------------------

const VULGAR: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅕': 0.2 };
const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, half: 0.5, quarter: 0.25,
};
// unit words -> [unit, multiplier into that unit]. Imperial weights become grams.
const UNIT_WORDS: [RegExp, Unit, number][] = [
  [/^(g|gr|grams?|gm)$/i, 'g', 1],
  [/^(kg|kgs|kilos?|kilograms?)$/i, 'kg', 1],
  [/^(ml|mls|millilit(re|er)s?)$/i, 'ml', 1],
  [/^(l|lt|ltr|lit(re|er)s?)$/i, 'l', 1],
  [/^(tsp|tsps|teaspoons?|teasp)$/i, 'tsp', 1],
  [/^(tbsp|tbsps|tbs|tbl|tblsp|tablespoons?|T)$/, 'tbsp', 1],
  [/^(tbsp|tbsps|tbs|tablespoons?)$/i, 'tbsp', 1],
  [/^(cups?|c)$/i, 'cup', 1],
  [/^(oz|ounces?)$/i, 'g', 28.35],
  [/^(lbs?|pounds?)$/i, 'g', 453.6],
  [/^cloves?$/i, 'clove', 1],
  [/^(tins?|cans?)$/i, 'tin', 1],
  [/^bunch(es)?$/i, 'bunch', 1],
  [/^handfuls?$/i, 'handful', 1],
  [/^pinch(es)?$/i, 'pinch', 1],
  [/^slices?$/i, 'slice', 1],
  [/^sprigs?$/i, 'sprig', 1],
  [/^sheets?$/i, 'sheet', 1],
  [/^stalks?$/i, 'stalk', 1],
  [/^cm$/i, 'cm', 1],
];
const unitOf = (word: string): [Unit, number] | undefined => {
  for (const [re, u, f] of UNIT_WORDS) if (re.test(word)) return [u, f];
  return undefined;
};

/** "1½" "1 1/2" "1/2" "2.5" "2,5" "2-3" at the start of a line. Returns the amount and what is left. */
function leadingAmount(t: string): { qty: number; rest: string } | undefined {
  const m = /^(\d+)\s+(\d)\/(\d)\b/.exec(t) // 1 1/2
    ?? /^(\d+)?\s?([½¼¾⅓⅔⅛⅕])/.exec(t) // 1½, ½
    ?? /^(\d+)\/(\d+)/.exec(t) // 1/2
    ?? /^(\d+(?:[.,]\d+)?)/.exec(t); // 2, 2.5
  if (!m) return undefined;
  let qty: number;
  if (m.length === 4) qty = Number(m[1]) + Number(m[2]) / Number(m[3]);
  else if (m[2] && VULGAR[m[2]] !== undefined) qty = Number(m[1] ?? 0) + VULGAR[m[2]];
  else if (m[2]) qty = Number(m[1]) / Number(m[2]);
  else qty = Number(m[1].replace(',', '.'));
  let rest = t.slice(m[0].length);
  // a range "2-3" or "2 to 3": cook with the first figure
  rest = rest.replace(/^\s*(?:-|–|—|to)\s*\d+(?:[.,]\d+)?/, '');
  if (!Number.isFinite(qty) || qty <= 0) return undefined;
  return { qty, rest: rest.trim() };
}

const BULLET = /^[\s•·▪▫◦●○■□▢☐☑✓✔✅\-–—*+>»~]+/u;
/** Takes off bullets, tick boxes and emoji at the start of a line. */
export const stripBullet = (t: string) => t.replace(BULLET, '').replace(/^\p{Extended_Pictographic}+\s*/u, '').trim();

// Words that say how a thing is cut or how big it is, not what it is.
const NOT_THE_THING = new Set(('large small medium big extra fresh freshly chopped finely roughly thinly thickly sliced diced minced grated crushed peeled '
  + 'deseeded seeded trimmed halved quartered ripe softened melted beaten cubed rinsed drained cooked uncooked boiled about approx approximately '
  + 'heaped level rounded good generous few some of a an the x to taste for serving garnish plus extra optional packet packets pack packs box boxes '
  + 'jar jars bag bags punnet punnets bottle bottles tub tubs block blocks piece pieces whole handful bunch tin tins can cans').split(' '));

// Common words recipes use for an ingredient the app names differently.
const ALIASES: Record<string, string> = {
  oil: 'sunflower-oil', 'cooking oil': 'sunflower-oil', 'vegetable oil': 'sunflower-oil', 'canola oil': 'sunflower-oil',
  flour: 'plain-flour', 'all purpose flour': 'plain-flour', 'cake flour': 'plain-flour', 'all-purpose flour': 'plain-flour',
  pepper: 'black-pepper', ginger: 'ginger', 'ginger root': 'ginger', egg: 'eggs', 'caster sugar': 'sugar', 'white sugar': 'sugar',
  'tomato puree': 'tomato-paste', 'tinned tomatoes': 'chopped-tomatoes', 'canned tomatoes': 'chopped-tomatoes',
  'tin tomatoes': 'chopped-tomatoes', 'tins tomatoes': 'chopped-tomatoes', 'can tomatoes': 'chopped-tomatoes', 'cans tomatoes': 'chopped-tomatoes',
  'tin chopped tomatoes': 'chopped-tomatoes', 'diced tomatoes': 'chopped-tomatoes', parsley: 'parsley', 'rice noodles': 'rice-noodles',
};
export const ALIAS_TARGETS = Object.values(ALIASES);

let NAMES: [string, string][] | null = null;
/** Every name an app ingredient goes by, longest first, so "red onion" wins over "onion". */
function names(): [string, string][] {
  if (NAMES) return NAMES;
  const out: [string, string][] = [];
  const add = (n: string, id: string) => { const k = norm(n).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); if (k.length > 1) out.push([k, id]); };
  for (const i of Object.values(INGREDIENTS)) {
    const base = i.name.split(' (')[0].split(' or ')[0];
    add(base, i.id);
    add(i.plural.split(' (')[0], i.id);
    if (base.startsWith('fresh ')) add(base.slice(6), i.id);
  }
  for (const [n, id] of Object.entries(ALIASES)) if (INGREDIENTS[id]) add(n, id);
  NAMES = out.sort((a, b) => b[0].length - a[0].length);
  return NAMES;
}

// Words that may follow the thing itself: "lemon juice", "garlic cloves", "chicken fillets".
const TAIL = new Set('juice zest rind leaves cloves wedges fillets florets chunks cubes strips rings halves'.split(' '));
/**
 * The app ingredient named in some words ("2 large red onions, chopped" -> red-onion), or undefined.
 * In English the thing comes LAST ("heavy cream", "cream crackers"), so the name must end where the thing ends:
 * cream crackers are not cream, tomato sauce is not tomatoes.
 */
export function matchIngredient(words: string): string | undefined {
  const head = words.split(/[,(;]| - | – | or /i)[0];
  const toks = norm(head).replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(Boolean);
  while (toks.length) {
    const t = ` ${toks.join(' ')} `;
    const hit = names().find(([n]) => t.endsWith(` ${n} `));
    if (hit) return hit[1];
    const last = toks[toks.length - 1];
    if (!NOT_THE_THING.has(last) && !TAIL.has(last)) return undefined;
    toks.pop();
  }
  return undefined;
}

/** What the ingredient itself is called, without amounts, sizes or how it is cut: "cream crackers". */
export function thingName(words: string): string {
  const head = words.split(/[,(;]| - | – /)[0];
  const kept = head.split(/\s+/).filter((w) => w && !NOT_THE_THING.has(w.toLowerCase().replace(/[^a-z]/g, '')) && !/^\d/.test(w));
  const name = kept.join(' ').replace(/[.:]+$/, '').trim();
  return (name || head.trim()).slice(0, 40).toLowerCase();
}

export interface ParsedLine { line: Line; known: boolean; ingredient?: Ingredient }

/**
 * One ingredient line as written -> a recipe line the app can scale, shop for and match to stock.
 * An ingredient the app does not know gets its own id ("own:harissa"), the same as an own item on the stock list.
 */
export function parseIngredientLine(raw: string): ParsedLine {
  let t = stripBullet(raw).replace(/\s+/g, ' ').trim();
  const optional = /\(optional\)|\boptional\b/i.test(t);
  let qty = 0;
  let unit: Unit = 'taste';
  let f = 1;
  let amount = leadingAmount(t);
  if (!amount) {
    const w = /^([A-Za-z]+)\b\s*/.exec(t);
    const n = w ? NUMBER_WORDS[w[1].toLowerCase()] : undefined;
    // "a pinch of salt", "one onion", "half a lemon" — but not "a little oil" (no amount word after "a")
    if (n !== undefined) {
      const rest = t.slice(w![0].length).replace(/^an?\s+/i, '');
      const next = rest.split(/\s+/)[0] ?? '';
      if (w![1].length > 2 || unitOf(next) || /^(pinch|handful|bunch|clove)/i.test(next)) amount = { qty: n, rest };
    }
  }
  if (amount) {
    qty = amount.qty;
    t = amount.rest;
    unit = 'pc';
    // "200g" (unit stuck on), "2 x 400g tins", "200 g"
    const stuck = /^([a-zA-Z]+)\b\.?\s*/.exec(t);
    const u = stuck ? unitOf(stuck[1]) : undefined;
    if (u) {
      [unit, f] = u;
      t = t.slice(stuck![0].length);
      t = t.replace(/^of\s+/i, '');
    }
  }
  const label = t.replace(/^of\s+/i, '').trim() || raw.trim();
  const known = matchIngredient(label);
  let ing = known ?? ownId(thingName(label));
  if (ing === 'own:') ing = ownId(label);
  // "3 garlic cloves": cloves, not three garlics
  if (ing === 'garlic' && unit === 'pc' && /\bcloves?\b/i.test(label)) unit = 'clove';
  const line: Line = { ing, qty: unit === 'taste' ? 0 : qty * f, unit, label };
  if (optional) line.optional = true;
  return { line, known: !!known };
}

/** The ingredient an own id stands for: shown on the shopping list in the "Other" aisle. */
export function ownIngredient(id: string, label: string): Ingredient {
  const name = id.slice(4) || thingName(label);
  return { id, name, plural: name, aisle: 'other', staple: false };
}

// ---- a whole recipe ----------------------------------------------------------------------------------------------

export interface Draft { title: string; serves: number; minutes?: number; ingredients: string[]; steps: string[]; notes: string }

const ING_HEAD = /^(ingredients?|what you(?:'|’)?(?:ll)? need|you will need|you(?:'|’)?ll need|shopping list)\b\s*:?\s*/i;
const METHOD_HEAD = /^(method|instructions?|directions?|preparation|steps?|how to (?:make|cook|prepare)(?: it)?|to make|let(?:'|’)s cook)\b\s*:?\s*/i;
// Screen furniture from Facebook, Instagram and phone screenshots.
const JUNK = [
  /^(like|likes|comment|comments|share|shares|reply|send|save|follow|following|see more|see translation|more|less|view more comments|write a comment.*|most relevant|all comments|sponsored|suggested for you|top fan|author|edited|·+)$/i,
  /^\d+([.,]\d+)?\s*[km]?\s*(likes?|comments?|shares?|views?|reactions?)\b/i,
  /^\d{1,2}:\d{2}(\s*[ap]m)?$/i,
  /^(\d+\s*[hdwmy]|just now|yesterday)$/i,
  /^(facebook|instagram|tiktok|pinterest|whatsapp|reels?)$/i,
  /·\s*(follow|join)$/i,
];
const isJunk = (t: string) => {
  const letters = (t.match(/\p{L}/gu) ?? []).length;
  if (letters < 2) return true;
  if (t.length <= 2) return true;
  return JUNK.some((re) => re.test(t));
};

// "1. Heat", "2) Add", "Step 3:" — but not "1.5 kg" or "2 onions"
const STEP_NUMBER = /^(?:step\s*\d{1,2}\s*[.):–-]?\s*|\d{1,2}\s*[.)]\s+(?=\p{L})|\d{1,2}\s*[:–-]\s+(?=\p{L}))/iu;
const looksLikeIngredient = (t: string) =>
  t.length <= 90 && (/^[\d½¼¾⅓⅔⅛]/.test(t) || BULLET.test(t) || /^(a|an|one|two|three|half)\s+(pinch|handful|bunch|clove|cup|tsp|tbsp|tablespoon|teaspoon|tin|can)/i.test(t))
  && !STEP_NUMBER.test(t);

function servesOf(text: string): number | undefined {
  const m = /\b(?:serves|servings?|makes|yields?|portions?|feeds)\s*:?\s*(\d{1,2})/i.exec(text) ?? /\b(\d{1,2})\s*(?:servings|portions|people)\b/i.exec(text);
  const n = m ? Number(m[1]) : NaN;
  return n > 0 && n <= 40 ? n : undefined;
}
function minutesIn(s: string): number {
  let m = 0;
  const h = /(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hours?)\b/i.exec(s);
  if (h) m += Number(h[1].replace(',', '.')) * 60;
  const mm = /(\d+)\s*(?:m|min|mins|minutes?)\b/i.exec(s);
  if (mm) m += Number(mm[1]);
  return Math.round(m);
}
function minutesOf(lines: string[]): number | undefined {
  const total = lines.find((l) => /\b(total|ready in)\b/i.test(l) && minutesIn(l) > 0);
  if (total) return minutesIn(total.replace(/^.*?\b(total|ready in)\b/i, ''));
  let sum = 0;
  for (const l of lines) {
    for (const part of l.split(/[|•·,;]/)) if (/\b(prep|cook|cooking|bake|baking)\b/i.test(part)) sum += minutesIn(part);
  }
  return sum > 0 ? sum : undefined;
}
const isInfoLine = (t: string) => /^(serves|servings?|makes|yields?|portions?|feeds|prep|cook|cooking|total|ready in)\b/i.test(t) && t.length < 80;

/** Steps run over several lines in a picture: joins them back and splits on numbers ("1.", "Step 2"). */
function joinSteps(lines: string[]): string[] {
  const steps: string[] = [];
  let cur = '';
  let prevBlank = false;
  for (const raw of lines) {
    if (raw === '') { prevBlank = true; continue; }
    const numbered = STEP_NUMBER.test(raw) || BULLET.test(raw);
    const t = stripBullet(raw.replace(STEP_NUMBER, ''));
    if (!t) continue;
    // a new step: a number or bullet, or a sentence that ended at the end of a line and a new one starting with a capital
    const newStep = !cur || numbered || (/[.!?)]$/.test(cur) && (prevBlank || /^\p{Lu}/u.test(t)));
    if (newStep) { if (cur) steps.push(cur); cur = t; } else cur = `${cur.replace(/-$/, '')}${cur.endsWith('-') ? '' : ' '}${t}`;
    prevBlank = false;
  }
  if (cur) steps.push(cur);
  // One long paragraph is hard to cook from: split it into a few sentences per step.
  return steps.flatMap((s) => {
    if (s.length <= 320) return [s];
    const sentences = s.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [s];
    const out: string[] = [];
    let chunk = '';
    for (const x of sentences) {
      if (chunk && (chunk + x).length > 220) { out.push(chunk.trim()); chunk = ''; }
      chunk += x;
    }
    if (chunk.trim()) out.push(chunk.trim());
    return out;
  });
}

/** Ingredient lines that ran onto a second line ("2 tbsp olive oil, plus extra / for drizzling") are joined back. */
function joinIngredients(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    if (!raw) continue;
    const t = raw.trim();
    const prev = out[out.length - 1];
    const continues = prev !== undefined && !looksLikeIngredient(t) && /^[a-z(]/.test(t) && !/[.!?]$/.test(prev);
    if (continues) out[out.length - 1] = `${prev} ${t}`;
    else if (!/:\s*$/.test(t) || t.length > 40) out.push(stripBullet(t)); // "For the sauce:" headings are dropped
  }
  return out.filter(Boolean);
}

/** Text read off one or more pictures (or pasted) -> a draft recipe for the user to check. */
export function parseRecipeText(text: string): Draft {
  const all = text.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim());
  const lines = all.map((l) => (l && isJunk(l) ? null : l)).filter((l): l is string => l !== null);
  const serves = servesOf(text) ?? 4;
  const minutes = minutesOf(lines.filter(isInfoLine).concat(lines.filter((l) => /\b(prep|cook|total)\s*(time)?\s*:/i.test(l))));

  let ingAt = lines.findIndex((l) => ING_HEAD.test(l));
  let methodAt = lines.findIndex((l, i) => i > ingAt && METHOD_HEAD.test(l));
  const intro: string[] = [];
  let ingLines: string[] = [];
  let stepLines: string[] = [];
  const afterHead = (l: string, re: RegExp) => l.replace(re, '').trim();

  if (ingAt >= 0) {
    intro.push(...lines.slice(0, ingAt));
    const end = methodAt > ingAt ? methodAt : lines.length;
    const first = afterHead(lines[ingAt], ING_HEAD);
    ingLines = [first, ...lines.slice(ingAt + 1, end)];
    if (methodAt > ingAt) {
      stepLines = [afterHead(lines[methodAt], METHOD_HEAD), ...lines.slice(methodAt + 1)];
    } else {
      // No "Method" heading: the steps start where lines stop looking like ingredients.
      const body = ingLines.filter((l) => l !== '');
      const cut = body.findIndex((l, i) => i > 0 && (STEP_NUMBER.test(l) || (l.length > 70 && !looksLikeIngredient(l))));
      if (cut > 0) { stepLines = body.slice(cut); ingLines = body.slice(0, cut); }
    }
  } else {
    methodAt = lines.findIndex((l) => METHOD_HEAD.test(l));
    const before = methodAt >= 0 ? lines.slice(0, methodAt) : lines;
    if (methodAt >= 0) stepLines = [afterHead(lines[methodAt], METHOD_HEAD), ...lines.slice(methodAt + 1)];
    // No headings at all: amounts and bullets are ingredients, numbered or long lines are steps, the rest is the intro.
    let seenIng = false;
    for (const l of before) {
      if (!l) { if (seenIng && methodAt < 0) stepLines.push(''); continue; }
      if (looksLikeIngredient(l) && !(methodAt < 0 && stepLines.length > 0)) { ingLines.push(l); seenIng = true; }
      else if (seenIng && methodAt < 0) stepLines.push(l);
      else intro.push(l);
    }
    ingAt = 0;
  }

  const introText = intro.filter((l) => l && !isInfoLine(l));
  const title = (introText.find((l) => l.length >= 3 && l.length <= 80 && !/^(recipe|ingredients?)$/i.test(l)) ?? '').replace(/^[^\p{L}\d]+/u, '').replace(/[^\p{L}\d)!?]+$/u, '');
  const notes = introText.filter((l) => !l.includes(title) || !title).join(' ').slice(0, 400).trim();
  return {
    title: title || 'Imported recipe',
    serves,
    ...(minutes ? { minutes } : {}),
    ingredients: joinIngredients(ingLines.filter((l) => !isInfoLine(l))),
    steps: joinSteps(stepLines.filter((l) => l === '' || !isInfoLine(l))),
    notes,
  };
}
