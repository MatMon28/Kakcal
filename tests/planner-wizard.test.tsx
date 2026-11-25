import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/context/AppContext', () => {
  const app = {
    language: 'en',
    t: { common: { confirmTitle: 'Confirm', cancel: 'Cancel', close: 'Close' }, mealSlots: { lunch: 'Lunch', breakfast: 'Breakfast', dinner: 'Dinner' }, favorites: { title: 'Favourites', hint: '', empty: '' } },
    allFoods: [], preBuiltMeals: [], favoriteFoods: [], allDayLogs: {}, rememberFood: () => {}, settings: { quickFoods: [] },
  };
  return { useApp: () => app, useSettings: () => app };
});
// Dialogs render inline: the animation host of the real Modal is not what is being tested here.
vi.mock('../src/components/common/Modal', () => ({
  Modal: ({ isOpen, title, children, footer }: { isOpen: boolean; title: string; children: ReactNode; footer?: ReactNode }) =>
    isOpen ? <div role="dialog" aria-label={title}>{children}{footer}</div> : null,
}));
vi.mock('../src/components/common/SaveBeforeCloseDialog', () => ({ SaveBeforeCloseDialog: () => null }));
vi.mock('../src/utils/layoutStore', () => ({ useLayout: () => ({ enabled: false, mealTypes: [], pages: { today: { order: [], hidden: [] } } }), mealItemId: (id: string) => id }));

import { PlanWizard } from '../src/components/journal/PlannerWizard';
import { exportMealJournal, savePlanGroup } from '../src/utils/journalStore';
import { planGroupViews } from '../src/utils/planGroups';
import { plannedMealName } from '../src/utils/planMealName';
import type { FoodItem } from '../src/types';
import type { MealPlan } from '../src/types/journal';

afterEach(cleanup);

const rice = { id: 'rice', name_de: 'Rice', name_it: 'Riso', name_en: 'Rice', store: 'Other', category: 'other', unit: 'g', calories: 130, carbs: 28, protein: 2, fat: 0, fiber: 0, salt: 0 } as unknown as FoodItem;
const meal = (id: string, date: string, slot: MealPlan['slot'] = 'lunch'): MealPlan => ({ id, date, slot, title: 'Rice', kind: 'food', items: [{ food: rice, amount: 150 }], note: '', read: false });
const FIRST = '2099-03-02';

function savedPlan() {
  savePlanGroup({ id: 'g1', name: 'Cutting', createdAt: '2099-01-01T00:00:00.000Z' }, [meal('m1', '2099-02-01'), meal('m2', '2099-02-02'), meal('m3', '2099-02-04')]);
  return planGroupViews(exportMealJournal().plans, exportMealJournal().planGroups).find((v) => v.id === 'g1')!;
}
const click = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }));

