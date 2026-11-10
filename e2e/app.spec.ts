import { expect, test, type Page } from '@playwright/test';

const noSideScroll = async (page: Page) => {
  const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(w).toBeLessThanOrEqual(0);
};

test('stock list: basics, add, run out, back in -> cook from stock -> recipe -> more people -> swap', async ({ page }, info) => {
  await page.goto('./#/stock');
  await page.getByRole('button', { name: 'Start with the usual basics' }).click();
  await expect(page.getByText('34 in stock.')).toBeVisible();
  for (const word of ['greek', 'sourdough']) {
    await page.getByPlaceholder('Add an ingredient').fill(word);
    await page.locator('.chips .chip', { hasText: new RegExp(`^\\+ ${word}`, 'i') }).first().click();
  }
  await expect(page.getByText('36 in stock.')).toBeVisible();
  // eggs run out: stays on the list, Turkish eggs can't be made from stock
  await page.locator('.stock li', { hasText: /^✓?\s*Egg/ }).locator('.stock-name').click();
  await expect(page.getByText('35 in stock, 1 run out.')).toBeVisible();
  await expect(page.locator('.stock li.out', { hasText: 'Egg' })).toContainText('run out');
  await noSideScroll(page);
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-stock.png' });
  await page.getByRole('link', { name: 'Find a recipe from my stock' }).click();
  await expect(page.getByRole('tab', { name: 'From my stock' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.fold', { hasText: 'Turkish eggs' })).toHaveCount(0);
  await page.goto('./#/stock');
  await page.getByRole('button', { name: 'Back from the shops: all in' }).click();
  await expect(page.getByText('36 in stock.')).toBeVisible();
  await page.locator('.tabbar a', { hasText: 'Cook' }).click();
  await page.getByRole('tab', { name: 'From my stock' }).click();
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-fromstock.png' });
  const card = page.locator('.fold', { hasText: 'Turkish eggs' }).first();
  await expect(card.locator('.badge')).toHaveText('All in stock');
  // the badge sits on the same line as "Turkish · 15 min · Easy · Veg"
  const [mb, bb] = [await card.locator('.fold-meta').boundingBox(), await card.locator('.badge').boundingBox()];
  expect(Math.abs((mb!.y + mb!.height / 2) - (bb!.y + bb!.height / 2))).toBeLessThan(4);
  // folded: name, "Turkish · … · Easy" and the badge show; the description waits behind the arrow
  await expect(card.locator('.fold-meta')).toContainText('Turkish');
  await expect(card.locator('.blurb')).toHaveCount(0);
  await card.getByRole('button', { name: /Show details of Turkish eggs/ }).click();
  await expect(card.locator('.blurb')).toBeVisible();
  await expect(card.locator('.uses')).toContainText('Uses your');
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-fold-open.png' });
  await card.getByRole('button', { name: /Hide details of Turkish eggs/ }).click();
  await expect(card.locator('.blurb')).toHaveCount(0);
  await card.locator('.fold-main').click();
  await expect(page.getByRole('heading', { name: 'Turkish eggs (çılbır)' })).toBeVisible();
  await expect(page.locator('.lines li', { hasText: '8 eggs' })).toBeVisible();
  await page.getByRole('button', { name: 'More people' }).click();
  await expect(page.locator('.serves strong')).toHaveText('5');
  await expect(page.locator('.lines li', { hasText: '10 eggs' })).toBeVisible();
  await expect(page.locator('.lines li', { hasText: '500 g Greek yoghurt' })).toBeVisible();
  await page.locator('.lines li', { hasText: 'Greek yoghurt' }).getByRole('button', { name: 'Swap' }).click();
  await expect(page.getByRole('dialog')).toContainText('500 g plain yoghurt');
  await noSideScroll(page);
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-swap.png' });
  await page.getByRole('button', { name: 'Close' }).click();
  // the servings stay after a reload
  await page.reload();
  await expect(page.locator('.serves strong')).toHaveText('5');
});

test('add your own ingredient that is not on the list', async ({ page }, info) => {
  await page.goto('./#/stock');
  const box = page.getByPlaceholder('Add an ingredient');
  await box.fill('Biltong');
  await expect(page.getByText('Not on our list. Add "Biltong" as your own to:')).toBeVisible();
  await page.locator('.own-add .chip', { hasText: 'Pantry & cupboard' }).click();
  await expect(box).toHaveValue('');
  const row = page.locator('.stock li', { hasText: 'Biltong' });
  await expect(row).toContainText('own');
  await expect(page.getByText('1 in stock.')).toBeVisible();
  // a word the list knows goes on as the real thing, with no "own" offer
  await box.fill('leeks');
  await expect(page.locator('.own-add')).toHaveCount(0);
  await page.locator('.chips .chip', { hasText: /^\+ Leek/ }).first().click();
  await expect(page.locator('.stock li', { hasText: 'Leek' })).not.toContainText('own');
  // run out and back, move it, still there after a reload
  await row.locator('.stock-name').click();
  await expect(row).toContainText('run out');
  await row.getByRole('button', { name: 'Change Biltong' }).click();
  await expect(page.getByRole('dialog')).toContainText("The app's own recipes don't use it");
  await page.getByRole('dialog').getByRole('button', { name: 'Fridge' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Back in stock' }).click();
  await page.reload();
  await expect(page.locator('section', { hasText: 'Fridge' }).locator('.stock li', { hasText: 'Biltong' })).not.toContainText('run out');
  await noSideScroll(page);
  if (info.project.name.startsWith('iphone')) {
    await box.fill('Dragon fruit');
    await page.screenshot({ path: 'test-results/shot-own.png' });
  }
});

test('vegetarian with meat on the side: filter, recipe, plan, shopping, cooking', async ({ page }, info) => {
  await page.goto('./#/find');
  await page.getByRole('tab', { name: 'Free rein' }).click();
  await page.locator('.chip', { hasText: 'Veg + meat on the side' }).click();
  const rows = page.locator('.fold');
  expect(await rows.count()).toBeGreaterThanOrEqual(30);
  for (const t of await page.locator('.fold .fold-meta').allTextContents()) expect(t).toContain('Veg');
  await page.locator('.chip', { hasText: /^Vegetarian$/ }).click();
  expect(await rows.count()).toBeGreaterThan(40);
  await page.locator('.chip', { hasText: 'Veg + meat on the side' }).click();
  const row = page.locator('.fold', { hasText: 'Mushroom stroganoff' });
  await row.getByRole('button', { name: /Show details/ }).click();
  await expect(row.locator('.meatline')).toContainText('seared beef strips, in its own pan');
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-flex.png' });
  await row.locator('.fold-main').click();
  const side = page.locator('.meat-side');
  await expect(side.locator('.meat-count')).toHaveText('2');
  await expect(side.locator('.lines')).toContainText('300 g beef steak');
  await side.getByRole('button', { name: 'More meat-eaters' }).click();
  await expect(side.locator('.lines')).toContainText('450 g beef steak');
  await side.getByRole('button', { name: 'Fewer meat-eaters' }).click();
  await noSideScroll(page);
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-meatside.png', fullPage: true });
  await page.getByRole('button', { name: 'Plan it' }).click();
  await expect(page.getByRole('dialog')).toContainText('plus seared beef strips for 2 meat-eaters');
  await page.getByRole('button', { name: 'Tonight' }).click();
  await page.goto('./#/saved');
  await expect(page.locator('.plan-list')).toContainText('meat on the side for 2');
  await page.locator('.chip', { hasText: 'Shopping' }).click();
  await expect(page.locator('main, .page').first()).toContainText('300 g beef steak');
  await page.goto('./#/cook/mushroom-stroganoff');
  const total = await page.locator('.step-count').textContent();
  const n = Number(/of (\d+)/.exec(total!)![1]);
  for (let i = 1; i < n; i++) await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.locator('.step-big')).toContainText('Meat on the side (own pan)');
});

test('something different from spaghetti bolognese', async ({ page }, info) => {
  await page.goto('./#/different');
  await page.locator('.chip', { hasText: 'Spaghetti bolognese' }).click();
  await expect(page.getByRole('heading', { name: 'Instead of spaghetti bolognese, try' })).toBeVisible();
  const cards = page.locator('.card');
  expect(await cards.count()).toBeGreaterThan(5);
  await expect(cards.first()).toContainText('A change from spaghetti bolognese');
  await noSideScroll(page);
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-different.png' });
  await page.getByPlaceholder('e.g. spaghetti bolognese').fill('spag bol');
  await expect(page.getByRole('heading', { name: 'Instead of spaghetti bolognese, try' })).toBeVisible();
});

test('plan two recipes, shopping list adds them up, ticks survive a reload', async ({ page }, info) => {
  await page.goto('./#/r/shakshuka');
  await page.getByRole('button', { name: 'Plan it' }).click();
  await page.getByRole('button', { name: 'Tomorrow' }).click();
  await expect(page.getByRole('button', { name: 'Planned: Tomorrow' })).toBeVisible();
  await page.goto('./#/r/cilbir');
  await page.getByRole('button', { name: 'Fewer people' }).click();
  await page.getByRole('button', { name: 'Fewer people' }).click();
  await page.getByRole('button', { name: 'Plan it' }).click();
  await page.getByRole('button', { name: 'Some day' }).click();
  await page.goto('./#/saved');
  await expect(page.locator('.tabbar')).toContainText('Saved (2)');
  await page.locator('.chip', { hasText: 'Shopping' }).click();
  const eggs = page.locator('.shop li', { hasText: '12 eggs' });
  await expect(eggs).toBeVisible();
  await eggs.click();
  await expect(eggs).toHaveClass(/done/);
  await noSideScroll(page);
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-shopping.png', fullPage: true });
  await page.reload();
  await page.locator('.chip', { hasText: 'Shopping' }).click();
  await expect(page.locator('.shop li', { hasText: '12 eggs' })).toHaveClass(/done/);
});

test('free rein filters, surprise, cooking view, hide', async ({ page }, info) => {
  await page.goto('./#/discover'); // the first version's address lands on Free rein
  await expect(page.getByRole('tab', { name: 'Free rein' })).toHaveAttribute('aria-selected', 'true');
  // foreign names carry a short English meaning
  await page.getByPlaceholder('Search: a dish').fill('ceci');
  await expect(page.locator('.fold-main strong').first()).toHaveText('Pasta e ceci (pasta and chickpeas)');
  await page.getByPlaceholder('Search: a dish').fill('');
  await page.locator('.chip', { hasText: 'Weekend project' }).click();
  const n = await page.locator('.fold').count();
  expect(n).toBeGreaterThan(10);
  for (const t of await page.locator('.fold .fold-meta').allTextContents()) expect(t).toContain('Weekend project');
  for (const b of await page.locator('.fold .badge').allTextContents()) expect(b).toMatch(/to buy/);
  // every row starts folded, so the names are what you scroll through
  await expect(page.locator('.fold .blurb')).toHaveCount(0);
  await noSideScroll(page);
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-free.png' });
  await page.getByRole('button', { name: 'Surprise me' }).click();
  await expect(page).toHaveURL(/#\/r\//);
  await page.goto('./#/r/pasta-norma');
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-recipe.png', fullPage: true });
  await page.getByRole('link', { name: 'Start cooking' }).first().click();
  await expect(page.locator('.step-count')).toHaveText('Step 1 of 8');
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.locator('.step-count')).toHaveText('Step 2 of 8');
  await noSideScroll(page);
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-cook.png' });
  await page.goto('./#/r/pasta-norma');
  await page.getByRole('button', { name: 'I know this one' }).click();
  await page.goto('./#/find');
  await page.getByRole('tab', { name: 'Free rein' }).click();
  await page.getByPlaceholder('Search: a dish').fill('norma');
  await expect(page.locator('.fold')).toHaveCount(0);
});

test('works with no signal once opened', async ({ page, context }, info) => {
  // Playwright's WebKit reports "internal error" when offline is emulated with a service worker (a test-tool limit).
  test.skip(info.project.name.startsWith('iphone'), 'offline emulation not supported by the WebKit test engine');
  await page.goto('./');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.goto('./#/r/pho');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Beef pho' })).toBeVisible();
});

test('favourite star on a list row: one tap, shows under Saved > Favourites', async ({ page }) => {
  await page.goto('./#/discover');
  const row = page.locator('.fold').first();
  const title = (await row.locator('.fold-main strong').textContent())!;
  await row.getByRole('button', { name: `Add ${title} to favourites` }).click();
  await expect(row.getByRole('button', { name: `Take ${title} off favourites` })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('./#/saved');
  await page.locator('.chip', { hasText: 'Favourites (1)' }).click();
  await expect(page.locator('.card', { hasText: title })).toBeVisible();
  // and off again from the card's own star
  await page.getByRole('button', { name: `Take ${title} off favourites` }).click();
  await expect(page.locator('.chip', { hasText: 'Favourites (0)' })).toBeVisible();
});

const FB = `Tasty Home Cooking · Follow
Creamy Garlic Butter Chicken
Serves 4 | Prep 10 min | Cook 25 min
Ingredients:
• 4 chicken breasts
• 3 tbsp butter
• 6 garlic cloves, minced
• 1 cup heavy cream
• 1 tsp liquid smoke
Instructions:
1. Fry the chicken 6-7 minutes per side.
2. Melt the butter, add the garlic, then the cream. Return the chicken.
1.2K Likes
Share`;

test('import from pasted text: sorted into a recipe, scales, favourite, in the Imports list', async ({ page }, info) => {
  await page.goto('./#/imports');
  await expect(page.getByText('Nothing imported yet.')).toBeVisible();
  await page.getByRole('link', { name: '+ Add a recipe from a picture' }).click();
  await page.getByRole('button', { name: 'Paste text instead' }).click();
  await page.getByPlaceholder('Paste the recipe here').fill(FB);
  await page.getByRole('button', { name: 'Sort it into a recipe' }).click();
  await expect(page.getByLabel('Name')).toHaveValue('Creamy Garlic Butter Chicken');
  await expect(page.getByLabel('Minutes (if known)')).toHaveValue('35');
  await expect(page.getByLabel('Ingredients: one per line, amount first')).toHaveValue('4 chicken breasts\n3 tbsp butter\n6 garlic cloves, minced\n1 cup heavy cream\n1 tsp liquid smoke');
  await page.locator('.understood summary').click();
  await expect(page.locator('.understood summary')).toContainText('4 of 5 it knows');
  await noSideScroll(page);
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-import-form.png', fullPage: true });
  await page.getByRole('button', { name: 'Save to my imports' }).click();
  await expect(page.getByRole('heading', { name: 'Creamy Garlic Butter Chicken' })).toBeVisible();
  await expect(page.locator('.facts')).toHaveText(/35 min.*Your import/);
  await expect(page.locator('.lines li', { hasText: '6 garlic cloves, minced' })).toBeVisible();
  await page.getByRole('button', { name: 'More people' }).click();
  await page.getByRole('button', { name: 'More people' }).click();
  await page.getByRole('button', { name: 'More people' }).click();
  await page.getByRole('button', { name: 'More people' }).click();
  await expect(page.locator('.lines li', { hasText: '8 chicken breasts' })).toBeVisible();
  await expect(page.locator('.lines li', { hasText: '2 cups heavy cream' })).toBeVisible();
  await page.getByRole('button', { name: '☆ Favourite' }).click();
  await expect(page.getByRole('button', { name: '★ Favourite' })).toBeVisible();
  await expect(page.locator('.steps li')).toHaveCount(2);
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-import-recipe.png', fullPage: true });
  // it survives a reload, sits in Imports with its star on, and can be changed
  await page.reload();
  await page.locator('.tabbar a', { hasText: 'Imports' }).click();
  const card = page.locator('.card-wrap', { hasText: 'Creamy Garlic Butter Chicken' });
  await expect(card.locator('.fav-star')).toHaveAttribute('aria-pressed', 'true');
  await card.locator('.card').click();
  await page.getByRole('link', { name: 'Change it' }).click();
  await page.getByLabel('Name').fill('Garlic butter chicken');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Garlic butter chicken' })).toBeVisible();
  // planned, it goes on the shopping list: the new thing under Other
  await page.getByRole('button', { name: 'Plan it' }).click();
  await page.getByRole('button', { name: 'Tomorrow' }).click();
  await page.goto('./#/saved');
  await page.locator('.chip', { hasText: 'Shopping' }).click();
  await expect(page.locator('section', { hasText: 'Other' }).locator('.shop li', { hasText: 'liquid smoke' })).toBeVisible();
  // deleted: gone from imports, favourites and the plan
  await page.goto('./#/imports');
  await page.locator('.card', { hasText: 'Garlic butter chicken' }).click();
  await page.getByRole('link', { name: 'Change it' }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete this recipe' }).click();
  await expect(page.getByText('Nothing imported yet.')).toBeVisible();
  await expect(page.locator('.tabbar')).toContainText('Saved');
  await expect(page.locator('.tabbar')).not.toContainText('Saved (1)');
});

// A "screenshot" drawn in the browser: a recipe in plain type, as a phone would show it.
const drawRecipe = (page: Page) => page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 900; c.height = 1100;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#111';
    const rows = ['Banana Oat Muffins', '', 'Makes 12', '', 'Ingredients', '2 ripe bananas', '200 g plain flour', '100 g oats', '2 eggs', '120 ml milk', '',
      'Method', '1. Mash the bananas and mix in the eggs and milk.', '2. Stir in the flour and oats.', '3. Bake for 20 minutes at 180 C.'];
    let y = 70;
    for (const r of rows) { g.font = r === 'Banana Oat Muffins' ? 'bold 48px Arial' : '34px Arial'; g.fillText(r, 50, y); y += r ? 58 : 30; }
    return c.toDataURL('image/png').split(',')[1];
  });

test('import from a picture: the phone reads the words off it', async ({ page }, info) => {
  test.setTimeout(150_000);
  await page.goto('./#/imports');
  const png = await drawRecipe(page);
  await page.getByRole('link', { name: '+ Add a recipe from a picture' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'screenshot.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.getByLabel('Name')).toHaveValue('Banana Oat Muffins', { timeout: 120_000 });
  await expect(page.getByLabel('Serves')).toHaveValue('12');
  const ings = await page.getByLabel('Ingredients: one per line, amount first').inputValue();
  expect(ings).toContain('200 g plain flour');
  expect(ings).toContain('2 eggs');
  expect((await page.getByLabel('Method: one step per line').inputValue()).split('\n')).toHaveLength(3);
  await expect(page.locator('.thumbs img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save to my imports' }).click();
  await expect(page.getByRole('heading', { name: 'Banana Oat Muffins' })).toBeVisible();
  // it opens at its own amount (makes 12), not scaled to the usual 4
  await expect(page.locator('.serves strong').first()).toHaveText('12');
  await expect(page.locator('.lines li', { hasText: '2 ripe bananas' })).toBeVisible();
  // the picture is kept with the recipe
  await expect(page.getByRole('heading', { name: 'The original picture' })).toBeVisible();
  await expect(page.locator('.thumbs img')).toHaveCount(1);
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-import-picture.png', fullPage: true });
});

test('the picture reader works with no signal once it has been used', async ({ page, context }, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'offline emulation not supported by the WebKit test engine');
  test.setTimeout(150_000);
  await page.goto('./#/imports');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); // now the service worker looks after the page
  const png = await drawRecipe(page);
  const pick = async () => {
    await page.goto('./#/import/new');
    await page.locator('input[type=file]').setInputFiles({ name: 'screenshot.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await expect(page.getByLabel('Name')).toHaveValue('Banana Oat Muffins', { timeout: 120_000 });
  };
  await pick(); // first time: fetches the reader
  await context.setOffline(true);
  await page.reload();
  await pick(); // no signal: from the phone's copy
});

test('recipe page: tick off ingredients and steps; cooking view: timer from the step, what the step needs', async ({ page }, info) => {
  await page.clock.install();
  await page.goto('./#/r/lentil-bolognese');
  const oil = page.locator('.lines li', { hasText: 'olive oil' });
  await oil.click();
  await expect(oil).toHaveClass(/ticked/);
  await oil.click();
  await expect(oil).not.toHaveClass(/ticked/);
  // Swap opens its sheet without ticking the line
  const tom = page.locator('.lines li', { hasText: 'chopped tomatoes' });
  await tom.getByRole('button', { name: 'Swap' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(tom).not.toHaveClass(/ticked/);
  await page.locator('.method li').first().click();
  await expect(page.locator('.method li').first()).toHaveClass(/done/);
  await page.locator('.hero-cook').click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.locator('.step-ings')).toContainText('250 g brown mushrooms');
  await page.getByRole('button', { name: 'Start a 8 minutes timer' }).click();
  await expect(page.locator('.timer')).toContainText('8:00');
  await page.clock.runFor(61_000);
  await expect(page.locator('.timer')).toContainText('6:59');
  // keeps running on the next step
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.locator('.step-ings')).toContainText('150 g green or brown lentils');
  await page.clock.runFor(8 * 60_000);
  await expect(page.locator('.timer')).toContainText('Done!');
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-timer.png' });
  await page.locator('.timer').click({ force: true }); // it pulses when done, which a test calls 'not stable'
  await expect(page.locator('.timer')).toHaveCount(0);
});
