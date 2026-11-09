import type { Familiar } from '../types';

// Dishes people make all the time. "Something different" starts from one of these: same kind of ingredients, new dish.
// id | name | other names (comma) | cuisine | key ingredients (comma)
const SRC = `
bolognese|Spaghetti bolognese|spag bol,bolognaise,mince pasta,pasta with mince|Italian|beef-mince,spaghetti,chopped-tomatoes,onion
lasagne|Lasagne|lasagna|Italian|beef-mince,lasagne-sheets,chopped-tomatoes,cheddar
carbonara|Spaghetti carbonara|carbonara|Italian|spaghetti,bacon,eggs,parmesan
pasta-bake|Pasta bake|tuna pasta bake,chicken pasta bake|Italian|pasta-short,cheddar,chopped-tomatoes,tuna-tin
mac-cheese|Macaroni cheese|mac and cheese,mac n cheese|American|pasta-short,cheddar,milk,butter
pizza|Pizza|margherita|Italian|bread-flour,mozzarella,passata,dried-yeast
risotto|Mushroom risotto|risotto|Italian|risotto-rice,mushrooms,parmesan,chicken-stock
roast-chicken|Roast chicken|sunday roast chicken,roast chicken and potatoes|British|chicken-whole,potato,lemon,garlic
chicken-stirfry|Chicken stir-fry|stir fry,stirfry|Chinese|chicken-breast,soy-sauce,egg-noodles,red-pepper
chicken-curry|Chicken curry|butter chicken,chicken tikka masala,curry|Indian|chicken-thighs,onion,garam-masala,chopped-tomatoes
beef-curry|Beef curry|mince curry,curry mince|Indian|beef-chuck,onion,curry-powder,potato
lamb-curry|Lamb curry|curry lamb|Indian|lamb-shoulder,onion,garam-masala,potato
chilli|Chilli con carne|chili,chilli|Mexican|beef-mince,kidney-beans,chopped-tomatoes,chilli-powder
cottage-pie|Cottage pie|shepherd's pie,shepherds pie|British|beef-mince,potato,carrot,onion
beef-stew|Beef stew|beef casserole,stew|British|beef-chuck,carrot,potato,onion
chicken-stew|Chicken casserole|chicken stew|British|chicken-thighs-bone,carrot,onion,chicken-stock
chicken-pie|Chicken pie|chicken and mushroom pie|British|chicken-thighs,puff-pastry,mushrooms,cream
burgers|Burgers|hamburger,cheeseburger|American|beef-mince,burger-buns,cheddar,tomato
steak-chips|Steak and chips|steak|French|beef-steak,potato,butter
braai|Braai (chops and wors)|bbq,barbecue,braaivleis,chops and wors|South African|boerewors,lamb-chops,mielies,onion
sausage-mash|Sausage and mash|bangers and mash|British|sausages,potato,onion,butter
fish-chips|Fish and chips|fried fish|British|white-fish,potato,plain-flour,beer
grilled-salmon|Grilled salmon|baked salmon,salmon and veg|British|salmon,lemon,broccoli,potato
fish-cakes|Fish cakes|fishcakes|British|white-fish,potato,parsley,eggs
roast-lamb|Roast lamb|leg of lamb|British|lamb-leg,rosemary,garlic,potato
roast-beef|Roast beef|sunday roast|British|beef-chuck,potato,carrot,onion
pork-chops|Pork chops|grilled pork chops|British|pork-chops,apple,potato
bobotie|Bobotie|bobotie|South African|beef-mince,curry-powder,eggs,milk
potjie|Potjiekos|potjie|South African|lamb-neck,potato,carrot,onion
tacos|Tacos|beef tacos|Mexican|beef-mince,tortillas,cheddar,lettuce
fajitas|Chicken fajitas|fajita|Mexican|chicken-breast,red-pepper,tortillas,onion
fried-rice|Egg fried rice|fried rice|Chinese|rice,eggs,soy-sauce,peas
peri-chicken|Peri-peri chicken|piri piri chicken,nando's|Portuguese|chicken-thighs-bone,peri-peri,lemon,garlic
schnitzel|Chicken schnitzel|schnitzel,crumbed chicken|German|chicken-breast,breadcrumbs,eggs,lemon
meatballs|Meatballs in tomato sauce|meatballs,spaghetti and meatballs|Italian|beef-mince,breadcrumbs,chopped-tomatoes,eggs
chicken-soup|Chicken soup|chicken noodle soup|British|chicken-thighs-bone,carrot,celery,onion
butternut-soup|Butternut soup|pumpkin soup|South African|butternut,onion,cream,veg-stock
tomato-soup|Tomato soup|cream of tomato|British|chopped-tomatoes,onion,cream,veg-stock
greek-salad|Greek salad|salad|Greek|tomato,cucumber,feta,olives
chicken-salad|Chicken salad|caesar salad|American|chicken-breast,lettuce,parmesan,bread
omelette|Omelette|scrambled eggs,eggs on toast|French|eggs,butter,cheddar
quiche|Quiche|quiche lorraine|French|eggs,shortcrust,bacon,cream
toastie|Toasted sandwich|toastie,cheese toastie,grilled cheese|British|bread,cheddar,butter
pancakes|Pancakes|crumpets,crepes|British|plain-flour,eggs,milk
`;

export const FAMILIAR: Familiar[] = SRC.trim().split('\n').map((raw) => {
  const [id, name, aliases, cuisine, key] = raw.split('|');
  return { id, name, aliases: aliases.split(',').map((a) => a.trim()).filter(Boolean), cuisine, key: key.split(',') };
});
export const familiarById = (id: string) => FAMILIAR.find((f) => f.id === id);
