import { useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { isAndroidApp } from './android';
import {
  buildNotificationPlan,
  hasAnyReminderEnabled,
  listenForNotificationTaps,
  MEAL_REMINDER_SLOTS,
  startWebReminders,
  syncNativeNotifications,
} from './notifications';
import { isTourScreen, type TourScreen } from '../components/widgets/widgetContract';

/**
 * Keeps the system (Android) or in-page (browser) reminders in step with Settings > Notifications, the language
 * and the custom-button names. Runs once, in the top-level journal only (not in the tour's embedded copy).
 */
export function useNotificationScheduler(onOpen: (screen: TourScreen) => void) {
  const { settings, t } = useApp();
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const standalone = window.parent === window;

  const customNames = settings.customButtons.map((b) => b.name);
  const customKey = customNames.join('\u0000');
  const plan = useMemo(
    () => buildNotificationPlan(
      settings.notifications,
      t.notifications,
      Object.fromEntries(MEAL_REMINDER_SLOTS.map((slot) => [slot, t.mealSlots[slot]])) as Record<(typeof MEAL_REMINDER_SLOTS)[number], string>,
      customNames,
    ),
    // customKey stands in for the names array, which is a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.notifications, t, customKey],
  );
  const planKey = JSON.stringify(plan);
  const planRef = useRef(plan);
  planRef.current = plan;
  const copyRef = useRef(t.notifications);
  copyRef.current = t.notifications;

  const open = (screen: string) => { if (isTourScreen(screen)) onOpenRef.current(screen); };

  // Taps on a notification open the matching screen.
  useEffect(() => {
    if (!standalone || !isAndroidApp()) return;
    return listenForNotificationTaps(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standalone]);

  useEffect(() => {
    if (!standalone) return;
    if (isAndroidApp()) {
      // Debounced so dragging through time values does not reschedule on every change.
      const timer = window.setTimeout(() => { void syncNativeNotifications(planRef.current, copyRef.current); }, 400);
      return () => window.clearTimeout(timer);
    }
    if (!hasAnyReminderEnabled(settings.notifications) || planRef.current.length === 0) return;
    return startWebReminders(planRef.current, open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standalone, planKey]);
}
