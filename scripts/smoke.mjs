import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

// Serve the actual built artifacts, never a stale precompiled test application.
const web = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const native = await readFile(new URL('../android/app/src/main/assets/public/index.html', import.meta.url), 'utf8');
assert.ok(native.includes('android-local-no-demo'), 'Run node scripts/prepare-android.mjs first');
assert.ok(!web.includes('android-local-no-demo'), 'Then run npm run build for the browser tour');
const worker = await readFile(new URL('../public/offline-worker.js', import.meta.url), 'utf8');

// Launcher PNGs must match the supplied icon at every density, plus the Play Store size.
const pngSize = async (file) => {
  const bytes = await readFile(new URL(`../${file}`, import.meta.url));
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG', file);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
};
for (const [dir, legacy, adaptive] of [['mipmap-mdpi', 48, 108], ['mipmap-hdpi', 72, 162], ['mipmap-xhdpi', 96, 216], ['mipmap-xxhdpi', 144, 324], ['mipmap-xxxhdpi', 192, 432]]) {
  const res = `android/app/src/main/res/${dir}/`;
  assert.deepEqual(await pngSize(`${res}ic_launcher.png`), [legacy, legacy]);
  assert.deepEqual(await pngSize(`${res}ic_launcher_round.png`), [legacy, legacy]);
  assert.deepEqual(await pngSize(`${res}ic_launcher_foreground.png`), [adaptive, adaptive]);
}
assert.deepEqual(await pngSize('android/store/kakcalculator-play-icon-512.png'), [512, 512]);
console.log('PASS: launcher, round, adaptive and Play Store PNG sizes match the supplied icon.');

