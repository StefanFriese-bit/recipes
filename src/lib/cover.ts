import type { Recipe } from '../types';

// A "cover" for each recipe, since the app has no food photos: a dish emoji on a soft colour wash.
// The emoji comes from the dish's name first (what it IS), then its main ingredients, then its course.

const BY_NAME: [RegExp, string][] = [
  [/stuffed pepper/i, '🫑'],
  [/schnitzel/i, '🥩'],
  [/chakalaka|\bpap\b/i, '🌽'],
  [/omelette|frittata/i, '🍳'],
  [/cheesecake|pavlova|tiramisu|melktert|\bcake/i, '🍰'],
  [/panna cotta|pudding|malva/i, '🍮'],
  [/chocolate|churros/i, '🍫'],
  [/tatin|tart\b|tart \(|pie\b(?!.*(steak|fish))|spanakopita/i, '🥧'],
  [/cinnamon bun|bun\b/i, '🥐'],
  [/banana bread|bagel|focaccia|bread\b|vetkoek/i, '🍞'],
  [/naan|flatbread|lahmacun|pide|khachapuri/i, '🫓'],
  [/pancake|dutch baby|okonomiyaki/i, '🥞'],
  [/pizza/i, '🍕'],
  [/burger/i, '🍔'],
  [/burrito|quesadilla|enchilada|wrap/i, '🌯'],
  [/taco|tostada/i, '🌮'],
  [/dumpling|empanada|sausage roll/i, '🥟'],
  [/ramen|pho|laksa|udon|noodle|pad thai|dan dan|spätzle|spaetzle/i, '🍜'],
  [/spaghetti|pasta|pappardelle|rigatoni|gnocchi|orzo|cannelloni|lasagne|bolognese|mac\b|cacio/i, '🍝'],
  [/sushi|salmon rice|rice bowl|bibimbap|teriyaki/i, '🍱'],
  [/paella|biryani|jollof|fried rice|nasi goreng|risotto|mujadara|rice and/i, '🍚'],
  [/curry|tikka|masala|dal\b|dhal|\brogan|korma|rendang|massaman|bunny chow|misir wat|paneer/i, '🍛'],
  [/soup|minestrone|ribollita|avgolemono|mulligatawny|pozole|tom kha/i, '🍲'],
  [/stew|tagine|goulash|potjie|gumbo|chilli|casserole|cassoulet|hotpot|bourguignon|coq au vin|feijoada|cacciatore|moqueca|maafe|stroganoff|ragù|ragu/i, '🥘'],
  [/salad|fattoush|tabbouleh|panzanella|larb/i, '🥗'],
  [/egg|omelette|frittata|shakshuka|çılbır|cilbir|kuku|huevos/i, '🍳'],
  [/bánh mì|banh mi|croque|sandwich|toast/i, '🥪'],
  [/skewer|souvlaki|sosatie|kebab|kofta|satay/i, '🍢'],
  [/falafel|fritter|fishcake/i, '🧆'],
  [/prawn|shrimp/i, '🍤'],
  [/mussel|moules/i, '🦪'],
  [/fish|salmon|cod|hake/i, '🐟'],
  [/duck/i, '🦆'],
  [/chicken/i, '🍗'],
  [/steak|beef|short rib|wellington|oxtail/i, '🥩'],
  [/lamb|kleftiko/i, '🍖'],
  [/pork|carnitas|char siu|porchetta|schnitzel|meatball|toad in the hole/i, '🥓'],
  [/tofu/i, '🥢'],
  [/mushroom|polenta/i, '🍄'],
  [/cauliflower|broccoli|aloo gobi/i, '🥦'],
  [/aubergine|moussaka|parmigiana|norma/i, '🍆'],
  [/pepper/i, '🫑'],
  [/sweet potato|butternut|pumpkin/i, '🍠'],
  [/potato|tartiflette|rösti|rosti|gratin/i, '🥔'],
  [/corn|sweetcorn/i, '🌽'],
  [/bean|chickpea|ceci|lentil|gigantes|chana/i, '🫘'],
  [/tomato|ratatouille/i, '🍅'],
  [/leek|onion/i, '🧅'],
  [/halloumi|cheese|gruyère/i, '🧀'],
];
const BY_COURSE: Record<string, string> = { dessert: '🍨', bake: '🍞', breakfast: '🍳', soup: '🍲', salad: '🥗', side: '🥔', starter: '🥟', main: '🍽️' };

export function coverEmoji(r: Recipe): string {
  if (r.course === 'soup') return '🍲';
  if (r.course === 'salad') return '🥗';
  const name = r.title.split(' (')[0];
  for (const [re, e] of BY_NAME) if (re.test(name)) return e;
  // the bracketed English meaning ("Mapo tofu (spicy tofu…)") and then the ingredients
  for (const [re, e] of BY_NAME) if (re.test(r.title)) return e;
  const ings = r.lines.map((l) => l.label ?? l.ing).join(' ');
  for (const [re, e] of BY_NAME.slice(BY_NAME.findIndex(([, e]) => e === '🍤'))) if (re.test(ings)) return e;
  return BY_COURSE[r.course] ?? '🍽️';
}

/** A colour for the wash: the same cuisine always gets the same colour family. */
export function coverHue(r: Recipe): number {
  let h = 0;
  for (const c of r.cuisine) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
