import { LocalNotifications } from '@capacitor/local-notifications';
import { isAndroidApp } from './android';
import type { TranslationKey } from '../i18n/translations';
import type {
  DailyReminderSetting,
  MealReminderSlotId,
  NotificationSettings,
  WaterReminderSetting,
} from '../types';
import type { TourScreen } from '../components/widgets/widgetContract';

/**
 * Reminder notifications.
 *
 * - `buildNotificationPlan` is pure: Settings → the list of daily alarms (hour + minute + text).
 * - On Android the plan is handed to Capacitor Local Notifications, which keeps repeating daily alarms in the
 *   system AlarmManager (they survive the app being closed and a reboot).
 * - In a browser the same plan runs on timers and uses the Web Notification API, so reminders only arrive while
 *   the page is open. Nothing is ever sent to a server.
 */

export const MEAL_REMINDER_SLOTS: MealReminderSlotId[] = ['breakfast', 'mid_morning', 'lunch', 'midday_snack', 'dinner'];

/** Water reminder choices, in minutes. */
export const WATER_INTERVALS = [30, 45, 60, 90, 120, 180, 240];

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  water: { enabled: false, intervalMinutes: 120, from: '08:00', to: '22:00' },
  customButtons: { enabled: false, time: '19:00' },
  weight: { enabled: false, time: '07:30' },
  logData: { enabled: false, time: '21:00' },
  meals: {
    breakfast: { enabled: false, time: '08:00' },
    mid_morning: { enabled: false, time: '10:30' },
    lunch: { enabled: false, time: '13:00' },
    midday_snack: { enabled: false, time: '16:30' },
    dinner: { enabled: false, time: '20:00' },
  },
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const asTime = (value: unknown, fallback: string) =>
  typeof value === 'string' && TIME_RE.test(value) ? value : fallback;
const asBool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

const normalizeDaily = (raw: unknown, fallback: DailyReminderSetting): DailyReminderSetting => {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return { enabled: asBool(src.enabled, fallback.enabled), time: asTime(src.time, fallback.time) };
};

const normalizeWater = (raw: unknown, fallback: WaterReminderSetting): WaterReminderSetting => {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const interval = Number(src.intervalMinutes);
  return {
    enabled: asBool(src.enabled, fallback.enabled),
    intervalMinutes: Number.isFinite(interval) ? Math.min(720, Math.max(15, Math.round(interval))) : fallback.intervalMinutes,
    from: asTime(src.from, fallback.from),
    to: asTime(src.to, fallback.to),
  };
};

/** Accepts anything (old storage, imported backups) and returns a complete, valid settings object. */
export function normalizeNotificationSettings(raw: unknown): NotificationSettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_NOTIFICATION_SETTINGS;
  const meals = (src.meals && typeof src.meals === 'object' ? src.meals : {}) as Record<string, unknown>;
  return {
    water: normalizeWater(src.water, d.water),
    customButtons: normalizeDaily(src.customButtons, d.customButtons),
    weight: normalizeDaily(src.weight, d.weight),
    logData: normalizeDaily(src.logData, d.logData),
    meals: MEAL_REMINDER_SLOTS.reduce(
      (acc, slot) => ({ ...acc, [slot]: normalizeDaily(meals[slot], d.meals[slot]) }),
      {} as NotificationSettings['meals'],
    ),
  };
}

export const hasAnyReminderEnabled = (n: NotificationSettings) =>
  n.water.enabled ||
  n.customButtons.enabled ||
  n.weight.enabled ||
  n.logData.enabled ||
  MEAL_REMINDER_SLOTS.some((slot) => n.meals[slot].enabled);

// ---------------------------------------------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------------------------------------------

export type NotificationChannelId = 'kc-water' | 'kc-meals' | 'kc-reminders';
export type NotificationCopy = TranslationKey['notifications'];

export interface PlannedNotification {
  id: number;
  channelId: NotificationChannelId;
  title: string;
  body: string;
  hour: number;
  minute: number;
  /** Screen opened when the notification is tapped. */
  screen: TourScreen;
}

const WATER_ID_BASE = 1000;
const MEAL_ID_BASE = 2000;
const CUSTOM_ID = 3001;
const WEIGHT_ID = 3002;
const LOG_ID = 3003;
const MAX_WATER_PER_DAY = 48;