const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const body = path === '/native/' ? native : path === '/offline-worker.js' ? worker :
    path === '/' || path === '/index.html' ? web : null;
  res.writeHead(body === null ? 404 : 200, {
    'Content-Type': path.endsWith('.js') ? 'application/javascript' : 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(body);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  ctx.on('request', (r) => { if (/^https?:/.test(r.url()) && !r.url().startsWith(base + '/')) external.push(r.url()); });

  // 1. The tour opens by default, with the transparent wordmark and the kept links.
  await page.goto(base + '/');
  await page.getByRole('heading', { level: 1, name: 'See how Kakcalculator works' }).waitFor();
  assert.equal(await page.locator('header svg rect[fill="#FBF3E3"]').count(), 0, 'Wordmark still has its cream plate');
  assert.equal(await page.locator('header svg text').count(), 1, 'Wordmark text missing');
  assert.equal(await page.locator('header svg text').first().evaluate((el) => el.closest('svg').querySelector('path') !== null), true);
  // Open full app appears in the header and under the phone; both must point to the plain journal.
  const openLinks = page.getByRole('link', { name: 'Open full app', exact: true });
  assert.equal(await openLinks.count(), 2);
  for (const link of await openLinks.all()) assert.equal(await link.getAttribute('href'), `${base}/?view=app`);
  assert.equal(await page.getByRole('link', { name: 'Android project', exact: true }).getAttribute('href'), './downloads/Kakcalculator-Android-Studio.zip');
  console.log('PASS: the tour opens on the welcome page, with a transparent wordmark, Open full app and the Android project link.');

  // 2. Every page is explained, in the order of the step list.
  const titles = ['How Kakcalculator works', 'Today', 'Meals', 'Add food', 'Activity', 'Water', 'Poop', 'Weight',
    'Day overview', 'Custom', 'Period', 'Statistics', 'Profile', 'Settings', 'Home-screen widgets'];
  const chips = page.getByRole('navigation', { name: 'Pages' }).getByRole('button');
  assert.equal(await chips.count(), titles.length);
  for (const [index, title] of titles.entries()) {
    await chips.nth(index).click();
    await page.locator('h2#tour-step-title', { hasText: title }).waitFor();
  }
  console.log(`PASS: all ${titles.length} pages are explained in order, ending with the widgets.`);

  // 3. The live journal responds to each page of the tour.
  const frame = page.frameLocator('iframe');
  await chips.nth(titles.indexOf('Statistics')).click();
  await frame.getByRole('navigation', { name: 'Primary' }).locator('[aria-current="page"]').filter({ hasText: 'Statistics' }).waitFor();
  await chips.nth(titles.indexOf('Settings')).click();
  await frame.getByRole('dialog', { name: 'Settings', exact: true }).waitFor();
  await chips.nth(titles.indexOf('Day overview')).click();
  await frame.getByRole('dialog', { name: 'Day overview', exact: true }).waitFor();
  await chips.nth(titles.indexOf('Period')).click();
  await frame.getByRole('navigation', { name: 'Primary' }).locator('[aria-current="page"]').filter({ hasText: 'Period' }).waitFor();
  console.log('PASS: Statistics, Settings, Day overview and Period open in the live journal.');

  // 4. The widgets come last and drive the same dialogs as the journal's own docks.
  await chips.nth(titles.indexOf('Home-screen widgets')).click();
  await page.getByRole('button', { name: 'Small widget: Food', exact: true }).waitFor();
  const shortcuts = {
    Food: 'Add Food', Movement: 'Log Activity', Water: 'Add Water', Poop: 'Log Poop', Weight: 'Log Weight',
  };
  for (const [name, actions] of [['Small widget', Object.keys(shortcuts)], ['Extra-small widget', ['Food', 'Water', 'Poop']], ['Medium widget', Object.keys(shortcuts)], ['Large widget', Object.keys(shortcuts)]]) {
    for (const action of actions) {
      const button = page.getByRole('button', { name: `${name}: ${action}`, exact: true });
      assert.equal((await button.innerText()).trim(), '', 'Widget buttons must be icon-only');
      await button.click();
      const dialog = frame.getByRole('dialog', { name: shortcuts[action], exact: true });
      await dialog.waitFor();
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
    }
  }
  console.log('PASS: all 18 default widget shortcuts open the intended logging dialogs.');

  // 5. The Large widget has no brand, no "today" tag, and shows the Ultra minimal arrangement.
  const large = page.getByRole('group', { name: 'Large widget', exact: true });
  const largeText = await large.innerText();
  assert.doesNotMatch(largeText, /today|kakcalculator/i, 'Large widget still shows a brand or "today"');
  assert.equal((largeText.match(/%/g) ?? []).length, 3, 'Carbs, protein and fat percentages expected');
  assert.equal(await large.getByRole('img', { name: /^Intake: .* kcal$/ }).count(), 1);
  assert.equal(await large.getByRole('img', { name: /^Burned: .* kcal$/ }).count(), 1);
  console.log('PASS: the Large widget shows intake, burned and macros, with no logo, name or "today".');

  // 6. The journal and the tour both follow the chosen language.
  await page.getByRole('button', { name: 'it', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Scopri come funziona Kakcalculator' }).waitFor();
  await page.getByRole('button', { name: 'en', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'See how Kakcalculator works' }).waitFor();
  console.log('PASS: the language switch reloads the tour in Italian and back.');

  // 7. Offline: the cached shell still opens the tour and widget actions still work.
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 15000 });
  await ctx.setOffline(true);
  await page.goto(base + '/#widgets');
  await page.getByRole('button', { name: 'Small widget: Water', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Small widget: Water', exact: true }).click();
  await frame.getByRole('dialog', { name: 'Add Water', exact: true }).getByRole('button', { name: /Add water.*250 ml/i }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Extra-small widget: Water', exact: true }).click();
  assert.match(await frame.getByRole('dialog').innerText(), /1000\s*\//);
  await frame.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await ctx.setOffline(false);
  console.log('PASS: the tour reopens offline, and water logged there persists after a reload.');

  // 8. The journal's own Ultra minimal view keeps the supplied salt drawing.
  const paths = ['M12 3l9 9-9 9-9-9z', 'M12 8l4 4-4 4-4-4z', 'M12 3v5M21 12h-5M12 21v-5M3 12h5'];
  await page.goto(base + '/?view=app');
  await page.getByRole('button', { name: 'Kakcalculator', exact: true }).waitFor();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('kcalsync_settings') ?? '{}');
    localStorage.setItem('kcalsync_settings', JSON.stringify({ ...s, ultraMinimal: true }));
  });
  await page.reload();
  const salt = page.locator(`svg:has(path[d="${paths[0]}"])`).first();
  await salt.waitFor({ state: 'attached' });
  assert.deepEqual(await salt.locator('path').evaluateAll((els) => els.map((p) => p.getAttribute('d'))), paths);
  assert.equal(await salt.getAttribute('stroke-width'), '2');
  console.log('PASS: the supplied salt drawing is used in Ultra minimal mode.');

  // 9. A clean, self-contained Android bundle: no remote requests and no demo data.
  const clean = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const app = await clean.newPage();
  app.setDefaultTimeout(8000);
  app.on('pageerror', (e) => errors.push(e.message));
  await clean.route('**/*', (route) => route.request().url() === base + '/native/'
    ? route.fulfill({ contentType: 'text/html', body: native }) : route.abort());
  await clean.setOffline(true);
  await app.goto(base + '/native/');
  await app.locator('[data-energy-overview]').waitFor();
  assert.equal(await app.locator('iframe').count(), 0);
  assert.match(await app.locator('[data-energy-overview] > div').first().getAttribute('aria-label'), /: 0 kcal/);
  assert.equal(await app.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('kcalsync_day_logs') || '{}')).length), 0);
  await app.waitForFunction(
    () => [...document.fonts].some((f) => f.family.replace(/["']/g, '') === 'Nunito' && f.weight === '800' && f.status === 'loaded'),
    null,
    { timeout: 7000 },
  );
  console.log('PASS: the Android bundle starts empty and offline, with its bundled Nunito wordmark.');

  // 10. Native swipe, Back and widget delivery, simulated at the protocol level only.
  const input = await clean.newCDPSession(app);
  const swipe = async (points) => {
    for (const [i, [x, y]] of points.entries()) {
      await input.send('Input.dispatchTouchEvent', { type: i ? 'touchMove' : 'touchStart', touchPoints: [{ x, y }] });
    }
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await app.waitForFunction(() => !document.documentElement.classList.contains('kc-page-moving'));
  };
  const current = () => app.locator('nav[aria-label="Primary"] [aria-current="page"]').getAttribute('aria-label');
  await swipe([[200, 330], [195, 390], [60, 410]]); assert.equal(await current(), 'Today');
  await swipe([[387, 330], [180, 334]]); assert.equal(await current(), 'Today');
  await swipe([[300, 330], [170, 333], [80, 335]]); assert.equal(await current(), 'Custom');
  await swipe([[80, 335], [260, 332]]); assert.equal(await current(), 'Today');
  console.log('PASS: horizontal swipes move between pages; vertical and edge gestures do not.');

  // Installed before the reload, so the bundle sees the Android platform and the bridge at start-up.
  await clean.addInitScript(() => {
    const listeners = {};
    window.androidBridge = {};
    const fixture = (window.widgetFixture = { pending: 'weight', daily: null, minimized: 0, emit: (name) => listeners[name]?.({}) });
    const method = (name, rtype = 'promise') => ({ name, rtype });
    window.Capacitor = {
      PluginHeaders: [
        { name: 'JournalDevice', methods: [method('takeWidgetAction'), method('publishNutrition'), method('addListener', 'callback'), method('removeListener')] },
        { name: 'App', methods: [method('minimizeApp'), method('addListener', 'callback'), method('removeListener')] },
      ],
      nativeCallback: (_plugin, _method, options, callback) => { listeners[options.eventName] = callback; return options.eventName; },
      nativePromise: async (_plugin, name, options) => {
        if (name === 'takeWidgetAction') { const action = fixture.pending; fixture.pending = null; return { action }; }
        if (name === 'publishNutrition') fixture.daily = options;
        if (name === 'minimizeApp') fixture.minimized++;
        if (name === 'removeListener') delete listeners[options.eventName];
        return {};
      },
    };
  });
  await app.reload();
  await app.getByRole('dialog', { name: 'Log Weight' }).waitFor();
  await app.evaluate(() => window.widgetFixture.emit('backButton'));
  await app.getByRole('dialog').waitFor({ state: 'hidden' });
  await app.getByRole('button', { name: 'Previous day', exact: true }).click();
  await app.evaluate(() => { window.widgetFixture.pending = 'food'; window.widgetFixture.emit('widgetActionAvailable'); });
  await app.getByRole('dialog', { name: 'Add Food', exact: true }).getByRole('button', { name: /White Bread Roll/ }).click();
  await app.getByRole('dialog').getByRole('button', { name: /Add another item/ }).click();
  await app.getByRole('dialog').getByRole('button', { name: /Log all/ }).click();
  await app.waitForFunction(() => Object.values(window.widgetFixture.daily.days).some((day) => day.calories === 272));
  const published = await app.evaluate(() => ({
    bmr: window.widgetFixture.daily.bmr,
    day: Object.values(window.widgetFixture.daily.days).find((d) => d.calories === 272),
  }));
  assert.ok(published.bmr > 0, 'BMR must be published for days with no entries');
  assert.equal(published.day.proteinGrams, 8.8);
  assert.equal(published.day.carbsGrams, 55);
  assert.equal(published.day.fatGrams, 1.6);
  assert.ok(published.day.burnedCalories >= published.bmr, 'Burned must include the BMR');
  assert.equal(typeof published.day.carbsPercent, 'number');
  assert.equal(await app.getByRole('button', { name: 'Back to today', exact: true }).count(), 0);
  await app.getByRole('button', { name: 'Date range: Today', exact: true }).click();
  await app.evaluate(() => window.widgetFixture.emit('backButton'));
  await app.getByRole('button', { name: 'Previous month' }).waitFor({ state: 'hidden' });
  assert.equal(await app.evaluate(() => window.widgetFixture.minimized), 0);
  await app.evaluate(() => window.widgetFixture.emit('backButton'));
  await app.waitForFunction(() => window.widgetFixture.minimized === 1);
  console.log('PASS: simulated native delivery sends intake, burned, macros and BMR; Back closes overlays first.');

  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log('PASS: no runtime errors or external requests during normal use.');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
