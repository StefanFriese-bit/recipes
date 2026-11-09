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
  await expect(page.getByRole('dialog')).toContainText('none of the recipes use it yet');
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
  await page.getByRole('link', { name: 'Start cooking' }).click();
  await expect(page.locator('.step-count')).toHaveText('Step 1 of 6');
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.locator('.step-count')).toHaveText('Step 2 of 6');
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
