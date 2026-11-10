import { test } from '@playwright/test';
const DIR = process.env.SHOTS_DIR ?? '/private/tmp/claude-501/shots';
const TAG = process.env.SHOTS_TAG ?? 'before';
test('screens', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('iphone') || !process.env.SHOTS_TAG, 'pictures only on request');
  await page.goto('./#/stock');
  await page.getByRole('button', { name: 'Start with the usual basics' }).click();
  await page.screenshot({ path: `${DIR}/${TAG}-1-stock.png` });
  await page.goto('./#/discover');
  await page.screenshot({ path: `${DIR}/${TAG}-2-cook.png` });
  await page.goto('./#/r/lentil-bolognese');
  await page.screenshot({ path: `${DIR}/${TAG}-3-recipe.png` });
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.screenshot({ path: `${DIR}/${TAG}-4-recipe-method.png` });
  await page.goto('./#/cook/lentil-bolognese');
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.screenshot({ path: `${DIR}/${TAG}-5-cooking.png` });
  await page.goto('./#/different');
  await page.locator('.chip').first().click();
  await page.screenshot({ path: `${DIR}/${TAG}-6-different.png` });
});
test('screens dark', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('iphone') || !process.env.SHOTS_TAG, 'pictures only on request');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./#/discover');
  await page.screenshot({ path: `${DIR}/${TAG}-7-cook-dark.png` });
  await page.goto('./#/r/thai-green-curry');
  await page.screenshot({ path: `${DIR}/${TAG}-8-recipe-dark.png` });
});
