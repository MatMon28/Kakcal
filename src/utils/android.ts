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
}

export const JournalDevice = registerPlugin<JournalDevicePlugin>('JournalDevice');

/** Android only: mirror the app background colour natively so the next launch starts on the same colour. */
export function syncLaunchBackground(color: string): void {
  if (!isAndroidApp() || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
  // An older native build without this method just rejects; nothing to do then.
  JournalDevice.setLaunchBackground({ color }).catch(() => undefined);
}

