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
  memories: Record<string, MealMemory>;
  photos: MealPhoto[];
}
