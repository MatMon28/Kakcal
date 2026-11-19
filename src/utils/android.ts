import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { Language } from '../types';
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
    /** Show the custom-tracker button on the Small and Large widgets. */
    widgetCustomButton: boolean;
    days: Record<string, NutritionValues>;
  }): Promise<void>;
  exportBackup(data: { json: string }): Promise<void>;
}

export const JournalDevice = registerPlugin<JournalDevicePlugin>('JournalDevice');
