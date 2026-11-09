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
  await expect(page.locator('.card', { hasText: 'Turkish eggs' })).toHaveCount(0);
  await page.goto('./#/stock');
  await page.getByRole('button', { name: 'Back from the shops: all in' }).click();
  await expect(page.getByText('36 in stock.')).toBeVisible();
  await page.locator('.tabbar a', { hasText: 'Cook' }).click();
  await page.getByRole('tab', { name: 'From my stock' }).click();
  if (info.project.name.startsWith('iphone')) await page.screenshot({ path: 'test-results/shot-fromstock.png' });
  const card = page.locator('.card', { hasText: 'Turkish eggs' }).first();
  await expect(card).toContainText('Nothing to buy');
  await card.click();
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
  await page.locator('.chip', { hasText: 'Weekend project' }).click();
  const n = await page.locator('.card').count();
  expect(n).toBeGreaterThan(10);
  for (const t of await page.locator('.card .meta').allTextContents()) expect(t).toContain('Weekend project');
  for (const b of await page.locator('.card .badge').allTextContents()) expect(b).toMatch(/to buy/);
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
  await expect(page.locator('.card')).toHaveCount(0);
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
