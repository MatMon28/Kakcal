import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp, useNavActions } from '../src/context/AppContext';
import { useJournalText } from '../src/i18n/journal';
import { useLayoutText } from '../src/i18n/layout';
import { useAdvancedText } from '../src/i18n/advanced';
import { useMealSlots } from '../src/utils/mealSlots';
import { LazyBody } from '../src/components/common/LazyBody';
import { DeferredBody } from '../src/components/common/DeferredBody';
import { PageSwiper } from '../src/components/common/PageSwiper';
import { getFoodByIdMap, getMealNutritionMap, getSavedRecipes } from '../src/components/prebuilt/usePreBuiltMealsState';
import { consumePendingMealSlot, revealMealSlot } from '../src/utils/journalNavigation';
import { planGroupViews, UNGROUPED_PLAN_ID } from '../src/utils/planGroups';
import { afterPaint } from '../src/utils/idle';
import { PAGE_IN_MS, PAGE_OUT_MS, playPageChange, setPageTransitioning } from '../src/utils/pageTransition';
import { importMealJournal, normalizeMealJournal, saveMealPhoto, usePhotosForLinked, usePhotosForSlot } from '../src/utils/journalStore';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { flushWrites } from '../src/storage/writeQueue';
import { resetBootForTests } from '../src/storage/boot';
import type { ActiveTab, FoodItem, PreBuiltMeal } from '../src/types';
import type { MealPhoto, MealPlan, PlanGroup } from '../src/types/journal';

// Page-change performance regression tests (docs/performance.md): what must NOT re-render on a tab change, and the
// pure helpers behind the cheaper first frame.

beforeEach(async () => {
  setPageTransitioning(false);
  consumePendingMealSlot();
  await deleteDatabase(); resetDbForTests(); resetBootForTests(); localStorage.clear();
});
afterEach(async () => { setPageTransitioning(false); cleanup(); vi.useRealTimers(); await flushWrites(); });

const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>;

describe('narrow subscriptions', () => {
  it('a settings-only consumer (the four text hooks) does not re-render on a tab change or a dialog; useApp() does', () => {
    const renders = { text: 0, slots: 0, everything: 0 };
    function TextConsumer() {
      renders.text += 1;
      useJournalText(); useLayoutText(); useAdvancedText();
      return null;
    }
    function SlotsConsumer() {
      renders.slots += 1;
      useMealSlots();
      return null;
    }
    function Everything() {
      renders.everything += 1;
      useApp();
      return null;
    }
    let api!: ReturnType<typeof useApp> & ReturnType<typeof useNavActions>;
    function Grab() { api = { ...useApp(), ...useNavActions() }; return null; }
    render(<><TextConsumer /><SlotsConsumer /><Everything /><Grab /></>, { wrapper });
    const before = { ...renders };
    act(() => api.setActiveTab('prebuilt'));
    act(() => api.setActiveTab('today'));
    act(() => api.setIsWaterOpen(true));
    expect(renders.everything).toBeGreaterThan(before.everything);
    expect(renders.text).toBe(before.text);
    expect(renders.slots).toBe(before.slots);
    act(() => api.setLanguage('it'));
    expect(renders.text).toBeGreaterThan(before.text);
    expect(renders.slots).toBeGreaterThan(before.slots);
  });

  it('the text hooks still translate', () => {
    const { result } = renderHook(() => ({ j: useJournalText(), api: useApp() }), { wrapper });
    expect(result.current.j('Meal diary', 'Diario dei pasti')).toBe('Meal diary');
    act(() => result.current.api.setLanguage('it'));
    expect(result.current.j('Meal diary', 'Diario dei pasti')).toBe('Diario dei pasti');
  });
});

describe('LazyBody / DeferredBody', () => {
  it('mounts nothing while closed, and a body opened by the user at once (no skeleton)', () => {
    const { rerender, container } = render(<LazyBody open={false} defer><p>body</p></LazyBody>);
    expect(container.textContent).toBe('');
    rerender(<LazyBody open defer><p>body</p></LazyBody>);
    expect(screen.getByText('body')).toBeTruthy();
    expect(container.querySelector('.kc-body-skeleton')).toBeNull();
  });

  it('a body that is open on the first render shows a skeleton first, the body after the idle callback', () => {
    vi.useFakeTimers();
    const { container } = render(<LazyBody open defer><p>body</p></LazyBody>);
    expect(container.querySelector('.kc-body-skeleton')).not.toBeNull();
    expect(screen.queryByText('body')).toBeNull();
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.getByText('body')).toBeTruthy();
    expect(container.querySelector('.kc-body-skeleton')).toBeNull();
  });

  it('without `defer` an open body is mounted in the first commit, as before', () => {
    render(<LazyBody open><p>body</p></LazyBody>);
    expect(screen.getByText('body')).toBeTruthy();
  });

  it('waits until an active page transition settles before mounting and fades in via .kc-deferred-in', () => {
    vi.useFakeTimers();
    setPageTransitioning(true);
    const { container } = render(<DeferredBody><p>deferred</p></DeferredBody>);
    expect(container.querySelector('.kc-body-skeleton')).not.toBeNull();
    expect(screen.queryByText('deferred')).toBeNull();
    // Still waiting while transition is active (before the safety timeout).
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.queryByText('deferred')).toBeNull();
    act(() => { setPageTransitioning(false); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByText('deferred')).toBeTruthy();
    expect(container.querySelector('.kc-deferred-in')).not.toBeNull();
  });
});