describe('planner wizard', () => {
  it('asks for one plan name on page 1; page 2 asks for no name (a meal name is an option of an open meal)', () => {
    render(<PlanWizard initialDate={FIRST} onClose={() => {}} />);
    const next = () => document.querySelector('.journal-plan-footer .journal-primary-button') as HTMLButtonElement;
    expect(screen.getByLabelText(/name of the plan/i)).toBeTruthy();
    expect(next().disabled).toBe(true);
    expect(next().textContent).toMatch(/choose a name/i);
    fireEvent.change(document.querySelector('[data-plan-name]')!, { target: { value: 'Holiday menu' } });
    expect(next().disabled).toBe(false);
    fireEvent.click(next());
    // Page 2 has no name field, only the meals.
    expect(document.querySelector('[data-plan-name]')).toBeNull();
    expect(document.querySelectorAll('input[type="text"]')).toHaveLength(0);
  });

  it('reuses a 7-day-style plan: page 1 is filled in, longer plans get empty extra days, and it saves as a new named plan', () => {
    const group = savedPlan(); // 3 days, planned on day 1, 2 and 4 (day 3 is skipped)
    const onClose = vi.fn();
    render(<PlanWizard initialDate={FIRST} reuse={group} onClose={onClose} />);
    expect((document.querySelector('[data-plan-name]') as HTMLInputElement).value).toBe('Cutting (copy)');
    // Same span (4 days), so 3 days are on and 1 is off.
    expect(screen.getByText(/3 of 4 days will be planned/i)).toBeTruthy();
    // Make the plan 6 days long: the two new days are on and empty.
    fireEvent.change(screen.getByLabelText('Last day of the plan'), { target: { value: '2099-03-07' } });
    expect(screen.getByText(/5 of 6 days will be planned/i)).toBeTruthy();
    click(/^Next/);
    const rows = Array.from(document.querySelectorAll('.journal-meal-card'));
    expect(rows).toHaveLength(5);
    expect(rows.filter((r) => r.classList.contains('is-done'))).toHaveLength(3);
    expect(rows.filter((r) => !r.classList.contains('is-done'))).toHaveLength(2);
    click(/^Save/);
    expect(onClose).toHaveBeenCalled();
    const saved = exportMealJournal();
    const copy = saved.planGroups.find((g) => g.name === 'Cutting (copy)')!;
    expect(copy).toBeTruthy();
    const copyPlans = saved.plans.filter((p) => p.groupId === copy.id).sort((a, b) => a.date.localeCompare(b.date));
    expect(copyPlans.map((p) => p.date)).toEqual(['2099-03-02', '2099-03-03', '2099-03-05']);
    expect(new Set(copyPlans.map((p) => p.id)).size).toBe(3);
    // The original is untouched.
    expect(saved.plans.filter((p) => p.groupId === 'g1')).toHaveLength(3);
  });

  it('moving the first day of a reused plan keeps its shape', () => {
    const group = savedPlan();
    render(<PlanWizard initialDate={FIRST} reuse={group} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('First day of the plan'), { target: { value: '2099-03-09' } });
    expect((screen.getByLabelText('Last day of the plan') as HTMLInputElement).value).toBe('2099-03-12');
    expect(screen.getByText(/3 of 4 days will be planned/i)).toBeTruthy();
    click(/^Next/);
    expect(document.querySelectorAll('.journal-meal-card.is-done')).toHaveLength(3);
  });

  it('edits a saved plan as a whole: opens on the meals, keeps ids, replaces the plan on save', () => {
    const group = savedPlan();
    const onClose = vi.fn();
    render(<PlanWizard initialDate={FIRST} group={group} onClose={onClose} />);
    expect(document.querySelector('[data-planner-step="plan"]')).toBeTruthy();
    expect(document.querySelectorAll('.journal-meal-card.is-done')).toHaveLength(3);
    // Back to page 1: rename and keep the same days.
    click(/name, days and meals/i);
    fireEvent.change(document.querySelector('[data-plan-name]')!, { target: { value: 'Cutting v2' } });
    click(/^Next/);
    click(/save changes/i);
    expect(onClose).toHaveBeenCalled();
    const saved = exportMealJournal();
    expect(saved.planGroups.filter((g) => g.id === 'g1')).toEqual([{ id: 'g1', name: 'Cutting v2', createdAt: '2099-01-01T00:00:00.000Z' }]);
    expect(saved.plans.filter((p) => p.groupId === 'g1').map((p) => p.id).sort()).toEqual(['m1', 'm2', 'm3']);
  });

  it('shows the date next to the meal type on every meal card', () => {
    const group = savedPlan();
    render(<PlanWizard initialDate={FIRST} group={group} onClose={() => {}} />);
    const heads = [...document.querySelectorAll('.journal-meal-card-title strong')].map((el) => el.textContent ?? '');
    expect(heads).toHaveLength(3);
    for (const head of heads) expect(head).toMatch(/^Lunch · \S.*Feb/);
    expect(heads[0]).toContain('1');
    expect(heads[2]).toContain('4');
    expect(document.querySelectorAll('.journal-meal-card-title [data-plan-date]')).toHaveLength(3);
  });

  it('offers "Meal name" as an option of one meal, saves it, and never invents one from the foods', () => {
    savedPlan();
    const single = exportMealJournal().plans.find((p) => p.id === 'm2')!;
    const view = render(<PlanWizard initialDate={FIRST} plan={single} onClose={() => {}} />);
    // The stored title "Rice" is only the automatic summary: no name field yet, just the option.
    expect(document.querySelector('[data-meal-name] input')).toBeNull();
    expect(screen.queryByText(/plan name \(optional\)/i)).toBeNull();
    click('Meal name');
    fireEvent.change(screen.getByLabelText('Meal name'), { target: { value: 'Sunday roast' } });
    click(/save plan/i);
    const named = exportMealJournal().plans.find((p) => p.id === 'm2')!;
    expect(named.title).toBe('Sunday roast');
    expect(plannedMealName(named)).toBe('Sunday roast');
    view.unmount();
    // A named meal opens with its name; an unnamed one keeps the food summary as title.
    render(<PlanWizard initialDate={FIRST} plan={named} onClose={() => {}} />);
    expect((screen.getByLabelText('Meal name') as HTMLInputElement).value).toBe('Sunday roast');
    const unnamed = exportMealJournal().plans.find((p) => p.id === 'm1')!;
    expect(unnamed.title).toBe('Rice');
    expect(plannedMealName(unnamed)).toBe('');
  });

  it('keeps editing a single meal of a plan inside its plan', () => {
    savedPlan();
    const single = exportMealJournal().plans.find((p) => p.id === 'm2')!;
    render(<PlanWizard initialDate={FIRST} plan={single} onClose={() => {}} />);
    click(/save plan/i);
    const saved = exportMealJournal();
    expect(saved.plans.find((p) => p.id === 'm2')?.groupId).toBe('g1');
    expect(saved.plans.filter((p) => p.groupId === 'g1')).toHaveLength(3);
  });
});
