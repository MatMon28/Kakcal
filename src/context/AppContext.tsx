import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ActiveTab,
  ActivityLog,
  DayLog,
  EnergyExpenditureSummary,
  FoodItem,
  Language,
  LoggedFoodItem,
  MacroSummary,
  MealSlotId,
  PeriodData,
  PeriodDayLog,
  PeriodSettings,
  PoopEntry,
  PoopSize,
  WaterEntry,
  BristolType,
  PreBuiltMeal,
  Settings,
  UserProfile,
} from '../types';
import { VERIFIED_FOODS } from '../data/verifiedFoods';
import { INITIAL_PREBUILT_MEALS } from '../data/samplePreBuiltMeals';
import {
  calculateBMR,
  calculateMacros,
  calculateTEF,
  calculateTotalActivityCalories,
  calculateTotalCalories,
} from '../utils/calculations';
import { addDaysToDateString, getTodayDateString } from '../utils/formatters';
import { translations } from '../i18n/translations';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  userProfile: UserProfile;
  updateUserProfile: (profile: UserProfile) => void;
  allFoods: FoodItem[];
  addCustomFood: (food: FoodItem) => void;
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
  togglePill: (date: string) => boolean;
  addPeriodTag: (group: 'mood' | 'symptom', label: string) => string | null;
  renamePeriodTag: (group: 'mood' | 'symptom', id: string, label: string) => boolean;
  deletePeriodTag: (group: 'mood' | 'symptom', id: string) => void;
  toggleHiddenBuiltin: (id: string) => void;
  periodSelectedDate: string;
  setPeriodSelectedDate: (d: string) => void;
  isPeriodSheetOpen: boolean;
  setIsPeriodSheetOpen: (open: boolean) => void;
  toast: { message: string; undo?: () => void } | null;
  showToast: (message: string, undo?: () => void) => void;
  hideToast: () => void;
  customActivities: string[];
  addCustomActivity: (name: string) => void;
  logWater: (ml: number, date?: string) => void;
  removeWaterEntry: (id: string, date?: string) => void;
  logCustom: (buttonId: string, value: number | boolean, date?: string) => void;
  waterTotalFor: (date: string) => number;
  logWeight: (kg: number, date?: string) => void;
  logPoop: (size: PoopSize, date?: string, description?: string, bristol?: BristolType) => void;
  removePoop: (poopId: string, date?: string) => void;
  isPrebuiltModalOpen: boolean;
  setIsPrebuiltModalOpen: (open: boolean) => void;
  prebuiltToLog: PreBuiltMeal | null;
  setPrebuiltToLog: (meal: PreBuiltMeal | null) => void;
  // Data Backup
  exportDataJson: () => string;
  importDataJson: (jsonStr: string) => boolean;
  allDayLogs: Record<string, DayLog>;
}

const STORAGE_KEYS = {
  LANG: 'kcalsync_lang',
  PROFILE: 'kcalsync_profile',
  CUSTOM_FOODS: 'kcalsync_custom_foods',
  DAY_LOGS: 'kcalsync_day_logs',
  PREBUILT_MEALS: 'kcalsync_prebuilt_meals',
  SETTINGS: 'kcalsync_settings',
  CUSTOM_ACTIVITIES: 'kcalsync_custom_activities',
  PERIOD: 'kf_period_data',
};

const DEFAULT_PERIOD_SETTINGS: PeriodSettings = {
  cycleLength: 28,
  periodDuration: 5,
  trackPill: false,
  packLength: 28,
  inactiveDays: 7,
  packStart: null,
  pillTrackingSince: null,
  showNutrition: false,
  showPhaseBandsInStats: false,
  customMoods: [],
  customSymptoms: [],
  hiddenBuiltins: [],
};

const clampInt = (v: unknown, min: number, max: number, dflt: number) => {
  const n = typeof v === 'number' ? Math.round(v) : NaN;
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
};

const isDateStr = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePeriodSettings(p: any): PeriodSettings {
  const src = p || {};
  const legacyPack = src.pillPack === 21 || src.pillPack === 28;
  const packLength = legacyPack ? 28 : clampInt(src.packLength, 1, 365, 28);
  const inactiveDays = legacyPack ? 7 : clampInt(src.inactiveDays, 0, Math.max(0, packLength - 1), Math.min(7, packLength - 1));
  const tags = (arr: unknown) =>
    Array.isArray(arr)
      ? arr
          .filter((t) => t && typeof t.id === 'string' && typeof t.label === 'string')
          .map((t) => ({ id: t.id as string, label: String(t.label).slice(0, 24) }))
          .slice(0, 30)
      : [];
  return {
    cycleLength: clampInt(src.cycleLength, 15, 60, 28),
    periodDuration: clampInt(src.periodDuration, 1, 15, 5),
    trackPill: Boolean(src.trackPill),
    packLength,
    inactiveDays,
    packStart: isDateStr(src.packStart) ? src.packStart : null,
    pillTrackingSince: isDateStr(src.pillTrackingSince) ? src.pillTrackingSince : null,
    showNutrition: Boolean(src.showNutrition),
    showPhaseBandsInStats: Boolean(src.showPhaseBandsInStats),
    customMoods: tags(src.customMoods),
    customSymptoms: tags(src.customSymptoms),
    hiddenBuiltins: Array.isArray(src.hiddenBuiltins) ? src.hiddenBuiltins.filter((x: unknown) => typeof x === 'string') : [],
  };
}