describe('photo lookups', () => {
  const photo = (id: string, date: string, slot: MealPhoto['slot'], linkedId?: string): MealPhoto =>
    ({ id, date, slot, src: `idb:${id}`, note: '', createdAt: `2025-01-0${id}T00:00:00Z`, linkedId });

  it('returns the linked photos and the slot photos in store order, and keeps identity until a photo changes', async () => {
    importMealJournal(normalizeMealJournal({ photos: [] }));
    act(() => {
      saveMealPhoto(photo('1', '2025-01-01', 'lunch'));
      saveMealPhoto(photo('2', '2025-01-01', 'lunch', 'meal-a'));
      saveMealPhoto(photo('3', '2025-01-01', 'dinner'));
      saveMealPhoto(photo('4', '2025-01-01', 'lunch'));
    });
    const { result, rerender } = renderHook(() => ({
      linked: usePhotosForLinked('meal-a'),
      lunch: usePhotosForSlot('2025-01-01', 'lunch'),
      none: usePhotosForSlot('2030-01-01', 'lunch'),
    }));
    expect(result.current.linked.map((p) => p.id)).toEqual(['2']);
    // `saveMealPhoto` puts the newest first, exactly the order the `photos.filter` it replaces gave.
    expect(result.current.lunch.map((p) => p.id)).toEqual(['4', '1']);
    expect(result.current.none).toEqual([]);
    const first = result.current;
    rerender();
    expect(result.current.lunch).toBe(first.lunch);
    expect(result.current.none).toBe(first.none);
    act(() => { saveMealPhoto(photo('5', '2025-01-01', 'dinner')); });
    expect(result.current.lunch.map((p) => p.id)).toEqual(['4', '1']);
    expect(result.current.linked.map((p) => p.id)).toEqual(['2']);
    await flushWrites();
  });
});

describe('planGroupViews', () => {
  // The previous implementation (a `plans.filter` per group), kept as the reference.
  function reference(plans: MealPlan[], groups: PlanGroup[]) {
    const known = new Set(groups.map((g) => g.id));
    const out: { id: string; ids: string[] }[] = [];
    for (const group of groups) {
      const own = plans.filter((p) => p.groupId === group.id);
      if (own.length) out.push({ id: group.id, ids: own.map((p) => p.id).sort() });
    }
    const loose = plans.filter((p) => !p.groupId || !known.has(p.groupId));
    if (loose.length) out.push({ id: UNGROUPED_PLAN_ID, ids: loose.map((p) => p.id).sort() });
    return out;
  }
  const plan = (id: string, date: string, groupId?: string): MealPlan =>
    ({ id, date, slot: 'lunch', title: id, kind: 'note', items: [], note: '', read: false, groupId });

  it('gives the same groups and members as the per-group filter, for many groups', () => {
    const groups: PlanGroup[] = Array.from({ length: 40 }, (_, i) => ({ id: `g${i}`, name: `Plan ${i}`, createdAt: '2025-01-01' }));
    const plans: MealPlan[] = [];
    for (let i = 0; i < 400; i += 1) {
      const g = i % 47; // groups 40..46 do not exist: those meals are "ungrouped", as are the ones without a group
      plans.push(plan(`p${i}`, `2025-02-${String((i % 28) + 1).padStart(2, '0')}`, i % 11 === 0 ? undefined : `g${g}`));
    }
    const views = planGroupViews(plans, groups);
    expect(views.map((v) => ({ id: v.id, ids: v.plans.map((p) => p.id).sort() }))).toEqual(reference(plans, groups));
    const dates = views[0].plans.map((p) => p.date);
    expect(dates).toEqual([...dates].sort());
  });
});

