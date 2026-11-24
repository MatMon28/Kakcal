import type { MealPlan, PlanGroup } from '../types/journal';

/** Id of the virtual group that collects meals planned one by one before plans had names. */
export const UNGROUPED_PLAN_ID = 'ungrouped';

/** A named plan together with its meals, ready to list. */
export interface PlanGroupView {
  id: string;
  name: string;
  createdAt: string;
  /** Meals of the plan, oldest first. */
  plans: MealPlan[];
  /** First and last planned day. */
  start: string;
  end: string;
  /** Number of different planned days. */
  days: number;
  /** `true` for the virtual group of unnamed single meals: it can be listed but not edited or reused as a whole. */
  ungrouped: boolean;
}

const byDateThenSlot = (a: MealPlan, b: MealPlan) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot);

function view(id: string, name: string, createdAt: string, plans: MealPlan[], ungrouped: boolean): PlanGroupView {
  const sorted = [...plans].sort(byDateThenSlot);
  return {
    id,
    name,
    createdAt,
    plans: sorted,
    start: sorted[0].date,
    end: sorted[sorted.length - 1].date,
    days: new Set(sorted.map((p) => p.date)).size,
    ungrouped,
  };
}

/**
 * Groups the saved meals by plan. Groups without meals are left out. Meals without a (known) group end up in one
 * virtual group, `UNGROUPED_PLAN_ID`, which is always returned last.
 */
export function planGroupViews(plans: MealPlan[], groups: PlanGroup[]): PlanGroupView[] {
  const known = new Set(groups.map((g) => g.id));
  const out: PlanGroupView[] = [];
  for (const group of groups) {
    const own = plans.filter((p) => p.groupId === group.id);
    if (own.length) out.push(view(group.id, group.name, group.createdAt, own, false));
  }
  const loose = plans.filter((p) => !p.groupId || !known.has(p.groupId));
  if (loose.length) out.push(view(UNGROUPED_PLAN_ID, '', '', loose, true));
  return out;
}

/** A plan is current until its last day has passed. */
export const isCurrentPlan = (g: Pick<PlanGroupView, 'end'>, today: string) => g.end >= today;

/** Current plans (soonest first) and past plans (most recent first); the ungrouped meals are not part of either. */
export function splitPlans(views: PlanGroupView[], today: string) {
  const named = views.filter((v) => !v.ungrouped);
  return {
    current: named.filter((v) => isCurrentPlan(v, today)).sort((a, b) => a.start.localeCompare(b.start)),
    past: named.filter((v) => !isCurrentPlan(v, today)).sort((a, b) => b.end.localeCompare(a.end)),
    ungrouped: views.find((v) => v.ungrouped),
  };
}

/** Name offered for a plan copy: "Cutting week (copy)". */
export const copyName = (name: string, language: string) => `${name} (${language === 'it' ? 'copia' : 'copy'})`.slice(0, 80);