const LEGACY_MOODS = ['happy', 'calm', 'tired', 'irritable', 'anxious'];
const LEGACY_SYMS = ['cramps', 'bloating', 'headache', 'fatigue', 'cravings'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePeriodLogs(raw: any): PeriodData['logs'] {
  if (!raw || typeof raw !== 'object') return {};
  const out: PeriodData['logs'] = {};
  for (const d of Object.keys(raw)) {
    if (!isDateStr(d)) continue;
    const l = raw[d] || {};
    const moods = Array.isArray(l.moods) ? l.moods.map((m: string) => (LEGACY_MOODS.includes(m) ? `mood.${m}` : m)) : [];
    const symptoms = Array.isArray(l.symptoms) ? l.symptoms.map((m: string) => (LEGACY_SYMS.includes(m) ? `sym.${m}` : m)) : [];
    const flow = ['none', 'light', 'medium', 'heavy'].includes(l.flow) ? l.flow : 'none';
    out[d] = {
      isPeriod: Boolean(l.isPeriod) || flow !== 'none',
      flow,
      moods,
      symptoms,
      pillTaken: l.pillTaken === undefined ? undefined : Boolean(l.pillTaken),
      notes: typeof l.notes === 'string' ? l.notes : undefined,
      updatedAt: typeof l.updatedAt === 'string' ? l.updatedAt : new Date().toISOString(),
    };
  }
  return out;
}

function normalizePeriodData(p: unknown): PeriodData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const src = (p || {}) as any;
  return { settings: normalizePeriodSettings(src.settings), logs: normalizePeriodLogs(src.logs) };
}

export const DEFAULT_QUICK_FOODS = ['gen-53', 'gen-30', 'gen-16']; // salt, bread, olive oil

