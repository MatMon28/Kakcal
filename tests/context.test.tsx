import { act, cleanup, render, renderHook } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppProvider, useApp, useSettings } from '../src/context/AppContext';
import { VERIFIED_FOODS } from '../src/data/verifiedFoods';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { flushWrites } from '../src/storage/writeQueue';
import { loadDayLogs } from '../src/storage/dayStore';
import { resetBootForTests } from '../src/storage/boot';
import { STORAGE_KEYS } from '../src/context/appStorage';

const wrapper = ({ children }: { children: ReactNode }) => <StrictMode><AppProvider>{children}</AppProvider></StrictMode>;
const food = VERIFIED_FOODS[0];

beforeEach(async () => {
  await deleteDatabase(); resetDbForTests(); resetBootForTests(); localStorage.clear();
});
afterEach(async () => { cleanup(); await flushWrites(); });

describe('food logging', () => {
  it('logs, edits and removes a food and persists the day as its own record', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const date = result.current.selectedDate;
    act(() => result.current.logFoodItem('lunch', food, 150));
    expect(result.current.currentDayLog.meals.lunch).toHaveLength(1);
    expect(result.current.currentIntakeCalories).toBeGreaterThan(0);
    const id = result.current.currentDayLog.meals.lunch[0].id;
    act(() => result.current.updateLoggedFoodItemAmount('lunch', id, 200));
    expect(result.current.currentDayLog.meals.lunch[0].amount).toBe(200);
    await flushWrites();
    resetDbForTests();
    expect((await loadDayLogs()).logs[date].meals.lunch[0].amount).toBe(200);
    act(() => result.current.removeLoggedFoodItem('lunch', id));
    expect(result.current.currentDayLog.meals.lunch).toHaveLength(0);
  });
});

describe('navigation', () => {
  it('changes tab and returns from the food database to the previous tab', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.setActiveTab('history'));
    expect(result.current.activeTab).toBe('history');
    act(() => result.current.setActiveTab('database'));
    act(() => result.current.returnFromDatabase());
    expect(result.current.activeTab).toBe('history');
  });
});

describe('saving settings without writing inside updaters', () => {
  it('persists a settings change through the queue', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.updateSettings({ ultraMinimal: true }));
    await flushWrites();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)!).ultraMinimal).toBe(true);
  });
});

describe('backup export and import', () => {
  it('round-trips the journal through JSON', async () => {
    const first = renderHook(() => useApp(), { wrapper });
    act(() => first.result.current.logFoodItem('dinner', food, 100));
    act(() => first.result.current.updateSettings({ trackSugar: true }));
    let json = '';
    await act(async () => { json = await first.result.current.exportDataJson(); });
    first.unmount();
    await deleteDatabase(); resetDbForTests(); resetBootForTests(); localStorage.clear();
    const second = renderHook(() => useApp(), { wrapper });
    expect(second.result.current.allDayLogs).toEqual({});
    let ok = false;
    await act(async () => { ok = await second.result.current.importDataJson(json); });
    expect(ok).toBe(true);
    expect(Object.values(second.result.current.allDayLogs).some((d) => d.meals.dinner.length === 1)).toBe(true);
    expect(second.result.current.settings.trackSugar).toBe(true);
  });
  it('rejects invalid JSON without changing anything', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    let ok = true;
    await act(async () => { ok = await result.current.importDataJson('not json'); });
    expect(ok).toBe(false);
  });
});

describe('context split (item 1)', () => {
  it('does not re-render a settings consumer when journal data changes', () => {
    let renders = 0;
    let api: ReturnType<typeof useApp> | undefined;
    const Settings = () => { useSettings(); renders++; return null; };
    const Api = () => { api = useApp(); return null; };
    render(<AppProvider><Settings /><Api /></AppProvider>);
    const before = renders;
    act(() => api!.logFoodItem('lunch', food, 100));
    act(() => api!.setActiveTab('history'));
    expect(renders).toBe(before);
    act(() => api!.updateSettings({ ultraMinimal: true }));
    expect(renders).toBeGreaterThan(before);
  });
});
