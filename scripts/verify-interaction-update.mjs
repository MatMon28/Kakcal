import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

const base = process.env.TEST_URL || 'http://localhost:5173';
const browser = await chromium.launch({ headless: true });
const failures = [];
mkdirSync('.test-output', { recursive: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
page.on('pageerror', (error) => failures.push(error.message));
const nav = (p) => p.locator('nav[aria-label="Primary"]:visible');
const dialog = (p) => p.locator('[role="dialog"]:visible').last();
const select = async (p, name, tab) => {
  await nav(p).getByRole('button', { name, exact: true }).click();
  await p.locator(`[data-journal-root][data-active-tab="${tab}"]`).waitFor();
  await p.waitForTimeout(300);
};
const journal = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('kcalsync_meal_journal')));
async function check(name, run) {
  await run();
  console.log(`PASS ${name}`);
}

try {
  await page.goto(`${base}/?intro=off`);
  await page.locator('[data-journal-root]').waitFor();
  await page.waitForTimeout(700);
  await check('populated Custom preview and no horizontal overflow', async () => {
    assert.equal(await page.locator('[data-journal-root]').getAttribute('data-active-tab'), 'prebuilt');
    assert.ok((await journal(page)).photos.length >= 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: '.test-output/desktop.png', fullPage: true });
  });
  await check('UTF-8 link and readable-text round trips; invalid input rejected', async () => {
    const result = await page.evaluate(async () => {
      const sharing = await import('/src/utils/planSharing.ts');
      const { exportMealJournal } = await import('/src/utils/journalStore.ts');
      const plans = exportMealJournal().plans.slice(0, 3).map((p) => ({ ...p, note: 'Basil & caf\u00e9 / \u65e5\u672c' }));
      const link = sharing.createPlanLink(plans);
      const roundtrip = sharing.parsePlanInput(link);
      let invalid = false, oversized = false;
      try { sharing.parsePlanInput('#meal-plan=not-valid'); } catch { invalid = true; }
      try { sharing.createPlanLink([{ ...plans[0], note: 'x'.repeat(20000) }]); } catch { oversized = true; }
      return { count: roundtrip.length, textCount: sharing.parsePlanInput(sharing.createPlanText(plans)).length, note: roundtrip[0].note, invalid, oversized };
    });
    assert.equal(result.count, 3); assert.equal(result.textCount, 3);
    assert.equal(result.note, 'Basil & caf\u00e9 / \u65e5\u672c'); assert.ok(result.invalid && result.oversized);
  });
  await check('collapsed Foods retains an accessible search shortcut', async () => {
    const foods = page.locator('[data-library-section="foods"]');
    await foods.getByRole('button', { name: /^Foods:/ }).click();
    await foods.locator('.library-browse-search').click();
    await page.locator('[data-active-tab="database"]').waitFor();
    await select(page, 'Custom', 'prebuilt');
  });
  await check('Different for each preserves note mode without copying note text', async () => {
    const before = (await journal(page)).plans.length;
    await page.getByRole('button', { name: 'Plan a meal', exact: true }).click();
    const modal = dialog(page);
    await modal.locator('input[type="number"]').first().fill('2');
    await modal.getByRole('button', { name: 'Different for each', exact: true }).click();
    await modal.getByRole('button', { name: 'Write a note', exact: true }).click();
    await modal.locator('textarea').fill('First test lunch');
    await modal.getByRole('button', { name: 'Next meal', exact: true }).click();
    assert.equal(await modal.getByRole('button', { name: 'Write a note', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await modal.locator('textarea').inputValue(), '');
    await modal.locator('textarea').fill('Second test lunch');
    await modal.getByRole('button', { name: 'Save 2 plans', exact: true }).click();
    assert.equal((await journal(page)).plans.length, before + 2);
  });
  await check('share link preview and additive import', async () => {
    await page.getByRole('button', { name: 'Share or import meal plans', exact: true }).click();
    const modal = dialog(page);
    const link = await modal.locator('textarea[readonly]').inputValue();
    assert.ok(link.includes('#meal-plan='));
    const before = (await journal(page)).plans.length;
    const logs = await page.evaluate(() => localStorage.getItem('kcalsync_day_logs'));
    await modal.getByRole('button', { name: 'Import a plan', exact: true }).click();
    await modal.locator('textarea').fill(link);
    await modal.getByRole('button', { name: 'Preview plan', exact: true }).click();
    await modal.locator('.plan-import-preview').waitFor();
    const count = await page.evaluate(async (link) => (await import('/src/utils/planSharing.ts')).parsePlanInput(link).length, link);
    await modal.getByRole('button', { name: `Import ${count} meals`, exact: true }).click();
    assert.equal((await journal(page)).plans.length, before + count);
    assert.equal(await page.evaluate(() => localStorage.getItem('kcalsync_day_logs')), logs);
    await page.keyboard.press('Escape');
  });
  await check('photo composer date first, meal chips, local image and note saving', async () => {
    const before = (await journal(page)).photos.length;
    await page.getByRole('button', { name: 'Add a meal photo', exact: true }).click();
    const modal = dialog(page);
    const date = await modal.locator('.journal-photo-date').boundingBox();
    const meals = await modal.locator('.journal-photo-meals').boundingBox();
    assert.ok(date.y < meals.y);
    await modal.getByRole('button', { name: 'Breakfast', exact: true }).click();
    assert.equal(await modal.getByRole('button', { name: 'Breakfast', exact: true }).getAttribute('aria-pressed'), 'true');
    await modal.getByLabel('Choose meal photo', { exact: true }).setInputFiles('public/images/demo-breakfast.jpg');
    await modal.locator('.journal-photo-selected img').waitFor();
    await modal.locator('textarea').fill('Test note: basil & lemon');
    await modal.screenshot({ path: '.test-output/photo-composer.png' });
    await modal.getByRole('button', { name: 'Save photo', exact: true }).click();
    const data = await journal(page);
    assert.equal(data.photos.length, before + 1);
    assert.ok(data.photos.some((p) => p.note === 'Test note: basil & lemon' && p.slot === 'breakfast' && p.src.startsWith('data:image/jpeg;')));
  });
  await check('readable diary browser and Log today', async () => {
    const seeAll = page.getByRole('button', { name: 'See all meals', exact: true });
    const colors = await seeAll.evaluate((el) => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
    assert.notEqual(colors.background, 'rgba(0, 0, 0, 0)'); assert.notEqual(colors.color, colors.background);
    await page.locator('.journal-meal-preview').first().click();
    await dialog(page).getByRole('button', { name: 'Log today', exact: true }).click();
    await dialog(page).getByRole('button', { name: 'Logged today', exact: true }).waitFor();
    await page.keyboard.press('Escape');
  });
  await check('picture ZIP downloads through Settings', async () => {
    await page.locator('button[aria-label="Settings"]:visible').first().click();
    await dialog(page).getByRole('button', { name: /data backup/i }).click();
    const downloading = page.waitForEvent('download');
    await dialog(page).getByRole('button', { name: /Export meal pictures/ }).click();
    const file = await downloading;
    await file.saveAs('.test-output/meal-pictures.zip');
    assert.ok(file.suggestedFilename().endsWith('.zip'));
    await page.keyboard.press('Escape');
  });
  await check('built-in and uploaded personalized tracker icons save', async () => {
    await page.locator('button[aria-label="Settings"]:visible').first().click();
    await dialog(page).getByRole('button', { name: 'Today', exact: true }).click(); // Settings > Today holds Custom buttons
    await dialog(page).getByRole('button', { name: 'Edit tracker', exact: true }).first().click();
    let editor = dialog(page);
    await editor.getByRole('button', { name: 'Choose an icon', exact: true }).click();
    await editor.getByRole('button', { name: 'coffee', exact: true }).click();
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kcalsync_settings')));
    assert.equal(saved.customButtons[0].icon, 'coffee');
    await dialog(page).getByRole('button', { name: 'Edit tracker', exact: true }).first().click();
    editor = dialog(page);
    await editor.getByLabel('Upload personalized icon', { exact: true }).setInputFiles('public/images/demo-breakfast.jpg');
    await editor.locator('.personal-icon-trigger img').waitFor();
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kcalsync_settings')));
    assert.ok(saved.customButtons[0].icon.startsWith('data:image/png;base64,'));
    await page.keyboard.press('Escape');
  });
  await check('incoming share links open an import preview, never auto-save', async () => {
    const link = await page.evaluate(async () => {
      const { createPlanLink } = await import('/src/utils/planSharing.ts');
      const { exportMealJournal } = await import('/src/utils/journalStore.ts');
      return createPlanLink(exportMealJournal().plans.slice(0, 2));
    });
    const receiver = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const receiving = await receiver.newPage();
    await receiving.goto(link);
    await receiving.locator('[role="dialog"]:visible').waitFor();
    const before = (await journal(receiving)).plans.length;
    await dialog(receiving).getByRole('button', { name: 'Preview plan', exact: true }).click();
    assert.equal((await journal(receiving)).plans.length, before);
    await dialog(receiving).getByLabel('Import starting date', { exact: true }).fill('2030-01-07');
    await dialog(receiving).getByRole('button', { name: 'Import 2 meals', exact: true }).click();
    const imported = (await journal(receiving)).plans.slice(before);
    assert.equal(imported.length, 2);
    assert.equal(imported[0].date, '2030-01-07');
    await receiver.close();
  });
  await check('resizing from desktop to mobile remeasures the active label', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const box = await nav(page).locator('button[aria-current="page"] > span').boundingBox();
    assert.ok(box.width > 10);
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.waitForTimeout(200);
  });
  await check('custom category icon survives normalization'  , async () => {
    const result = await page.evaluate(async () => {
      const layout = await import('/src/utils/layoutStore.ts');
      const id = layout.addMealType('Test brunch', 'coffee');
      layout.setMealTypeIcon(id, 'salad');
      const raw = JSON.parse(localStorage.getItem('kcalsync_layout') || 'null');
      return raw;
    });
    assert.ok(result?.mealTypes.some((m) => m.name === 'Test brunch' && m.icon === 'salad'));
  });

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await mobile.newPage();
  phone.on('pageerror', (error) => failures.push(error.message));
  await phone.goto(`${base}/?intro=off`);
  await phone.locator('[data-journal-root]').waitFor();
  await phone.waitForTimeout(700);
  await phone.screenshot({ path: '.test-output/mobile.png', fullPage: true });
  await check('mobile has no horizontal overflow', async () => assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false));
  await check('pill follows a real touch swipe from the bottom of Today', async () => {
    await select(phone, 'Today', 'today');
    await phone.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await phone.waitForTimeout(250);
    const height = await phone.evaluate(() => document.documentElement.scrollHeight);
    const cdp = await phone.context().newCDPSession(phone);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 325, y: 690 }] });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 325 - i * 19, y: 690 }] });
      await phone.waitForTimeout(18);
    }
    const during = await phone.evaluate(async () => ({
      position: (await import('/src/utils/pagePosition.ts')).getPagePosition(),
      opacities: Array.from(document.querySelectorAll('[data-mobile-journal-header] .kc-following-indicator > span')).map((el) => el.style.opacity),
      height: document.documentElement.scrollHeight,
    }));
    assert.ok(during.position > 0 && during.position < 1, JSON.stringify(during));
    assert.ok(during.opacities.some((o) => Number(o) > 0 && Number(o) < 1));
    assert.ok(during.height <= height + 1, `preview grew document: ${during.height} > ${height}`);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await phone.locator('[data-active-tab="prebuilt"]').waitFor();
    await phone.waitForTimeout(300);
    assert.equal(await phone.evaluate(async () => (await import('/src/utils/pagePosition.ts')).getPagePosition()), null);
    await cdp.detach();
  });
  await check('cancelled swipe restores pill and current page', async () => {
    const cdp = await phone.context().newCDPSession(phone);
    await phone.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await phone.waitForTimeout(150);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y: 690 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 127, y: 690 }] });
    await phone.waitForTimeout(35);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await phone.waitForTimeout(350);
    assert.equal(await phone.locator('[data-journal-root]').getAttribute('data-active-tab'), 'prebuilt');
    assert.equal(await phone.evaluate(async () => (await import('/src/utils/pagePosition.ts')).getPagePosition()), null);
    await cdp.detach();
  });
  await check('one custom tracker uses its icon; several use the default picker' , async () => {
    await phone.evaluate(() => {
      const settings = JSON.parse(localStorage.getItem('kcalsync_settings') || 'null') || { theme: 'light', themeStyle: 'classic', hidePeriod: true, quickAdd: { food: true, movement: true, water: true, poop: true, weight: true, custom: true } };
      settings.customButtons = [{ id: 'test-coffee', name: 'Coffee', type: 'quantity', icon: 'coffee', unit: 'cups' }];
      localStorage.setItem('kcalsync_settings', JSON.stringify(settings));
    });
    await phone.reload(); await phone.locator('[data-journal-root]').waitFor();
    await select(phone, 'Today', 'today');
    await phone.locator('[data-dock-action="custom"] .lucide-coffee').waitFor();
    await phone.evaluate(() => {
      const settings = JSON.parse(localStorage.getItem('kcalsync_settings') || 'null') || { theme: 'light', themeStyle: 'classic', hidePeriod: true, quickAdd: { food: true, movement: true, water: true, poop: true, weight: true, custom: true } };
      settings.customButtons.push({ id: 'test-water', name: 'Water', type: 'quantity', icon: 'water', unit: 'ml' });
      localStorage.setItem('kcalsync_settings', JSON.stringify(settings));
    });
    await phone.reload(); await phone.locator('[data-journal-root]').waitFor();
    await select(phone, 'Today', 'today');
    await phone.locator('[data-dock-action="custom"] .lucide-sparkles').waitFor();
  });
  assert.deepEqual(failures, [], 'Uncaught browser errors');
  console.log('PASS no uncaught browser errors');
} catch (error) {
  await page.screenshot({ path: '.test-output/failure.png', fullPage: true }).catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally { await browser.close(); }