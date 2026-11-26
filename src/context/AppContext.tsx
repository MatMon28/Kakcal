import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ActiveTab, ActivityLog, DayLog, EnergyExpenditureSummary, FoodItem, Language, LoggedFoodItem, MealSlotId, PeriodData, PeriodDayLog, PeriodSettings, PoopEntry, PoopSize, WaterEntry, BristolType, PreBuiltMeal, Settings, UserProfile, CustomActivityDef } from '../types';
import { VERIFIED_FOODS } from '../data/verifiedFoods';
import { INITIAL_PREBUILT_MEALS } from '../data/samplePreBuiltMeals';
import { calculateBMR, calculateMacros, calculateTEF, calculateTotalActivityCalories, calculateTotalCalories } from '../utils/calculations';
import { addDaysToDateString, getTodayDateString } from '../utils/formatters';
import { translations } from '../i18n/translations';
import { getCustomEntries, migrateCustomEntries, withCustomEntries } from '../utils/customTrackers';
import { getDefaultPeriodTags, periodTagListKey, periodTagSelectionKey, prunePeriodTags, type PeriodTagGroup } from '../utils/period';
import { syncLaunchBackground } from '../utils/android';
import { whenIdle } from '../utils/idle';
import { DEFAULT_PAGE_ORDER, isPageHiddenBySettings, normalizePageOrder } from '../utils/pageVisibility';
import { exportAdvanced, importAdvanced } from '../utils/advancedStore';
import { exportFasting, getFasting, importFasting } from '../utils/fastingStore';
import { requestFastInterrupt } from '../components/fasting/FastingInterruptModal';
import { exportLayout, importLayout } from '../utils/layoutStore';
import { exportMealJournalForBackup, importMealJournal, prepareMealJournalImport } from '../utils/journalStore';
import { applyPreferences, backupMajorVersion, BACKUP_FORMAT, BACKUP_VERSION, collectPreferences, isSupportedBackup, setLastImportReport } from '../utils/backupFormat';
import { exportLastAmounts, importLastAmounts } from '../utils/amountMemory';
import { exportCustomPortions, importCustomPortions } from '../utils/customPortions';
import { loadPlannerDraft, parsePlannerDraft, savePlannerDraft } from '../utils/plannerDraft';
import { bootedDays } from '../storage/boot';
import { persistDayChanges, replaceAllDays } from '../storage/dayStore';
import { usePersistLocal } from '../storage/usePersist';
import { JournalDataContext, NavActionsContext, NavContext, SettingsContext, UiContext, useStableActions, type JournalSlice, type NavSlice, type SettingsSlice, type UiSlice } from './contexts';

/** One empty day per date (C4): a new object on every read would defeat memoisation. Never written into state. */
const emptyDays = new Map<string, DayLog>();
import { allMealItems } from '../utils/mealItems';
import { offerRemovalUndo, removeWithUndo, restoreAt } from '../utils/undoRemoval';
import { applyThemeAttributes, DEFAULT_MONO_HUE, normalizeMonoHue, normalizeThemeStyle } from '../utils/themes';
import { DEMO_MODE } from '../config/demo';
import { DEFAULT_NOTIFICATION_SETTINGS, normalizeNotificationSettings } from '../utils/notifications';
import { startedWithPlanLink } from '../utils/incomingPlan';
import { createDemoPeriodData, DEMO_CUSTOM_BUTTONS, DEMO_MEALS, DEMO_RECIPES, enrichDemoDayLogs } from '../data/demoData';
import {
  DEFAULT_PERIOD_SETTINGS,
  DEFAULT_PROFILE,
  DEFAULT_QUICK_FOODS,
  DEMO_FAVORITE_FOODS,
  STORAGE_KEYS,
  normalizeCustomActivities,
  normalizeDayLogs,
  normalizePeriodData,
  normalizePeriodSettings,
  normalizeTheme,
} from './appStorage';
import { createDemoSeedDays } from './demoSeeds';
import type { AppContextType } from './appContextType';

