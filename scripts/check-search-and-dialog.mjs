/**
 * Search + dialog-exit check (docs/search-and-animation-performance.md). Loads the production `dist/` at 390x844 with
 * touch and checks, in a real Chromium:
 *   1. nothing downloads the 12 MB catalogue before two characters are typed in Add food,
 *   2. the catalogue is searched in a Web Worker and its results reach the list,
 *   3. typing causes no long main-thread task while the results update (reported; fails above KC_LONGTASK_MS, 200),
 *   4. closing a dialog animates the SAME overlay element (no clone is ever added), it is inert while it leaves, and
 *      nothing is left behind afterwards; typed text is still in the field during the exit,
 *   5. no page errors.
 *
 *   npm run build && npm i --no-save playwright && npx playwright install chromium
 *   node scripts/check-search-and-dialog.mjs
 *   KC_THROTTLE=4 node scripts/check-search-and-dialog.mjs   # CPU throttled 4x (default 1)
 */
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const dist = process.env.KC_TEST_DIST || fileURLToPath(new URL('../dist/', import.meta.url));
const throttle = Number(process.env.KC_THROTTLE || 1);
const longTaskLimit = Number(process.env.KC_LONGTASK_MS || 200);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.bin': 'application/octet-stream', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = normalize(join(dist, path === '/' ? 'index.html' : path));
  try {
    if (!file.startsWith(normalize(dist)) || !(await stat(file)).isFile()) throw new Error('missing');
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const url = `http://127.0.0.1:${server.address().port}/?view=app`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const catalogueRequests = [];
page.on('request', (request) => { if (request.url().includes('off-foods.bin')) catalogueRequests.push(Date.now()); });

if (throttle > 1) {
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: throttle });
}
await page.addInitScript(() => {
  window.__long = [];
  new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ entryTypes: ['longtask'] });
});
await page.goto(url);
await page.waitForSelector('[data-dock-action="food"]', { timeout: 20000 });
await page.waitForTimeout(500);

// ---- Add food: search ----
await page.click('[data-dock-action="food"]');
await page.waitForSelector('[role="dialog"]');
const input = page.locator('[role="dialog"] input[enterkeyhint="search"]');
await input.click();
await page.keyboard.type('n', { delay: 40 });
await page.waitForTimeout(400);
assert.equal(catalogueRequests.length, 0, 'the catalogue must not be fetched for one character');

await page.evaluate(() => { window.__long.length = 0; });
await page.keyboard.type('utella', { delay: 60 });
await page.waitForFunction(() => /off-|Open Food Facts/i.test(document.querySelector('[role="dialog"]')?.textContent ?? '') || document.querySelectorAll('[role="dialog"] button img, [role="dialog"] [data-food-row]').length > 0, null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(800);
assert.ok(catalogueRequests.length >= 1, 'the catalogue is fetched once two characters are typed');
const workers = page.workers().map((w) => w.url());
assert.ok(workers.some((u) => u.includes('offCatalogSearch.worker')), `a catalogue search worker is running (workers: ${workers.join(', ') || 'none'})`);
const dialogText = (await page.locator('[role="dialog"]').innerText()).toLowerCase();
assert.ok(dialogText.includes('nutella'), 'catalogue results for "nutella" are listed');
const long = await page.evaluate(() => window.__long);
const longest = Math.max(0, ...long);
console.log(`typing: ${long.length} long task(s), longest ${longest.toFixed(0)} ms (CPU throttle ${throttle}x)`);
assert.ok(longest < longTaskLimit, `a main-thread task of ${longest.toFixed(0)} ms while typing is over the ${longTaskLimit} ms limit`);

// ---- dialog exit: the live element is animated, never cloned ----
await page.evaluate(() => {
  document.querySelector('.dialog-viewport').__kcLive = true;
  window.__exit = [];
  const sample = () => {
    const nodes = [...document.querySelectorAll('.dialog-viewport')];
    window.__exit.push({ count: nodes.length, live: nodes.filter((n) => n.__kcLive).length, inert: nodes.every((n) => n.inert), text: nodes[0]?.querySelector('input')?.value ?? null });
    if (nodes.length) requestAnimationFrame(sample);
  };
  window.__sampleExit = sample;
});
const typed = await input.inputValue();
await page.evaluate(() => { document.querySelector('[role="dialog"] [aria-label="Close"]').click(); requestAnimationFrame(window.__sampleExit); });
await page.waitForTimeout(700);
// The sampler stops after the first frame without an overlay: that last, empty sample is the end of the exit.
const exit = (await page.evaluate(() => window.__exit)).filter((s) => s.count > 0);
assert.ok(exit.length > 0, 'the dialog stayed on screen for the exit animation');
assert.ok(exit.every((s) => s.count === 1), 'exactly one overlay during the exit (no clone)');
assert.ok(exit.every((s) => s.live === 1), 'the overlay that leaves is the one that was open');
assert.ok(exit.every((s) => s.inert), 'the leaving dialog is inert');
assert.ok(exit.every((s) => s.text === typed), 'typed text stays in the field while it leaves');
const left = await page.evaluate(() => ({ overlays: document.querySelectorAll('.dialog-viewport').length, hostChildren: [...document.querySelectorAll('[data-dialog-host]')].reduce((n, h) => n + h.childElementCount, 0), anim: document.getAnimations().length }));
assert.deepEqual(left, { overlays: 0, hostChildren: 0, anim: 0 }, 'nothing is left behind after the exit');
console.log(`dialog exit: ${exit.length} frame(s) sampled, never more than one overlay`);

// ---- reopen straight away: taps are not lost ----
await page.click('[data-dock-action="food"]');
await page.waitForSelector('[role="dialog"]');
assert.equal(await page.locator('.dialog-viewport').count(), 1, 'the dialog opens again right after closing');

assert.deepEqual(errors, [], 'no page errors');
await browser.close();
server.close();
console.log('search + dialog check passed');
