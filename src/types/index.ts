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
  /** Sugars in g per 100 g/ml (part of carbs). Shown when Settings > Today & pages > Track sugar is on. */
  sugar?: number | null;
  /** The product's classic serving in g/ml, when known (Open Food Facts `serving_quantity`). For a recipe: the standard portion set by the user. */
  portion?: number;
  source?: FoodSource;
  barcode?: string;
  isCustom?: boolean;
  isRecipe?: boolean; // created from the recipe builder (multi-ingredient)
  recipeIngredients?: PreBuiltMealIngredient[]; // original quantities, shown when a recipe is expanded
}

export type BuiltInMealSlotId =
  | 'breakfast'
  | 'mid_morning'
  | 'lunch'
  | 'midday_snack'
  | 'dinner'
  | 'extra';

/** A meal type added by the user (Settings > Advanced > Advanced layout). Its name lives in `utils/layoutStore.ts`. */
export type CustomMealSlotId = `custom_${string}`;

export type MealSlotId = BuiltInMealSlotId | CustomMealSlotId;

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
  /** Sugar snapshot per 100 g/ml, totalled when sugar tracking is enabled. */
  sugar?: number | null;
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

// 'other' = an entry picked from the activities database (src/data/activities.ts) via Activity → Other.
export type ActivityType = 'walking' | 'running' | 'other' | 'custom';

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
  customName?: string; // custom activities; for 'other' it is an English-name fallback
  activityId?: string; // 'other': id in the activities database
  met?: number; // 'other': MET value used for the calculation (kept so old logs never change)
}

/** User-created activity. Saved from Activity → Custom and offered again under Activity → Other. */
export interface CustomActivityDef {
  id: string;
  name: string;
  met: number; // derived from the calories/duration entered when it was created (5 MET if none)
  createdAt: string;
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
  } & Partial<Record<CustomMealSlotId, LoggedFoodItem[]>>; // custom meal types only exist once something was logged in them
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
  sugarGrams: number;
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

export type ActiveTab = 'today' | 'prebuilt' | 'period' | 'database' | 'body' | 'history';

export type Theme = 'light' | 'lite-dark' | 'dark';

export type ThemeStyle = 'classic' | 'angular' | 'aurora' | 'pop' | 'playful' | 'minimal' | 'mono';

/** A reminder sent once a day at a chosen local time ("HH:MM"). */
export interface DailyReminderSetting {
  enabled: boolean;
  time: string;
}

/** Water reminders repeat every `intervalMinutes` between `from` and `to` ("HH:MM"). */
export interface WaterReminderSetting {
  enabled: boolean;
  intervalMinutes: number;
  from: string;
  to: string;
}

/** Meal slots that get their own reminder (the free-form "extra" slot has no fixed time). */
export type MealReminderSlotId = Exclude<BuiltInMealSlotId, 'extra'>;

export interface NotificationSettings {
  water: WaterReminderSetting;
  /** One reminder to use your custom buttons (needs at least one custom button). */
  customButtons: DailyReminderSetting;
  weight: DailyReminderSetting;
  /** General "don't forget to log your data" reminder. */
  logData: DailyReminderSetting;
  /** One reminder per meal, each with its own switch and time. */
  meals: Record<MealReminderSlotId, DailyReminderSetting>;
}

export interface Settings {
  theme: Theme;
  themeStyle: ThemeStyle;
  monoHue: string;
  ultraMinimal: boolean;
  quickAdd: {
    food: boolean;
    movement: boolean;
    water: boolean;
    poop: boolean;
    weight: boolean;
    custom: boolean;
  };
  hidePoop: boolean;
  /** Show and total sugar in Today, food forms and statistics. */
  trackSugar: boolean;
  /** Opt-in meal photographs, stored locally and included in JSON backups. */
  photoDiary: boolean;
  /** Show the diary action in Today and a note field while logging food. */
  inlineMealNotes: boolean;
  /** Custom page shortcut buttons (Settings > Today & pages). Both default to on. */
  showPlannerButton: boolean;
  showPhotoButton: boolean;
  hidePeriod: boolean;
  hidePeriodCustomized?: boolean;
  quickFoods: string[]; // food ids for the 3 quick-add shortcut buttons
  favoriteFoods: string[]; // starred foods: listed first on every food search
  favoriteActivities: string[]; // starred activities (database ids): listed first in the activity search
  customButtons: CustomButtonDef[]; // user-defined quick-add trackers (one button, picker if several)
  widgetStyle: 'light' | 'dark'; // home-screen widgets: light, or a darker translucent look
  widgetCustomButton: boolean; // add the custom-tracker button to the Small and Large widgets
  notifications: NotificationSettings; // reminders: water, custom buttons, weight, general log, meals
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
