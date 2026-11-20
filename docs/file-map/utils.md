# File map: `src/utils/`

> **Scope:** Hooks and helpers: notifications, calculations, formatting, motion, favourites, android bridge.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/utils/tourPreview.ts` | The `?tour=1` flag that shows the Period page inside the tour only. |
| `src/utils/deleteAllData.ts` | `deleteAllData()`: cancels pending reminders (Android), clears local/session storage. Called by `DeleteAllData.tsx`. |
| `src/utils/android.ts` | Typed local Capacitor plugin for launcher actions, nutrition and theme-style updates, native JSON export, and `syncLaunchBackground` (sends the current `--bg` to the native launch surfaces). |
| `src/utils/notifications.ts` | Notification defaults and `normalizeNotificationSettings`, the pure `buildNotificationPlan` / `waterReminderMinutes`, permission helpers, the Android scheduler (`syncNativeNotifications`, tap listener, test notification via `@capacitor/local-notifications`) and the browser timer fallback. See [Notifications](../notifications.md). |
| `src/utils/useNotificationScheduler.ts` | React hook that keeps the Android alarms / browser timers in step with Settings, language and custom buttons, and opens the right screen when a notification is tapped. |
| `src/utils/calculations.ts`, `waterTarget.ts` | Nutrition, activity, BMR, personal MET-based activity energy (`calculateMetCalories`), thermogenesis, and water-goal calculations. |
| `src/utils/activityLabel.ts` | Display name of a logged activity (Walk, Run, localized database name or custom name) shared by Today and the Day overview. |
| `src/utils/customTrackers.ts` | Quantity entry helpers, legacy migration, and per-day tracker totals. |
| `src/utils/period.ts`, `usePeriodDayDraft.ts` | Cycle calculations, tag catalogs, and drafts shared by the cycle log forms. |
| `src/utils/formatters.ts`, `fuzzy.ts`, `amountMemory.ts`, `usePersistentState.ts`, `cn.ts` | Dates and formatting with cached `Intl` formatters (`numberFormatter`, `dateFormatter`), fuzzy search, remembered portions and the default-weight rule (`getDefaultAmount`: last used, else classic portion, else 100), persisted UI state, and class-name helpers. |
| `src/utils/idle.ts` | `whenIdle(task, timeoutMs)`: `requestIdleCallback` wrapper that returns a cancel function. Used to defer widget publishing, launch-colour sync and notification rescheduling out of the start-up path. See [Startup performance](../startup-performance.md). |
| `src/utils/spring.ts` | Damped-spring physics sampled into CSS `linear()` curves (`SPRING.soft` 271 ms, `SPRING.bounce` 297 ms) and published as `--ease-*` / `--dur-*` variables at startup. |
| `src/utils/motion.ts` | `prefersReducedMotion()` and `slideIn()`: compositor-only Web Animations helpers used for the day-change slide. |
| `src/utils/pwaInstall.ts` | PWA install state: captures `beforeinstallprompt`/`appinstalled`, detects standalone (`isStandaloneApp()`, used by `App.tsx` to skip the tour) and iOS (`isIosDevice()`), exposes `detectInstallTarget()`, `usePwaInstallState()` and `promptInstall()`. Started from `main.tsx`; in-memory only. |
| `src/utils/favorites.ts` | Favourite helpers: `sortFavoritesFirst`, `pinCoherentFavorites` (while typing, only favourites that directly match the text are pinned above the other results), `matchesFirstChar`. Used by Add Food, the Foods page and the meal / recipe ingredient pickers. |
| `src/utils/advancedStore.ts` | Settings > Advanced store (own localStorage keys `kcalsync_advanced`, `kcalsync_body`): goals/limits (`goalState`, `GOAL_MODE_CHOICES`), body measures (`DEFAULT_MEASURES`, tracked/custom measures, entries), backup `exportAdvanced` / `importAdvanced`. |
| `src/utils/layoutStore.ts` | Advanced layout store (own key `kcalsync_layout`): master switch, per-page field order / widths / sizes / removed fields, added meal types, editing state, reset, backup. See [../advanced-layout.md](../advanced-layout.md). |
| `src/utils/mealItems.ts`, `mealSlots.ts` | `allMealItems(meals)` (sum of every meal key, built-in or added) and `BUILT_IN_MEAL_SLOTS` (pure); `useMealSlots()` (meal choices in Today order, minus removed ones, plus added meal types, and `label(id)`). |