export const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const formatMinutes = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Times of day (minutes after midnight) of the water reminders. A window that ends before it starts crosses midnight. */
export function waterReminderMinutes(water: WaterReminderSetting): number[] {
  const step = Math.max(15, water.intervalMinutes);
  const start = timeToMinutes(water.from);
  let end = timeToMinutes(water.to);
  if (end < start) end += 1440;
  const out: number[] = [];
  for (let at = start; at <= end && out.length < MAX_WATER_PER_DAY; at += step) {
    const day = at % 1440;
    if (!out.includes(day)) out.push(day);
  }
  return out;
}

const cap = (names: string[]) => (names.length > 3 ? `${names.slice(0, 3).join(', ')}…` : names.join(', '));

export function buildNotificationPlan(
  settings: NotificationSettings,
  copy: NotificationCopy,
  mealNames: Record<MealReminderSlotId, string>,
  customButtonNames: string[],
): PlannedNotification[] {
  const plan: PlannedNotification[] = [];
  const at = (time: string) => {
    const minutes = timeToMinutes(time);
    return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
  };

  if (settings.water.enabled) {
    waterReminderMinutes(settings.water).forEach((minutes, i) => {
      plan.push({
        id: WATER_ID_BASE + i,
        channelId: 'kc-water',
        title: copy.messages.waterTitle,
        body: copy.messages.water[i % copy.messages.water.length],
        hour: Math.floor(minutes / 60),
        minute: minutes % 60,
        screen: 'water',
      });
    });
  }

  MEAL_REMINDER_SLOTS.forEach((slot, i) => {
    const meal = settings.meals[slot];
    if (!meal.enabled) return;
    plan.push({
      id: MEAL_ID_BASE + i,
      channelId: 'kc-meals',
      title: copy.messages.mealTitle.replace('{meal}', mealNames[slot]),
      body: copy.messages.mealBody.replace('{meal}', mealNames[slot].toLowerCase()),
      ...at(meal.time),
      screen: 'food',
    });
  });

  if (settings.customButtons.enabled && customButtonNames.length > 0) {
    plan.push({
      id: CUSTOM_ID,
      channelId: 'kc-reminders',
      title: copy.messages.customTitle,
      body: copy.messages.customBody.replace('{names}', cap(customButtonNames)),
      ...at(settings.customButtons.time),
      screen: 'tracker',
    });
  }

  if (settings.weight.enabled) {
    plan.push({
      id: WEIGHT_ID,
      channelId: 'kc-reminders',
      title: copy.messages.weightTitle,
      body: copy.messages.weightBody,
      ...at(settings.weight.time),
      screen: 'weight',
    });
  }

  if (settings.logData.enabled) {
    plan.push({
      id: LOG_ID,
      channelId: 'kc-reminders',
      title: copy.messages.logTitle,
      body: copy.messages.logBody,
      ...at(settings.logData.time),
      screen: 'today',
    });
  }

  return plan;
}

// ---------------------------------------------------------------------------------------------------------------
// Open the Notifications group of Settings from elsewhere (the guided tour)
// ---------------------------------------------------------------------------------------------------------------

export const OPEN_NOTIFICATION_SETTINGS_EVENT = 'kc:open-notification-settings';
let openRequested = false;

/** Asks Settings > Notifications to expand. Works before and after the Settings dialog has mounted. */
export const requestOpenNotificationSettings = () => {
  openRequested = true;
  window.dispatchEvent(new Event(OPEN_NOTIFICATION_SETTINGS_EVENT));
};

export const consumeOpenNotificationRequest = () => {
  const requested = openRequested;
  openRequested = false;
  return requested;
};

// ---------------------------------------------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------------------------------------------

