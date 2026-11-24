import { ActiveTab, ActivityLog, DayLog, EnergyExpenditureSummary, FoodItem, Language, LoggedFoodItem, MacroSummary, MealSlotId, PeriodData, PeriodDayLog, PeriodSettings, PoopSize, BristolType, PreBuiltMeal, Settings, UserProfile, CustomActivityDef } from '../types';
import { translations } from '../i18n/translations';
import { type PeriodTagGroup } from '../utils/period';

/** Everything `useApp()` returns. Implemented by `AppProvider` in `AppContext.tsx`. */
export interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  userProfile: UserProfile;
  updateUserProfile: (profile: UserProfile) => void;
  allFoods: FoodItem[];
  addCustomFood: (food: FoodItem) => void;
  deleteCustomFood: (foodId: string) => void;
  favoriteFoods: string[];
  toggleFavoriteFood: (foodId: string) => void;
  /** Keep a catalogue (Open Food Facts) food resolvable by id once the user has picked or starred it. */
  rememberFood: (food: FoodItem) => void;
  favoriteActivities: string[];
  toggleFavoriteActivity: (activityId: string) => void;
  currentDayLog: DayLog;
  logFoodItem: (
    mealSlot: MealSlotId,
    food: FoodItem,
    amount: number,
    date?: string
  ) => void;
  removeLoggedFoodItem: (
    mealSlot: MealSlotId,
    loggedItemId: string,
    date?: string
  ) => void;
  updateLoggedFoodItemAmount: (
    mealSlot: MealSlotId,
    loggedItemId: string,
    newAmount: number,
    date?: string
  ) => void;
  logActivity: (activity: Omit<ActivityLog, 'id' | 'timestamp'>, date?: string) => void;
  removeActivity: (activityId: string, date?: string) => void;
  copyYesterdayMeals: (targetDate?: string) => { success: boolean; count: number };
  logItemsToSlot: (slot: MealSlotId, items: LoggedFoodItem[], date?: string) => void;
  preBuiltMeals: PreBuiltMeal[];
  addPreBuiltMeal: (meal: Omit<PreBuiltMeal, 'id' | 'createdAt'>) => void;
  updatePreBuiltMeal: (meal: PreBuiltMeal) => void;
  deletePreBuiltMeal: (mealId: string) => void;
  logPreBuiltMealToSlot: (
    preBuiltMealId: string,
    mealSlot: MealSlotId,
    date?: string
  ) => void;
  // Computed values for selectedDate
  currentMacros: MacroSummary;
  currentIntakeCalories: number;
  currentExpenditure: EnergyExpenditureSummary;
  netBalance: number;
  // Modals state
  isAddFoodOpen: boolean;
  setIsAddFoodOpen: (open: boolean) => void;
  targetMealSlot: MealSlotId;
  setTargetMealSlot: (slot: MealSlotId) => void;
  isLogActivityOpen: boolean;
  setIsLogActivityOpen: (open: boolean) => void;
  isBarcodeOpen: boolean;
  setIsBarcodeOpen: (open: boolean) => void;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  returnFromDatabase: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isWaterOpen: boolean;
  setIsWaterOpen: (open: boolean) => void;
  isPoopOpen: boolean;
  setIsPoopOpen: (open: boolean) => void;
  isWeightOpen: boolean;
  setIsWeightOpen: (open: boolean) => void;
  isCustomFoodOpen: boolean;
  setIsCustomFoodOpen: (open: boolean) => void;
  customButtonOpenId: string | null;
  setCustomButtonOpenId: (id: string | null) => void;
  isCustomPickerOpen: boolean;
  setIsCustomPickerOpen: (open: boolean) => void;
  periodData: PeriodData;
  updatePeriodSettings: (partial: Partial<PeriodSettings>) => void;
  updatePeriodDay: (date: string, partial: Partial<PeriodDayLog>) => void;
  clearPeriodDay: (date: string) => void;
  markPeriodStart: (date: string) => void;
  markPeriodEnd: (date: string) => void;
  addPeriodTag: (group: PeriodTagGroup, label: string) => string | null;
  deletePeriodTag: (group: PeriodTagGroup, id: string) => void;
  resetPeriodTags: (group: PeriodTagGroup) => void;
  periodSelectedDate: string;
  setPeriodSelectedDate: (d: string) => void;
  isPeriodSheetOpen: boolean;
  setIsPeriodSheetOpen: (open: boolean) => void;
  customActivities: CustomActivityDef[];
  addCustomActivity: (name: string, met?: number) => CustomActivityDef;
  removeCustomActivity: (id: string) => void;
  logWater: (ml: number, date?: string) => void;
  removeWaterEntry: (id: string, date?: string) => void;
  logCustom: (buttonId: string, value: number | boolean, date?: string) => void;
  removeCustomEntry: (buttonId: string, entryId: string, date?: string) => void;
  waterTotalFor: (date: string) => number;
  logWeight: (kg: number, date?: string) => void;
  logPoop: (size: PoopSize, date?: string, description?: string, bristol?: BristolType) => void;
  removePoop: (poopId: string, date?: string) => void;
  // Data Backup
  exportDataJson: () => Promise<string>;
  importDataJson: (jsonStr: string) => Promise<boolean>;
  allDayLogs: Record<string, DayLog>;
}
