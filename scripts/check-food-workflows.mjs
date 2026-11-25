import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { chromium } from 'playwright';

// Run against a production Vite build. External recipe and OFF requests are fixture responses.
const root = resolve(process.env.KC_TEST_DIST || 'dist');
const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css', bin: 'application/octet-stream', woff2: 'font/woff2', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!path.startsWith(root + sep)) { res.writeHead(404).end(); return; }
  try { const data = await readFile(path); res.writeHead(200, { 'Content-Type': mime[path.split('.').at(-1)] || 'application/octet-stream' }).end(data); }
  catch { res.writeHead(404).end(); }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const origin = `http://127.0.0.1:${server.address().port}`;
const link = 'https://recipe-fixture.example/banana-bowl';
let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 720 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'UTC' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(6500);
  await page.route(link, (route) => route.fulfill({ contentType: 'text/html', headers: { 'Access-Control-Allow-Origin': '*' },
    body: `<title>Fixture Banana Bowl</title><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Recipe', name: 'Fixture Banana Bowl', recipeYield: 2, recipeIngredient: ['200 g banana', '100 g zzqkjvxwqz', 'salt to taste'] })}</script>` }));
  await page.route('https://world.openfoodfacts.org/api/v2/product/9988776655443.json?*', (route) => route.fulfill({
    json: { status: 1, product: { product_name: 'Test scanned food', nutriments: { 'energy-kcal_100g': 70 } } }, headers: { 'Access-Control-Allow-Origin': '*' },
  }));
  const sheet = () => page.getByRole('dialog').last();
  const button = (name) => sheet().getByRole('button', { name, exact: typeof name === 'string' });
  const dock = (id) => page.locator(`[data-dock-action="${id}"]:visible`).last();
  const tab = (name) => page.locator('nav[aria-label="Primary"]').getByRole('button', { name, exact: true });
  const fixed = (name) => button(name).evaluate((el) => Boolean(el.closest('[data-workflow-footer]') && !el.closest('[data-dialog-scroll]')));
  const leave = () => page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.goto(`${origin}/index.html?view=app&intro=0`);
  await tab('Custom').click();
  await dock('recipe-import').click();
  await sheet().getByLabel('Recipe link', { exact: true }).fill(link);
  await button('Import recipe').click();
  await sheet().getByRole('heading', { name: 'Review ingredients', exact: true }).waitFor();
  assert.equal(await sheet().locator('[data-review-line]').count(), 3);
  assert.ok(await sheet().getByText('200 g banana', { exact: true }).isVisible());
  assert.ok(await sheet().getByText('Automatic match', { exact: true }).first().isVisible());
  assert.equal(await button('Continue to portions').isDisabled(), true);
  await button('Delete: salt to taste').click();
  assert.equal(await sheet().locator('[data-review-line]').count(), 2);
  await button('Undo').click();
  assert.equal(await sheet().locator('[data-review-line]').count(), 3);
  await button('Search for 100 g zzqkjvxwqz').click();
  await button('Add custom food').click();
  await button('Back').click();
  assert.equal(await sheet().getByRole('searchbox').inputValue(), 'zzqkjvxwqz');
  await button('Add custom food').click();
  await sheet().getByLabel('Food name', { exact: true }).fill('Test custom ingredient');
  await button('Save and select').click();
  // A chosen food goes to its quantity first (amount + nutrition); "Use this food" swaps it into the line.
  await sheet().locator('[data-ingredient-amount-step="swap"]').waitFor();
  await button('Use this food').click();
  await sheet().locator('[data-review-line]').filter({ hasText: 'Test custom ingredient' }).waitFor();
  // Imported lines: an icon-only pencil for the quantity and a Swap button with icon and text.
  const banana = sheet().locator('[data-review-line]').filter({ hasText: '200 g banana' });
  assert.equal((await banana.locator('[data-ingredient-edit]').innerText()).trim(), '');
  assert.equal((await banana.locator('[data-ingredient-swap]').innerText()).trim(), 'Swap');
  await banana.locator('[data-ingredient-edit]').click();
  await sheet().locator('[data-ingredient-amount-step="edit"]').waitFor();
  await button('Save amount').click();
  await button('Continue to portions').click();
  const standard = button(/Standard portion/);
  assert.equal(await standard.getAttribute('aria-expanded'), 'false');
  await standard.click();
  await button(/1\/2 ·/).click();
  await standard.click();
  assert.equal(await standard.getAttribute('aria-expanded'), 'false');
  assert.ok(await fixed('Save recipe'));
  await button('Save recipe').click();
  await leave();
  console.log('PASS: imported source and matches, custom replacement with Back, removal + Undo, compact recap and fixed Save');

  await dock('recipe').click();
  await sheet().getByLabel('Recipe name', { exact: true }).fill('Test manual recipe');
  await button('Add Ingredient').click();
  await sheet().getByRole('searchbox').fill('banana');
  await sheet().getByRole('button', { name: /^Banana\b/i }).first().click();
  await sheet().locator('[data-ingredient-amount-step="add"]').waitFor();
  assert.ok(await fixed('Add more'));
  await button('Add to recipe').click();
  // A recipe made by hand: the pencil changes the quantity, there is no Swap.
  assert.equal(await sheet().locator('[data-ingredient-swap]').count(), 0);
  assert.equal(await sheet().locator('[data-ingredient-edit]').count(), 1);
  await button('Continue to portions').click();
  await sheet().getByRole('heading', { name: 'Recipe recap' }).waitFor();
  await button('Save recipe').click();
  await leave();
  await dock('meal').click();
  await sheet().getByLabel('Meal name', { exact: true }).fill('Test saved meal');
  await button('Add Ingredient').click();
  // The quick-add buttons are the Log food tiles (three-column grid), not a "Quick foods" list of pills.
  await sheet().locator('[data-quick-foods]').waitFor();
  await sheet().getByRole('searchbox').fill('banana');
  await sheet().getByRole('button', { name: /^Banana\b/i }).first().click();
  assert.ok(await fixed('Add more'));
  await button('Add to meal').click();
  assert.equal(await sheet().locator('[data-review-line]').count(), 1);
  assert.ok(await fixed('Save Meal'));
  await button('Save Meal').click();
  await leave();
  console.log('PASS: manual recipe review before recap and new meal picker with quick foods and fixed Save');

  await tab('Today').click();
  await dock('food').click();
  const search = () => sheet().getByPlaceholder('Type to search foods...');
  await search().fill('banana');
  await sheet().getByRole('button', { name: /^Banana\b/i }).first().click();
  assert.ok(await fixed('Log food'));
  await button('Add more').click();
  await search().fill('carrot');
  await button('Barcode').click();
  await button('Back').click();
  assert.equal(await search().inputValue(), 'carrot');
  await button('Add custom food').click();
  await page.keyboard.press('Escape');
  assert.equal(await search().inputValue(), 'carrot');
  await button('Barcode').click();
  await sheet().locator('input[inputmode=numeric]').fill('9988776655443');
  await sheet().locator('input[inputmode=numeric]').press('Enter');
  await button('Use this food').click();
  await sheet().getByRole('heading', { name: 'Test scanned food', exact: true }).waitFor();
  assert.ok(await fixed('Log all (2)'));
  await button('Log all (2)').click();
  await leave();
  console.log('PASS: Back/Escape preserve search and queued food, a scanned result joins the same batch');

  await tab('Custom').click();
  const diary = page.locator('.journal-meal-diary');
  await diary.getByRole('button', { name: /^Meal diary/i }).first().click();
  await diary.getByRole('button', { name: 'See all meals', exact: true }).click();
  const yesterday = new Date(Date.now() - 86400000);
  const yesterdayLabel = yesterday.toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const oldMeal = sheet().locator('.journal-diary-result').filter({ hasText: yesterdayLabel }).first();
  await oldMeal.getByRole('button').first().click();
  await button('Edit meal').click();
  const edit = button(/^Edit amount for/).first();
  const previous = await edit.innerText();
  await edit.click();
  await button('Increase').click();
  await button('Save amount').click();
  assert.notEqual(await edit.innerText(), previous);
  const food = button(/^Delete /).first();
  const name = await food.getAttribute('aria-label');
  await food.click();
  await button('Undo').click();
  await button(name).waitFor();
  await button('Done editing').click();
  await button('Go to day').click();
  await page.locator('[data-journal-page="today"]:not([inert])').waitFor();
  await page.locator('[data-cal-trigger][title="Yesterday"]').waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: diary amount editing, logged-food Undo and navigation to the meal day');
} finally {
  await browser?.close();
  server.close();
}