const DEFAULT_PROFILE: UserProfile = {
  weightKg: 73,
  heightCm: 178,
  age: 29,
  sex: 'male',
  targetIntakeKcal: 2200,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Language
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANG);
    return saved === 'it' ? 'it' : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
  };

  const t = translations[language];

  // 2. Selected Date
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // 3. User Profile
  const [userProfile, setUserProfileState] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse user profile', e);
      }
    }
    return DEFAULT_PROFILE;
  });

  const updateUserProfile = (profile: UserProfile) => {
    setUserProfileState(profile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  };

  // 4. Custom Foods
  const [customFoods, setCustomFoods] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse custom foods', e);
      }
    }
    return [];
  });

  const addCustomFood = (food: FoodItem) => {
    setCustomFoods((prev) => {
      const updated = [food, ...prev.filter((f) => f.id !== food.id)];
      localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(updated));
      return updated;
    });
  };

  const allFoods = [...customFoods, ...VERIFIED_FOODS];

  // 5. Day Logs with realistic initial data for today and yesterday if first launch
  const [dayLogs, setDayLogs] = useState<Record<string, DayLog>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DAY_LOGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // migrate legacy waterMl totals into individual entries
        for (const d of Object.keys(parsed)) {
          const log = parsed[d];
          if (typeof log.waterMl === 'number' && log.waterMl > 0 && !(log.waterEntries || []).length) {
            log.waterEntries = [
              {
                id: 'water-legacy-' + d,
                ml: log.waterMl,
                timestamp: new Date(d + 'T12:00:00').toISOString(),
              },
            ];
          }
        }
        if (Object.keys(parsed).length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse day logs', e);
      }
    }

    // Generate initial sample days for today & yesterday so the app has live visual data immediately
    const today = getTodayDateString();
    const yesterday = addDaysToDateString(today, -1);

    const initialSeeds: Record<string, DayLog> = {
      [yesterday]: {
        date: yesterday,
        meals: {
          breakfast: [
            {
              id: 'init-y-1',
              foodId: 'lidl-07',
              name: 'Crownfield Haferflocken / Fiocchi d\'Avena',
              store: 'Lidl',
              amount: 50,
              unit: 'g',
              calories: 372,
              carbs: 58.7,
              protein: 13.5,
              fat: 7.0,
              fiber: 10.0,
              salt: 0.02,
              loggedAt: new Date().toISOString(),
            },
            {
              id: 'init-y-2',
              foodId: 'lidl-01',
              name: 'Milbona Skyr Naturale',
              store: 'Lidl',
              amount: 150,
              unit: 'g',
              calories: 63,
              carbs: 4.0,
              protein: 11.0,
              fat: 0.2,
              fiber: null,
              salt: 0.10,
              loggedAt: new Date().toISOString(),
            },
            {
              id: 'init-y-3',
              foodId: 'gen-03',
              name: 'Mirtilli Freschi / Blaubeeren',
              store: 'Generic',
              amount: 60,
              unit: 'g',
              calories: 57,
              carbs: 12.1,
              protein: 0.7,
              fat: 0.3,
              fiber: 2.4,
              salt: 0.001,
              loggedAt: new Date().toISOString(),
            },
          ],
          mid_morning: [
            {
              id: 'init-y-4',
              foodId: 'gen-01',
              name: 'Mela Fresca / Apfel',
              store: 'Generic',
              amount: 180,
              unit: 'g',
              calories: 52,
              carbs: 11.4,
              protein: 0.3,
              fat: 0.2,
              fiber: 2.4,
              salt: 0.001,
              loggedAt: new Date().toISOString(),
            },
          ],
          lunch: [
            {
              id: 'init-y-5',
              foodId: 'gen-21',
              name: 'Petto di Pollo Fresco / Hähnchenbrust',
              store: 'Generic',
              amount: 200,
              unit: 'g',
              calories: 106,
              carbs: 0.0,
              protein: 23.1,
              fat: 1.2,
              fiber: null,
              salt: 0.16,
              loggedAt: new Date().toISOString(),
            },
            {
              id: 'init-y-6',
              foodId: 'netto-04',
              name: 'BioBio Riso Basmati Bianco',
              store: 'Netto',
              amount: 75,
              unit: 'g',
              calories: 353,
              carbs: 76.5,
              protein: 8.2,
              fat: 0.9,
              fiber: 1.8,
              salt: 0.01,
              loggedAt: new Date().toISOString(),
            },
            {
              id: 'init-y-7',
              foodId: 'gen-16',
              name: 'Olio EVO / Olivenöl',
              store: 'Generic',
              amount: 10,
              unit: 'ml',
              calories: 824,
              carbs: 0.0,
              protein: 0.0,
              fat: 91.6,
              fiber: null,
              salt: null,
              loggedAt: new Date().toISOString(),
            },
          ],
          midday_snack: [
            {
              id: 'init-y-8',
              foodId: 'aldi-13',
              name: 'Gut Bio Mandorle / Mandeln',
              store: 'Aldi',
              amount: 25,
              unit: 'g',
              calories: 610,
              carbs: 5.4,
              protein: 24.1,
              fat: 53.0,
              fiber: 12.0,
              salt: 0.01,
              loggedAt: new Date().toISOString(),
            },
          ],
          dinner: [
            {
              id: 'init-y-9',
              foodId: 'aldi-10',
              name: 'Golden Seafood Salmone / Lachsfilets',
              store: 'Aldi',
              amount: 150,
              unit: 'g',
              calories: 185,
              carbs: 0.0,
              protein: 20.0,
              fat: 11.8,
              fiber: null,
              salt: 0.12,
              loggedAt: new Date().toISOString(),
            },
            {
              id: 'init-y-10',
              foodId: 'gen-06',
              name: 'Broccoli Freschi / Brokkoli',
              store: 'Generic',
              amount: 200,
              unit: 'g',
              calories: 34,
              carbs: 2.7,
              protein: 2.8,
              fat: 0.4,
              fiber: 2.6,
              salt: 0.08,
              loggedAt: new Date().toISOString(),
            },
          ],
          extra: [],
        },
        activities: [
          {
            id: 'init-act-y1',
            type: 'walking',
            method: 'duration',
            durationMin: 45,
            intensity: 'moderate',
            caloriesBurned: 192,
            timestamp: new Date().toISOString(),
            notes: 'Passeggiata pomeridiana',
          },
        ],
      },
      [today]: {
        date: today,
        meals: {
          breakfast: [
            {
              id: 'init-t-1',
              foodId: 'lidl-07',
              name: 'Crownfield Haferflocken / Fiocchi d\'Avena',
              store: 'Lidl',
              amount: 60,
              unit: 'g',
              calories: 372,
              carbs: 58.7,
              protein: 13.5,
              fat: 7.0,
              fiber: 10.0,
              salt: 0.02,
              loggedAt: new Date().toISOString(),
            },
            {
              id: 'init-t-2',
              foodId: 'lidl-01',
              name: 'Milbona Skyr Naturale',
              store: 'Lidl',
              amount: 160,
              unit: 'g',
              calories: 63,
              carbs: 4.0,
              protein: 11.0,
              fat: 0.2,
              fiber: null,
              salt: 0.10,
              loggedAt: new Date().toISOString(),
            },
            {
              id: 'init-t-3',
              foodId: 'gen-03',
              name: 'Mirtilli Freschi / Blaubeeren',
              store: 'Generic',
              amount: 50,
              unit: 'g',
              calories: 57,
              carbs: 12.1,
              protein: 0.7,
              fat: 0.3,
              fiber: 2.4,
              salt: 0.001,
              loggedAt: new Date().toISOString(),
            },
          ],
          mid_morning: [
            {
              id: 'init-t-4',
              foodId: 'gen-02',
              name: 'Banana Matura / Banane',
              store: 'Generic',
              amount: 120,
              unit: 'g',
              calories: 89,
              carbs: 20.2,
              protein: 1.1,
              fat: 0.3,
              fiber: 2.6,
              salt: 0.001,
              loggedAt: new Date().toISOString(),
            },
          ],
          lunch: [
            {
              id: 'init-t-5',
              foodId: 'gen-21',
              name: 'Petto di Pollo Fresco / Hähnchenbrust',
              store: 'Generic',
              amount: 180,
              unit: 'g',
              calories: 106,
              carbs: 0.0,
              protein: 23.1,
              fat: 1.2,
              fiber: null,
              salt: 0.16,
              loggedAt: new Date().toISOString(),
            },
            {
              id: 'init-t-6',
              foodId: 'netto-04',
              name: 'BioBio Riso Basmati Bianco',
              store: 'Netto',
              amount: 70,
              unit: 'g',
              calories: 353,
              carbs: 76.5,
              protein: 8.2,
              fat: 0.9,
              fiber: 1.8,
              salt: 0.01,
              loggedAt: new Date().toISOString(),
            },
            {
              id: 'init-t-7',
              foodId: 'gen-16',
              name: 'Olio EVO / Olivenöl',
              store: 'Generic',
              amount: 8,
              unit: 'ml',
              calories: 824,
              carbs: 0.0,
              protein: 0.0,
              fat: 91.6,
              fiber: null,
              salt: null,
              loggedAt: new Date().toISOString(),
            },
          ],
          midday_snack: [],
          dinner: [],
          extra: [],
        },
        activities: [
          {
            id: 'init-act-t1',
            type: 'walking',
            method: 'distance',
            distanceKm: 3.5,
            intensity: 'moderate',
            caloriesBurned: 192,
            timestamp: new Date().toISOString(),
            notes: 'Lunch break walk',
          },
        ],
      },
    };

    try {
        localStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(initialSeeds));
      } catch (err) {
        console.error('Failed to save initial day seeds', err);
      }

      return initialSeeds;
  });

  const saveDayLogs = (newLogs: Record<string, DayLog>) => {
    setDayLogs(newLogs);
    localStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(newLogs));
  };

  // 6. Prebuilt Meals
  const [preBuiltMeals, setPreBuiltMeals] = useState<PreBuiltMeal[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PREBUILT_MEALS);
    if (saved) {
      try {
        return (JSON.parse(saved) as PreBuiltMeal[]).filter((m) => !m.id.startsWith('meal-'));
      } catch (e) {
        console.error('Failed to parse prebuilt meals', e);
      }
    }
    return INITIAL_PREBUILT_MEALS;
  });

  const addPreBuiltMeal = (mealData: Omit<PreBuiltMeal, 'id' | 'createdAt'>) => {
    const newMeal: PreBuiltMeal = {
      ...mealData,
      id: 'prebuilt-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newMeal, ...preBuiltMeals];
    setPreBuiltMeals(updated);
    localStorage.setItem(STORAGE_KEYS.PREBUILT_MEALS, JSON.stringify(updated));
  };

  const updatePreBuiltMeal = (updatedMeal: PreBuiltMeal) => {
    const updated = preBuiltMeals.map((m) => (m.id === updatedMeal.id ? updatedMeal : m));
    setPreBuiltMeals(updated);
    localStorage.setItem(STORAGE_KEYS.PREBUILT_MEALS, JSON.stringify(updated));
  };

  const deletePreBuiltMeal = (mealId: string) => {
    const updated = preBuiltMeals.filter((m) => m.id !== mealId);
    setPreBuiltMeals(updated);
    localStorage.setItem(STORAGE_KEYS.PREBUILT_MEALS, JSON.stringify(updated));
  };

  // Modals state
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [targetMealSlot, setTargetMealSlot] = useState<MealSlotId>('breakfast');
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPrebuiltModalOpen, setIsPrebuiltModalOpen] = useState(false);
  const [prebuiltToLog, setPrebuiltToLog] = useState<PreBuiltMeal | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWaterOpen, setIsWaterOpen] = useState(false);
  const [isPoopOpen, setIsPoopOpen] = useState(false);
  const [isWeightOpen, setIsWeightOpen] = useState(false);
  const [isCustomFoodOpen, setIsCustomFoodOpen] = useState(false);
  const [customButtonOpenId, setCustomButtonOpenId] = useState<string | null>(null);
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);

  // Period tracker (isolated from calorie stats)
  const [periodData, setPeriodData] = useState<PeriodData>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PERIOD);
    if (saved) {
      try {
        return normalizePeriodData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse period data', e);
      }
    }
    return { settings: DEFAULT_PERIOD_SETTINGS, logs: {} };
  });
  const periodRef = React.useRef(periodData);
  periodRef.current = periodData;

  const savePeriodData = (next: PeriodData) => {
    periodRef.current = next;
    setPeriodData(next);
    localStorage.setItem(STORAGE_KEYS.PERIOD, JSON.stringify(next));
  };

  // Date selected on the Period calendar (shared with the Period dock)
  const [periodSelectedDate, setPeriodSelectedDate] = useState<string>(getTodayDateString());
  const [isPeriodSheetOpen, setIsPeriodSheetOpen] = useState(false);

  // Toast with optional undo
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const toastTimer = React.useRef<number | null>(null);
  const showToast = (message: string, undo?: () => void) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  };
  const hideToast = () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(null);
  };

  const updatePeriodSettings = (partial: Partial<PeriodSettings>) => {
    const cur = periodRef.current;
    const merged = normalizePeriodSettings({ ...cur.settings, ...partial });
    // remember when pill tracking was switched on (missed cues never show before this)
    if (merged.trackPill && !cur.settings.trackPill && !merged.pillTrackingSince) {
      merged.pillTrackingSince = getTodayDateString();
    }
    savePeriodData({ ...cur, settings: merged });
  };

  const writeDay = (logs: PeriodData['logs'], date: string, partial: Partial<PeriodDayLog>): PeriodData['logs'] => {
    const existing: PeriodDayLog = logs[date] || {
      isPeriod: false,
      flow: 'none',
      moods: [],
      symptoms: [],
      updatedAt: new Date().toISOString(),
    };
    let next: PeriodDayLog = { ...existing, ...partial, updatedAt: new Date().toISOString() };
    // consistency: flow ≠ none ⇒ period day; unmarking ⇒ flow none
    if (partial.flow !== undefined && partial.flow !== 'none') next.isPeriod = true;
    if (partial.isPeriod === false) next = { ...next, flow: 'none' };
    return { ...logs, [date]: next };
  };

  const updatePeriodDay = (date: string, partial: Partial<PeriodDayLog>) => {
    const cur = periodRef.current;
    savePeriodData({ ...cur, logs: writeDay(cur.logs, date, partial) });
  };

  const clearPeriodDay = (date: string) => {
    const cur = periodRef.current;
    const nextLogs = { ...cur.logs };
    delete nextLogs[date];
    savePeriodData({ ...cur, logs: nextLogs });
  };

  /** Mark `date` and the following periodDuration-1 days as period days. */
  const markPeriodStart = (date: string) => {
    const cur = periodRef.current;
    let logs = cur.logs;
    for (let i = 0; i < cur.settings.periodDuration; i++) {
      const d = addDaysToDateString(date, i);
      const l = logs[d];
      logs = writeDay(logs, d, { isPeriod: true, flow: l && l.flow !== 'none' ? l.flow : 'medium' });
    }
    savePeriodData({ ...cur, logs });
  };

  /** Make `date` the last day of its run: unmark later consecutive days (gap ≤ 3). */
  const markPeriodEnd = (date: string) => {
    const cur = periodRef.current;
    let logs = cur.logs;
    const l = logs[date];
    logs = writeDay(logs, date, { isPeriod: true, flow: l && l.flow !== 'none' ? l.flow : 'light' });
    let d = date;
    let guard = 0;
    while (guard < 60) {
      let found: string | null = null;
      for (let i = 1; i <= 3; i++) {
        const n = addDaysToDateString(d, i);
        if (logs[n]?.isPeriod) {
          found = n;
          break;
        }
      }
      if (!found) break;
      logs = writeDay(logs, found, { isPeriod: false });
      d = found;
      guard++;
    }
    savePeriodData({ ...cur, logs });
  };

  /** Toggle pill taken for a date; returns the previous value for undo. */
  const togglePill = (date: string): boolean => {
    const cur = periodRef.current;
    const prev = Boolean(cur.logs[date]?.pillTaken);
    savePeriodData({ ...cur, logs: writeDay(cur.logs, date, { pillTaken: !prev }) });
    return prev;
  };

  // ---- custom tags ----
  const tagGroupKey = (g: 'mood' | 'symptom'): 'customMoods' | 'customSymptoms' =>
    g === 'mood' ? 'customMoods' : 'customSymptoms';
  const addPeriodTag = (group: 'mood' | 'symptom', label: string): string | null => {
    const cur = periodRef.current;
    const name = label.trim();
    if (name.length < 1 || name.length > 24) return null;
    const key = tagGroupKey(group);
    const list = cur.settings[key];
    if (list.length >= 30) return null;
    const builtins = (group === 'mood'
      ? ['happy', 'calm', 'tired', 'irritable', 'anxious']
      : ['cramps', 'bloating', 'headache', 'fatigue', 'cravings']
    ).flatMap((k) => [
      translations.en.period[`${group === 'mood' ? 'mood' : 'sym'}_${k}` as keyof typeof translations.en.period] as string,
      translations.it.period[`${group === 'mood' ? 'mood' : 'sym'}_${k}` as keyof typeof translations.it.period] as string,
    ]);
    const lower = name.toLowerCase();
    if (list.some((x) => x.label.toLowerCase() === lower) || builtins.some((b) => b.toLowerCase() === lower)) return null;
    const id = 'c_' + Math.random().toString(36).slice(2, 6) + Date.now().toString(36).slice(-2);
    savePeriodData({ ...cur, settings: { ...cur.settings, [key]: [...list, { id, label: name }] } });
    return id;
  };
  const renamePeriodTag = (group: 'mood' | 'symptom', id: string, label: string): boolean => {
    const cur = periodRef.current;
    const name = label.trim();
    if (name.length < 1 || name.length > 24) return false;
    const key = tagGroupKey(group);
    const list = cur.settings[key];
    if (list.some((x) => x.id !== id && x.label.toLowerCase() === name.toLowerCase())) return false;
    savePeriodData({
      ...cur,
      settings: { ...cur.settings, [key]: list.map((x) => (x.id === id ? { ...x, label: name } : x)) },
    });
    return true;
  };
  const deletePeriodTag = (group: 'mood' | 'symptom', id: string) => {
    const cur = periodRef.current;
    const key = tagGroupKey(group);
    // keep past days as-is (history shows the stored label via tagLabel fallback = id); remember label
    savePeriodData({ ...cur, settings: { ...cur.settings, [key]: cur.settings[key].filter((x) => x.id !== id) } });
  };
  const toggleHiddenBuiltin = (id: string) => {
    const cur = periodRef.current;
    const h = cur.settings.hiddenBuiltins;
    savePeriodData({
      ...cur,
      settings: { ...cur.settings, hiddenBuiltins: h.includes(id) ? h.filter((x) => x !== id) : [...h, id] },
    });
  };

  // Navigation tab (lifted so Settings can jump to the Foods database)
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');

  // Settings (theme, quick-add buttons, hide poop/period)
  const [settings, setSettingsState] = useState<Settings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        return {
          theme: p.theme === 'dark' ? 'dark' : 'light',
          quickAdd: {
            food: true,
            movement: true,
            water: true,
            poop: true,
            weight: true,
            custom: true,
            ...(p.quickAdd || {}),
          },
          hidePoop: Boolean(p.hidePoop),
          hidePeriod: Boolean(p.hidePeriod),
          quickFoods:
            Array.isArray(p.quickFoods) && p.quickFoods.length === 3
              ? p.quickFoods
              : DEFAULT_QUICK_FOODS,
          customButtons: Array.isArray(p.customButtons)
            ? p.customButtons.map((b: { icon?: string; showStats?: boolean }) => ({
                ...b,
                icon: typeof b.icon === 'string' ? b.icon : 'sparkles',
                showStats: b.showStats !== false,
              }))
            : [],
        };
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return {
      theme: 'light',
      quickAdd: { food: true, movement: true, water: true, poop: true, weight: true, custom: true },
      hidePoop: false,
      hidePeriod: false,
      quickFoods: DEFAULT_QUICK_FOODS,
      customButtons: [],
    };
  });

  // Custom activity names (suggested next time)
  const [customActivities, setCustomActivities] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_ACTIVITIES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addCustomActivity = (name: string) => {
    const n = name.trim();
    if (!n) return;
    setCustomActivities((prev) => {
      const next = [n, ...prev.filter((x) => x.toLowerCase() !== n.toLowerCase())].slice(0, 12);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ACTIVITIES, JSON.stringify(next));
      return next;
    });
  };

  const updateSettings = (partial: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Helper to get or create DayLog
  const getDayLog = (date: string): DayLog => {
    if (dayLogs[date]) {
      return dayLogs[date];
    }
    return {
      date,
      meals: {
        breakfast: [],
        mid_morning: [],
        lunch: [],
        midday_snack: [],
        dinner: [],
        extra: [],
      },
      activities: [],
      waterEntries: [],
      poops: [],
      custom: {},
    };
  };

  const currentDayLog = getDayLog(selectedDate);

  const waterTotalFor = (date: string) =>
    (getDayLog(date).waterEntries || []).reduce((a, w) => a + w.ml, 0);

  // Log food item
  const logFoodItem = (
    mealSlot: MealSlotId,
    food: FoodItem,
    amount: number,
    date: string = selectedDate
  ) => {
    const activeDay = getDayLog(date);
    const itemName = language === 'it' ? food.name_it : (food.name_en || food.name_de);

    const newLoggedItem: LoggedFoodItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      foodId: food.id,
      name: itemName,
      store: food.store,
      amount,
      unit: food.unit,
      calories: food.calories,
      carbs: food.carbs,
      protein: food.protein,
      fat: food.fat,
      fiber: food.fiber,
      salt: food.salt,
      loggedAt: new Date().toISOString(),
    };

    const updatedSlot = [...activeDay.meals[mealSlot], newLoggedItem];
    const updatedDay: DayLog = {
      ...activeDay,
      meals: {
        ...activeDay.meals,
        [mealSlot]: updatedSlot,
      },
    };

    saveDayLogs({
      ...dayLogs,
      [date]: updatedDay,
    });
  };

  // Remove logged food item
  const removeLoggedFoodItem = (
    mealSlot: MealSlotId,
    loggedItemId: string,
    date: string = selectedDate
  ) => {
    const activeDay = getDayLog(date);
    const updatedSlot = activeDay.meals[mealSlot].filter((item) => item.id !== loggedItemId);
    const updatedDay: DayLog = {
      ...activeDay,
      meals: {
        ...activeDay.meals,
        [mealSlot]: updatedSlot,
      },
    };
    saveDayLogs({
      ...dayLogs,
      [date]: updatedDay,
    });
  };

  // Update logged food item amount
  const updateLoggedFoodItemAmount = (
    mealSlot: MealSlotId,
    loggedItemId: string,
    newAmount: number,
    date: string = selectedDate
  ) => {
    const activeDay = getDayLog(date);
    const updatedSlot = activeDay.meals[mealSlot].map((item) =>
      item.id === loggedItemId ? { ...item, amount: newAmount } : item
    );
    const updatedDay: DayLog = {
      ...activeDay,
      meals: {
        ...activeDay.meals,
        [mealSlot]: updatedSlot,
      },
    };
    saveDayLogs({
      ...dayLogs,
      [date]: updatedDay,
    });
  };

  // Log activity
  const logActivity = (
    activityData: Omit<ActivityLog, 'id' | 'timestamp'>,
    date: string = selectedDate
  ) => {
    const activeDay = getDayLog(date);
    const newActivity: ActivityLog = {
      ...activityData,
      id: 'act-' + Date.now(),
      timestamp: new Date().toISOString(),
    };

    const updatedDay: DayLog = {
      ...activeDay,
      activities: [...activeDay.activities, newActivity],
    };

    saveDayLogs({
      ...dayLogs,
      [date]: updatedDay,
    });
  };

  // Remove activity
  const removeActivity = (activityId: string, date: string = selectedDate) => {
    const activeDay = getDayLog(date);
    const updatedDay: DayLog = {
      ...activeDay,
      activities: activeDay.activities.filter((act) => act.id !== activityId),
    };
    saveDayLogs({
      ...dayLogs,
      [date]: updatedDay,
    });
  };

  // Log a water entry (each addition is its own voice/block)
  const logWater = (ml: number, date: string = selectedDate) => {
    const activeDay = getDayLog(date);
    const entry: WaterEntry = {
      id: 'water-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      ml,
      timestamp: new Date().toISOString(),
    };
    saveDayLogs({
      ...dayLogs,
      [date]: {
        ...activeDay,
        waterEntries: [...(activeDay.waterEntries || []), entry],
      },
    });
  };

  // Remove a single water entry
  const removeWaterEntry = (id: string, date: string = selectedDate) => {
    const activeDay = getDayLog(date);
    saveDayLogs({
      ...dayLogs,
      [date]: {
        ...activeDay,
        waterEntries: (activeDay.waterEntries || []).filter((w) => w.id !== id),
      },
    });
  };

  // Custom button log
  const logCustom = (buttonId: string, value: number | boolean, date: string = selectedDate) => {
    const activeDay = getDayLog(date);
    saveDayLogs({
      ...dayLogs,
      [date]: {
        ...activeDay,
        custom: { ...(activeDay.custom || {}), [buttonId]: value },
      },
    });
  };

  // Log body weight (kg) for a day
  const logWeight = (kg: number, date: string = selectedDate) => {
    const activeDay = getDayLog(date);
    saveDayLogs({
      ...dayLogs,
      [date]: { ...activeDay, weightKg: Math.round(kg * 10) / 10 },
    });
  };

  // Log a poop entry for a day
  const logPoop = (
    size: PoopSize,
    date: string = selectedDate,
    description?: string,
    bristol?: BristolType
  ) => {
    const activeDay = getDayLog(date);
    const entry: PoopEntry = {
      id: 'poop-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      size,
      description: description?.trim() || undefined,
      bristol,
      timestamp: new Date().toISOString(),
    };
    saveDayLogs({
      ...dayLogs,
      [date]: { ...activeDay, poops: [...(activeDay.poops || []), entry] },
    });
  };

  // Remove a poop entry for a day
  const removePoop = (poopId: string, date: string = selectedDate) => {
    const activeDay = getDayLog(date);
    saveDayLogs({
      ...dayLogs,
      [date]: {
        ...activeDay,
        poops: (activeDay.poops || []).filter((p) => p.id !== poopId),
      },
    });
  };

  // Copy yesterday's meals
  const copyYesterdayMeals = (targetDate: string = selectedDate) => {
    const yesterdayDate = addDaysToDateString(targetDate, -1);
    const yesterdayLog = dayLogs[yesterdayDate];

    if (!yesterdayLog) {
      return { success: false, count: 0 };
    }

    let copiedCount = 0;
    const targetDay = getDayLog(targetDate);
    const newMeals = { ...targetDay.meals };

    const slots: MealSlotId[] = [
      'breakfast',
      'mid_morning',
      'lunch',
      'midday_snack',
      'dinner',
      'extra',
    ];

    for (const slot of slots) {
      const itemsToCopy = yesterdayLog.meals[slot] || [];
      if (itemsToCopy.length > 0) {
        const clonedItems: LoggedFoodItem[] = itemsToCopy.map((item) => ({
          ...item,
          id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          loggedAt: new Date().toISOString(),
        }));
        newMeals[slot] = [...newMeals[slot], ...clonedItems];
        copiedCount += clonedItems.length;
      }
    }

    if (copiedCount === 0) {
      return { success: false, count: 0 };
    }

    const updatedDay: DayLog = {
      ...targetDay,
      meals: newMeals,
    };

    saveDayLogs({
      ...dayLogs,
      [targetDate]: updatedDay,
    });

    return { success: true, count: copiedCount };
  };

  // Log pre-built meal to a slot
  const logPreBuiltMealToSlot = (
    preBuiltMealId: string,
    mealSlot: MealSlotId,
    date: string = selectedDate
  ) => {
    const meal = preBuiltMeals.find((m) => m.id === preBuiltMealId);
    if (!meal) return;
    const items: LoggedFoodItem[] = [];
    for (const ing of meal.ingredients) {
      const food = allFoods.find((f) => f.id === ing.foodId);
      if (food) {
        items.push({
          id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          foodId: food.id,
          name: language === 'it' ? food.name_it : food.name_en || food.name_de,
          store: food.store,
          amount: ing.amount,
          unit: food.unit,
          calories: food.calories,
          carbs: food.carbs,
          protein: food.protein,
          fat: food.fat,
          fiber: food.fiber,
          salt: food.salt,
          loggedAt: new Date().toISOString(),
        });
      }
    }
    logItemsToSlot(mealSlot, items, date);
  };

  const logItemsToSlot = (mealSlot: MealSlotId, items: LoggedFoodItem[], date: string = selectedDate) => {
    const activeDay = getDayLog(date);
    const cloned = items.map((it) => ({
      ...it,
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      loggedAt: new Date().toISOString(),
    }));
    saveDayLogs({
      ...dayLogs,
      [date]: { ...activeDay, meals: { ...activeDay.meals, [mealSlot]: [...activeDay.meals[mealSlot], ...cloned] } },
    });
  };

  // Export JSON
  const exportDataJson = (): string => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userProfile,
      customFoods,
      dayLogs,
      preBuiltMeals,
      settings,
      periodData,
    };
    return JSON.stringify(data, null, 2);
  };

  // Import JSON
  const importDataJson = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.userProfile) {
        updateUserProfile(data.userProfile);
      }
      if (Array.isArray(data.customFoods)) {
        setCustomFoods(data.customFoods);
        localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(data.customFoods));
      }
      if (data.dayLogs && typeof data.dayLogs === 'object') {
        saveDayLogs(data.dayLogs);
      }
      if (Array.isArray(data.preBuiltMeals)) {
        setPreBuiltMeals(data.preBuiltMeals);
        localStorage.setItem(STORAGE_KEYS.PREBUILT_MEALS, JSON.stringify(data.preBuiltMeals));
      }
      if (data.settings) {
        updateSettings(data.settings);
      }
      if (data.periodData && typeof data.periodData === 'object') {
        try {
          savePeriodData(normalizePeriodData(data.periodData));
        } catch (e) {
          console.error('Failed to import period data', e);
        }
      }
      return true;
    } catch (err) {
      console.error('Import error:', err);
      return false;
    }
  };

  // Calculations for current day
  const allCurrentDayFoods: LoggedFoodItem[] = [
    ...currentDayLog.meals.breakfast,
    ...currentDayLog.meals.mid_morning,
    ...currentDayLog.meals.lunch,
    ...currentDayLog.meals.midday_snack,
    ...currentDayLog.meals.dinner,
    ...currentDayLog.meals.extra,
  ];

  const currentMacros = calculateMacros(allCurrentDayFoods);
  const currentIntakeCalories = calculateTotalCalories(allCurrentDayFoods);

  const bmr = calculateBMR(userProfile);
  const activityExpenditure = calculateTotalActivityCalories(currentDayLog.activities);
  const tefResult = calculateTEF(
    currentMacros.carbsGrams,
    currentMacros.proteinGrams,
    currentMacros.fatGrams
  );
  const totalExpenditure = bmr + activityExpenditure + tefResult.totalTEF;

  const currentExpenditure: EnergyExpenditureSummary = {
    bmr,
    activityExpenditure,
    tef: tefResult.totalTEF,
    totalExpenditure,
  };

  const netBalance = currentIntakeCalories - totalExpenditure;

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        selectedDate,
        setSelectedDate,
        userProfile,
        updateUserProfile,
        allFoods,
        addCustomFood,
        currentDayLog,
        logFoodItem,
        removeLoggedFoodItem,
        updateLoggedFoodItemAmount,
        logActivity,
        removeActivity,
        copyYesterdayMeals,
        preBuiltMeals,
        addPreBuiltMeal,
        updatePreBuiltMeal,
        deletePreBuiltMeal,
        logPreBuiltMealToSlot,
        logItemsToSlot,
        currentMacros,
        currentIntakeCalories,
        currentExpenditure,
        netBalance,
        isAddFoodOpen,
        setIsAddFoodOpen,
        targetMealSlot,
        setTargetMealSlot,
        isLogActivityOpen,
        setIsLogActivityOpen,
        isBarcodeOpen,
        setIsBarcodeOpen,
        isProfileOpen,
        setIsProfileOpen,
        isPrebuiltModalOpen,
        setIsPrebuiltModalOpen,
        prebuiltToLog,
        setPrebuiltToLog,
        settings,
        updateSettings,
        activeTab,
        setActiveTab,
        isSettingsOpen,
        setIsSettingsOpen,
        isWaterOpen,
        setIsWaterOpen,
        isPoopOpen,
        setIsPoopOpen,
        isWeightOpen,
        setIsWeightOpen,
        isCustomFoodOpen,
        setIsCustomFoodOpen,
        customButtonOpenId,
        setCustomButtonOpenId,
        isCustomPickerOpen,
        setIsCustomPickerOpen,
        periodData,
        updatePeriodSettings,
        updatePeriodDay,
        clearPeriodDay,
        markPeriodStart,
        markPeriodEnd,
        togglePill,
        addPeriodTag,
        renamePeriodTag,
        deletePeriodTag,
        toggleHiddenBuiltin,
        periodSelectedDate,
        setPeriodSelectedDate,
        isPeriodSheetOpen,
        setIsPeriodSheetOpen,
        toast,
        showToast,
        hideToast,
        customActivities,
        addCustomActivity,
        logWater,
        removeWaterEntry,
        logCustom,
        waterTotalFor,
        logWeight,
        logPoop,
        removePoop,
        exportDataJson,
        importDataJson,
        allDayLogs: dayLogs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
