import { TOUR_STORAGE_ISOLATED } from '../utils/tourStorage';

/**
 * Demo data (sample meals, activity, recipes, favourites, custom buttons, period data).
 *
 * - The real app (Android APK, installed PWA, the website's journal) starts EMPTY: normal use.
 * - The guided tour's embedded phone (`?tour=1`) is populated, but only while its storage is the
 *   in-memory sandbox from `utils/tourStorage.ts`, so demo data can never be saved into a real journal.
 * - `VITE_DEMO_DATA=true npm run build` brings back populated review builds (never for Android).
 */
export const DEMO_MODE = import.meta.env.VITE_ANDROID_RELEASE !== 'true' &&
  (TOUR_STORAGE_ISOLATED || import.meta.env.VITE_DEMO_DATA === 'true');