// Still exported from here for existing importers; the value lives in `appStorage.ts`.
export { DEFAULT_QUICK_FOODS };

const USED_FOODS_LIMIT = 3000;

/** Keeps all protected (favourited, quick-add, meal/recipe-linked) OFF foods plus the newest remaining ones up to `limit`. */
function trimUsedFoods(list: FoodItem[], protectedIds: ReadonlySet<string>, limit = USED_FOODS_LIMIT): FoodItem[] {
  if (list.length <= limit) return list;
  const keptProtected: FoodItem[] = [];
  const rest: FoodItem[] = [];
  for (const item of list) {
    if (protectedIds.has(item.id)) keptProtected.push(item);
    else rest.push(item);
  }
  const restBudget = Math.max(0, limit - keptProtected.length);
  const keptRest = new Set(rest.slice(0, restBudget));
  return list.filter((item) => protectedIds.has(item.id) || keptRest.has(item));
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Language
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANG);
    return saved === 'it' ? 'it' : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };
  usePersistLocal(STORAGE_KEYS.LANG, language, String);

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
    if (sexChanged && !settings.hidePeriodCustomized) {
      const hidePeriod = profile.sex === 'male';
      setSettingsState((prev) => (prev.hidePeriodCustomized ? prev : { ...prev, hidePeriod }));
      if (hidePeriod) setActiveTabState((tab) => (tab === 'period' ? 'today' : tab));
    }
  };
  usePersistLocal(STORAGE_KEYS.PROFILE, userProfile);

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
    setCustomFoods((prev) => [food, ...prev.filter((f) => f.id !== food.id)]);
  };

  const deleteCustomFood = (foodId: string) => {
    removeWithUndo(customFoods, customFoods.findIndex((f) => f.id === foodId), setCustomFoods, undefined, (a, b) => a.id === b.id);
  };
  usePersistLocal(STORAGE_KEYS.CUSTOM_FOODS, customFoods);

  // Foods picked from the offline catalogue. Lookups by id (favourites, recents,
  // recipe ingredients) go through allFoods, so a picked or starred catalogue food is kept here.
  const [usedFoods, setUsedFoods] = useState<FoodItem[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.USED_FOODS) || '[]');
      return Array.isArray(parsed) ? parsed.filter((f: FoodItem) => f && typeof f.id === 'string') : [];
    } catch {
      return [];
    }
  });

  const protectedFoodIdsRef = useRef<Set<string>>(new Set());

  const rememberFood = (food: FoodItem) => {
    if (!food.id.startsWith('off-')) return; // the bundled and custom foods are always available
    setUsedFoods((prev) => {
      if (prev[0]?.id === food.id) return prev;
      return trimUsedFoods([food, ...prev.filter((f) => f.id !== food.id)], protectedFoodIdsRef.current);
    });
  };
  usePersistLocal(STORAGE_KEYS.USED_FOODS, usedFoods);

  const allFoods = useMemo(() => [...customFoods, ...usedFoods, ...VERIFIED_FOODS], [customFoods, usedFoods]);

  // 5. Day Logs with realistic initial data for today and yesterday if first launch
  // Days were loaded from IndexedDB (one record per date) by `bootStorage()` before the first render (see main.tsx).
  // Without a boot (tests, tools) the legacy localStorage blob is read synchronously instead.
  const [diskDays] = useState(() => {
    const booted = bootedDays();
    if (booted) return booted;
    let legacy: Record<string, DayLog> | null = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DAY_LOGS);
      if (saved) legacy = normalizeDayLogs(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to parse day logs', e);
    }
    return { logs: legacy ?? {}, initialised: legacy !== null, backend: 'local' as const };
  });
  const [dayLogs, setDayLogs] = useState<Record<string, DayLog>>(() => {
    if (diskDays.initialised || !DEMO_MODE) return diskDays.logs;
    // Generate initial sample days for today & yesterday so the demo has live visual data immediately.
    const today = getTodayDateString();
    return enrichDemoDayLogs(createDemoSeedDays(today, addDaysToDateString(today, -1)));
  });

  // Persist per record, from an effect and outside any state updater: only days whose record changed are written.
  const persistedDays = useRef(diskDays.logs);
  useEffect(() => {
    if (persistedDays.current === dayLogs) return;
    persistDayChanges(persistedDays.current, dayLogs);
    persistedDays.current = dayLogs;
  }, [dayLogs]);

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

  const mutateDay = (date: string, fn: (day: DayLog) => DayLog) => {
    setDayLogs((prev) => ({ ...prev, [date]: fn(prev[date] || emptyDayFor(date)) }));
  };

  /** Inverse operations act on the same date and live array, even if the user changed days since deleting. */
  const removeDayItem = <T extends { id: string },>(
    date: string, id: string, read: (day: DayLog) => T[], write: (day: DayLog, items: T[]) => DayLog,
  ) => {
    const items = read(dayLogs[date] ?? emptyDayFor(date));
    removeWithUndo(items, items.findIndex((item) => item.id === id), (change) => {
      mutateDay(date, (day) => write(day, change(read(day))));
    }, undefined, (a, b) => a.id === b.id);
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
    setPreBuiltMeals((prev) => [newMeal, ...prev]);
  };

  const updatePreBuiltMeal = (updatedMeal: PreBuiltMeal) => {
    setPreBuiltMeals((prev) => prev.map((m) => (m.id === updatedMeal.id ? updatedMeal : m)));
  };

  const deletePreBuiltMeal = (mealId: string) => {
    removeWithUndo(preBuiltMeals, preBuiltMeals.findIndex((m) => m.id === mealId), setPreBuiltMeals, undefined, (a, b) => a.id === b.id);
  };
  usePersistLocal(STORAGE_KEYS.PREBUILT_MEALS, preBuiltMeals);

  // Modals state
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [foodLogSeed, setFoodLogSeed] = useState<AppContextType['foodLogSeed']>([]);
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
  };
  usePersistLocal(STORAGE_KEYS.PERIOD, periodData);

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
    const removed = cur.logs[date];
    if (!removed) return;
    const nextLogs = { ...cur.logs };
    delete nextLogs[date];
    savePeriodData({ ...cur, logs: nextLogs });
    offerRemovalUndo(() => {
      const latest = periodRef.current;
      if (!latest.logs[date]) savePeriodData({ ...latest, logs: { ...latest.logs, [date]: removed } });
    });
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
    const selectionKey = periodTagSelectionKey(group);
    const index = cur.settings[key].findIndex((tag) => tag.id === id);
    const tag = cur.settings[key][index];
    if (!tag) return;
    const affected = Object.entries(cur.logs).filter(([, log]) => log[selectionKey].includes(id)).map(([date]) => date);
    savePeriodData({
      settings: { ...cur.settings, [key]: cur.settings[key].filter((tag) => tag.id !== id) },
      logs: prunePeriodTags(cur.logs, group, (tagId) => tagId !== id),
    });
    offerRemovalUndo(() => {
      const latest = periodRef.current;
      const logs = { ...latest.logs };
      for (const date of affected) {
        const log = logs[date];
        if (log && !log[selectionKey].includes(id)) logs[date] = { ...log, [selectionKey]: [...log[selectionKey], id] };
      }
      savePeriodData({ settings: { ...latest.settings, [key]: restoreAt(latest.settings[key], tag, index, (a, b) => a.id === b.id) }, logs });
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
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    if (DEMO_MODE || startedWithPlanLink || new URLSearchParams(window.location.search).get('tab') === 'custom') {
      return 'prebuilt';
    }
    const fasting = getFasting();
    if (fasting.config.enabled && fasting.activeSession) return 'fasting';
    return 'today';
  });
  const lastMainTabRef = React.useRef<ActiveTab>('today');
  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState((prev) => {
      if (prev !== 'database') lastMainTabRef.current = prev;
      return tab;
    });
  };
  const returnFromDatabase = () => {
    const target = lastMainTabRef.current;
    setActiveTabState(isPageHiddenBySettings(target, settings) ? 'today' : target);
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
          themeStyle: normalizeThemeStyle(p.themeStyle),
          monoHue: normalizeMonoHue(p.monoHue),
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
          trackSugar: Boolean(p.trackSugar),
          photoDiary: Boolean(p.photoDiary),
          inlineMealNotes: Boolean(p.inlineMealNotes),
          photoDiaryInToday: typeof p.photoDiaryInToday === 'boolean' ? p.photoDiaryInToday : Boolean(p.photoDiary),
          showPlannerButton: p.showPlannerButton !== false,
          showPhotoButton: p.showPhotoButton !== false,
          hidePeriod: resolvedHidePeriod,
          hidePeriodCustomized: customized,
          hideCustomPage: Boolean(p.hideCustomPage),
          hideStatisticsPage: Boolean(p.hideStatisticsPage),
          pageOrder: normalizePageOrder(p.pageOrder),
          hideCustomButtons:
            p.hideCustomButtons && typeof p.hideCustomButtons === 'object'
              ? { meal: Boolean(p.hideCustomButtons.meal), recipe: Boolean(p.hideCustomButtons.recipe), food: Boolean(p.hideCustomButtons.food) }
              : {},
          hideCustomFields: p.hideCustomFields && typeof p.hideCustomFields === 'object' ? p.hideCustomFields : {},
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
          widgetStyle: p.widgetStyle === 'dark' ? 'dark' : 'light',
          widgetCustomButton: Boolean(p.widgetCustomButton),
          notifications: normalizeNotificationSettings(p.notifications),
        };
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return {
      theme: 'light',
      themeStyle: 'classic',
      monoHue: DEFAULT_MONO_HUE,
      ultraMinimal: false,
      quickAdd: { food: true, movement: true, water: true, poop: true, weight: true, custom: true },
      hidePoop: false,
      trackSugar: false,
      photoDiary: DEMO_MODE,
      inlineMealNotes: DEMO_MODE,
      photoDiaryInToday: DEMO_MODE,
      showPlannerButton: true,
      showPhotoButton: true,
      hidePeriod: defaultHidePeriod,
      hidePeriodCustomized: false,
      hideCustomPage: false,
      hideStatisticsPage: false,
      pageOrder: DEFAULT_PAGE_ORDER,
      hideCustomButtons: {},
      hideCustomFields: {},
      quickFoods: DEFAULT_QUICK_FOODS,
      favoriteFoods: DEMO_MODE ? DEMO_FAVORITE_FOODS : [],
      favoriteActivities: [],
      customButtons: DEMO_MODE ? DEMO_CUSTOM_BUTTONS : [],
      widgetStyle: 'light',
      widgetCustomButton: false,
      notifications: DEFAULT_NOTIFICATION_SETTINGS,
    };
  });

  const protectedIds = new Set<string>([
    ...(settings.favoriteFoods ?? []),
    ...(settings.quickFoods ?? []),
    ...preBuiltMeals.flatMap((m) => (m?.ingredients ?? []).map((ing) => ing.foodId)),
    ...customFoods.flatMap((f) => (f?.recipeIngredients ?? []).map((ing) => ing.foodId)),
  ]);
  protectedFoodIdsRef.current = protectedIds;

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

  usePersistLocal(STORAGE_KEYS.CUSTOM_ACTIVITIES, customActivities);

  /** Saves (or updates) a custom activity so it can be searched under Activity → Other. */
  const addCustomActivity = (name: string, met = 5): CustomActivityDef => {
    const n = name.trim();
    const safeMet = Number.isFinite(met) && met > 0 ? Math.round(met * 10) / 10 : 5;
    const existing = customActivities.find((x) => x.name.toLowerCase() === n.toLowerCase());
    const def: CustomActivityDef = existing
      ? { ...existing, met: safeMet }
      : { id: `ca-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: n, met: safeMet, createdAt: new Date().toISOString() };
    setCustomActivities((prev) => [def, ...prev.filter((x) => x.id !== def.id)]);
    return def;
  };

  const removeCustomActivity = (id: string) => {
    removeWithUndo(customActivities, customActivities.findIndex((x) => x.id === id), setCustomActivities, undefined, (a, b) => a.id === b.id);
  };

  const toggleFavoriteFood = (foodId: string) => {
    setSettingsState((prev) => {
      const current = prev.favoriteFoods ?? [];
      return {
        ...prev,
        favoriteFoods: current.includes(foodId)
          ? current.filter((id) => id !== foodId)
          : [foodId, ...current.filter((id) => id !== foodId)],
      };
    });
  };

  const toggleFavoriteActivity = (activityId: string) => {
    setSettingsState((prev) => {
      const current = prev.favoriteActivities ?? [];
      return {
        ...prev,
        favoriteActivities: current.includes(activityId)
          ? current.filter((id) => id !== activityId)
          : [activityId, ...current.filter((id) => id !== activityId)],
      };
    });
  };

  const updateSettings = (partial: Partial<Settings>) => {
    if (partial.customButtons) {
      const incomingIds = new Set(partial.customButtons.map((button) => button.id));
      const removed = settings.customButtons.flatMap((button, index) => incomingIds.has(button.id) ? [] : [{ button, index }]);
      if (removed.length) offerRemovalUndo(() => setSettingsState((current) => ({
        ...current,
        customButtons: removed.reduce((buttons, { button, index }) => restoreAt(buttons, button, index, (a, b) => a.id === b.id), current.customButtons),
      })));
    }
    setSettingsState((prev) => {
      // Switching the app to Dark also sets the home-screen widgets to Dark; both stay independent after that.
      const followDark = partial.theme === 'dark' && partial.widgetStyle === undefined ? { widgetStyle: 'dark' as const } : {};
      const next: Settings = {
        ...prev,
        ...partial,
        ...followDark,
        theme: normalizeTheme(partial.theme ?? prev.theme),
        themeStyle: normalizeThemeStyle(partial.themeStyle ?? prev.themeStyle),
        monoHue: normalizeMonoHue(partial.monoHue ?? prev.monoHue),
        pageOrder: normalizePageOrder(partial.pageOrder ?? prev.pageOrder),
        notifications: normalizeNotificationSettings(partial.notifications ?? prev.notifications),
      };
      // No trackers means no button to show: keep the widget setting consistent with the data.
      if (next.customButtons.length === 0) next.widgetCustomButton = false;
      return next;
    });
  };
  usePersistLocal(STORAGE_KEYS.SETTINGS, settings);

  useEffect(() => {
    applyThemeAttributes(settings.theme, settings.themeStyle, settings.monoHue);
    // Native launch screen / window / WebView follow the current background (Android only).
    // Only needed for the NEXT cold start, so it waits until the first screen is done.
    const color = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    return whenIdle(() => syncLaunchBackground(color));
  }, [settings.theme, settings.themeStyle, settings.monoHue]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Helper to get or create DayLog
  const emptyDayOnce = (date: string): DayLog => {
    let day = emptyDays.get(date);
    if (!day) {
      day = emptyDayFor(date);
      emptyDays.set(date, day);
    }
    return day;
  };
  const getDayLog = (date: string): DayLog => dayLogs[date] || emptyDayOnce(date);

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
      sugar: food.sugar ?? null,
      loggedAt: new Date().toISOString(),
    };

    const commit = () => mutateDay(date, (day) => ({
      ...day,
      meals: {
        ...day.meals,
        [mealSlot]: [...(day.meals[mealSlot] ?? []), newLoggedItem],
      },
    }));

    const fasting = getFasting();
    if (fasting.config.enabled && fasting.activeSession) {
      const kcal = Math.round((food.calories * amount) / 100);
      requestFastInterrupt(kcal, commit);
      return;
    }
    commit();
  };

  // Remove logged food item
  const removeLoggedFoodItem = (mealSlot: MealSlotId, loggedItemId: string, date: string = selectedDate) => {
    removeDayItem(date, loggedItemId, (day) => day.meals[mealSlot] ?? [], (day, items) => (
      { ...day, meals: { ...day.meals, [mealSlot]: items } }
    ));
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
        [mealSlot]: (day.meals[mealSlot] ?? []).map((item) =>
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
    removeDayItem(date, activityId, (day) => day.activities ?? [], (day, items) => ({ ...day, activities: items }));
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
    removeDayItem(date, id, (day) => day.waterEntries ?? [], (day, items) => ({ ...day, waterEntries: items }));
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
    removeDayItem(date, entryId, (day) => getCustomEntries(day, buttonId), (day, items) => withCustomEntries(day, buttonId, items));
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
    removeDayItem(date, poopId, (day) => day.poops ?? [], (day, items) => ({ ...day, poops: items }));
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

    // Built-in meals and the meal types added with the advanced layout.
    const slots = Object.keys(yesterdayLog.meals) as MealSlotId[];

    for (const slot of slots) {
      const itemsToCopy = yesterdayLog.meals[slot] || [];
      if (itemsToCopy.length > 0) {
        const clonedItems: LoggedFoodItem[] = itemsToCopy.map((item) => ({
          ...item,
          id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          loggedAt: new Date().toISOString(),
        }));
        newMeals[slot] = [...(newMeals[slot] ?? []), ...clonedItems];
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

    setDayLogs((prev) => ({ ...prev, [targetDate]: updatedDay }));

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
          sugar: food.sugar ?? null,
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
    const commit = () => mutateDay(date, (day) => ({
      ...day,
      meals: { ...day.meals, [mealSlot]: [...(day.meals[mealSlot] ?? []), ...cloned] },
    }));

    const fasting = getFasting();
    if (fasting.config.enabled && fasting.activeSession && cloned.length > 0) {
      const kcal = Math.round(cloned.reduce((sum, it) => sum + (it.calories * it.amount) / 100, 0));
      requestFastInterrupt(kcal, commit);
      return;
    }
    commit();
  };

  // Export JSON (backup version 2, see utils/backupFormat.ts): everything the user saved EXCEPT the pictures.
  // The top-level keys of version 1.2 are unchanged, so the new sections only add to them. Still async (the Promise
  // type is part of the context contract and the Android bridge awaits it).
  const exportDataJson = async (): Promise<string> => {
    const data = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      picturesIncluded: false, // picture files are never part of the backup (only their notes)
      language,
      userProfile,
      customFoods,
      usedFoods,
      dayLogs,
      preBuiltMeals, // meals and recipes
      settings, // includes favourite foods / activities, quick foods, custom buttons, notifications, theme
      periodData,
      customActivities,
      advanced: exportAdvanced(), // goals/limits + body measures (Settings > Advanced)
      fasting: exportFasting(), // intermittent fasting config, active session, history and notes
      layout: exportLayout(), // advanced layout: field order/sizes/removed fields + added meal types
      mealJournal: exportMealJournalForBackup(), // plans, plan names, shopping lists, meal notes/favourites, picture notes
      lastAmounts: exportLastAmounts(), // remembered portions
      customPortions: exportCustomPortions(), // user-saved custom portions per food
      plannerDraft: loadPlannerDraft(), // unfinished meal plan
      preferences: collectPreferences(), // which cards / sections are open, selected ranges and tabs
    };
    return JSON.stringify(data, null, 2);
  };

  // Import JSON: backup version 2 (no pictures) and the older 1.x files (pictures embedded). Files from a newer app are
  // refused. Pictures of an old file are stored FIRST: when the device is full this returns false and nothing else has
  // changed. Details for the user (notes without a picture...) are left in `getLastImportReport()`.
  const importDataJson = async (jsonStr: string): Promise<boolean> => {
    setLastImportReport(null);
    try {
      const data = JSON.parse(jsonStr);
      if (!isSupportedBackup(data)) return false;
      const prepared = await prepareMealJournalImport(data.mealJournal);
      const journal = prepared?.journal;
      const importedDays = data.dayLogs && typeof data.dayLogs === 'object' && !Array.isArray(data.dayLogs)
        ? normalizeDayLogs(data.dayLogs) : null;
      if (importedDays) await replaceAllDays(importedDays);
      if (data.userProfile) {
        updateUserProfile(data.userProfile);
      }
      if (Array.isArray(data.customFoods)) {
        setCustomFoods(data.customFoods);
      }
      if (Array.isArray(data.usedFoods)) {
        const importProtected = new Set<string>([
          ...(Array.isArray(data.settings?.favoriteFoods) ? data.settings.favoriteFoods : settings.favoriteFoods),
          ...(Array.isArray(data.settings?.quickFoods) ? data.settings.quickFoods : settings.quickFoods),
          ...(Array.isArray(data.preBuiltMeals) ? data.preBuiltMeals : preBuiltMeals)
            .flatMap((m: PreBuiltMeal) => (m.ingredients ?? []).map((ing) => ing.foodId)),
          ...(Array.isArray(data.customFoods) ? data.customFoods : customFoods)
            .flatMap((f: FoodItem) => (f.recipeIngredients ?? []).map((ing) => ing.foodId)),
        ]);
        const used = trimUsedFoods(
          data.usedFoods.filter((f: FoodItem) => f && typeof f.id === 'string' && f.id.startsWith('off-')),
          importProtected,
        );
        setUsedFoods(used);
      }
      if (importedDays) {
        // The records are already stored; the effect must not write them a second time.
        persistedDays.current = importedDays;
        setDayLogs(importedDays);
      }
      if (Array.isArray(data.preBuiltMeals)) {
        setPreBuiltMeals(data.preBuiltMeals);
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
        updateSettings({
          ...s,
          hidePeriod,
          hidePeriodCustomized: customized,
          pageOrder: s.pageOrder !== undefined ? normalizePageOrder(s.pageOrder) : DEFAULT_PAGE_ORDER,
        });
        if (hidePeriod) {
          setActiveTabState((tab) => (tab === 'period' ? 'today' : tab));
        }
      }
      if (Array.isArray(data.customActivities)) {
        setCustomActivities(normalizeCustomActivities(data.customActivities));
      }
      importAdvanced(data.advanced);
      importFasting(data.fasting);
      importLayout(data.layout);
      if (journal) importMealJournal(journal);
      // Version 2 sections (absent in older files, which then leave the current values untouched).
      if (data.language === 'en' || data.language === 'it') setLanguage(data.language);
      if (data.lastAmounts !== undefined) importLastAmounts(data.lastAmounts);
      if (data.customPortions !== undefined) importCustomPortions(data.customPortions);
      const draft = parsePlannerDraft(data.plannerDraft);
      if (draft) savePlannerDraft(draft);
      applyPreferences(data.preferences);
      if (data.periodData && typeof data.periodData === 'object') {
        try {
          savePeriodData(normalizePeriodData(data.periodData));
        } catch (e) {
          console.error('Failed to import period data', e);
        }
      }
      setLastImportReport({
        version: backupMajorVersion(data),
        picturesInFile: prepared?.picturesInFile ?? false,
        notesRestored: prepared?.notesRestored ?? 0,
        notesWithoutPicture: prepared?.notesWithoutPicture ?? 0,
      });
      return true;
    } catch (err) {
      console.error('Import error:', err);
      return false;
    }
  };

  // Derived totals for the selected day: recomputed only when the day or the profile changes.
  const derived = useMemo(() => {
    const foods: LoggedFoodItem[] = allMealItems(currentDayLog.meals);
    const macros = calculateMacros(foods);
    const intake = calculateTotalCalories(foods);
    const bmr = calculateBMR(userProfile);
    const activityExpenditure = calculateTotalActivityCalories(currentDayLog.activities);
    const tefResult = calculateTEF(macros.carbsGrams, macros.proteinGrams, macros.fatGrams);
    const totalExpenditure = bmr + activityExpenditure + tefResult.totalTEF;
    const expenditure: EnergyExpenditureSummary = { bmr, activityExpenditure, tef: tefResult.totalTEF, totalExpenditure };
    return { macros, intake, expenditure, net: intake - totalExpenditure };
  }, [currentDayLog, userProfile]);

  // Stable function identities: a slice's value changes only when its data changes.
  // Tab navigation has its own contexts (contexts.ts): the tab (NavContext) and the stable functions (NavActionsContext).
  // Neither is in the UI slice, so a tab change does not re-render the components that use only dialogs or data.
  const navActions = useStableActions({ setActiveTab, returnFromDatabase });
  const navValue = useMemo<NavSlice>(() => ({ activeTab, ...navActions }), [activeTab, navActions]);
  const settingsActions = useStableActions({ setLanguage, updateUserProfile, updateSettings, toggleFavoriteFood, toggleFavoriteActivity });
  const journalActions = useStableActions({
    addCustomFood, deleteCustomFood, rememberFood, logFoodItem, removeLoggedFoodItem, updateLoggedFoodItemAmount,
    logActivity, removeActivity, copyYesterdayMeals, logItemsToSlot, addPreBuiltMeal, updatePreBuiltMeal,
    deletePreBuiltMeal, logPreBuiltMealToSlot, updatePeriodSettings, updatePeriodDay, clearPeriodDay,
    markPeriodStart, markPeriodEnd, addPeriodTag, deletePeriodTag, resetPeriodTags, addCustomActivity,
    removeCustomActivity, logWater, removeWaterEntry, logCustom, removeCustomEntry, waterTotalFor, logWeight,
    logPoop, removePoop, exportDataJson, importDataJson,
  });

  const ui = useMemo<UiSlice>(() => ({
    selectedDate, setSelectedDate, targetMealSlot, setTargetMealSlot,
    isAddFoodOpen, setIsAddFoodOpen, foodLogSeed, setFoodLogSeed, isLogActivityOpen, setIsLogActivityOpen,
    isBarcodeOpen, setIsBarcodeOpen, isProfileOpen, setIsProfileOpen,
    isSettingsOpen, setIsSettingsOpen, isWaterOpen, setIsWaterOpen,
    isPoopOpen, setIsPoopOpen, isWeightOpen, setIsWeightOpen,
    isCustomFoodOpen, setIsCustomFoodOpen, customButtonOpenId, setCustomButtonOpenId,
    isCustomPickerOpen, setIsCustomPickerOpen, isPeriodSheetOpen, setIsPeriodSheetOpen,
    periodSelectedDate, setPeriodSelectedDate,
  }), [
    selectedDate, targetMealSlot, isAddFoodOpen, foodLogSeed, isLogActivityOpen, isBarcodeOpen, isProfileOpen, isSettingsOpen,
    isWaterOpen, isPoopOpen, isWeightOpen, isCustomFoodOpen, customButtonOpenId, isCustomPickerOpen,
    isPeriodSheetOpen, periodSelectedDate,
  ]);

  const settingsValue = useMemo<SettingsSlice>(() => ({
    language, t, userProfile, settings,
    favoriteFoods: settings.favoriteFoods ?? [],
    favoriteActivities: settings.favoriteActivities ?? [],
    ...settingsActions,
  }), [language, t, userProfile, settings, settingsActions]);

  const journal = useMemo<JournalSlice>(() => ({
    allFoods, currentDayLog, preBuiltMeals, periodData, customActivities, allDayLogs: dayLogs,
    currentMacros: derived.macros,
    currentIntakeCalories: derived.intake,
    currentExpenditure: derived.expenditure,
    netBalance: derived.net,
    ...journalActions,
  }), [allFoods, currentDayLog, preBuiltMeals, periodData, customActivities, dayLogs, derived, journalActions]);

  return (
    <NavContext.Provider value={navValue}>
    <NavActionsContext.Provider value={navActions}>
    <UiContext.Provider value={ui}>
      <SettingsContext.Provider value={settingsValue}>
        <JournalDataContext.Provider value={journal}>{children}</JournalDataContext.Provider>
      </SettingsContext.Provider>
    </UiContext.Provider>
    </NavActionsContext.Provider>
    </NavContext.Provider>
  );
};

export { useApp, useJournalData, useNav, useNavActions, useSettings, useShell, useUiState } from './contexts';
