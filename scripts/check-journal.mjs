import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const dist = process.env.KC_TEST_DIST || fileURLToPath(new URL('../dist/', import.meta.url));
const files = new Map(await Promise.all([
  ['/index.html', 'text/html'], ['/offline-worker.js', 'text/javascript'], ['/data/off-foods.bin', 'application/octet-stream'],
].map(async ([url, type]) => [url, [type, await readFile(resolve(dist, url.slice(1)))]])));
const catalogue = files.get('/data/off-foods.bin')[1];
assert.ok(catalogue.readUInt32LE(8) >= 100000);
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = files.get(path === '/' ? '/index.html' : path);
  res.writeHead(file ? 200 : 404, { 'Content-Type': file?.[0] ?? 'text/plain' });
  res.end(file?.[1]);
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const url = `http://127.0.0.1:${server.address().port}/?view=app`;
let browser;
try {
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(6000);
  const errors = [];
  let documents = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (request.isNavigationRequest()) documents++; });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const sheet = page.getByRole('dialog');
  const tab = (name) => page.locator('nav[aria-label="Primary"]').getByRole('button', { name, exact: true });
  const button = (name) => page.getByRole('button', { name, exact: true });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: x == null ? [] : [{ x, y }] });
  const draw = async (x, y, dx, dy) => {
    await touch('touchStart', x, y);
    for (let i = 1; i <= 6; i++) await touch('touchMove', x + dx * i / 6, y + dy * i / 6);
  };
  const swipe = async (dx) => { await draw(195, 420, dx, 0); await touch('touchEnd'); };
  const settled = async (name) => {
    await page.waitForFunction((expected) => {
      const panel = document.querySelector('[data-journal-page]:not([inert])');
      const rail = document.querySelector('[data-page-rail]');
      if (panel?.dataset.journalPage !== expected || !rail || document.querySelector('.kc-page-moving')) return false;
      const r = panel.getBoundingClientRect();
      const y = Math.max(document.querySelector('header').getBoundingClientRect().bottom + 25, r.top + 12);
      return r.left >= 0 && r.right <= innerWidth + 1 && rail.getAnimations().length === 0 &&
        getComputedStyle(rail).transform === 'none' && panel.contains(document.elementFromPoint(innerWidth / 2, y));
    }, name).catch(async (error) => {
      console.error('Expected settled page:', name, await page.evaluate(() => ({
        tab: document.querySelector('nav [aria-current]')?.getAttribute('aria-label'),
        pages: [...document.querySelectorAll('[data-journal-page]')].map((el) => [el.dataset.journalPage, el.getBoundingClientRect().toJSON()]),
        scroll: window.scrollY, moving: document.documentElement.className,
        rail: getComputedStyle(document.querySelector('[data-page-rail]')).transform,
      })));
      throw error;
    });
  };

  // Start on empty bottom padding, not a card. The preview must become the actual page.
  await settled('today');
  await page.waitForFunction(() => !document.querySelector('.anim-dock')?.getAnimations().some((a) => a.playState === 'running'));
  const blank = await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    for (let y = innerHeight - 10; y > innerHeight - 120; y -= 5) {
      const x = innerWidth - 12, el = document.elementFromPoint(x, y);
      if (el?.closest('main') && !el.closest('[data-journal-page]')) return { x, y };
    }
    throw new Error('Blank journal padding was not hit-testable');
  });
  await draw(blank.x, blank.y, -145, 0);
  const previewNode = await page.locator('[data-journal-page="prebuilt"] [data-library-section="meals"]').elementHandle();
  assert.ok(previewNode);
  assert.ok(await previewNode.evaluate((el) => el.getBoundingClientRect().top < innerHeight), 'Preview is above the fold even when leaving a scrolled page');
  assert.equal(await page.locator('.kc-page-moving').count(), 1);
  await touch('touchEnd');
  await settled('prebuilt');
  assert.ok(await previewNode.evaluate((node) => node.isConnected && !node.closest('[inert]')), 'Preview remounted on release');
  for (let i = 0; i < 3; i++) {
    await swipe(130);
    await swipe(-130);
    await settled('prebuilt');
  }
  await draw(190, 430, 74, 0); await touch('touchCancel'); await settled('prebuilt');
  await swipe(130); await tab('Statistics').tap(); await settled('history');
  await tab('Today').tap(); await settled('today');
  console.log('PASS: blank-space swipe, retained destination, repeated interruptions, cancellation and tab tap');

  await page.evaluate(() => window.scrollTo({ top: 230, behavior: 'instant' }));
  const scroll = await page.evaluate(() => window.scrollY);
  const background = await page.locator('[data-journal-page="today"]').elementHandle();
  const dock = await page.locator('.anim-dock').elementHandle();
  await page.locator('.anim-dock').getByRole('button', { name: 'Water', exact: true }).tap();
  await sheet.waitFor();
  const grip = async () => {
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]').getAnimations().some((a) => a.playState === 'running'));
    const r = await page.locator('[data-sheet-handle]').boundingBox();
    return [r.x + r.width / 2, r.y + r.height / 2];
  };
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY), 'none');
  await draw(...await grip(), 0, 40); await touch('touchCancel');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[role="dialog"]')).transform === 'none');
  await draw(...await grip(), 0, 148); await touch('touchEnd');
  await sheet.waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => window.scrollY), scroll);
  assert.ok(await background.evaluate((el) => el.isConnected));
  assert.ok(await dock.evaluate((el) => el.isConnected));
  assert.equal(documents, 1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await swipe(-140); await settled('prebuilt');
  console.log('PASS: sheet cancel/dismiss, unchanged page, dock and scroll position, reduced motion');

  await button('Settings').tap();
  await sheet.getByRole('button', { name: /today & pages/i }).tap();
  await button('Track sugar intake').tap();
  await button('Close').tap();
  await ctx.route('**/data/off-foods.bin', (route) => route.fulfill({ status: 404, body: '' }), { times: 1 });
  await button('Browse Foods').tap();
  await button('Try again').tap();
  const count = () => page.locator('[data-catalogue-count]').evaluate((e) => Number(e.textContent.replace(/\D/g, '')));
  await page.waitForFunction(() => Number(document.querySelector('[data-catalogue-count]').textContent.replace(/\D/g, '')) >= 130000);
  const total = await count();
  const rows = page.locator('[data-food-id]');
  assert.equal(await rows.count(), 36);
  const search = page.locator('main input[enterkeyhint="search"]');
  await search.fill('pasta');
  assert.ok(await count() > 2000);
  const first = await rows.first().getAttribute('data-food-id');
  await button('Next foods').tap();
  assert.notEqual(await rows.first().getAttribute('data-food-id'), first);
  await button('Previous foods').tap();
  assert.equal(await rows.first().getAttribute('data-food-id'), first);
  await search.fill('');
  await button('Dairy & Eggs').tap();
  assert.ok(await count() < total && await count() > 100);
  await button('All Categories').tap();
  await search.fill('8013355501520');
  const product = page.locator('[data-food-id="off-8013355501520"]');
  await product.waitFor();
  assert.equal(await count(), 1);
  await product.getByRole('button', { name: 'Add to favourites' }).tap();
  await button('Favourites').tap();
  assert.equal(await count(), 1, 'A remembered catalogue product must not be counted twice');
  await product.getByRole('button', { name: 'Add Food' }).tap();
  for (const key of ['fiber', 'salt', 'sugar']) {
    const field = sheet.locator(`[data-nutrient="${key}"]`);
    assert.equal(await field.locator('svg').count(), 1);
    assert.equal(await field.evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(247, 233, 170)');
    assert.match(await field.getAttribute('aria-label'), new RegExp(key, 'i'));
    assert.doesNotMatch(await field.innerText(), /fiber|salt|sugar/i);
  }
  await sheet.locator('input').fill('50');
  assert.match(await sheet.locator('[data-nutrient="sugar"]').innerText(), /25g/);
  await sheet.getByRole('button', { name: /^Add to Meal/ }).tap();
  await sheet.waitFor({ state: 'detached' });
  await tab('Today').tap();
  assert.match(await page.locator('[data-nutrient="sugar"]').getAttribute('aria-label'), /25 g/);
  assert.equal(documents, 1);
  assert.deepEqual(errors, []);
  console.log(`PASS: ${total.toLocaleString('en-US')} browsable foods, retry, paging, search, filters, favourites, quantity icons and logging`);

  // Recover installations where the host previously served an HTML fallback at the binary URL.
  const cached = await browser.newContext();
  const offline = await cached.newPage();
  offline.setDefaultTimeout(6000);
  await offline.goto(url);
  await offline.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await offline.evaluate(async () => {
    const cache = await caches.open('kakcalculator-data-v1');
    await cache.put('/data/off-foods.bin', new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }));
  });
  const openCatalogue = async () => {
    await offline.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Custom', exact: true }).click();
    await offline.getByRole('button', { name: 'Browse Foods', exact: true }).click();
    await offline.waitForFunction(() => Number(document.querySelector('[data-catalogue-count]')?.textContent.replace(/\D/g, '')) >= 130000);
  };
  await openCatalogue();
  await cached.setOffline(true);
  await offline.reload();
  await openCatalogue();
  await offline.locator('main input[enterkeyhint="search"]').fill('8013355501520');
  await offline.locator('[data-food-id="off-8013355501520"]').waitFor();
  console.log('PASS: stale HTML catalogue cache is repaired; the full database reopens and searches offline');
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}