export type NotificationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function getNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (isAndroidApp()) {
      const { display } = await LocalNotifications.checkPermissions();
      return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
    }
  } catch {
    return 'unsupported';
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

/** Asks the user for permission. Call it from a tap (browsers require a user gesture). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (isAndroidApp()) {
      const { display } = await LocalNotifications.requestPermissions();
      return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
    }
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'default') await Notification.requestPermission();
  } catch {
    return 'unsupported';
  }
  return getNotificationPermission();
}

// ---------------------------------------------------------------------------------------------------------------
// Android: native daily alarms
// ---------------------------------------------------------------------------------------------------------------

let nativeQueue: Promise<unknown> = Promise.resolve();

/**
 * Replaces every pending reminder with `plan`. Calls are queued so quick successive edits cannot interleave.
 * The app owns all of its local notifications, so everything pending is cancelled first.
 */
export function syncNativeNotifications(plan: PlannedNotification[], copy: NotificationCopy): Promise<void> {
  const run = async () => {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
    }
    if (plan.length === 0) return;
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
    const channels: { id: NotificationChannelId; name: string; description: string }[] = [
      { id: 'kc-water', name: copy.channels.water, description: copy.channels.waterDesc },
      { id: 'kc-meals', name: copy.channels.meals, description: copy.channels.mealsDesc },
      { id: 'kc-reminders', name: copy.channels.reminders, description: copy.channels.remindersDesc },
    ];
    for (const channel of channels) await LocalNotifications.createChannel({ ...channel, importance: 3, visibility: 1 });
    await LocalNotifications.schedule({
      notifications: plan.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        channelId: n.channelId,
        smallIcon: 'ic_stat_kak',
        largeIcon: 'ic_notification_large',
        iconColor: '#2E7D4F',
        extra: { screen: n.screen },
        // Daily at hour:minute. `second: 0` matters: without it Android keeps the seconds of "now".
        schedule: { on: { hour: n.hour, minute: n.minute, second: 0 }, allowWhileIdle: true },
      })),
    });
  };
  nativeQueue = nativeQueue.then(run, run).catch((error) => console.warn('Notification scheduling failed', error));
  return nativeQueue as Promise<void>;
}

/** Calls `onOpen` with the screen of the notification the user tapped (also after a cold start). */
export function listenForNotificationTaps(onOpen: (screen: string) => void): () => void {
  const handle = LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const screen = (event.notification.extra as { screen?: unknown } | undefined)?.screen;
    if (typeof screen === 'string') onOpen(screen);
  });
  return () => { void handle.then((h) => h.remove()).catch(() => {}); };
}

// ---------------------------------------------------------------------------------------------------------------
// Browser: timers + Web Notification API (only while the page is open)
// ---------------------------------------------------------------------------------------------------------------

const msUntil = (hour: number, minute: number, now = new Date()) => {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
};

const showWebNotification = (title: string, body: string, tag: string, onClick?: () => void) => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, tag });
  n.onclick = () => { window.focus(); onClick?.(); n.close(); };
};

/** Starts the timers for `plan`; returns the function that stops them. */
export function startWebReminders(plan: PlannedNotification[], onOpen: (screen: string) => void): () => void {
  const timers = new Map<number, number>();
  let stopped = false;
  const arm = (n: PlannedNotification) => {
    // A day is shorter than the 32-bit setTimeout limit. The next run is recomputed from the clock each time.
    timers.set(
      n.id,
      window.setTimeout(() => {
        if (stopped) return;
        showWebNotification(n.title, n.body, `kc-${n.id}`, () => onOpen(n.screen));
        arm(n);
      }, msUntil(n.hour, n.minute) + 250),
    );
  };
  plan.forEach(arm);
  return () => {
    stopped = true;
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}

/** Fires a notification right now so the user can check that delivery works. */
export async function sendTestNotification(copy: NotificationCopy): Promise<void> {
  if (isAndroidApp()) {
    if ((await requestNotificationPermission()) !== 'granted') return;
    await LocalNotifications.createChannel({
      id: 'kc-reminders', name: copy.channels.reminders, description: copy.channels.remindersDesc, importance: 3, visibility: 1,
    });
    await LocalNotifications.schedule({
      notifications: [{
        id: 9001,
        title: copy.testTitle,
        body: copy.testBody,
        channelId: 'kc-reminders',
        smallIcon: 'ic_stat_kak',
        largeIcon: 'ic_notification_large',
        iconColor: '#2E7D4F',
        extra: { screen: 'today' },
        schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true },
      }],
    });
    return;
  }
  if ((await requestNotificationPermission()) === 'granted') showWebNotification(copy.testTitle, copy.testBody, 'kc-test');
}
