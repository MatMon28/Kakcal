# File map: `src/utils/`

`photoExport.ts`: local standard ZIP assembly, XMP JPEG descriptions, per-photo text notes and CSV index.

`planSharing.ts`: compact UTF-8 plan-link codec, readable text export, strict import validation and download helper.

`src/utils/pagePosition.ts`: lightweight continuous swipe-position publisher used by PageSwiper and the navigation pill.

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
| `src/utils/layoutGrid.ts` | Pure geometry of the advanced layout's free-placement canvas: `resolveFree` (real place of every field, fields in the way are pushed down, unplaced fields flow at the bottom), `snapTop` (magnetic drop height), original span to columns, and the legacy row resolver used to convert old layouts. See [../advanced-layout.md](../advanced-layout.md). |
| `src/utils/layoutStore.ts` | Advanced layout store (own key `kcalsync_layout`): master switch, per-page field places (`col` / `top` in px; legacy `row` only migrated) / widths / sizes / removed fields, added meal types, editing state, reset, backup. See [../advanced-layout.md](../advanced-layout.md). |
| `src/utils/mealItems.ts`, `mealSlots.ts` | `allMealItems(meals)` (sum of every meal key, built-in or added) and `BUILT_IN_MEAL_SLOTS` (pure); `useMealSlots()` (meal choices in Today order, minus removed ones, plus added meal types, and `label(id)`); `useAutoMealSlot()` (returns `() => MealSlotId`, the meal that fits the time of day among those choices). |
| `src/utils/mealByTime.ts` | Pure time-of-day rule for the preselected meal: `MEAL_TIME_WINDOWS`, `idealMealSlot(date)` and `mealSlotForTime(date, available)` (falls back to the closest available built-in meal). See [journal-pages.md](../journal-pages.md). |
| (Round: left / right) `src/utils/advancedStore.ts`, `src/types/advanced.ts`, `src/i18n/advanced.ts` | `PAIRED_MEASURES`, `BODY_SIDES`, `isPairedMeasure`, `seriesKey`, `seriesKeysOf`, type `BodySide`; `normalizeBodyEntries` moves legacy un-sided values of paired measures to the right side; new `side` strings (EN / IT). |
| `src/utils/scrollFade.ts` | Edge-fade for scrollable fields: `scrollFadeX` / `scrollFadeY` ref callbacks (and `scrollFadeRef(axis, extra)` to keep an own ref) set `data-scroll-fade`, `data-fade-start` and `data-fade-end` from the scroll position, size changes and content changes; the CSS mask lives in `index.css`. Used by `Modal.tsx`, `AddFoodModal.tsx`, `ActivitySearch.tsx`, `SettingsModal.tsx`, `FoodDatabaseView.tsx`, `PreBuiltMealsView.tsx`. |
| `src/utils/pageFields.ts` | Page-change field entrance: `collectPageFields(page)` (advanced-layout items, else the first level with several children) and `animatePageFields(page)` (opacity 0 -> 1 + `translate` 5 px -> 0, 230 ms, 14 ms stagger capped at 9 steps, `fill: backwards`; skipped with `prefers-reduced-motion`). Called by `PageSwiper.tsx` on every tap / Back page change. |
| `src/utils/journalStore.ts` | Versioned meal plans, memories and photos; shared reactive localStorage state, validation, cross-tab updates, food snapshots, and JSON backup helpers. |

android.ts declares the local exportFile bridge. planSharing.ts/saveLocalFile chooses browser downloads or the APK document picker; native links use the existing public homepage, configurable with VITE_PUBLIC_APP_URL.
