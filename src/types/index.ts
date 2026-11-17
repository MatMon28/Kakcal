export type Language = 'en' | 'it';

export type Supermarket = 'Lidl' | 'Aldi' | 'Netto' | 'Generic' | 'Custom' | 'Open Food Facts';

export type FoodCategory =
  | 'dairy'
  | 'meat_fish'
  | 'bakery'
  | 'produce_fruit'
  | 'produce_veg'
  | 'legumes'
  | 'nuts_seeds'
  | 'grains_pasta'
  | 'snacks_sweets'
  | 'drinks'
  | 'condiments_oils'
  | 'prepared'
  | 'soups'
  | 'desserts';

export interface FoodSource {
  label: string;
  url: `https://${string}`;
}

export interface FoodItem {
  id: string;
  name_de: string;
  name_it: string;
  name_en: string;
  brand?: string;
  store: Supermarket;
  category: FoodCategory;
  unit: 'g' | 'ml';
  calories: number;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  fiber: number | null;
  salt: number | null;
  source?: FoodSource;
  barcode?: string;
  isCustom?: boolean;
  isRecipe?: boolean; // created from the recipe builder (multi-ingredient)
}

export type MealSlotId =
  | 'breakfast'
  | 'mid_morning'
  | 'lunch'
  | 'midday_snack'
  | 'dinner'
  | 'extra';

export interface LoggedFoodItem {
  id: string;
  foodId: string;
  name: string;
  store: Supermarket;
  amount: number;
  unit: 'g' | 'ml';
  calories: number;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  fiber: number | null;
  salt: number | null;
  loggedAt: string;
}

export interface PreBuiltMealIngredient {
  foodId: string;
  amount: number;
}

export interface PreBuiltMeal {
  id: string;
  name: string;
  description?: string;
  ingredients: PreBuiltMealIngredient[];
  slot?: MealSlotId;
  createdAt: string;
}

export type ActivityType = 'walking' | 'running' | 'custom';

export type ActivityLogMethod = 'distance' | 'duration';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  method: ActivityLogMethod;
  distanceKm?: number;
  durationMin?: number;
  intensity?: 'light' | 'moderate' | 'vigorous';
  caloriesBurned: number;
  timestamp: string;
  notes?: string;
  customName?: string;
}

export type PoopSize = 'very_little' | 'little' | 'normal' | 'a_lot' | 'huge';

export type BristolType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface PoopEntry {
  id: string;
  size: PoopSize;
  timestamp: string;
  description?: string;
  bristol?: BristolType;
}

export interface UserProfile {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'male' | 'female';
  targetIntakeKcal?: number;
}

export interface WaterEntry {
  id: string;
  ml: number;
  timestamp: string;
}

export interface CustomButtonDef {
  id: string;
  name: string;
  type: 'quantity' | 'toggle';
  unit?: string; // for quantity type (e.g. mg, tablets)
  icon?: string; // key of the tracker icon set (common/TrackerIcon.tsx)
  showStats?: boolean; // show this tracker in Statistics
}

export interface CustomQuantityEntry {
  id: string;
  amount: number;
  timestamp?: string; // unknown for migrated daily totals
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  meals: {
    breakfast: LoggedFoodItem[];
    mid_morning: LoggedFoodItem[];
    lunch: LoggedFoodItem[];
    midday_snack: LoggedFoodItem[];
    dinner: LoggedFoodItem[];
    extra: LoggedFoodItem[];
  };
  activities: ActivityLog[];
  weightKg?: number;
  waterMl?: number; // legacy total (migrated to waterEntries on load)
  waterEntries?: WaterEntry[];
  poops?: PoopEntry[];
  custom?: Record<string, number | boolean>; // toggles; numbers are read from legacy backups
  customEntries?: Record<string, CustomQuantityEntry[]>;
}

export interface MacroSummary {
  carbsGrams: number;
  proteinGrams: number;
  fatGrams: number;
  fiberGrams: number;
  saltGrams: number;
  carbsKcal: number;
  proteinKcal: number;
  fatKcal: number;
  carbsPercent: number;
  proteinPercent: number;
  fatPercent: number;
}

export interface EnergyExpenditureSummary {
  bmr: number;
  activityExpenditure: number;
  tef: number;
  totalExpenditure: number;
}

export type ActiveTab = 'today' | 'prebuilt' | 'period' | 'database' | 'history';

export type Theme = 'light' | 'lite-dark' | 'dark';

export interface Settings {
  theme: Theme;
  quickAdd: {
    food: boolean;
    movement: boolean;
    water: boolean;
    poop: boolean;
    weight: boolean;
    custom: boolean;
  };
  hidePoop: boolean;
  hidePeriod: boolean;
  hidePeriodCustomized?: boolean;
  quickFoods: string[]; // food ids for the 3 quick-add shortcut buttons
  customButtons: CustomButtonDef[]; // user-defined quick-add trackers (one button, picker if several)
}

export type PeriodFlow = 'none' | 'light' | 'medium' | 'heavy';

// Tag ids: built-ins are stable ('mood.happy', 'sym.cramps'); custom tags are generated ('c_ab12')
export interface PeriodTag {
  id: string;
  label: string;
}

export interface PeriodDayLog {
  isPeriod: boolean;
  flow: PeriodFlow;
  moods: string[]; // tag ids
  symptoms: string[]; // tag ids
  pillTaken?: boolean;
  intercourse?: boolean;
  notes?: string;
  updatedAt: string;
}

export interface PeriodSettings {
  cycleLength: number; // 15-60
  periodDuration: number; // 1-15
  trackPill: boolean;
  packLength: number; // 1-365
  inactiveDays: number; // 0..packLength-1 (0 = continuous use)
  packStart: string | null; // YYYY-MM-DD
  pillTrackingSince: string | null; // date pill tracking was enabled
  showNutrition: boolean;
  showPhaseBandsInStats: boolean;
  moodTags: PeriodTag[];
  symptomTags: PeriodTag[];
}

export interface PeriodData {
  settings: PeriodSettings;
  logs: Record<string, PeriodDayLog>; // YYYY-MM-DD -> log
}

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
