/**
 * Tunes the container-query widths of the Today meal card (src/styles/performance.css, "Meal card fitting").
 *
 *   npm run build && npm i --no-save playwright && npx playwright install chromium
 *   node scripts/measure-meal-card.mjs            # serves dist/, prints the table below
 *
 * It seeds three meals (8 kcal, 1,234 kcal, 12,345 kcal), forces the card to every width from 320 px down to 70 px with
 * the container-query hiding switched off, and records the LAST card width at which the element still fits:
 *   normal          the calorie figure next to the three macro pills (no overlap, no pill clipped);
 *   compact         the calorie figure in the header row, extras hidden (the state it is in when it is that narrow);
 *   compact extras  the figure AND the note / photo icons in the header row.
 * "container max-width" is what goes into the CSS: last fit - 2 px (a query measures the content box and the card has
 * a 1 px border) + the margin (MARGIN, default 8). Use the four-digit row (1,234 kcal): the widest figure a meal
 * realistically has. Check that a default card still shows what it showed before (compact cards are 138 px wide at
 * 320 px and 173 px at 390 px), otherwise lower the margin. See docs/performance.md#meal-card-container-queries.
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

const MARGIN = Number(process.env.MARGIN || 8);
const BORDER = 2;
const browser = await chromium.launch();
const rows = [];

async function measure(viewport, layout, extras) {
  const ctx = await browser.newContext({ viewport: { width: viewport, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const item = (id, calories) => ({ id, foodId: 'gen-01', name: 'Food', store: 'Generic', amount: 100, unit: 'g', calories, carbs: 10, protein: 8, fat: 4, fiber: 2, salt: 0.1, loggedAt: new Date().toISOString() });
    const meals = { breakfast: [item('a', 1234)], mid_morning: [], lunch: [item('b', 12345)], midday_snack: [item('d', 8)], dinner: [], extra: [] };
    localStorage.setItem('kcalsync_day_logs', JSON.stringify({ [key]: { date: key, meals, activities: [], waterMl: 0 } }));
    localStorage.setItem('kcalsync_settings', JSON.stringify({ photoDiary: true }));
  });
  await page.goto(`http://localhost:${server.address().port}/?view=app`);
  await page.waitForTimeout(3500);
  const group = page.locator('[role="group"]').filter({ has: page.locator('button[aria-pressed]') }).first();
  await group.locator('button').nth(layout === 'compact' ? 0 : 1).click(); // order of the buttons: Compact, Normal, Expanded
  await page.waitForTimeout(600);
  // Switch the container-query hiding off, so that fit is judged on the real geometry.
  await page.addStyleTag({ content: `.kc-meal-kcal{display:inline-flex !important}.kc-meal-extras{display:${extras ? 'flex' : 'none'} !important}` });
  const result = await page.evaluate(async () => {
    const out = {};
    const cards = [...document.querySelectorAll('[data-meal-slot]')].filter((c) => ['midday_snack', 'breakfast', 'lunch'].includes(c.dataset.mealSlot));
    for (const card of cards) {
      const slot = card.dataset.mealSlot;
      let last = null;
      let figure = 0;
      for (let w = 320; w >= 70; w -= 1) {
        card.style.width = `${w}px`;
        card.style.maxWidth = `${w}px`;
        card.style.justifySelf = 'start';
        await new Promise((r) => requestAnimationFrame(() => r()));
        const kcal = card.querySelector('[data-calories]');
        const kcalRect = kcal.getBoundingClientRect();
        figure = Math.round(kcalRect.width);
        const nutrition = card.querySelector('[data-nutrition-row]');
        let fits;
        if (nutrition) {
          const pills = [...card.querySelectorAll('[data-macro-area] [data-macro]')];
          const area = card.querySelector('[data-macro-area]').getBoundingClientRect();
          const row = nutrition.getBoundingClientRect();
          const clipped = pills.some((p) => p.scrollWidth > p.clientWidth + 0.5);
          const lastRight = Math.max(...pills.map((p) => p.getBoundingClientRect().right));
          fits = kcalRect.right + 12 <= area.left + 0.5 && lastRight <= row.right + 0.5 && !clipped && nutrition.scrollWidth <= nutrition.clientWidth;
        } else {
          const room = kcal.parentElement;
          const header = room.parentElement;
          const extrasEl = header.querySelector('[data-compact-extras]');
          const extrasShown = getComputedStyle(extrasEl).display !== 'none';
          if (!extrasShown) {
            fits = kcal.offsetWidth <= room.clientWidth;
          } else {
            const gap = parseFloat(getComputedStyle(header).columnGap) || 0;
            const others = [...header.children].filter((c) => c !== room && c !== extrasEl);
            const fixed = others.reduce((sum, c) => sum + c.getBoundingClientRect().width, 0);
            const needed = fixed + kcalRect.width + extrasEl.getBoundingClientRect().width + gap * (others.length + 1);
            fits = header.clientWidth >= needed - 0.01;
          }
        }
        if (fits) last = w;
      }
      card.style.width = '';
      card.style.maxWidth = '';
      out[slot] = { last, figure };
    }
    return out;
  });
  await ctx.close();
  return result;
}

for (const viewport of [390, 320]) {
  for (const [layout, extras, label] of [['normal', false, 'normal'], ['compact', false, 'compact'], ['compact', true, 'compact extras']]) {
    const result = await measure(viewport, layout, extras);
    for (const [slot, { last, figure }] of Object.entries(result)) {
      rows.push({
        viewport,
        element: label,
        meal: { midday_snack: '8 kcal', breakfast: '1,234 kcal', lunch: '12,345 kcal' }[slot],
        'figure px': figure,
        'last fit (card px)': last,
        'container max-width': last === null ? '-' : last - BORDER + MARGIN,
      });
    }
  }
}
console.table(rows);
await browser.close();
server.close();
