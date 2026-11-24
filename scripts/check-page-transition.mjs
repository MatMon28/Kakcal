/**
 * Page-change (tap / Back) transition check. Samples every animation frame while the page changes and fails on
 * the artifacts a transition can cause: blank frames, double exposure, horizontal overflow, scroll-height jumps,
 * leftover pages / animations / classes, a moving dock, lost taps and page errors.
 *
 *   npm run build && npm i --no-save playwright && npx playwright install chromium
 *   node scripts/check-page-transition.mjs            # asserts
 *   KC_REPORT_ONLY=1 node scripts/check-page-transition.mjs   # only prints the metrics (no assertions)
 *   KC_VIEWPORT=1280x800 node scripts/check-page-transition.mjs   # desktop layout (default 390x844)
 *
 * See docs/verification.md > Page transition check.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const [vw, vh] = (process.env.KC_VIEWPORT || '390x844').split('x').map(Number); // e.g. KC_VIEWPORT=1280x800 for desktop
const reportOnly = Boolean(process.env.KC_REPORT_ONLY);
const dist = process.env.KC_TEST_DIST || fileURLToPath(new URL('../dist/', import.meta.url));
const files = new Map(await Promise.all([
  ['/index.html', 'text/html'], ['/offline-worker.js', 'text/javascript'], ['/data/off-foods.bin', 'application/octet-stream'],
].map(async ([url, type]) => [url, [type, await readFile(resolve(dist, url.slice(1)))]])));
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = files.get(path === '/' ? '/index.html' : path);
  res.writeHead(file ? 200 : 404, { 'Content-Type': file?.[0] ?? 'text/plain' });
  res.end(file?.[1]);
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const url = `http://127.0.0.1:${server.address().port}/?view=app`;

const check = (condition, message) => {
  if (reportOnly) { if (!condition) console.log('  (would fail) ' + message); return; }
  assert.ok(condition, message);
};

// Runs inside the page: records one sample per frame until stop() is called.
const RECORDER = () => {
  const rec = [];
  let on = true;
  const html = document.documentElement;
  const tick = () => {
    const pages = [...document.querySelectorAll('[data-journal-page]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { tab: el.dataset.journalPage, op: Number(getComputedStyle(el).opacity), left: r.left, right: r.right, inert: el.inert };
    });
    const dock = document.querySelector('.anim-dock')?.getBoundingClientRect();
    rec.push({ t: performance.now(), pages, sw: html.scrollWidth, cw: html.clientWidth, sh: html.scrollHeight, sy: scrollY,
      moving: html.classList.contains('kc-page-moving'), dockTop: dock ? Math.round(dock.top) : null });
    if (on) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__stop = () => { on = false; return rec; };
};

const analyse = (rec, label, { expectFinal, maxHeightChanges = 1 }) => {
  const start = rec.findIndex((s) => s.pages.length > 1 || s.pages[0]?.op < 1 || s.moving);
  const frames = start < 0 ? [] : rec.slice(start);
  const last = rec[rec.length - 1];
  const maxPages = Math.max(...rec.map((s) => s.pages.length));
  const visible = (s) => s.pages.reduce((sum, p) => sum + p.op, 0);
  const blank = frames.filter((s) => visible(s) < 0.02).length; // frames where nothing is drawn
  const doubled = frames.filter((s) => s.pages.length > 1 && s.pages.filter((p) => p.op > 0.35).length > 1).length;
  const overflowX = Math.max(...rec.map((s) => s.sw - s.cw));
  const heights = new Set(rec.map((s) => s.sh)).size;
  const heightChanges = rec.reduce((n, s, i) => n + (i && s.sh !== rec[i - 1].sh ? 1 : 0), 0);
  const dockMoves = new Set(rec.filter((s) => s.dockTop != null).map((s) => s.dockTop)).size;
  const duration = frames.length ? frames[frames.length - 1].t - frames[0].t : 0;
  const offscreen = Math.max(0, ...rec.flatMap((s) => s.pages.filter((p) => !p.inert).map((p) => Math.max(-p.left, p.right - s.cw))));
  console.log(`  ${label}: frames=${rec.length} animated=${frames.length} pagesMax=${maxPages} blankFrames=${blank} doubleExposure=${doubled}` +
    ` overflowX=${overflowX} distinctScrollHeights=${heights} dockPositions=${dockMoves} activeOffscreenPx=${offscreen.toFixed(1)}`);
  check(blank === 0, `${label}: ${blank} blank frame(s) while changing page`);
  check(doubled === 0, `${label}: ${doubled} frame(s) with two pages both clearly visible (ghosting)`);
  check(heightChanges <= maxHeightChanges, `${label}: the document height changed ${heightChanges} times (a leftover page stretched it)`);
  check(overflowX <= 0, `${label}: horizontal overflow ${overflowX}px (scrollbar / layout shift)`);
  check(last.pages.length === 1 && last.pages[0].op === 1, `${label}: ${last.pages.length} page(s) left, opacity ${last.pages[0]?.op}`);
  check(!last.moving, `${label}: kc-page-moving left on <html>`);
  check(last.sy === 0, `${label}: scroll position ${last.sy} after the change`);
  if (expectFinal) check(last.pages[0].tab === expectFinal, `${label}: ended on ${last.pages[0].tab}, expected ${expectFinal}`);
  return { frames: frames.length, duration, dockMoves };
};

let browser;
try {
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, isMobile: vw < 700, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(6000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  const tab = (name) => page.locator('nav[aria-label="Primary"]').getByRole('button', { name, exact: true });
  const quiet = () => page.waitForFunction(() => document.querySelectorAll('[data-journal-page]').length === 1 && !document.querySelector('.kc-page-moving'), null, { timeout: 4000 });
  await quiet();
  await page.waitForTimeout(600);

  const change = async (label, action, expectFinal) => {
    await page.evaluate(RECORDER);
    await action();
    await page.waitForTimeout(700);
    const rec = await page.evaluate(() => window.__stop());
    const result = analyse(rec, label, { expectFinal });
    // After settling: no running animation anywhere in the page, the rail is untouched.
    const leftovers = await page.evaluate(() => ({
      animations: document.querySelector('main').getAnimations({ subtree: true }).filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('[data-page-rail]')).length,
      rail: getComputedStyle(document.querySelector('[data-page-rail]')).transform,
      railWill: document.querySelector('[data-page-rail]').style.willChange,
      pageTransform: getComputedStyle(document.querySelector('[data-journal-page]')).transform,
      pageStyle: document.querySelector('[data-journal-page]').getAttribute('style'),
    }));
    check(leftovers.animations === 0, `${label}: ${leftovers.animations} animation(s) still running`);
    check(leftovers.rail === 'none' && !leftovers.railWill, `${label}: rail left with transform ${leftovers.rail} / will-change ${leftovers.railWill}`);
    check(leftovers.pageTransform === 'none' && !leftovers.pageStyle, `${label}: page left with transform ${leftovers.pageTransform} / style ${leftovers.pageStyle}`);
    return result;
  };

  console.log(`Page transition samples (${vw}x${vh} touch viewport):`);
  await change('Today -> Statistics', () => tab('Statistics').tap(), 'history');
  await change('Statistics -> Today', () => tab('Today').tap(), 'today');
  await change('Today -> Custom (right, several tabs)', () => tab('Custom').tap(), 'prebuilt');
  await change('Custom -> Today (left)', () => tab('Today').tap(), 'today');

  // Leaving a scrolled page: the old page must fade out where it was, never jump to the top first.
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
  await page.waitForTimeout(200);
  await change('Scrolled Today -> Statistics', () => tab('Statistics').tap(), 'history');
  await change('Statistics -> Today', () => tab('Today').tap(), 'today');

  // Food catalogue (pushed from Custom) and the Back button.
  await change('Today -> Custom', () => tab('Custom').tap(), 'prebuilt');
  await change('Custom -> Food catalogue', () => page.getByRole('button', { name: 'Browse Foods', exact: true }).first().tap(), 'database');
  await change('Food catalogue -> Back', () => page.getByRole('button', { name: 'Back', exact: true }).first().tap(), undefined);
  await change('Back page -> Today', () => tab('Today').tap(), 'today');

  // Rapid taps: three changes in a row must end clean on the last one.
  await page.evaluate(RECORDER);
  await tab('Statistics').tap(); await page.waitForTimeout(60);
  await tab('Custom').tap(); await page.waitForTimeout(40);
  await tab('Today').tap();
  await page.waitForTimeout(800);
  analyse(await page.evaluate(() => window.__stop()), 'Rapid taps Statistics, Custom, Today', { expectFinal: 'today', maxHeightChanges: 4 });

  // A tap right in the middle of a transition must reach its target (no swallowed click).
  await tab('Statistics').tap(); await page.waitForTimeout(90);
  await tab('Today').tap();
  await quiet();
  check(await tab('Today').getAttribute('aria-current') === 'page', 'tap during a transition was lost');
  console.log('PASS: tap during a transition is not lost');

  // Reduced motion: instant, no ghost page ever.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(RECORDER);
  await tab('Statistics').tap();
  await page.waitForTimeout(500);
  const reduced = await page.evaluate(() => window.__stop());
  check(Math.max(...reduced.map((s) => s.pages.length)) === 1, 'reduced motion: a second page was rendered');
  check(reduced.every((s) => s.pages.every((p) => p.op === 1)), 'reduced motion: a page faded');
  console.log('PASS: reduced motion has no fade and no second page');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  check(errors.length === 0, 'page errors: ' + errors.join(' | '));
  console.log(reportOnly ? 'Report finished (no assertions).' : 'PASS: page transition has no blank frames, ghosting, overflow, leftovers or lost taps');
} finally {
  await browser?.close();
  server.close();
}
