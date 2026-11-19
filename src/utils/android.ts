import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { Language, ThemeStyle } from '../types';
import type { NutritionValues } from '../components/widgets/widgetContract';

export const isAndroidApp = () => Capacitor.getPlatform() === 'android';
export type { NutritionValues };

interface JournalDevicePlugin {
  takeWidgetAction(): Promise<{ action?: string }>;
  addListener(event: 'widgetActionAvailable', listener: () => void): Promise<PluginListenerHandle>;
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
  exportBackup(data: { json: string }): Promise<void>;
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
