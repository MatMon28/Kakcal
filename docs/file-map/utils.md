# File map: `src/utils/`

> **Scope:** Hooks and helpers: notifications, calculations, formatting, motion, favourites, android bridge.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/utils/tourPreview.ts` | The `?tour=1` flag that shows the Period page inside the tour only. |
| `src/utils/android.ts` | Typed local Capacitor plugin for launcher actions, nutrition and theme-style updates, and native JSON export. |
| `src/utils/notifications.ts` | Notification defaults and `normalizeNotificationSettings`, the pure `buildNotificationPlan` / `waterReminderMinutes`, permission helpers, the Android scheduler (`syncNativeNotifications`, tap listener, test notification via `@capacitor/local-notifications`) and the browser timer fallback. See [Notifications](../notifications.md). |
| `src/utils/useNotificationScheduler.ts` | React hook that keeps the Android alarms / browser timers in step with Settings, language and custom buttons, and opens the right screen when a notification is tapped. |
| `src/utils/calculations.ts`, `waterTarget.ts` | Nutrition, activity, BMR, personal MET-based activity energy (`calculateMetCalories`), thermogenesis, and water-goal calculations. |
| `src/utils/activityLabel.ts` | Display name of a logged activity (Walk, Run, localized database name or custom name) shared by Today and the Day overview. |
| `src/utils/customTrackers.ts` | Quantity entry helpers, legacy migration, and per-day tracker totals. |
| `src/utils/period.ts`, `usePeriodDayDraft.ts` | Cycle calculations, tag catalogs, and drafts shared by the cycle log forms. |
| `src/utils/formatters.ts`, `fuzzy.ts`, `amountMemory.ts`, `usePersistentState.ts`, `cn.ts` | Dates and formatting with cached `Intl` formatters (`numberFormatter`, `dateFormatter`), fuzzy search, remembered portions and the default-weight rule (`getDefaultAmount`: last used, else classic portion, else 100), persisted UI state, and class-name helpers. |
| `src/utils/spring.ts` | Damped-spring physics sampled into CSS `linear()` curves (`SPRING.soft` 271 ms, `SPRING.bounce` 297 ms) and published as `--ease-*` / `--dur-*` variables at startup. |
| `src/utils/motion.ts` | `prefersReducedMotion()` and `slideIn()`: compositor-only Web Animations helpers used for the day-change slide. |
| `src/utils/pwaInstall.ts` | PWA install state: captures `beforeinstallprompt`/`appinstalled`, detects standalone and iOS, exposes `usePwaInstallState()` and `promptInstall()`. Started from `main.tsx`; in-memory only. |
