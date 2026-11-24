import { createContext, useContext, useMemo, useRef } from 'react';
import type { AppContextType } from './appContextType';

/**
 * The app state is published through THREE contexts instead of one (item 1 of the performance review):
 *
 * - `UiContext`        dialog visibility, active tab, selected dates (changes on every navigation / dialog),
 * - `SettingsContext`  language, strings, profile, settings, favourites (changes only when a setting changes),
 * - `JournalDataContext` foods, meals, day logs, period data, derived totals and every logging action.
 *
 * Every function in every slice has a stable identity (`useStableActions`), so a slice's value changes only when
 * its DATA changes. A component that reads one slice no longer re-renders for the other two.
 * `useApp()` still returns everything (it subscribes to all three) so existing components keep working;
 * hot components should move to the narrow hooks.
 */
export type UiSlice = Pick<AppContextType,
  | 'selectedDate' | 'setSelectedDate' | 'targetMealSlot' | 'setTargetMealSlot'
  | 'isAddFoodOpen' | 'setIsAddFoodOpen' | 'isLogActivityOpen' | 'setIsLogActivityOpen'
  | 'isBarcodeOpen' | 'setIsBarcodeOpen' | 'isProfileOpen' | 'setIsProfileOpen'
  | 'isSettingsOpen' | 'setIsSettingsOpen' | 'isWaterOpen' | 'setIsWaterOpen'
  | 'isPoopOpen' | 'setIsPoopOpen' | 'isWeightOpen' | 'setIsWeightOpen'
  | 'isCustomFoodOpen' | 'setIsCustomFoodOpen' | 'customButtonOpenId' | 'setCustomButtonOpenId'
  | 'isCustomPickerOpen' | 'setIsCustomPickerOpen' | 'isPeriodSheetOpen' | 'setIsPeriodSheetOpen'
  | 'activeTab' | 'setActiveTab' | 'returnFromDatabase' | 'periodSelectedDate' | 'setPeriodSelectedDate'>;

export type SettingsSlice = Pick<AppContextType,
  | 'language' | 'setLanguage' | 't' | 'userProfile' | 'updateUserProfile' | 'settings' | 'updateSettings'
  | 'favoriteFoods' | 'toggleFavoriteFood' | 'favoriteActivities' | 'toggleFavoriteActivity'>;

export type JournalSlice = Omit<AppContextType, keyof UiSlice | keyof SettingsSlice>;

export const UiContext = createContext<UiSlice | undefined>(undefined);
export const SettingsContext = createContext<SettingsSlice | undefined>(undefined);
export const JournalDataContext = createContext<JournalSlice | undefined>(undefined);

function need<T>(value: T | undefined, hook: string): T {
  if (!value) throw new Error(`${hook} must be used within an AppProvider`);
  return value;
}

/** Dialog / navigation state only. */
export const useUiState = () => need(useContext(UiContext), 'useUiState');
/** Language, strings, profile and settings only. */
export const useSettings = () => need(useContext(SettingsContext), 'useSettings');
/** Journal data, derived totals and logging actions only. */
export const useJournalData = () => need(useContext(JournalDataContext), 'useJournalData');

/** Dialog state plus settings (no journal data): for chrome such as the header, dock and main layout. */
export function useShell(): UiSlice & SettingsSlice {
  const ui = useUiState();
  const settings = useSettings();
  return useMemo(() => ({ ...ui, ...settings }), [ui, settings]);
}

/** Everything at once (re-renders on any change). Kept for existing components. */
export function useApp(): AppContextType {
  const ui = useUiState();
  const settings = useSettings();
  const journal = useJournalData();
  return useMemo(() => ({ ...ui, ...settings, ...journal }), [ui, settings, journal]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

/**
 * Returns the same set of functions on every render, each calling the LATEST version of the function passed in.
 * The key set must not change between renders.
 */
export function useStableActions<T extends Record<string, AnyFn>>(actions: T): T {
  const latest = useRef(actions);
  latest.current = actions;
  const keys = useRef(Object.keys(actions));
  return useMemo(() => {
    const stable: Record<string, AnyFn> = {};
    for (const key of keys.current) stable[key] = (...args) => latest.current[key](...args);
    return stable as T;
  }, []);
}
