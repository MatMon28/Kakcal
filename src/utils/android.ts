import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { Language, ThemeStyle } from '../types';
import type { NutritionValues } from '../components/widgets/widgetContract';

export const isAndroidApp = () => Capacitor.getPlatform() === 'android';
export type { NutritionValues };

/** Result of every native export. `cancelled` = the user closed the picker (nothing saved, nothing to show). */
export type ExportResult = { cancelled?: boolean; bytes?: number };

/** An export that finished while its call was gone (activity re-created or process killed while the picker was open). */
export interface NativeExportRecord {
  id: string;
  status: 'saved' | 'failed';
  filename?: string;
  bytes?: number;
  /** For `failed`: mode, exception class and message of the real failure, plus whether the empty file was removed. */
  detail?: string;
}

interface JournalDevicePlugin {
  takeWidgetAction(): Promise<{ action?: string }>;
  addListener(event: 'widgetActionAvailable' | 'exportFinished', listener: () => void): Promise<PluginListenerHandle>;
  publishNutrition(data: {
    language: Language;
    /** Basal metabolic rate: the burned figure for a day with no entries. */
    bmr: number;
    /** Home-screen widget look: light, or a darker translucent style. */
    widgetStyle: 'light' | 'dark';
    /** Active theme preset so widget button shapes and colours match the app theme style. */
    themeStyle?: ThemeStyle;
    /** Active single-hue hex when themeStyle is 'mono'. */
    monoHue?: string;
    /** Show the custom-tracker button on the Small and Large widgets. */
    widgetCustomButton: boolean;
    days: Record<string, NutritionValues>;
  }): Promise<void>;
  /**
   * Saves the JSON backup through the system "save as" picker. Resolves `{ cancelled: true }` when the user closes the
   * picker, otherwise `{ bytes }` (what was written). Rejects when nothing could be written (no empty file is left).
   */
  exportBackup(data: { json: string; filename?: string }): Promise<ExportResult>;
  /** Local document-picker export, using the same native staging / picker / verified write as `exportBackup`. */
  exportFile(data: { base64: string; filename: string; kind: 'json' | 'zip' | 'txt' | 'xlsx' | 'pdf' }): Promise<ExportResult>;
  /**
   * Opens the Android share sheet (WhatsApp, email, Drive...) for a file: `text` (the JSON backup) or `base64`.
   * Resolves `{ bytes }` once the chooser is open. Missing (rejects) in APKs built before the share round.
   */
  shareFile(data: { base64?: string; text?: string; filename: string; kind: 'json' | 'zip' | 'txt' | 'xlsx' | 'pdf' }): Promise<ExportResult>;
  /** Exports that finished without a live call (read once, then cleared). Missing in APKs built before round 2. */
  takeLastExport(): Promise<{ exports?: NativeExportRecord[] }>;
  /** Tells the native launch surfaces (system launch screen, window, WebView) the current app background `#rrggbb`. */
  setLaunchBackground(data: { color: string }): Promise<void>;
  /** Health Connect (Android only): check SDK availability and permission state. */
  getHealthConnectStatus(): Promise<HealthConnectStatus>;
  /** Health Connect (Android only): open the system Health Connect permission sheet. */
  requestHealthConnectPermissions(): Promise<{ granted: boolean }>;
  /** Health Connect (Android only): open Health Connect settings or Play Store listing. */
  openHealthConnectSettings(): Promise<void>;
  /** Health Connect (Android only): read workouts and non-workout daily movement in [fromDate, toDate]. */
  readHealthConnectMovement(data: { fromDate: string; toDate: string }): Promise<HealthConnectReadResult>;
}

export type HealthConnectStatusState = 'unsupported' | 'needs_install' | 'available';

export interface HealthConnectStatus {
  status: HealthConnectStatusState;
  granted: boolean;
  grantedPermissions?: string[];
}

export interface HealthConnectWorkout {
  externalId: string;
  date: string;
  timestamp: string;
  exerciseType: number;
  title?: string;
  durationMin: number;
  distanceKm?: number;
  caloriesBurned: number;
  startEpochMs: number;
  endEpochMs: number;
}

export interface HealthConnectDailyMovement {
  externalId: string;
  date: string;
  steps: number;
  distanceKm?: number;
  durationMin?: number;
  caloriesBurned: number;
}

export interface HealthConnectReadResult {
  workouts: HealthConnectWorkout[];
  daily: HealthConnectDailyMovement[];
  error?: string;
}

export const JournalDevice = registerPlugin<JournalDevicePlugin>('JournalDevice');

/** Android only: mirror the app background colour natively so the next launch starts on the same colour. */
export function syncLaunchBackground(color: string): void {
  if (!isAndroidApp() || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
  // An older native build without this method just rejects; nothing to do then.
  JournalDevice.setLaunchBackground({ color }).catch(() => undefined);
}

export async function getHealthConnectStatus(): Promise<HealthConnectStatus> {
  if (!isAndroidApp()) return { status: 'unsupported', granted: false };
  try {
    return await JournalDevice.getHealthConnectStatus();
  } catch {
    return { status: 'unsupported', granted: false };
  }
}

export async function requestHealthConnectPermissions(): Promise<boolean> {
  if (!isAndroidApp()) return false;
  try {
    const res = await JournalDevice.requestHealthConnectPermissions();
    return Boolean(res?.granted);
  } catch {
    return false;
  }
}

export async function openHealthConnectSettings(): Promise<void> {
  if (!isAndroidApp()) return;
  try {
    await JournalDevice.openHealthConnectSettings();
  } catch {
    // Ignore on unsupported / older APKs
  }
}

export async function readHealthConnectMovement(
  fromDate: string,
  toDate: string,
): Promise<HealthConnectReadResult> {
  if (!isAndroidApp()) return { workouts: [], daily: [] };
  try {
    const res = await JournalDevice.readHealthConnectMovement({ fromDate, toDate });
    return {
      workouts: Array.isArray(res?.workouts) ? res.workouts : [],
      daily: Array.isArray(res?.daily) ? res.daily : [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { workouts: [], daily: [], error: message };
  }
}

