import { describe, expect, it } from 'vitest';
import type { FoodItem } from '../src/types';
import type { MealPlan } from '../src/types/journal';
import { automaticPlanTitles, plannedMealName } from '../src/utils/planMealName';

const food = (id: string, en: string, it: string) => ({ id, name_de: en, name_it: it, name_en: en, unit: 'g', calories: 100 }) as unknown as FoodItem;
const rice = food('rice', 'Rice', 'Riso');
const beans = food('beans', 'Beans', 'Fagioli');
const plan = (title: string, items = [rice, beans], kind: MealPlan['kind'] = 'food', note = '') =>
  ({ title, kind, note, items: items.map((entry) => ({ food: entry, amount: 100 })) });

describe('meal name of a planned meal', () => {
  it('is empty for the summaries the planner writes by itself', () => {
    expect(plannedMealName(plan('Rice + Beans'))).toBe('');
    expect(plannedMealName(plan('Riso + Fagioli'))).toBe(''); // saved in Italian, read in English
    expect(plannedMealName(plan('Rice'))).toBe(''); // older plans took the first food as title
    expect(plannedMealName(plan('Beans'))).toBe('');
    expect(plannedMealName(plan('', [rice]))).toBe('');
    expect(plannedMealName(plan('Dinner out', [], 'note', 'Dinner out\nwith friends'))).toBe('');
  });

  it('is the name the user typed', () => {
    expect(plannedMealName(plan('  Sunday roast '))).toBe('Sunday roast');
    expect(plannedMealName(plan('Team lunch', [], 'note', 'Pick something light'))).toBe('Team lunch');
    expect(plannedMealName(plan('Rice + Beans + Salsa'))).toBe('Rice + Beans + Salsa');
  });

  it('lists every automatic title of a food meal', () => {
    expect([...automaticPlanTitles(plan('', [rice, beans]))].sort()).toEqual(
      ['Beans', 'Fagioli', 'Rice', 'Rice + Beans', 'Rice + Fagioli', 'Riso', 'Riso + Beans', 'Riso + Fagioli'].sort(),
    );
  });
});