describe('page transition', () => {
  it('returns both animations so the old page can be unmounted when ITS fade-out ends', () => {
    const animate = vi.fn((_keyframes: Keyframe[], options: KeyframeAnimationOptions) => ({ options }) as unknown as Animation);
    const incoming = { animate } as unknown as HTMLElement;
    const outgoing = { animate } as unknown as HTMLElement;
    const both = playPageChange(incoming, outgoing, 1);
    expect((both.outgoing as unknown as { options: KeyframeAnimationOptions }).options.duration).toBe(PAGE_OUT_MS);
    expect((both.incoming as unknown as { options: KeyframeAnimationOptions }).options.duration).toBe(PAGE_IN_MS);
    expect(playPageChange(incoming, null, 1).outgoing).toBeNull();
  });
});

describe('afterPaint', () => {
  it('runs the task after a frame and can be cancelled', async () => {
    const ran = vi.fn();
    afterPaint(ran);
    expect(ran).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(ran).toHaveBeenCalledTimes(1);
    const cancelled = vi.fn();
    afterPaint(cancelled)();
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(cancelled).not.toHaveBeenCalled();
  });
});

describe('Custom WeakMap caches', () => {
  const food = (id: string, isRecipe = false): FoodItem => ({
    id,
    name_de: id,
    name_it: id,
    name_en: id,
    store: 'Generic',
    category: 'prepared',
    unit: 'g',
    calories: 200,
    carbs: 20,
    protein: 10,
    fat: 8,
    fiber: 2,
    salt: 0.5,
    isRecipe,
  });
  const meal = (id: string, foodId: string): PreBuiltMeal => ({
    id,
    name: id,
    slot: 'lunch',
    createdAt: '2026-01-01T00:00:00Z',
    ingredients: [{ foodId, amount: 150 }],
  });

  it('reuses cached maps and recipe lists for identical array references and recomputes for new ones', () => {
    const foods1 = [food('f1'), food('r1', true)];
    const foods2 = [...foods1, food('r2', true)];
    const meals1 = [meal('m1', 'f1')];
    const meals2 = [...meals1];

    const map1 = getFoodByIdMap(foods1);
    expect(getFoodByIdMap(foods1)).toBe(map1);
    expect(map1.get('r1')?.id).toBe('r1');
    const map2 = getFoodByIdMap(foods2);
    expect(map2).not.toBe(map1);

    const recipes1 = getSavedRecipes(foods1);
    expect(getSavedRecipes(foods1)).toBe(recipes1);
    expect(recipes1.map((r) => r.id)).toEqual(['r1']);
    expect(getSavedRecipes(foods2).map((r) => r.id)).toEqual(['r1', 'r2']);

    const nut1 = getMealNutritionMap(meals1, map1);
    expect(getMealNutritionMap(meals1, map1)).toBe(nut1);
    expect(nut1.get('m1')?.totalKcal).toBe(300);
    expect(getMealNutritionMap(meals2, map1)).not.toBe(nut1);
    expect(getMealNutritionMap(meals1, map2)).not.toBe(nut1);
  });
});

describe('Today keep-alive and pending meal slot delivery', () => {
  it('keeps Today mounted via Activity when switching away and back, while unmounting non-Today pages', () => {
    function StatefulToday() {
      const [count, setCount] = useState(0);
      return <button type="button" onClick={() => setCount((c) => c + 1)}>today:{count}</button>;
    }
    function StatefulCustom() {
      const [count, setCount] = useState(0);
      return <button type="button" onClick={() => setCount((c) => c + 1)}>custom:{count}</button>;
    }
    const tabs: ActiveTab[] = ['today', 'prebuilt'];
    const renderTab = (tab: ActiveTab) => (tab === 'today' ? <StatefulToday /> : <StatefulCustom />);

    const { rerender, container } = render(
      <PageSwiper tabs={tabs} activeTab="today" onChange={() => {}} renderTab={renderTab} />,
    );
    act(() => { screen.getByText('today:0').click(); });
    expect(screen.getByText('today:1')).toBeTruthy();

    rerender(<PageSwiper tabs={tabs} activeTab="prebuilt" onChange={() => {}} renderTab={renderTab} />);
    expect(container.querySelectorAll('[data-journal-page]').length).toBe(1);
    expect(container.querySelector('[data-journal-page]')?.getAttribute('data-journal-page')).toBe('prebuilt');
    expect(screen.getByText('today:1').closest('[hidden]')).not.toBeNull();
    act(() => { screen.getByText('custom:0').click(); });
    expect(screen.getByText('custom:1')).toBeTruthy();

    rerender(<PageSwiper tabs={tabs} activeTab="today" onChange={() => {}} renderTab={renderTab} />);
    expect(screen.getByText('today:1')).toBeTruthy();
    expect(screen.queryByText('custom:1')).toBeNull();
  });

  it('buffers revealMealSlot until Today consumes it', () => {
    revealMealSlot('dinner');
    expect(consumePendingMealSlot()).toBe('dinner');
    expect(consumePendingMealSlot()).toBeNull();
  });
});
