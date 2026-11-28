import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { Profiler, StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppProvider, useApp, useNav, useNavActions, useSettings, useUiActions } from '../src/context/AppContext';
import { Header } from '../src/components/common/Header';
import { TodayView } from '../src/components/dashboard/TodayView';
import { PlanTransfer } from '../src/components/journal/PlanTransfer';
import { JOURNAL_KEY } from '../src/utils/journalStore';
import type { MealPlan, PlanGroup } from '../src/types/journal';
import { createPlanText } from '../src/utils/planSharing';
import { getRemovals, undoRemoval } from '../src/utils/undoRemoval';
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
    const { result } = renderHook(() => ({ ...useNav(), ...useNavActions() }), { wrapper });
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
    let api: (ReturnType<typeof useApp> & ReturnType<typeof useNavActions>) | undefined;
    const Settings = () => { useSettings(); renders++; return null; };
    const Api = () => { api = { ...useApp(), ...useNavActions() }; return null; };
    render(<AppProvider><Settings /><Api /></AppProvider>);
    const before = renders;
    act(() => api!.logFoodItem('lunch', food, 100));
    act(() => api!.setActiveTab('history'));
    expect(renders).toBe(before);
    act(() => api!.updateSettings({ ultraMinimal: true }));
    expect(renders).toBeGreaterThan(before);
  });

  it('does not re-render Header, Tabs, or TodayView when opening/closing a modal', () => {
    const prevRO = globalThis.ResizeObserver;
    const prevMM = window.matchMedia;
    const prevFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
    window.matchMedia = (() => ({ matches: true, media: '', onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } })) as unknown as typeof window.matchMedia;
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } });
    try {
      let headerCommits = 0;
      let todayCommits = 0;
      let actions: ReturnType<typeof useUiActions> | undefined;
      const Actions = () => { actions = useUiActions(); return null; };
      render(
        <AppProvider>
          <Profiler id="header" onRender={() => { headerCommits++; }}>
            <Header />
          </Profiler>
          <Profiler id="today" onRender={() => { todayCommits++; }}>
            <TodayView />
          </Profiler>
          <Actions />
        </AppProvider>,
      );
      const headerBefore = headerCommits;
      const todayBefore = todayCommits;
      act(() => actions!.setIsWaterOpen(true));
      act(() => actions!.setIsWaterOpen(false));
      expect(headerCommits).toBe(headerBefore);
      expect(todayCommits).toBe(todayBefore);
      cleanup();
    } finally {
      globalThis.ResizeObserver = prevRO;
      window.matchMedia = prevMM;
      if (prevFonts) Object.defineProperty(document, 'fonts', prevFonts);
      else delete (document as unknown as Record<string, unknown>).fonts;
    }
  });
});

describe('Health Connect activity undo', () => {
  it('un-dismisses externalId when undoing deletion of a Health Connect activity', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.logActivity({
        type: 'running',
        method: 'duration',
        durationMin: 30,
        caloriesBurned: 280,
        source: 'health_connect',
        externalId: 'hc-ext-42',
      });
    });
    const beforeRemovals = getRemovals().length;
    const actId = result.current.currentDayLog.activities[0].id;
    act(() => result.current.removeActivity(actId));
    expect(result.current.currentDayLog.activities).toHaveLength(0);
    expect(result.current.settings.healthConnectDismissedIds).toContain('hc-ext-42');

    const removals = getRemovals();
    expect(removals).toHaveLength(beforeRemovals + 1);
    act(() => undoRemoval(removals[0].id));

    expect(result.current.currentDayLog.activities).toHaveLength(1);
    expect(result.current.currentDayLog.activities[0].externalId).toBe('hc-ext-42');
    expect(result.current.settings.healthConnectDismissedIds).not.toContain('hc-ext-42');
  });
});

describe('PlanTransfer group import', () => {
  it('imports shared meal plans as a named PlanGroup', async () => {
    const sample = createPlanText([
      {
        id: 'p1',
        date: '2026-11-24',
        slot: 'lunch',
        title: 'Pasta',
        kind: 'food',
        items: [{ food, amount: 100 }],
        note: '',
        read: false,
      },
    ]);
    render(
      <AppProvider>
        <PlanTransfer plans={[]} weekStart="2026-11-23" />
      </AppProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Share or import meal plans' });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Import a plan' }));
    fireEvent.change(screen.getByLabelText('Paste a meal-plan link or exported text'), { target: { value: sample } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview plan' }));

    await waitFor(() => expect(screen.getByLabelText('Plan name')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Plan name'), { target: { value: 'Shared Week' } });
    fireEvent.click(screen.getByRole('button', { name: /Import 1 meals/i }));

    await flushWrites();
    const journal = JSON.parse(localStorage.getItem(JOURNAL_KEY)!) as { planGroups: PlanGroup[]; plans: MealPlan[] };
    expect(journal.planGroups.some((g) => g.name === 'Shared Week')).toBe(true);
    expect(journal.plans.some((p) => p.title === 'Pasta' && p.groupId)).toBe(true);
  });
});
