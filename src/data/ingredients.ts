import type { Aisle, Ingredient } from '../types';

// id | name | aisle | plural (for "2 onions"; blank = name + s) | s = staple (assumed in every kitchen)
const SRC = `
salt|salt|spice||s
black-pepper|black pepper|spice||s
water|water|pantry||s
sunflower-oil|sunflower oil|pantry||s
olive-oil|olive oil|pantry||s
sugar|sugar|pantry||s
onion|onion|veg
red-onion|red onion|veg
spring-onion|spring onion|veg
shallot|shallot|veg
leek|leek|veg
garlic|garlic|veg
ginger|fresh ginger|veg
red-chilli|red chilli|veg|red chillies
green-chilli|green chilli|veg|green chillies
carrot|carrot|veg
celery|celery|veg
potato|potato|veg|potatoes
sweet-potato|sweet potato|veg|sweet potatoes
butternut|butternut|veg
pumpkin|pumpkin|veg
tomato|tomato|veg|tomatoes
cherry-tomatoes|cherry tomatoes|veg|cherry tomatoes
red-pepper|red pepper|veg
green-pepper|green pepper|veg
yellow-pepper|yellow pepper|veg
courgette|courgette|veg
aubergine|aubergine|veg
mushrooms|mushrooms|veg|mushrooms
brown-mushrooms|brown mushrooms|veg|brown mushrooms
spinach|baby spinach|veg|spinach
kale|kale|veg|kale
cabbage|cabbage|veg
red-cabbage|red cabbage|veg
broccoli|broccoli|veg|heads of broccoli
cauliflower|cauliflower|veg
green-beans|green beans|veg|green beans
peas|peas|frozen|peas
corn|sweetcorn|frozen|sweetcorn
mielies|corn on the cob|veg|corn cobs
cucumber|cucumber|veg
lettuce|lettuce|veg
rocket|rocket|veg|rocket
avocado|avocado|veg
lemon|lemon|veg
lime|lime|veg
orange|orange|veg
apple|apple|veg
pear|pear|veg
banana|banana|veg
mango|mango|veg|mangoes
pineapple|pineapple|veg
berries|mixed berries|frozen|berries
raspberries|raspberries|veg|raspberries
dates|dates|pantry|dates
raisins|raisins|pantry|raisins
dried-apricots|dried apricots|pantry|dried apricots
fennel|fennel bulb|veg
beetroot|beetroot|veg|beetroot
radish|radish|veg|radishes
asparagus|asparagus|veg|asparagus spears
pak-choi|pak choi|veg|pak choi
bean-sprouts|bean sprouts|veg|bean sprouts
parsley|flat-leaf parsley|veg
coriander|fresh coriander|veg
basil|fresh basil|veg
mint|fresh mint|veg
dill|fresh dill|veg
thyme|fresh thyme|veg
rosemary|fresh rosemary|veg
sage|fresh sage|veg
chives|chives|veg
bay-leaf|bay leaf|spice|bay leaves
lemongrass|lemongrass|veg
chicken-thighs|chicken thighs (boneless)|meat|chicken thighs
chicken-thighs-bone|chicken thighs (bone-in)|meat|chicken thighs
chicken-breast|chicken breast|meat|chicken breasts
chicken-whole|whole chicken|meat|whole chickens
chicken-wings|chicken wings|meat|chicken wings
chicken-drumsticks|chicken drumsticks|meat|chicken drumsticks
beef-mince|beef mince|meat
beef-steak|beef steak (rump or sirloin)|meat|steaks
beef-chuck|beef chuck or shin|meat
beef-short-rib|beef short ribs|meat
oxtail|oxtail|meat
pork-shoulder|pork shoulder|meat
pork-belly|pork belly|meat
pork-chops|pork chops|meat|pork chops
pork-mince|pork mince|meat
pork-fillet|pork fillet|meat
lamb-shoulder|lamb shoulder|meat
lamb-leg|leg of lamb|meat
lamb-mince|lamb mince|meat
lamb-chops|lamb chops|meat|lamb chops
lamb-neck|lamb neck|meat
bacon|streaky bacon|meat
chorizo|chorizo|meat
boerewors|boerewors|meat
sausages|pork sausages|meat|sausages
pancetta|pancetta|meat
duck-legs|duck legs|meat|duck legs
salmon|salmon fillet|fish|salmon fillets
white-fish|white fish fillet (hake or cod)|fish|white fish fillets
prawns|prawns (peeled)|fish
mussels|mussels|fish
smoked-salmon|smoked salmon|fish
tuna-tin|tinned tuna|pantry
anchovies|anchovy fillets|pantry
eggs|egg|dairy|eggs
butter|butter|dairy
milk|milk|dairy
cream|cream|dairy
sour-cream|sour cream|dairy
creme-fraiche|crème fraîche|dairy
greek-yoghurt|Greek yoghurt|dairy
plain-yoghurt|plain yoghurt|dairy
buttermilk|buttermilk|dairy
cheddar|cheddar|dairy
parmesan|parmesan|dairy
mozzarella|mozzarella|dairy
feta|feta|dairy
halloumi|halloumi|dairy
ricotta|ricotta|dairy
goats-cheese|goat's cheese|dairy
gruyere|gruyère|dairy
cream-cheese|cream cheese|dairy
mascarpone|mascarpone|dairy
paneer|paneer|dairy
coconut-milk|coconut milk|world
tofu|firm tofu|world
plain-flour|plain flour|pantry
bread-flour|strong bread flour|pantry
self-raising-flour|self-raising flour|pantry
cornflour|cornflour|pantry
baking-powder|baking powder|pantry
bicarb|bicarbonate of soda|pantry
dried-yeast|instant dried yeast|pantry
brown-sugar|brown sugar|pantry
icing-sugar|icing sugar|pantry
honey|honey|pantry
golden-syrup|golden syrup|pantry
maple-syrup|maple syrup|pantry
dark-chocolate|dark chocolate|pantry
cocoa|cocoa powder|pantry
vanilla|vanilla extract|pantry
oats|rolled oats|pantry
rice|long-grain or basmati rice|pantry
risotto-rice|risotto rice (arborio)|pantry
sushi-rice|short-grain rice|pantry
spaghetti|spaghetti|pantry
pasta-short|short pasta (penne, rigatoni)|pantry
orzo|orzo|pantry
lasagne-sheets|lasagne sheets|pantry
egg-noodles|egg noodles|pantry
rice-noodles|flat rice noodles|world
udon|udon noodles|world
couscous|couscous|pantry
bulgur|bulgur wheat|pantry
quinoa|quinoa|pantry
polenta|polenta (or maize meal)|pantry
red-lentils|red lentils|pantry
green-lentils|green or brown lentils|pantry
chickpeas|chickpeas (tinned)|pantry
butter-beans|butter beans (tinned)|pantry
kidney-beans|red kidney beans (tinned)|pantry
black-beans|black beans (tinned)|pantry
cannellini|cannellini beans (tinned)|pantry
chopped-tomatoes|chopped tomatoes|pantry
passata|passata|pantry
tomato-paste|tomato paste|pantry
chicken-stock|chicken stock|pantry
beef-stock|beef stock|pantry
veg-stock|vegetable stock|pantry
red-wine|red wine|pantry
white-wine|dry white wine|pantry
beer|beer|pantry
cider|dry cider|pantry
coffee|coffee|pantry
sponge-fingers|sponge fingers (boudoir biscuits)|pantry
gelatine|gelatine|pantry
gnocchi|potato gnocchi (shop-bought)|pantry
breadcrumbs|breadcrumbs|pantry
panko|panko breadcrumbs|world
bread|crusty bread|bakery
sourdough|sourdough bread|bakery
pitta|pitta breads|bakery|pitta breads
tortillas|flour tortillas|bakery|tortillas
corn-tortillas|corn tortillas|bakery|corn tortillas
burger-buns|burger buns|bakery|burger buns
puff-pastry|puff pastry (ready-rolled)|frozen
filo|filo pastry|frozen
shortcrust|shortcrust pastry (ready-rolled)|frozen
soy-sauce|soy sauce|world
fish-sauce|fish sauce|world
oyster-sauce|oyster sauce|world
hoisin|hoisin sauce|world
sesame-oil|toasted sesame oil|world
rice-vinegar|rice vinegar|world
mirin|mirin|world
miso|white miso paste|world
gochujang|gochujang (Korean chilli paste)|world
sriracha|sriracha|world
red-curry-paste|Thai red curry paste|world
green-curry-paste|Thai green curry paste|world
tahini|tahini|world
harissa|harissa paste|world
peanut-butter|peanut butter|pantry
peanuts|roasted peanuts|pantry
cashews|cashew nuts|pantry
almonds|almonds|pantry
ground-almonds|ground almonds|pantry
walnuts|walnuts|pantry
pine-nuts|pine nuts|pantry
pistachios|pistachios|pantry
sesame-seeds|sesame seeds|pantry
desiccated-coconut|desiccated coconut|pantry
capers|capers|pantry
gherkins|gherkin|pantry
olives|black olives|pantry
green-olives|green olives|pantry
sun-dried-tomatoes|sun-dried tomatoes|pantry
roasted-peppers|roasted peppers (jar)|pantry
pesto|basil pesto|pantry
dijon|Dijon mustard|pantry
wholegrain-mustard|wholegrain mustard|pantry
mayonnaise|mayonnaise|pantry
ketchup|tomato ketchup|pantry
worcestershire|Worcestershire sauce|pantry
red-wine-vinegar|red wine vinegar|pantry
white-wine-vinegar|white wine vinegar|pantry
balsamic|balsamic vinegar|pantry
apple-cider-vinegar|apple cider vinegar|pantry
chutney|fruit chutney|pantry
apricot-jam|apricot jam|pantry
pomegranate-molasses|pomegranate molasses|world
preserved-lemon|preserved lemon|world
cumin|ground cumin|spice
cumin-seeds|cumin seeds|spice
coriander-ground|ground coriander|spice
turmeric|ground turmeric|spice
paprika|paprika|spice
smoked-paprika|smoked paprika|spice
chilli-flakes|chilli flakes|spice
chilli-powder|chilli powder|spice
cayenne|cayenne pepper|spice
garam-masala|garam masala|spice
curry-powder|curry powder|spice
cinnamon|ground cinnamon|spice
cinnamon-stick|cinnamon stick|spice|cinnamon sticks
nutmeg|nutmeg|spice
cloves|whole cloves|spice
cardamom|cardamom pods|spice
star-anise|star anise|spice
fennel-seeds|fennel seeds|spice
mustard-seeds|black mustard seeds|spice
dried-oregano|dried oregano|spice
dried-thyme|dried thyme|spice
dried-mixed-herbs|dried mixed herbs|spice
ras-el-hanout|ras el hanout|spice
sumac|sumac|spice
zaatar|za'atar|spice
five-spice|Chinese five-spice|spice
allspice|ground allspice|spice
saffron|saffron|spice
garlic-powder|garlic powder|spice
ground-ginger|ground ginger|spice
curry-leaves|curry leaves|spice
kaffir-lime|lime leaves|spice
peri-peri|peri-peri spice or sauce|spice
dried-chillies|dried chillies|spice|dried chillies
`;

const AISLES: Aisle[] = ['veg', 'meat', 'fish', 'dairy', 'bakery', 'pantry', 'spice', 'world', 'frozen'];
export const AISLE_NAMES: Record<Aisle, string> = {
  veg: 'Fruit, veg & herbs', meat: 'Meat', fish: 'Fish', dairy: 'Dairy & eggs', bakery: 'Bread',
  pantry: 'Cupboard', spice: 'Spices', world: 'World foods', frozen: 'Frozen',
};

export const INGREDIENTS: Record<string, Ingredient> = {};
for (const raw of SRC.trim().split('\n')) {
  const [id, name, aisle, plural, s] = raw.split('|');
  if (!AISLES.includes(aisle as Aisle)) throw new Error(`Bad aisle for ${id}`);
  if (INGREDIENTS[id]) throw new Error(`Ingredient ${id} twice`);
  INGREDIENTS[id] = { id, name, aisle: aisle as Aisle, plural: plural || `${name}s`, staple: s === 's' };
}
export const ingredient = (id: string): Ingredient => {
  const i = INGREDIENTS[id];
  if (!i) throw new Error(`Unknown ingredient ${id}`);
  return i;
};
