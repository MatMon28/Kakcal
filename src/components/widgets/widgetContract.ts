import type { DayLog, Language, UserProfile } from '../../types';
import {
  calculateBMR,
  calculateMacros,
  calculateTEF,
  calculateTotalActivityCalories,
  calculateTotalCalories,
} from '../../utils/calculations';

// One serialisable bridge shared by the guided tour, the widget gallery and the
// native widgets. The same action IDs and nutrition fields feed every presentation.
export const WIDGET_CHANNEL = 'kakcalculator.widgets.v1';
// 'custom' is the optional sixth button of the Small and Large widgets (Settings > Widgets).
export const WIDGET_ACTIONS = ['food', 'movement', 'water', 'poop', 'weight', 'custom'] as const;
export type WidgetAction = (typeof WIDGET_ACTIONS)[number];
/** The five shortcuts every widget always has. */
export const BASE_WIDGET_ACTIONS = WIDGET_ACTIONS.filter((action) => action !== 'custom');

export interface WidgetAppearance {
  style: 'light' | 'dark';
  customButton: boolean;
}

/** The widget look chosen in Settings; the browser tour shares the journal's localStorage. */
export function readWidgetAppearance(): WidgetAppearance {
  try {
    const saved = JSON.parse(localStorage.getItem('kcalsync_settings') || '{}');
    const buttons = Array.isArray(saved.customButtons) ? saved.customButtons.length : 0;
    return {
      style: saved.widgetStyle === 'dark' ? 'dark' : 'light',
      customButton: Boolean(saved.widgetCustomButton) && buttons > 0,
    };
  } catch {
    return { style: 'light', customButton: false };
  }
}

/** Pages and dialogs the guided tour can show inside the embedded journal. */
export const TOUR_SCREENS = [
  'today', 'meals', 'food', 'activity', 'water', 'poop', 'weight', 'overview',
  'custom', 'period', 'statistics', 'profile', 'settings', 'tracker',
] as const;
export type TourScreen = (typeof TOUR_SCREENS)[number];

export const NUTRITION_KEYS = [
  'calories', 'burnedCalories', 'proteinGrams', 'carbsGrams', 'fatGrams',
  'proteinPercent', 'carbsPercent', 'fatPercent',
] as const;
export type NutritionValues = Record<(typeof NUTRITION_KEYS)[number], number>;

export interface WidgetSnapshot extends NutritionValues {
  date: string;
  language: Language;
}

/** The numbers the native widget cache stores for one day. */
export function nutritionValues(snapshot: WidgetSnapshot): NutritionValues {
  return {
    calories: snapshot.calories,
    burnedCalories: snapshot.burnedCalories,
    proteinGrams: snapshot.proteinGrams,
    carbsGrams: snapshot.carbsGrams,
    fatGrams: snapshot.fatGrams,
    proteinPercent: snapshot.proteinPercent,
    carbsPercent: snapshot.carbsPercent,
    fatPercent: snapshot.fatPercent,
  };
}

export type WidgetRequest =
  | { channel: typeof WIDGET_CHANNEL; type: 'request-snapshot' }
  | { channel: typeof WIDGET_CHANNEL; type: 'open-action'; action: WidgetAction }
  | { channel: typeof WIDGET_CHANNEL; type: 'show-screen'; screen: TourScreen };

export interface WidgetSnapshotMessage {
  channel: typeof WIDGET_CHANNEL;
  type: 'snapshot';
  snapshot: WidgetSnapshot;
}

/** Sent once each time the journal starts, so the parent can send its first command. */
export interface WidgetReadyMessage {
  channel: typeof WIDGET_CHANNEL;
  type: 'ready';
}

/**
 * Today's figures, computed exactly as the Today page does: intake from the logged
 * foods; burned from BMR, logged activity and food thermogenesis.
 */
export function makeWidgetSnapshot(
  date: string,
  language: Language,
  day: DayLog | undefined,
  profile: UserProfile,
): WidgetSnapshot {
  const foods = day ? Object.values(day.meals).flat() : [];
  const macros = calculateMacros(foods);
  const tef = calculateTEF(macros.carbsGrams, macros.proteinGrams, macros.fatGrams).totalTEF;
  const activity = calculateTotalActivityCalories(day?.activities ?? []);
  return {
    date,
    language,
    calories: calculateTotalCalories(foods),
    burnedCalories: Math.round(calculateBMR(profile) + activity + tef),
    proteinGrams: macros.proteinGrams,
    carbsGrams: macros.carbsGrams,
    fatGrams: macros.fatGrams,
    proteinPercent: macros.proteinPercent,
    carbsPercent: macros.carbsPercent,
    fatPercent: macros.fatPercent,
  };
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isWidgetAction = (value: unknown): value is WidgetAction =>
  WIDGET_ACTIONS.some((action) => action === value);

export const isTourScreen = (value: unknown): value is TourScreen =>
  TOUR_SCREENS.some((screen) => screen === value);

export function isWidgetRequest(value: unknown): value is WidgetRequest {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  if (message.channel !== WIDGET_CHANNEL) return false;
  if (message.type === 'request-snapshot') return true;
  if (message.type === 'open-action') return isWidgetAction(message.action);
  if (message.type === 'show-screen') return isTourScreen(message.screen);
  return false;
}

export function isWidgetReadyMessage(value: unknown): value is WidgetReadyMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return message.channel === WIDGET_CHANNEL && message.type === 'ready';
}

export function isWidgetSnapshotMessage(value: unknown): value is WidgetSnapshotMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  if (message.channel !== WIDGET_CHANNEL || message.type !== 'snapshot' ||
      !message.snapshot || typeof message.snapshot !== 'object') return false;
  const snapshot = message.snapshot as Record<string, unknown>;
  return typeof snapshot.date === 'string' &&
    (snapshot.language === 'en' || snapshot.language === 'it') &&
    NUTRITION_KEYS.every((key) => isFiniteNumber(snapshot[key]));
}
