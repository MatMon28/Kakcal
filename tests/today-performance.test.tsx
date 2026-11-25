import { act, cleanup, render, waitFor } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppProvider, useApp, useNav, useNavActions } from '../src/context/AppContext';
import { MealSlotCard } from '../src/components/dashboard/MealSlotCard';
import { plansForSlotOf } from '../src/utils/journalStore';
import { knownFoodIds } from '../src/utils/knownFoods';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { flushWrites } from '../src/storage/writeQueue';
import { resetBootForTests } from '../src/storage/boot';
import type { FoodItem, MealSlotId } from '../src/types';
import type { MealPlan } from '../src/types/journal';

// Today performance regression tests (docs/performance.md > Today performance round).

beforeEach(async () => {
  await deleteDatabase(); resetDbForTests(); resetBootForTests(); localStorage.clear();
});
afterEach(async () => { cleanup(); await flushWrites(); });

const noop = () => {};

// A probe that exposes the context functions to the test body (it re-renders on any change, which is fine here).
type Api = ReturnType<typeof useApp> & ReturnType<typeof useNav> & ReturnType<typeof useNavActions>;
let api!: Api;
function Probe() {
  api = { ...useApp(), ...useNav(), ...useNavActions() };
  return null;
}

const itemRows = () => document.querySelectorAll('[data-item-nutrition]').length;

describe('collapsed means not mounted (C1)', () => {
  it('a collapsed meal renders zero item rows and zero food grids; opening it mounts them', () => {
    const { rerender } = render(<AppProvider><Probe /></AppProvider>);
    act(() => { api.logFoodItem('lunch', api.allFoods[0], 100); });
    rerender(<AppProvider><Probe /><MealSlotCard slotId="lunch" open={false} onToggle={noop} /></AppProvider>);
    expect(itemRows()).toBe(0);
    expect(document.querySelector('[data-meal-slot="lunch"] [data-item-nutrition]')).toBeNull();
    rerender(<AppProvider><Probe /><MealSlotCard slotId="lunch" open onToggle={noop} /></AppProvider>);
    expect(itemRows()).toBe(1);
  });

  it('a card re-closes without unmounting its body (the closing animation keeps its content)', () => {
    const { rerender } = render(<AppProvider><Probe /></AppProvider>);
    act(() => { api.logFoodItem('lunch', api.allFoods[0], 100); });
    // Mount closed first, then open (by a tap, so the body mounts at once), then re-close.
    rerender(<AppProvider><Probe /><MealSlotCard slotId="lunch" open={false} onToggle={noop} /></AppProvider>);
    rerender(<AppProvider><Probe /><MealSlotCard slotId="lunch" open onToggle={noop} /></AppProvider>);
    expect(itemRows()).toBe(1);
    rerender(<AppProvider><Probe /><MealSlotCard slotId="lunch" open={false} onToggle={noop} /></AppProvider>);
    expect(itemRows()).toBe(1);
  });

  it('a meal that is open on arrival mounts its body after the first paint, behind the skeleton', async () => {
    const { rerender } = render(<AppProvider><Probe /></AppProvider>);
    act(() => { api.logFoodItem('lunch', api.allFoods[0], 100); });
    // The card mounts already open: that is "open on arrival" (kcak_today_meals_open).
    act(() => { rerender(<AppProvider><Probe /><MealSlotCard slotId="lunch" open onToggle={noop} /></AppProvider>); });
    expect(document.querySelector('.kc-body-skeleton')).not.toBeNull();
    expect(itemRows()).toBe(0);
    await waitFor(() => expect(itemRows()).toBe(1));
    expect(document.querySelector('.kc-body-skeleton')).toBeNull();
  });
});

describe('a tab change does not re-render Today (C2)', () => {
  it('changing activeTab does not re-render a mounted meal card', () => {
    let commits = 0;
    render(
      <AppProvider>
        <Probe />
        <Profiler id="meal" onRender={() => { commits += 1; }}>
          <MealSlotCard slotId="dinner" open={false} onToggle={noop} />
        </Profiler>
      </AppProvider>,
    );
    const before = commits;
    act(() => { api.setActiveTab('prebuilt'); });
    act(() => { api.setActiveTab('history'); });
    expect(api.activeTab).toBe('history');
    expect(commits).toBe(before);
  });
});

describe('indexed plans and known foods (C5)', () => {
  it('plansForSlotOf returns exactly what the old filter + sort returned, for a seeded fixture', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const slots: MealSlotId[] = ['breakfast', 'lunch', 'dinner', 'mid_morning'];
    const dates = ['2026-01-01', '2026-01-02', '2026-01-03'];
    const plans = Array.from({ length: 300 }, (_, i) => ({
      id: `p-${i}`,
      date: dates[Math.floor(rnd() * dates.length)],
      slot: slots[Math.floor(rnd() * slots.length)],
      kind: rnd() < 0.3 ? 'note' : 'meal',
      loggedAt: rnd() < 0.25 ? '2026-01-01T10:00:00.000Z' : undefined,
    })) as unknown as MealPlan[];
    const oldWay = (date: string, slot: MealSlotId) => plans
      .filter((p) => p.date === date && p.slot === slot && !p.loggedAt)
      .sort((a, b) => Number(b.kind === 'note') - Number(a.kind === 'note'));
    for (const date of [...dates, '2099-01-01']) {
      for (const slot of slots) {
        expect(plansForSlotOf(plans, date, slot)).toEqual(oldWay(date, slot));
      }
    }
    expect(plansForSlotOf(plans, dates[0], slots[0])).toBe(plansForSlotOf(plans, dates[0], slots[0]));
  });

  it('knownFoodIds holds the ids of the list and is built once per list', () => {
    const foods = [{ id: 'a' }, { id: 'b' }] as FoodItem[];
    const first = knownFoodIds(foods);
    expect([...first].sort()).toEqual(['a', 'b']);
    expect(knownFoodIds(foods)).toBe(first);
  });
});
