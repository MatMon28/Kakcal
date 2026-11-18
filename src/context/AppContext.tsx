import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  PeriodTag,
  PoopEntry,
  PoopSize,
  WaterEntry,
  BristolType,
  PreBuiltMeal,
  Settings,
  Theme,
  UserProfile,
  CustomActivityDef,
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
import { getCustomEntries, migrateCustomEntries, withCustomEntries } from '../utils/customTrackers';
import { getDefaultPeriodTags, periodTagListKey, prunePeriodTags, type PeriodTagGroup } from '../utils/period';
import { DEMO_MODE } from '../config/demo';
import {
  createDemoPeriodData,
  DEMO_CUSTOM_BUTTONS,
  DEMO_MEALS,
  DEMO_RECIPES,
  enrichDemoDayLogs,
} from '../data/demoData';

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
  deleteCustomFood: (foodId: string) => void;
  favoriteFoods: string[];
  toggleFavoriteFood: (foodId: string) => void;
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
  exportDataJson: () => string;
  importDataJson: (jsonStr: string) => boolean;
  allDayLogs: Record<string, DayLog>;
}

/** Accepts the legacy `string[]` format as well as `CustomActivityDef[]`. */
function normalizeCustomActivities(raw: unknown): CustomActivityDef[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomActivityDef[] = [];
  raw.forEach((item, index) => {
    if (typeof item === 'string' && item.trim()) {
      out.push({ id: `ca-legacy-${index}-${item.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name: item.trim(), met: 5, createdAt: '' });
    } else if (item && typeof item === 'object' && typeof (item as CustomActivityDef).name === 'string') {
      const d = item as Partial<CustomActivityDef>;
      out.push({
        id: typeof d.id === 'string' && d.id ? d.id : `ca-legacy-${index}`,
        name: d.name!.trim(),
        met: typeof d.met === 'number' && d.met > 0 ? d.met : 5,
        createdAt: typeof d.createdAt === 'string' ? d.createdAt : '',
      });
    }
  });
  return out;
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
  moodTags: getDefaultPeriodTags('mood'),
  symptomTags: getDefaultPeriodTags('symptom'),
};

const clampInt = (v: unknown, min: number, max: number, dflt: number) => {
  const n = typeof v === 'number' ? Math.round(v) : NaN;
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
};

const isDateStr = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

const normalizeTheme = (value: unknown): Theme => value === 'dark' || value === 'lite-dark' ? value : 'light';

function normalizeDayLogs(logs: Record<string, DayLog>): Record<string, DayLog> {
  return Object.fromEntries(Object.entries(logs).map(([date, raw]) => {
    const log = migrateCustomEntries(raw.date === date ? raw : { ...raw, date });
    const legacyWater = log.waterMl;
    const noon = new Date(`${date}T12:00:00`);
    if (typeof legacyWater === 'number' && legacyWater > 0 && !log.waterEntries?.length && Number.isFinite(noon.getTime())) {
      const { waterMl: _legacy, ...day } = log;
      return [date, { ...day, waterEntries: [{ id: `water-legacy-${date}`, ml: legacyWater, timestamp: noon.toISOString() }] }];
    }
    return [date, log];
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePeriodSettings(p: any): PeriodSettings {
  const src = p || {};
  const legacyPack = src.pillPack === 21 || src.pillPack === 28;
  const packLength = legacyPack ? 28 : clampInt(src.packLength, 1, 365, 28);
  const inactiveDays = legacyPack ? 7 : clampInt(src.inactiveDays, 0, Math.max(0, packLength - 1), Math.min(7, packLength - 1));
  const tags = (arr: unknown): PeriodTag[] => Array.isArray(arr)
    ? arr.filter((tag) => tag && typeof tag.id === 'string' && typeof tag.label === 'string' && tag.label.trim())
        .map(({ id, label }) => ({ id, label: label.trim().slice(0, 24) }))
    : [];
  const catalogue = (group: PeriodTagGroup) => {
    const defaults = getDefaultPeriodTags(group);
    const stored = src[periodTagListKey(group)];
    const hidden = Array.isArray(src.hiddenBuiltins) ? src.hiddenBuiltins : [];
    const legacy = group === 'mood' ? src.customMoods : src.customSymptoms;
    const list = Array.isArray(stored)
      ? tags(stored)
      : [...defaults.filter((tag) => !hidden.includes(tag.id)), ...tags(legacy)];
    return [...new Map(list.map((tag) => [tag.id, tag])).values()].slice(0, defaults.length + 30);
  };
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
    moodTags: catalogue('mood'),
    symptomTags: catalogue('symptom'),
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
    const tagIds = (arr: unknown, legacy: string[], prefix: string) => Array.isArray(arr)
      ? arr.filter((id): id is string => typeof id === 'string').map((id) => legacy.includes(id) ? `${prefix}.${id}` : id)
      : [];
    const moods = tagIds(l.moods, LEGACY_MOODS, 'mood');
    const symptoms = tagIds(l.symptoms, LEGACY_SYMS, 'sym');
    const flow = ['none', 'light', 'medium', 'heavy'].includes(l.flow) ? l.flow : 'none';
    out[d] = {
      isPeriod: Boolean(l.isPeriod) || flow !== 'none',
      flow,
      moods,
      symptoms,
      pillTaken: l.pillTaken === undefined ? undefined : Boolean(l.pillTaken),
      intercourse: l.intercourse === true ? true : undefined,
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

// Demo favourites so the starred-first search is visible on a fresh install (see DEMO_MODE).
const DEMO_FAVORITE_FOODS = ['lidl-01', 'gen-21', 'gen-03', ...DEFAULT_QUICK_FOODS];

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
    const sexChanged = profile.sex !== userProfile.sex;
    setUserProfileState(profile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    if (sexChanged) {
      setSettingsState((prev) => {
        if (prev.hidePeriodCustomized) return prev;
        const hidePeriod = profile.sex === 'male';
        if (hidePeriod) {
          setActiveTabState((tab) => (tab === 'period' ? 'today' : tab));
        }
        const next = { ...prev, hidePeriod };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
        return next;
      });
    }
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
    return DEMO_MODE ? DEMO_RECIPES : [];
  });

  const addCustomFood = (food: FoodItem) => {
    setCustomFoods((prev) => {
      const updated = [food, ...prev.filter((f) => f.id !== food.id)];
      localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteCustomFood = (foodId: string) => {
    setCustomFoods((prev) => {
      const updated = prev.filter((f) => f.id !== foodId);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(updated));
      return updated;
    });
  };

  const allFoods = useMemo(() => [...customFoods, ...VERIFIED_FOODS], [customFoods]);

  // 5. Day Logs with realistic initial data for today and yesterday if first launch
  const [dayLogs, setDayLogs] = useState<Record<string, DayLog>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DAY_LOGS);
    if (saved) {
      try {
        return normalizeDayLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse day logs', e);
      }
    }

    if (!DEMO_MODE) return {};

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

    const demoSeeds = enrichDemoDayLogs(initialSeeds);
    try {
        localStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(demoSeeds));
      } catch (err) {
        console.error('Failed to save initial day seeds', err);
      }

      return demoSeeds;
  });

  const emptyDayFor = (date: string): DayLog => ({
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
  });

  const saveDayLogs = (newLogs: Record<string, DayLog>) => {
    setDayLogs(newLogs);
    localStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(newLogs));
  };

  const mutateDay = (date: string, fn: (day: DayLog) => DayLog) => {
    setDayLogs((prev) => {
      const base = prev[date] || emptyDayFor(date);
      const next = { ...prev, [date]: fn(base) };
      localStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(next));
      return next;
    });
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
    return DEMO_MODE ? DEMO_MEALS : INITIAL_PREBUILT_MEALS;
  });

  const addPreBuiltMeal = (mealData: Omit<PreBuiltMeal, 'id' | 'createdAt'>) => {
    const newMeal: PreBuiltMeal = {
      ...mealData,
      id: 'prebuilt-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setPreBuiltMeals((prev) => {
      const updated = [newMeal, ...prev];
      localStorage.setItem(STORAGE_KEYS.PREBUILT_MEALS, JSON.stringify(updated));
      return updated;
    });
  };

  const updatePreBuiltMeal = (updatedMeal: PreBuiltMeal) => {
    setPreBuiltMeals((prev) => {
      const updated = prev.map((m) => (m.id === updatedMeal.id ? updatedMeal : m));
      localStorage.setItem(STORAGE_KEYS.PREBUILT_MEALS, JSON.stringify(updated));
      return updated;
    });
  };

  const deletePreBuiltMeal = (mealId: string) => {
    setPreBuiltMeals((prev) => {
      const updated = prev.filter((m) => m.id !== mealId);
      localStorage.setItem(STORAGE_KEYS.PREBUILT_MEALS, JSON.stringify(updated));
      return updated;
    });
  };

  // Modals state
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [targetMealSlot, setTargetMealSlot] = useState<MealSlotId>('breakfast');
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
    return DEMO_MODE
      ? createDemoPeriodData(DEFAULT_PERIOD_SETTINGS)
      : { settings: DEFAULT_PERIOD_SETTINGS, logs: {} };
  });
  const periodRef = React.useRef(periodData);
  periodRef.current = periodData;

  const savePeriodData = (next: PeriodData) => {
    periodRef.current = next;
    setPeriodData(next);
    localStorage.setItem(STORAGE_KEYS.PERIOD, JSON.stringify(next));
  };

  // Date selected on the Period calendar (shared with the quick-log dialog)
  const [periodSelectedDate, setPeriodSelectedDate] = useState<string>(getTodayDateString());
  const [isPeriodSheetOpen, setIsPeriodSheetOpen] = useState(false);

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
    const updated = { ...logs };
    if (!next.isPeriod && !next.moods.length && !next.symptoms.length &&
        next.pillTaken === undefined && !next.intercourse && !next.notes?.trim()) {
      delete updated[date];
    } else {
      updated[date] = next;
    }
    return updated;
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

  const addPeriodTag = (group: PeriodTagGroup, label: string): string | null => {
    const cur = periodRef.current;
    const name = label.trim();
    if (name.length < 1 || name.length > 24) return null;
    const key = periodTagListKey(group);
    const list = cur.settings[key];
    const defaults = getDefaultPeriodTags(group);
    if (list.filter((tag) => !defaults.some((entry) => entry.id === tag.id)).length >= 30) return null;
    const builtins = defaults.flatMap(({ label: slug }) => {
      const translationKey = `${group === 'mood' ? 'mood' : 'sym'}_${slug}` as keyof typeof translations.en.period;
      return [translations.en.period[translationKey], translations.it.period[translationKey]];
    });
    const lower = name.toLowerCase();
    if (list.some((tag) => tag.label.toLowerCase() === lower) || builtins.some((label) => label.toLowerCase() === lower)) return null;
    const id = 'c_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
    savePeriodData({ ...cur, settings: { ...cur.settings, [key]: [...list, { id, label: name }] } });
    return id;
  };

  const deletePeriodTag = (group: PeriodTagGroup, id: string) => {
    const cur = periodRef.current;
    const key = periodTagListKey(group);
    savePeriodData({
      settings: { ...cur.settings, [key]: cur.settings[key].filter((tag) => tag.id !== id) },
      logs: prunePeriodTags(cur.logs, group, (tagId) => tagId !== id),
    });
  };

  const resetPeriodTags = (group: PeriodTagGroup) => {
    const cur = periodRef.current;
    const defaults = getDefaultPeriodTags(group);
    const ids = new Set(defaults.map((tag) => tag.id));
    savePeriodData({
      settings: { ...cur.settings, [periodTagListKey(group)]: defaults },
      logs: prunePeriodTags(cur.logs, group, (id) => ids.has(id)),
    });
  };

  // Navigation tab (lifted so Settings can jump to the Foods database)
  const [activeTab, setActiveTabState] = useState<ActiveTab>('today');
  const lastMainTabRef = React.useRef<ActiveTab>('today');
  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState((prev) => {
      if (prev !== 'database') lastMainTabRef.current = prev;
      return tab;
    });
  };
  const returnFromDatabase = () => {
    const target = lastMainTabRef.current;
    setActiveTabState(target === 'period' && settings.hidePeriod ? 'today' : target);
  };

  // Settings (theme, quick-add buttons, hide poop/period — Period hidden by default for male profiles)
  const [settings, setSettingsState] = useState<Settings>(() => {
    const defaultHidePeriod = userProfile.sex === 'male';
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        const customized = Boolean(p.hidePeriodCustomized);
        const hasPeriodLogs = Object.keys(periodData.logs).length > 0;
        const resolvedHidePeriod = customized
          ? Boolean(p.hidePeriod)
          : p.hidePeriod === true
          ? true
          : defaultHidePeriod && !hasPeriodLogs;
        return {
          theme: normalizeTheme(p.theme),
          ultraMinimal: Boolean(p.ultraMinimal),
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
          hidePeriod: resolvedHidePeriod,
          hidePeriodCustomized: customized,
          quickFoods:
            Array.isArray(p.quickFoods) && p.quickFoods.length === 3
              ? p.quickFoods
              : DEFAULT_QUICK_FOODS,
          favoriteFoods: Array.isArray(p.favoriteFoods)
            ? p.favoriteFoods.filter((id: unknown): id is string => typeof id === 'string')
            : [],
          favoriteActivities: Array.isArray(p.favoriteActivities)
            ? p.favoriteActivities.filter((id: unknown): id is string => typeof id === 'string')
            : [],
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
      ultraMinimal: false,
      quickAdd: { food: true, movement: true, water: true, poop: true, weight: true, custom: true },
      hidePoop: false,
      hidePeriod: defaultHidePeriod,
      hidePeriodCustomized: false,
      quickFoods: DEFAULT_QUICK_FOODS,
      favoriteFoods: DEMO_MODE ? DEMO_FAVORITE_FOODS : [],
      favoriteActivities: [],
      customButtons: DEMO_MODE ? DEMO_CUSTOM_BUTTONS : [],
    };
  });

  // Custom activity names (suggested next time)
  // Saved custom activities (name + MET). Older installs stored plain names: migrate them to 5 MET.
  const [customActivities, setCustomActivities] = useState<CustomActivityDef[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_ACTIVITIES);
      return saved ? normalizeCustomActivities(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  const persistCustomActivities = (next: CustomActivityDef[]) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_ACTIVITIES, JSON.stringify(next));
    return next;
  };

  /** Saves (or updates) a custom activity so it can be searched under Activity → Other. */
  const addCustomActivity = (name: string, met = 5): CustomActivityDef => {
    const n = name.trim();
    const safeMet = Number.isFinite(met) && met > 0 ? Math.round(met * 10) / 10 : 5;
    const existing = customActivities.find((x) => x.name.toLowerCase() === n.toLowerCase());
    const def: CustomActivityDef = existing
      ? { ...existing, met: safeMet }
      : { id: `ca-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: n, met: safeMet, createdAt: new Date().toISOString() };
    setCustomActivities((prev) => persistCustomActivities([def, ...prev.filter((x) => x.id !== def.id)]));
    return def;
  };

  const removeCustomActivity = (id: string) => {
    setCustomActivities((prev) => persistCustomActivities(prev.filter((x) => x.id !== id)));
  };

  const toggleFavoriteFood = (foodId: string) => {
    setSettingsState((prev) => {
      const current = prev.favoriteFoods ?? [];
      const next: Settings = {
        ...prev,
        favoriteFoods: current.includes(foodId)
          ? current.filter((id) => id !== foodId)
          : [foodId, ...current.filter((id) => id !== foodId)],
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
      return next;
    });
  };

  const toggleFavoriteActivity = (activityId: string) => {
    setSettingsState((prev) => {
      const current = prev.favoriteActivities ?? [];
      const next: Settings = {
        ...prev,
        favoriteActivities: current.includes(activityId)
          ? current.filter((id) => id !== activityId)
          : [activityId, ...current.filter((id) => id !== activityId)],
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
      return next;
    });
  };

  const updateSettings = (partial: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial, theme: normalizeTheme(partial.theme ?? prev.theme) };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    }
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Helper to get or create DayLog
  const getDayLog = (date: string): DayLog => dayLogs[date] || emptyDayFor(date);

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
    const itemName = language === 'it' ? food.name_it : food.name_en || food.name_de;
    const newLoggedItem: LoggedFoodItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
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

    mutateDay(date, (day) => ({
      ...day,
      meals: {
        ...day.meals,
        [mealSlot]: [...day.meals[mealSlot], newLoggedItem],
      },
    }));
  };

  // Remove logged food item
  const removeLoggedFoodItem = (
    mealSlot: MealSlotId,
    loggedItemId: string,
    date: string = selectedDate
  ) => {
    mutateDay(date, (day) => ({
      ...day,
      meals: {
        ...day.meals,
        [mealSlot]: day.meals[mealSlot].filter((item) => item.id !== loggedItemId),
      },
    }));
  };

  // Update logged food item amount
  const updateLoggedFoodItemAmount = (
    mealSlot: MealSlotId,
    loggedItemId: string,
    newAmount: number,
    date: string = selectedDate
  ) => {
    mutateDay(date, (day) => ({
      ...day,
      meals: {
        ...day.meals,
        [mealSlot]: day.meals[mealSlot].map((item) =>
          item.id === loggedItemId ? { ...item, amount: newAmount } : item
        ),
      },
    }));
  };

  // Log activity
  const logActivity = (
    activityData: Omit<ActivityLog, 'id' | 'timestamp'>,
    date: string = selectedDate
  ) => {
    const newActivity: ActivityLog = {
      ...activityData,
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
    };
    mutateDay(date, (day) => ({
      ...day,
      activities: [...day.activities, newActivity],
    }));
  };

  // Remove activity
  const removeActivity = (activityId: string, date: string = selectedDate) => {
    mutateDay(date, (day) => ({
      ...day,
      activities: day.activities.filter((act) => act.id !== activityId),
    }));
  };

  // Log a water entry (each addition is its own voice/block)
  const logWater = (ml: number, date: string = selectedDate) => {
    const entry: WaterEntry = {
      id: 'water-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      ml,
      timestamp: new Date().toISOString(),
    };
    mutateDay(date, (day) => ({
      ...day,
      waterEntries: [...(day.waterEntries || []), entry],
    }));
  };

  // Remove a single water entry
  const removeWaterEntry = (id: string, date: string = selectedDate) => {
    mutateDay(date, (day) => ({
      ...day,
      waterEntries: (day.waterEntries || []).filter((w) => w.id !== id),
    }));
  };

  // Quantities append one entry; done/not-done trackers still store one value per day.
  const logCustom = (buttonId: string, value: number | boolean, date: string = selectedDate) => {
    if (typeof value === 'boolean') {
      mutateDay(date, (day) => {
        const migrated = migrateCustomEntries(day);
        return { ...migrated, custom: { ...migrated.custom, [buttonId]: value } };
      });
      return;
    }
    if (!Number.isFinite(value) || value <= 0) return;
    const entry = {
      id: `qty-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      amount: value,
      timestamp: new Date().toISOString(),
    };
    mutateDay(date, (day) => withCustomEntries(day, buttonId, [...getCustomEntries(day, buttonId), entry]));
  };

  const removeCustomEntry = (buttonId: string, entryId: string, date: string = selectedDate) => {
    mutateDay(date, (day) => withCustomEntries(day, buttonId, getCustomEntries(day, buttonId).filter((entry) => entry.id !== entryId)));
  };

  // Keep the selected day's measurement and profile weight in sync on save.
  const logWeight = (kg: number, date: string = selectedDate) => {
    if (!Number.isFinite(kg) || kg <= 0) return;
    const weightKg = Math.round(kg * 10) / 10;
    if (!Number.isFinite(weightKg) || weightKg <= 0) return;
    mutateDay(date, (day) => ({ ...day, weightKg }));
    updateUserProfile({ ...userProfile, weightKg });
  };

  // Log a poop entry for a day
  const logPoop = (
    size: PoopSize,
    date: string = selectedDate,
    description?: string,
    bristol?: BristolType
  ) => {
    const entry: PoopEntry = {
      id: 'poop-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      size,
      description: description?.trim() || undefined,
      bristol,
      timestamp: new Date().toISOString(),
    };
    mutateDay(date, (day) => ({
      ...day,
      poops: [...(day.poops || []), entry],
    }));
  };

  // Remove a poop entry for a day
  const removePoop = (poopId: string, date: string = selectedDate) => {
    mutateDay(date, (day) => ({
      ...day,
      poops: (day.poops || []).filter((p) => p.id !== poopId),
    }));
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
    const cloned = items.map((it) => ({
      ...it,
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      loggedAt: new Date().toISOString(),
    }));
    mutateDay(date, (day) => ({
      ...day,
      meals: { ...day.meals, [mealSlot]: [...day.meals[mealSlot], ...cloned] },
    }));
  };

  // Export JSON
  const exportDataJson = (): string => {
    const data = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      userProfile,
      customFoods,
      dayLogs,
      preBuiltMeals,
      settings,
      periodData,
      customActivities,
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
      if (data.dayLogs && typeof data.dayLogs === 'object' && !Array.isArray(data.dayLogs)) {
        saveDayLogs(normalizeDayLogs(data.dayLogs));
      }
      if (Array.isArray(data.preBuiltMeals)) {
        setPreBuiltMeals(data.preBuiltMeals);
        localStorage.setItem(STORAGE_KEYS.PREBUILT_MEALS, JSON.stringify(data.preBuiltMeals));
      }
      if (data.settings && typeof data.settings === 'object') {
        const s = data.settings;
        const importedSex = data.userProfile?.sex ?? userProfile.sex;
        const customized = Boolean(s.hidePeriodCustomized);
        const importedHasLogs = Boolean(
          data.periodData?.logs && Object.keys(data.periodData.logs).length > 0
        );
        const hidePeriod =
          typeof s.hidePeriod === 'boolean'
            ? customized || s.hidePeriod || importedSex !== 'male' || importedHasLogs
              ? s.hidePeriod
              : true
            : importedSex === 'male';
        updateSettings({ ...s, hidePeriod, hidePeriodCustomized: customized });
        if (hidePeriod) {
          setActiveTabState((tab) => (tab === 'period' ? 'today' : tab));
        }
      }
      if (Array.isArray(data.customActivities)) {
        setCustomActivities(persistCustomActivities(normalizeCustomActivities(data.customActivities)));
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
        deleteCustomFood,
        favoriteFoods: settings.favoriteFoods ?? [],
        toggleFavoriteFood,
        favoriteActivities: settings.favoriteActivities ?? [],
        toggleFavoriteActivity,
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
        settings,
        updateSettings,
        activeTab,
        setActiveTab,
        returnFromDatabase,
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
        addPeriodTag,
        deletePeriodTag,
        resetPeriodTags,
        periodSelectedDate,
        setPeriodSelectedDate,
        isPeriodSheetOpen,
        setIsPeriodSheetOpen,
        customActivities,
        addCustomActivity,
        removeCustomActivity,
        logWater,
        removeWaterEntry,
        logCustom,
        removeCustomEntry,
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
