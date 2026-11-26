import { useEffect, useMemo, useRef } from 'react';
import { whenIdle } from './idle';
import { useApp } from '../context/AppContext';
import { isAndroidApp } from './android';
import { useFasting } from './fastingStore';
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
  const fasting = useFasting();
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
      fasting,
    ),
    // customKey stands in for the names array, which is a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.notifications, t, customKey, fasting],
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
      // Then waits for an idle moment: rescheduling is several native calls and never needed for the first frame.
      let cancelIdle = () => {};
      const timer = window.setTimeout(() => {
        cancelIdle = whenIdle(() => { void syncNativeNotifications(planRef.current, copyRef.current); }, 4000);
      }, 400);
      return () => { window.clearTimeout(timer); cancelIdle(); };
    }
    if (!hasAnyReminderEnabled(settings.notifications) || planRef.current.length === 0) return;
    return startWebReminders(planRef.current, open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standalone, planKey]);
}
