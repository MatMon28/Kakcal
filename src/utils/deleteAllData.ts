import { LocalNotifications } from '@capacitor/local-notifications';
import { isAndroidApp } from './android';

/**
 * Erases everything the app keeps on this device: the whole localStorage of the origin (journal,
 * profile, foods, recipes, settings, period data, remembered portions, UI preferences) and, in the
 * Android app, every pending reminder notification. The caller reloads the page afterwards, so the
 * app restarts empty (and republishes empty figures to the home-screen widgets).
 */
export async function deleteAllData(): Promise<void> {
  if (isAndroidApp()) {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
      }
    } catch {
      /* Reminders are rebuilt from the (now default) settings on the next start. */
    }
  }
  try { localStorage.clear(); } catch { /* storage unavailable: nothing to delete */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }
}
