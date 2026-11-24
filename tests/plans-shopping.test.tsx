import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/context/AppContext', () => ({ useApp: () => ({ language: 'en' }), useSettings: () => ({ language: 'en' }) }));

import { RecentChips } from '../src/components/common/RecentChips';
import { normalizeMealJournal } from '../src/utils/journalStore';
import { copyName, isCurrentPlan, planGroupViews, splitPlans, UNGROUPED_PLAN_ID } from '../src/utils/planGroups';
import {
  addCustomShoppingItem,
  boughtCount,
  buildShoppingItems,
  createShoppingList,
  formatQuantity,
  isShoppingListOutdated,
  removeShoppingItem,
  syncShoppingList,
  toggleShoppingItem,
} from '../src/utils/shoppingList';
import type { FoodItem } from '../src/types';
import type { MealPlan, PlanGroup } from '../src/types/journal';

afterEach(cleanup);

const food = (id: string, name: string, extra: Partial<FoodItem> = {}): FoodItem => ({
  id, name_de: name, name_it: `${name} it`, name_en: name, store: 'Other' as FoodItem['store'], category: 'other' as FoodItem['category'],
  unit: 'g', calories: 100, carbs: 10, protein: 5, fat: 2, fiber: 1, salt: 0, ...extra,
});
const rice = food('rice', 'Rice');
const chicken = food('chicken', 'Chicken');
const milk = food('milk', 'Milk', { unit: 'ml' });
// 400 g of recipe = 200 g rice + 200 g chicken.
const bowl = food('bowl', 'Bowl', { isRecipe: true, recipeIngredients: [{ foodId: 'rice', amount: 200 }, { foodId: 'chicken', amount: 200 }] });
const all = new Map([rice, chicken, milk, bowl].map((f) => [f.id, f]));
const lookup = (id: string) => all.get(id);

const plan = (id: string, date: string, items: { food: FoodItem; amount: number }[], extra: Partial<MealPlan> = {}): MealPlan => ({
  id, date, slot: 'lunch', title: id, kind: 'food', items, note: '', read: false, ...extra,
});

describe('recent food chips', () => {
  const foods = Array.from({ length: 15 }, (_, i) => ({ id: `f${i}`, name: `Food ${i}` }));
  const view = (items = foods) =>
    render(<RecentChips items={items} getKey={(f) => f.id} toggleClassName="more" renderChip={(f) => <button data-chip>{f.name}</button>} />);

  it('shows 5 foods and a "..." chip, then 10 more when it is pressed', () => {
    view();
    expect(document.querySelectorAll('[data-chip]')).toHaveLength(5);
    const more = screen.getByText('...');
    fireEvent.click(more);
    expect(document.querySelectorAll('[data-chip]')).toHaveLength(15);
    expect(screen.queryByText('...')).toBeNull();
    fireEvent.click(document.querySelector('[data-recent-more]')!);
    expect(document.querySelectorAll('[data-chip]')).toHaveLength(5);
  });

  it('has no "..." chip when there are 5 foods or fewer, and never shows more than 15', () => {
    view(foods.slice(0, 5));
    expect(screen.queryByText('...')).toBeNull();
    cleanup();
    view(Array.from({ length: 30 }, (_, i) => ({ id: `g${i}`, name: `G ${i}` })));
    fireEvent.click(screen.getByText('...'));
    expect(document.querySelectorAll('[data-chip]')).toHaveLength(15);
  });
});

describe('plan groups', () => {
  const groups: PlanGroup[] = [{ id: 'a', name: 'Cutting', createdAt: '' }, { id: 'b', name: 'Holiday', createdAt: '' }, { id: 'empty', name: 'Nothing', createdAt: '' }];
  const plans = [
    plan('a1', '2025-03-03', [], { groupId: 'a', kind: 'note', note: 'x' }),
    plan('a2', '2025-03-01', [], { groupId: 'a', kind: 'note', note: 'x' }),
    plan('b1', '2025-01-01', [], { groupId: 'b', kind: 'note', note: 'x' }),
    plan('old', '2024-01-01', [], { kind: 'note', note: 'x' }),
    plan('lost', '2024-02-01', [], { groupId: 'deleted', kind: 'note', note: 'x' }),
  ];

  it('groups meals by plan, drops empty groups and collects unnamed meals last', () => {
    const views = planGroupViews(plans, groups);
    expect(views.map((v) => v.id)).toEqual(['a', 'b', UNGROUPED_PLAN_ID]);
    expect(views[0]).toMatchObject({ name: 'Cutting', start: '2025-03-01', end: '2025-03-03', days: 2, ungrouped: false });
    expect(views[2].plans.map((p) => p.id)).toEqual(['old', 'lost']);
  });

  it('splits current (last day not past) from past plans', () => {
    const { current, past, ungrouped } = splitPlans(planGroupViews(plans, groups), '2025-03-03');
    expect(current.map((v) => v.id)).toEqual(['a']);
    expect(past.map((v) => v.id)).toEqual(['b']);
    expect(ungrouped?.ungrouped).toBe(true);
    expect(isCurrentPlan({ end: '2025-03-03' }, '2025-03-04')).toBe(false);
  });

  it('names a copy', () => {
    expect(copyName('Cutting', 'en')).toBe('Cutting (copy)');
    expect(copyName('Cutting', 'it')).toBe('Cutting (copia)');
  });
});

