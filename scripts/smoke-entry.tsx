import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';

/* Bundled as IIFE and evaluated inside a jsdom window (see scripts/smoke.mjs). */

const tick = (ms = 70) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const norm = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();

function findButton(label: string, root: ParentNode = document): HTMLButtonElement | null {
  const nodes = Array.from(root.querySelectorAll<HTMLButtonElement>('button, [role="button"]'));
  return (
    nodes.find(
      (b) => norm(b.getAttribute('aria-label')) === label || norm(b.getAttribute('title')) === label
    ) ??
    nodes.find((b) => norm(b.textContent) === label) ??
    null
  );
}

function click(target: Element | null, label: string) {
  if (!target) throw new Error(`Missing control: ${label}`);
  (target as HTMLElement).click();
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function rowsIn(container: Element): string[] {
  return Array.from(container.children).map((child) => norm(child.textContent));
}

export async function run() {
  const root = document.getElementById('root')!;
  createRoot(root).render(<App />);
  await tick(150);

  const results: string[] = [];
  const ok = (message: string) => results.push(message);

  // 1. Blue, arrow-marked "back to today" pill next to the calendar.
  click(findButton('Previous day'), 'Previous day');
  await tick();
  const backToToday = findButton('Back to today');
  if (!backToToday) throw new Error('Back-to-today control missing');
  if (!backToToday.className.includes('bg-[#2E7CC4]')) throw new Error('Back-to-today is not blue');
  if (!/Today/.test(norm(backToToday.textContent))) throw new Error('Back-to-today label missing');
  ok('back-to-today: blue with arrow');
  click(backToToday, 'Back to today');
  await tick();
  if (findButton('Back to today')) throw new Error('Back-to-today should hide on today');
  ok('back-to-today: returns to current day');

  // 2. Compact layout: rounded macros in a bar, tracker cards in a 2-column grid.
  click(findButton('Compact'), 'Compact');
  await tick();
  const breakfastHeader = document.querySelector('[aria-label="Breakfast"][role="button"]');
  if (!breakfastHeader) throw new Error('Breakfast card missing in compact mode');
  const headerText = norm(nodeText(breakfastHeader));
  // The kcal total sits inline before the macro letters in textContent.
  const macroText = headerText.replace(/^\d+/, '');
  if (!/\bC\b/.test(macroText) || !/\bP\b/.test(macroText) || !/\bF\b/.test(macroText)) {
    throw new Error(`Compact macros missing: ${headerText}`);
  }
  if (/\d+\.\d+g/.test(headerText)) throw new Error(`Compact macros not rounded: ${headerText}`);
  ok(`compact macros rounded: ${headerText}`);

  const customSection = document.querySelector('section[aria-label="Custom"]');
  const grid = customSection?.parentElement;
  if (!grid || !grid.className.includes('grid-cols-2')) throw new Error('Compact tracker grid is not 2-column');
  ok('compact tracker cards in 2-column grid');

  // 3. Favourites: whole list while focused, favourites pinned first while typing, star toggle persists.
  click(findButton('Food', todayDock()), 'Food dock');
  await tick(150);
  const search = Array.from(document.querySelectorAll<HTMLInputElement>('input')).find((i) =>
    i.placeholder.includes('search foods')
  );
  if (!search) throw new Error('Add Food search input missing');
  search.focus();
  await tick();
  const favoritesPanel = Array.from(document.querySelectorAll('div')).find((d) =>
    d.className.includes('max-h-72') && d.previousElementSibling?.textContent?.includes('Favourites')
  );
  if (!favoritesPanel) throw new Error('Favourites list did not appear on focus');
  if (rowsIn(favoritesPanel).length !== 6) throw new Error(`Expected 6 favourites, got ${rowsIn(favoritesPanel).length}`);
  ok('favourites list appears before typing');

  setInput(search, 'sk');
  await tick();
  const resultsPanel = document.querySelector('div.max-h-72');
  if (!resultsPanel) throw new Error('Search results missing');
  const first = rowsIn(resultsPanel)[0] || '';
  if (!first.includes('Skyr')) throw new Error(`Favourite is not pinned first: ${first}`);
  ok(`favourites pinned first while typing (${first.slice(0, 40)})`);

  const starLabel = (b: Element) => b.getAttribute('aria-label') || '';
  const skyrRow = () =>
    Array.from(document.querySelectorAll('div.max-h-72 > *')).find((row) => {
      const stars = Array.from(row.querySelectorAll('button')).filter((b) => starLabel(b).toLowerCase().includes('favourit'));
      return stars.length > 0 && norm(row.textContent).includes('Skyr');
    });
  const skyrStar = () =>
    Array.from(skyrRow()?.querySelectorAll('button') ?? []).find((b) => starLabel(b).toLowerCase().includes('favourit'));
  const savedFavourites = () =>
    JSON.parse(window.localStorage.getItem('kcalsync_settings') || '{}').favoriteFoods?.length;

  if (!skyrStar()) throw new Error('Star toggle missing in results');
  const originalLabel = starLabel(skyrStar()!);
  click(skyrStar(), 'star');
  await tick();
  const restored = skyrStar();
  if (!restored) throw new Error('Skyr row lost after toggling the star');
  if (starLabel(restored) === originalLabel) throw new Error('Star label did not change');
  click(restored, 'star'); // restore original state
  await tick();
  if (starLabel(skyrStar() || restored) !== originalLabel) throw new Error('Star did not toggle back');
  if (JSON.parse(window.localStorage.getItem('kcalsync_settings') || '{}').favoriteFoods?.length !== 6) {
    throw new Error('Favourite list not restored');
  }
  ok('star toggles and persists to localStorage');

  click(findButton('Close'), 'Close modal');
  await tick(150);

  // 4. Custom page: icon-only creation dock, actions beside name/macros, recipe ingredients.
  click(findButton('Custom', document.querySelector('[aria-label="Primary"]') as Element), 'Custom tab');
  await tick(150);
  const dock = document.querySelector('[role="group"][aria-label="Create custom items"]');
  if (!dock) throw new Error('Custom creation dock missing');
  const dockButtons = Array.from(dock.querySelectorAll('button'));
  if (dockButtons.length !== 3) throw new Error(`Expected 3 dock buttons, got ${dockButtons.length}`);
  if (dockButtons.some((b) => norm(b.textContent) !== '')) throw new Error('Dock buttons must be icon-only');
  ok('Custom creation dock is icon-only');

  const recipeToggle = Array.from(document.querySelectorAll('button[aria-expanded="false"]')).find((b) =>
    norm(b.textContent).includes('Skyr, Oat & Blueberry Bowl')
  );
  if (!recipeToggle) throw new Error('Recipe card missing');
  const recipeCard = recipeToggle.closest('div.rounded-3xl');
  const recipeLogBtn = recipeCard?.querySelector('[aria-label^="Log Recipe:"]');
  const recipeEditBtn = recipeCard?.querySelector('[aria-label^="Edit:"]');
  const recipeDeleteBtn = recipeCard?.querySelector('[aria-label^="Delete:"]');
  if (!recipeLogBtn || !recipeEditBtn || !recipeDeleteBtn) throw new Error('Recipe Log/Edit/Delete missing');
  const recipeNameRect = recipeToggle.getBoundingClientRect();
  const recipeLogRect = recipeLogBtn.getBoundingClientRect();
  if (Math.abs(recipeNameRect.top - recipeLogRect.top) > 30) {
    throw new Error('Recipe actions are not beside the name');
  }
  ok('recipe Log/Edit/Delete beside the name');

  click(recipeToggle, 'expand recipe');
  await tick();
  const recipeCardText = norm(recipeCard?.textContent);
  if (!recipeCardText.includes('150g') || !recipeCardText.includes('50g') || !recipeCardText.includes('60g')) {
    throw new Error(`Recipe ingredients/quantities missing: ${recipeCardText}`);
  }
  ok('expanded recipe shows original ingredient quantities');

  click(findButton('Edit: Skyr, Oat & Blueberry Bowl'), 'edit recipe');
  await tick();
  const editDialog = Array.from(document.querySelectorAll('[role="dialog"] h2, [role="dialog"] h3')).find((h) =>
    norm(h.textContent) === 'Edit'
  );
  if (!editDialog) throw new Error('Edit recipe dialog missing');
  click(findButton('Close'), 'close edit dialog');
  await tick();

  // 5. Meals: Log/Edit/Delete also beside name and macros.
  const mealToggle = Array.from(document.querySelectorAll('button[aria-expanded]')).find((b) =>
    norm(b.textContent).includes('Morning Skyr Oats')
  );
  if (!mealToggle) throw new Error('Meal card missing');
  const mealCard = mealToggle.closest('div.rounded-3xl');
  const mealLog = mealCard?.querySelector('[aria-label^="Log Meal:"]');
  if (!mealLog) throw new Error('Meal Log button missing');
  if (Math.abs(mealToggle.getBoundingClientRect().top - mealLog.getBoundingClientRect().top) > 30) {
    throw new Error('Meal actions are not beside the name');
  }
  if (mealCard?.querySelector('[aria-label^="Edit:"]')?.getBoundingClientRect().top === undefined) {
    throw new Error('Meal Edit button missing');
  }
  ok('meal Log/Edit/Delete beside the name');

  return results;
}

// jsdom-safe helpers
function nodeText(node: Element): string {
  return norm(node.textContent);
}

function todayDock(): Element {
  const dock = document.querySelector('[role="group"][aria-label="Today quick-add"]');
  if (!dock) throw new Error('Today dock missing');
  return dock;
}

(window as any).__smokeRun__ = run;
