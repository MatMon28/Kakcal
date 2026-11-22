# Reminder notifications

> **Scope:** Settings > Notifications: reminder types, defaults, alarm IDs, Android vs browser scheduling, permissions, tour step.
>
> **Read when:** you touch `src/utils/notifications.ts`, `useNotificationScheduler.ts`, `NotificationSettings.tsx` or notification strings.
>
> **Related:** file-map/utils.md, file-map/components-modals.md, ../android/BUILD_APK.md

Settings > **Notifications** switches on local reminders. Everything is opt-in (all off by default), nothing leaves the device, and there is no push server. Nothing is stored beyond `settings.notifications` in `kcalsync_settings` (so it is part of the JSON backup).

| Reminder | What you choose | Tapping it opens |
| --- | --- | --- |
| **Water** | How often: every 30, 45 min, 1 h, 1 h 30, 2 h, 3 h or 4 h, between a *From* and an *Until* time (a window that ends before it starts crosses midnight; at most 48 a day). The three water messages rotate. | Add Water |
| **Meals** | One switch **and one time per meal**: Breakfast 08:00, Morning snack 10:30, Lunch 13:00, Afternoon snack 16:30, Dinner 20:00 (defaults; Extra has no fixed time). | Add Food |
| **Custom buttons** | One time (19:00). The text lists your custom buttons (first three, then …). Needs at least one custom button; skipped if you delete them all. | The custom-button dialog/picker |
| **Weight** | One time (07:30). | Log Weight |
| **Log your data** | One time (21:00): the general "don't forget to log your data" reminder. | Today |

How it works:

- `buildNotificationPlan()` (`src/utils/notifications.ts`) is a pure function: settings + language + meal and custom-button names → a list of daily alarms (`id`, hour, minute, title, body, target screen). IDs are stable: water `1000+`, meals `2000-2004`, custom `3001`, weight `3002`, log `3003`.
- **Android:** `@capacitor/local-notifications` (v8) schedules each alarm as a repeating *daily* system alarm (`schedule.on = {hour, minute, second: 0}`, `allowWhileIdle`), so reminders arrive with the app closed and are restored after a reboot by the plugin's boot receiver. Three notification channels (*Water reminders*, *Meal reminders*, *Other reminders*, named in the app language) let the user tune sound per type in Android's own settings. The notification icon is `drawable/ic_stat_kak.xml`: the app's **real logo** (the solid poop with the K carved out, same coordinates as `kakcalculator-icon.svg`) as a one-colour glyph on a **transparent background** (no disc). The accent tint (`iconColor`, the circle behind the glyph) is Koink's ink `#0B0F1E`. Android only uses the alpha channel, so the system paints it in its own circle on the left of the notification and in the status bar. The K is a real hole in the poop, so it stays readable at 20 dp. No `largeIcon` is set, so nothing is drawn on the right. Re-generate it with `npm i --no-save paper-jsdom sharp && node scripts/generate-notification-icon.mjs`. The name is protected from resource shrinking in `res/raw/keep.xml`. Android 13+ asks for the `POST_NOTIFICATIONS` permission the first time a reminder is switched on. On Android 12+ without the "alarms & reminders" special access the plugin falls back to inexact alarms, so a reminder may be delayed by a few minutes. `AndroidManifest.xml` repeats `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM` and `RECEIVE_BOOT_COMPLETED` so all requirements are visible in one place (the widgets themselves use no exact alarm).
- **Browser:** the same plan runs on timers and the Web Notification API (each notification carries `icons/icon-192.png` as its icon and `icons/badge-96.png`, the white glyph, as its badge), so reminders only arrive **while the page is open** (the tour's embedded journal never schedules, only the top-level page does). A note in Settings says so.
- `useNotificationScheduler()` (`src/utils/useNotificationScheduler.ts`, used by `WidgetAppBridge` in `src/App.tsx`) re-syncs the system alarms 400 ms after any change to the settings, the language or the custom-button names, and routes a tap on a notification to the matching screen through the same `showScreen` bridge as the widgets.
- Settings shows a banner when notifications are blocked or unsupported, an *Allow notifications* button when permission is still pending, and **Send a test notification**.
- Old backups and stored settings without `notifications` load with the defaults (`normalizeNotificationSettings`).
- The guided tour has a **Notifications** step (after Settings, before the widgets): five tappable previews built from the app's real notification strings, beside the live journal with Settings > Notifications expanded.
