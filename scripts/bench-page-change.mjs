/**
 * Page-change cost benchmark. Seeds a large journal (500 logged days, 60 saved meals, 30 recipes, 14 photos), throttles the
 * CPU 4x (a mid-range phone) and taps Today -> Custom -> Today, then every other main page, printing the longest main-thread
 * block (long task) and the longest frame of each change. A long task is what you feel as "the app froze when I tapped".
 *
 *   npm run build && npm i --no-save playwright && npx playwright install chromium
 *   node scripts/bench-page-change.mjs            # production dist/
 *   KC_THROTTLE=1 node scripts/bench-page-change.mjs   # no CPU throttling
 *
 * Numbers are only comparable on the same machine, before and after a change. See docs/performance.md.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const dist = resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  let file = join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (file.endsWith('/')) file = join(file, 'index.html');
  let body;
  try { body = await readFile(file); } catch { file = join(dist, 'index.html'); body = await readFile(file); }
  res.setHeader('content-type', types[extname(file)] || 'application/octet-stream');
  res.end(body);
}).listen(0);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.addInitScript(() => {
  if (localStorage.getItem('__seeded')) return;
  localStorage.setItem('__seeded', '1');
  const foods = ['kebab-01', 'gen-01', 'gen-03', 'lidl-01', 'lidl-07'];
  const rnd = (n) => Math.floor(Math.random() * n);
  const item = (i, d) => ({ id: `i-${d}-${i}`, foodId: foods[i % foods.length], name: `Food number ${i} of ${d}`, store: 'Generic', amount: 100, unit: 'g', calories: 120, carbs: 10, protein: 8, fat: 4, fiber: 2, salt: 0.1, loggedAt: new Date().toISOString() });
  const logs = {};
  const slots = ['breakfast', 'mid_morning', 'lunch', 'midday_snack', 'dinner'];
  for (let d = 0; d < 500; d++) {
    const dt = new Date(Date.now() - d * 86400000);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const meals = {};
    slots.forEach((s) => { meals[s] = Array.from({ length: 4 }, (_, i) => item(i, d)); });
    logs[key] = { date: key, meals, activities: [], waterMl: 1500 };
  }
  localStorage.setItem('kcalsync_day_logs', JSON.stringify(logs));
  localStorage.setItem('kcalsync_prebuilt_meals', JSON.stringify(Array.from({ length: 60 }, (_, m) => ({ id: `pm-${m}`, name: `My meal ${m}`, slot: 'lunch', createdAt: new Date().toISOString(),
    ingredients: Array.from({ length: 6 }, (_, i) => ({ foodId: foods[(i + m) % foods.length], amount: 50 + i * 10 })) }))));
  localStorage.setItem('kcalsync_custom_foods', JSON.stringify(Array.from({ length: 30 }, (_, r) => ({ id: `recipe-${r}`, name_de: `Recipe ${r}`, name_it: `Recipe ${r}`, name_en: `Recipe ${r}`, store: 'Custom', category: 'prepared', unit: 'g', calories: 150, carbs: 20, protein: 8, fat: 5, fiber: 2, salt: 0.2, isCustom: true, isRecipe: true,
    recipeIngredients: Array.from({ length: 5 }, (_, i) => ({ foodId: foods[(i + r) % foods.length], amount: 80 })) }))));
  const mk = () => { const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const g = c.getContext('2d');
    for (let i = 0; i < 400; i++) { g.fillStyle = `hsl(${rnd(360)},70%,${30 + rnd(40)}%)`; g.fillRect(rnd(1200), rnd(900), 40 + rnd(200), 40 + rnd(200)); }
    return c.toDataURL('image/jpeg', 0.6); };
  const src = [mk(), mk(), mk()];
  localStorage.setItem('kcalsync_meal_journal', JSON.stringify({ version: 1, plans: [], memories: {}, photos: Array.from({ length: 14 }, (_, p) => ({ id: `ph-${p}`, date: '2025-01-0' + (1 + (p % 9)), slot: 'lunch', src: src[p % 3], note: `Photo ${p}`, createdAt: new Date(Date.now() - p * 1000).toISOString(), linkedId: p < 10 ? `pm-${p}` : undefined })) }));
  localStorage.setItem('kcalsync_settings', JSON.stringify({ photoDiary: true, hidePeriod: false, hidePeriodCustomized: true }));
});
await page.goto(`http://localhost:${server.address().port}/?view=app`);
await page.waitForTimeout(3500);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.KC_THROTTLE || 4) });
await page.evaluate(() => {
  window.__start = () => {
    const m = { t0: performance.now(), frames: [], long: [] };
    window.__m = m;
    const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => m.long.push(Math.round(e.duration))));
    try { po.observe({ entryTypes: ['longtask'] }); } catch { /* no long-task support */ }
    let last = performance.now();
    const loop = (t) => { m.frames.push(t - last); last = t; if (t - m.t0 < 900) requestAnimationFrame(loop); else po.disconnect(); };
    requestAnimationFrame(loop);
  };
});
const rows = [];
const nav = (l) => `nav[aria-label="Primary"] button[aria-label="${l}"]`;
async function tap(name, label) {
  await page.evaluate(() => window.__start());
  await page.click(nav(label));
  await page.waitForTimeout(1100);
  const m = await page.evaluate(() => window.__m);
  rows.push({ change: name, 'longest task ms': Math.max(0, ...m.long), 'longest frame ms': Math.round(Math.max(...m.frames)) });
}
const labels = [...new Set(await page.$$eval('nav[aria-label="Primary"] button', (b) => b.map((x) => x.getAttribute('aria-label'))))];
const [home, ...others] = labels;
for (let rep = 0; rep < 3; rep++) {
  for (const label of others) { await tap(`${home} -> ${label}`, label); await tap(`${label} -> ${home}`, home); }
}
console.table(rows);
await browser.close();
server.close();
