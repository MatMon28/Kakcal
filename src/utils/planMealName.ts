import type { MealPlan, PlannedFood } from '../types/journal';

type TitledPlan = Pick<MealPlan, 'title' | 'kind' | 'items' | 'note'>;

const foodNames = (food: PlannedFood['food']) => [food.name_en, food.name_it, food.name_de].filter((name): name is string => Boolean(name));

/**
 * The titles the planner writes by itself for a meal the user did not name: the first line of a note, a food of the
 * meal, or its first two foods joined with " + " (in any of the app languages, because a plan can be saved in one
 * language and opened in another).
 */
export function automaticPlanTitles(plan: TitledPlan): Set<string> {
  const titles = new Set<string>();
  if (plan.kind === 'note') {
    titles.add(plan.note.trim().split('\n')[0]);
    return titles;
  }
  for (const item of plan.items) for (const name of foodNames(item.food)) titles.add(name);
  const [first, second] = plan.items;
  if (first && second) for (const a of foodNames(first.food)) for (const b of foodNames(second.food)) titles.add(`${a} + ${b}`);
  return titles;
}

/**
 * The *meal name* the user gave to a planned meal, or `''` when the stored `title` is only the automatic summary.
 * `MealPlan.title` always holds something to show; this tells a chosen name apart without a new stored field.
 */
export function plannedMealName(plan: TitledPlan): string {
  const title = plan.title.trim();
  return title && !automaticPlanTitles(plan).has(title) ? title : '';
}
