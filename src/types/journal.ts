import type { FoodItem, MealSlotId } from './index';

export interface PlannedFood {
  food: FoodItem;
  amount: number;
}

export interface MealPlan {
  id: string;
  date: string;
  slot: MealSlotId;
  title: string;
  kind: 'food' | 'note';
  items: PlannedFood[];
  note: string;
  read: boolean;
  loggedAt?: string;
  /** The named plan (`PlanGroup`) this meal belongs to; absent on meals planned one by one before plans had names. */
  groupId?: string;
}

/** A named meal plan: the meals created together in the planner wizard share its id. */
export interface PlanGroup {
  id: string;
  name: string;
  createdAt: string;
}

/** One line of a shopping list. `amount` is `null` when the quantity is unknown (an item typed in by hand). */
export interface ShoppingItem {
  id: string;
  name: string;
  amount: number | null;
  unit: string;
  /** Food the line was computed from; absent for lines added by hand. */
  foodId?: string;
  checked: boolean;
  /** `true` for lines added by hand with the edit button. */
  custom?: boolean;
}

/** The shopping list of one plan (one list per `PlanGroup`). */
export interface ShoppingList {
  planId: string;
  items: ShoppingItem[];
  /** Keys (`foodId|unit`) of computed lines the user removed, so *Update from plan* does not bring them back. */
  dismissed: string[];
  updatedAt: string;
}

export interface MealMemory {
  favorite?: boolean;
  note?: string;
}

export interface MealPhoto {
  id: string;
  date: string;
  slot: MealSlotId;
  src: string;
  note: string;
  createdAt: string;
  linkedId?: string;
}

export interface MealJournalData {
  version: 1;
  plans: MealPlan[];
  planGroups: PlanGroup[];
  shoppingLists: ShoppingList[];
  memories: Record<string, MealMemory>;
  photos: MealPhoto[];
}
