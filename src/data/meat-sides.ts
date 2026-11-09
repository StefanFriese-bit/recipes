import type { MeatSide } from '../types';
import { parseLine } from '../lib/units';

/**
 * Vegetarian dishes that take meat (or fish) cooked on the side, in its own pan, for the meat-eaters at the table.
 * The main dish stays vegetarian for everyone; amounts here are for ONE meat-eater and scale with how many there are.
 */
const m = (name: string, lines: string[], steps: string[]): MeatSide => ({ name, lines: lines.map(parseLine), steps });

export const MEAT_SIDES: Record<string, MeatSide> = {
  kasespatzle: m('Crispy bacon', ['50 g bacon | in strips'], [
    'Fry the bacon in a separate dry pan over medium heat until crisp, 6–8 minutes.',
    "Scatter it over the meat-eaters' plates with the crispy onions.",
  ]),
  pide: m('Spiced lamb mince', ['100 g lamb-mince', '0.25 tsp cumin', '0.25 tsp chilli-flakes'], [
    'Fry the mince in a separate pan over high heat, breaking it up, until browned, 6–8 minutes. Add the cumin and chilli for the last minute and season.',
    "Spoon it onto the meat-eaters' pides for their last 3 minutes in the oven.",
  ]),
  enchiladas: m('Smoky shredded chicken', ['150 g chicken-thighs', '0.5 tsp smoked-paprika', '0.25 tsp cumin'], [
    'Rub the chicken with the spices and a pinch of salt. Fry in a separate pan, 5–6 minutes a side, until cooked through.',
    'Shred it with two forks and roll it into the meat-eaters\' enchiladas with the filling, before the sauce goes on.',
  ]),
  'three-cheese-mac': m('Crispy bacon', ['50 g bacon | in strips'], [
    'Fry the bacon in a separate dry pan until crisp, 6–8 minutes.',
    "Crumble it over the meat-eaters' portions at the table.",
  ]),
  chakalaka: m('Boerewors', ['200 g boerewors'], [
    'Braai the boerewors, or fry it in a separate pan over medium heat, 15–20 minutes, turning a few times.',
    'Cut into pieces and serve beside the pap and chakalaka.',
  ]),
  'misir-wat': m('Spiced chicken', ['150 g chicken-thighs', '0.5 tsp paprika', '0.25 tsp ground-ginger', '0.25 tsp cayenne'], [
    'Rub the chicken with the spices and a pinch of salt. Fry in a separate pan, 5–6 minutes a side, until cooked through.',
    'Slice and serve on top of the lentils.',
  ]),
  shakshuka: m('Chorizo', ['50 g chorizo | sliced'], [
    'Fry the chorizo in a separate small pan until crisp at the edges, about 4 minutes.',
    "Scatter it, with a little of its red oil, over the meat-eaters' share at the table.",
  ]),
  'pasta-norma': m('Italian sausage crumble', ['2 pc sausages', '0.25 tsp fennel-seeds'], [
    'Squeeze the meat out of the sausage skins. Fry it in a separate pan, breaking it up, until golden, about 8 minutes; add the fennel seeds for the last minute.',
    "Spoon it over the meat-eaters' pasta.",
  ]),
  'lemon-pea-orzo': m('Lemon-garlic chicken', ['150 g chicken-breast', '0.5 clove garlic | grated', '0.25 pc lemon'], [
    'Rub the chicken with the garlic, a squeeze of the lemon and some salt. Fry in a separate pan, 5–6 minutes a side, until cooked through.',
    'Rest 2 minutes, slice, and lay on top of the orzo.',
  ]),
  'gnocchi-sage': m('Crispy pancetta', ['40 g pancetta'], [
    'Fry the pancetta in a separate dry pan until crisp, about 5 minutes.',
    "Scatter over the meat-eaters' gnocchi with the sage butter.",
  ]),
  spanakopita: m('Lemon-oregano lamb chops', ['2 pc lamb-chops', '0.25 tsp dried-oregano', '0.25 pc lemon'], [
    'Season the chops with the oregano, salt and pepper. Fry in a hot separate pan, 3–4 minutes a side.',
    'Squeeze the lemon over and rest 3 minutes before serving with the pie.',
  ]),
  gigantes: m('Pork sausages', ['2 pc sausages'], [
    'Fry the sausages in a separate pan over medium heat, 12–15 minutes, turning, until cooked through.',
    'Serve beside the beans.',
  ]),
  fattoush: m('Sumac chicken', ['150 g chicken-thighs', '0.5 tsp sumac'], [
    'Rub the chicken with the sumac, salt and a little oil. Fry in a separate pan, 5–6 minutes a side, until cooked through.',
    'Slice and lay on top of the meat-eaters\' salad.',
  ]),
  mujadara: m('Spiced lamb chops', ['2 pc lamb-chops', '0.25 tsp cumin', '0.25 tsp cinnamon'], [
    'Rub the chops with the spices, salt and pepper. Fry in a hot separate pan, 3–4 minutes a side.',
    'Rest 3 minutes and serve on the lentils and rice.',
  ]),
  ratatouille: m('Herb-roast chicken thighs', ['2 pc chicken-thighs-bone', '1 sprig thyme'], [
    'Season the thighs, lay them skin up on a separate small tray with the thyme and roast in the same oven (about 200°C) for 35–40 minutes until the skin is crisp.',
    'Serve them on top of the ratatouille.',
  ]),
  'dal-tadka': m('Garam masala chicken', ['150 g chicken-thighs', '1 tbsp plain-yoghurt', '0.5 tsp garam-masala'], [
    'Mix the chicken with the yoghurt, garam masala and a pinch of salt; leave while the dal cooks.',
    'Fry in a separate hot pan, 5–6 minutes a side, until charred and cooked through. Serve on top of the dal.',
  ]),
  'palak-paneer': m('Spiced lamb chops', ['2 pc lamb-chops', '0.5 tsp garam-masala'], [
    'Rub the chops with the garam masala, salt and a little oil. Fry in a hot separate pan, 3–4 minutes a side.',
    'Rest 3 minutes and serve beside the palak paneer.',
  ]),
  'chana-masala': m('Chicken tikka-style pieces', ['150 g chicken-thighs | in chunks', '1 tbsp plain-yoghurt', '0.5 tsp curry-powder'], [
    'Mix the chicken with the yoghurt, curry powder and a pinch of salt.',
    'Fry in a separate hot pan, 8–10 minutes, turning, until charred and cooked through. Spoon onto the meat-eaters\' curry.',
  ]),
  'sri-lankan-dhal': m('Chilli-garlic prawns', ['100 g prawns', '0.5 clove garlic | grated', '0.25 tsp chilli-flakes'], [
    'Fry the garlic and chilli in a little oil in a separate pan for 30 seconds, add the prawns and cook 2–3 minutes until pink.',
    'Spoon them over the meat-eaters\' dhal.',
  ]),
  'halloumi-traybake': m('Harissa chicken', ['150 g chicken-thighs', '1 tsp harissa'], [
    'Coat the chicken with the harissa and a pinch of salt. Roast on a separate small tray in the same oven for 25 minutes, until cooked through.',
    'Serve it with the traybake.',
  ]),
  'crispy-gnocchi-traybake': m('Italian sausages', ['2 pc sausages'], [
    'Put the sausages on a separate small tray in the same oven for 25 minutes, turning once, until browned and cooked through.',
    'Slice and serve with the gnocchi.',
  ]),
  ribollita: m('Crispy pancetta', ['40 g pancetta'], [
    'Fry the pancetta in a separate dry pan until crisp, about 5 minutes.',
    "Scatter over the meat-eaters' bowls.",
  ]),
  'roast-pepper-soup': m('Crispy chorizo', ['40 g chorizo | diced'], [
    'Fry the chorizo in a separate small pan until crisp, about 4 minutes.',
    "Scatter it over the meat-eaters' bowls with a drizzle of its oil.",
  ]),
  'thai-butternut-soup': m('Lime prawns', ['100 g prawns', '0.25 pc lime'], [
    'Fry the prawns in a little oil in a separate pan, 2–3 minutes, until pink. Squeeze over the lime.',
    "Drop them into the meat-eaters' bowls.",
  ]),
  panzanella: m('Sliced steak', ['150 g beef-steak'], [
    'Season the steak and sear in a very hot separate pan, 2–3 minutes a side for medium-rare.',
    'Rest 5 minutes, slice thinly and lay over the meat-eaters\' salad.',
  ]),
  tabbouleh: m('Sumac lamb chops', ['2 pc lamb-chops', '0.25 tsp sumac'], [
    'Season the chops with the sumac, salt and pepper. Fry in a hot separate pan, 3–4 minutes a side.',
    'Rest 3 minutes and serve with the tabbouleh.',
  ]),
  'beetroot-goats-cheese': m('Seared steak', ['150 g beef-steak'], [
    'Season the steak and sear in a very hot separate pan, 2–3 minutes a side for medium-rare.',
    'Rest 5 minutes, slice and serve with the salad.',
  ]),
  'huevos-rancheros': m('Chorizo', ['50 g chorizo | diced'], [
    'Fry the chorizo in a separate small pan until crisp, about 4 minutes.',
    "Scatter it over the meat-eaters' plates.",
  ]),
  'corn-fritters': m('Crispy bacon', ['60 g bacon'], [
    'Fry the bacon in a separate pan until crisp, 6–8 minutes.',
    'Serve beside the fritters.',
  ]),
  'mushroom-stroganoff': m('Seared beef strips', ['150 g beef-steak | in thin strips', '0.25 tsp paprika'], [
    'Toss the beef with the paprika, salt and pepper. Sear in a very hot separate pan in one layer, 1–2 minutes, so it stays pink inside.',
    "Stir it into the meat-eaters' portions of the stroganoff just before serving.",
  ]),
  'whole-roast-cauliflower': m('Ras el hanout chicken', ['150 g chicken-thighs', '0.5 tsp ras-el-hanout'], [
    'Rub the chicken with the spice, salt and a little oil. Roast on a separate small tray in the same oven for 25 minutes, until cooked through.',
    'Slice and serve with the cauliflower and tahini.',
  ]),
  'pasta-e-ceci': m('Crispy pancetta', ['40 g pancetta'], [
    'Fry the pancetta in a separate dry pan until crisp, about 5 minutes.',
    "Scatter over the meat-eaters' bowls.",
  ]),
  'cacio-e-pepe': m('Crispy pancetta', ['40 g pancetta'], [
    'Fry the pancetta in a separate dry pan until crisp, about 5 minutes.',
    "Toss it through the meat-eaters' pasta at the table.",
  ]),
  'sesame-cauliflower': m('Sticky sesame chicken', ['150 g chicken-thighs | in chunks', '1 tbsp soy-sauce', '1 tsp honey'], [
    'Fry the chicken in a separate pan, 6–8 minutes, until golden and cooked through.',
    'Add the soy sauce and honey and bubble for a minute until sticky. Serve with the cauliflower.',
  ]),
  'egg-curry': m('Curry-spiced chicken', ['150 g chicken-thighs | in chunks', '0.5 tsp curry-powder'], [
    'Toss the chicken with the curry powder and a pinch of salt. Fry in a separate pan, 8–10 minutes, until cooked through.',
    "Spoon onto the meat-eaters' curry.",
  ]),
  'polenta-mushrooms': m('Pork sausages', ['2 pc sausages'], [
    'Fry the sausages in a separate pan over medium heat, 12–15 minutes, turning, until cooked through.',
    'Serve on the polenta beside the mushrooms.',
  ]),
};