describe('shopping list', () => {
  const plans = [
    plan('p1', '2025-03-01', [{ food: rice, amount: 150 }, { food: milk, amount: 250 }]),
    plan('p2', '2025-03-02', [{ food: rice, amount: 100 }, { food: bowl, amount: 200 }]),
    plan('p3', '2025-03-03', [], { kind: 'note', note: 'Dinner out' }),
  ];

  it('adds up quantities and breaks recipes into their ingredients', () => {
    const items = buildShoppingItems(plans, lookup, 'en');
    const by = Object.fromEntries(items.map((i) => [i.foodId, i.amount]));
    // rice: 150 + 100 + half of the bowl (100 g); chicken: half of the bowl.
    expect(by).toEqual({ rice: 350, chicken: 100, milk: 250 });
    expect(items.map((i) => i.name)).toEqual(['Chicken', 'Milk', 'Rice']);
    expect(items.every((i) => !i.checked)).toBe(true);
  });

  it('keeps a recipe as one line when its ingredients are gone, and keeps foods of different units apart', () => {
    const only = buildShoppingItems([plan('p', '2025-03-01', [{ food: bowl, amount: 300 }])], (id) => (id === 'bowl' ? bowl : undefined), 'en');
    expect(only).toMatchObject([{ foodId: 'bowl', amount: 300 }]);
    const mixed = buildShoppingItems([plan('p', '2025-03-01', [{ food: food('x', 'Water', { unit: 'ml' }), amount: 200 }, { food: food('x', 'Water'), amount: 50 }])], () => undefined, 'en');
    expect(mixed).toHaveLength(2);
  });

  it('ticks, removes (and stays removed after an update), adds and updates', () => {
    let list = createShoppingList(plans, 'g', lookup, 'en');
    expect(list.items).toHaveLength(3);
    list = toggleShoppingItem(list, 'rice|g');
    expect(boughtCount(list)).toBe(1);
    list = removeShoppingItem(list, 'milk|ml');
    expect(list.items.map((i) => i.id)).toEqual(['chicken|g', 'rice|g']);
    list = addCustomShoppingItem(list, 'c1', ' Salt ', 500, 'g');
    list = addCustomShoppingItem(list, 'c2', '   ', 1, 'g');
    expect(list.items.at(-1)).toMatchObject({ id: 'c1', name: 'Salt', amount: 500, unit: 'g', custom: true });
    expect(list.items).toHaveLength(3);
    // The plan grows: more rice. Ticks and removals survive, the quantity follows the plan, hand-made lines stay.
    const bigger = [...plans, plan('p4', '2025-03-04', [{ food: rice, amount: 50 }])];
    const fresh = buildShoppingItems(bigger, lookup, 'en');
    expect(isShoppingListOutdated(list, fresh)).toBe(true);
    const synced = syncShoppingList(list, fresh);
    expect(synced.items.map((i) => [i.id, i.amount, i.checked])).toEqual([['chicken|g', 100, false], ['rice|g', 400, true], ['c1', 500, false]]);
    expect(isShoppingListOutdated(synced, fresh)).toBe(false);
  });

  it('removing a hand-made line does not blacklist anything; a line without a quantity is allowed', () => {
    let list = createShoppingList([], 'g', lookup, 'en');
    list = addCustomShoppingItem(list, 'c1', 'Bread', null, 'g');
    expect(list.items[0]).toMatchObject({ amount: null, unit: '' });
    list = removeShoppingItem(list, 'c1');
    expect(list.items).toEqual([]);
    expect(list.dismissed).toEqual([]);
  });

  it('formats quantities', () => {
    expect(formatQuantity(350, 'g')).toBe('350 g');
    expect(formatQuantity(1250, 'g')).toBe('1.25 kg');
    expect(formatQuantity(2000, 'ml')).toBe('2 l');
    expect(formatQuantity(null, '')).toBe('');
  });
});

describe('journal storage', () => {
  it('reads older journals (no groups, no lists) and keeps the new fields of newer ones', () => {
    expect(normalizeMealJournal({ version: 1, plans: [], memories: {}, photos: [] })).toMatchObject({ planGroups: [], shoppingLists: [] });
    const data = normalizeMealJournal({
      version: 1,
      plans: [plan('a1', '2025-03-03', [], { groupId: 'a', kind: 'note', note: 'x' })],
      planGroups: [{ id: 'a', name: 'Cutting', createdAt: '2025-03-01' }, { id: 'bad' }],
      shoppingLists: [{ planId: 'a', updatedAt: '', dismissed: ['x|g', 5], items: [{ id: 'rice|g', name: 'Rice', amount: 350, unit: 'g', checked: true }, { id: 'n' }, { id: 'z', name: 'Z', amount: -3, unit: 'kg', checked: 'yes' }] }],
      memories: {},
      photos: [],
    });
    expect(data.plans[0].groupId).toBe('a');
    expect(data.planGroups).toEqual([{ id: 'a', name: 'Cutting', createdAt: '2025-03-01' }]);
    expect(data.shoppingLists[0].dismissed).toEqual(['x|g']);
    expect(data.shoppingLists[0].items).toEqual([
      { id: 'rice|g', name: 'Rice', amount: 350, unit: 'g', checked: true, foodId: undefined, custom: undefined },
      { id: 'z', name: 'Z', amount: null, unit: '', checked: false, foodId: undefined, custom: undefined },
    ]);
  });
});
