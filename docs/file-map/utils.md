# File map: `src/utils/`


(Ingredient quantities round) `planMealName.ts` (new): `plannedMealName` (the *Meal name* the user gave to a planned meal, `''` when `MealPlan.title` is only the automatic summary) and `automaticPlanTitles`. See [ingredient-quantity-update.md](../ingredient-quantity-update.md#planner).

(Backup round) `backupFormat.ts` (new): backup version constants (`BACKUP_VERSION` 2.0, `isSupportedBackup`), picture notes without images (`journalWithoutPictures`, `readPhotoNotes`, `mergePictureNotes`), interface preferences (`collectPreferences`, `applyPreferences`, `isPreferenceKey`) and the import report (`getLastImportReport`); `amountMemory.ts`: `exportLastAmounts` / `importLastAmounts`; `plannerDraft.ts`: `parsePlannerDraft` (validation shared with the backup); `journalStore.ts`: `exportMealJournalForBackup` has no pictures, `prepareMealJournalImport` handles old and new files. See [../backup-update.md](../backup-update.md).

(Plans round) `planGroups.ts` (new): `planGroupViews`, `splitPlans`, `isCurrentPlan`, `copyName`, `UNGROUPED_PLAN_ID`. `shoppingList.ts` (new): `buildShoppingItems` (totals, recipes broken into ingredients), `createShoppingList`, `syncShoppingList`, `removeShoppingItem`, `addCustomShoppingItem`, `toggleShoppingItem`, `isShoppingListOutdated`, `formatQuantity`. `journalStore.ts`: `savePlanGroup`, `removePlanGroup`, `saveShoppingList`, `removeShoppingList`, normalising of `planGroups` / `shoppingLists`. `plannerDraft.ts`: `PlanEntry.planId / loggedAt / read`, `PlannerDraft.name`. See [plans-shopping-update.md](../plans-shopping-update.md).

(Planner / dock round) `plannerDraft.ts`: the unfinished planner draft (`PlanEntry`, `PlannerDraft`, `loadPlannerDraft` with validation, `savePlannerDraft`, `clearPlannerDraft`, `draftPlannedCount`), stored under `kcak_planner_draft`.
(New features round) `excelExport.ts`: local `.xlsx` workbook builder (`buildWorkbook`, `buildExcelExport`) on top of the `zip` of `photoExport.ts`; `advancedStore.ts`: `balance` target (`updateBalance`), protein `perKg` (`goalValue`, `goalState(..., weightKg)`); `amountMemory.ts`: a recipe's standard portion wins in `getDefaultAmount`; `planSharing.ts` / `android.ts`: `xlsx` export kind.

`photoExport.ts`: local standard ZIP assembly, XMP JPEG descriptions, per-photo text notes and CSV index.

`planSharing.ts`: short (format 2, deflate-compressed, `#p=`) plan-link codec with legacy `#meal-plan=` import, readable text export, strict import validation and download helper; `createPlanLink` / `parsePlanInput` are async.

`incomingPlan.ts`: reads a received plan link once at start-up, removes it from the address bar and keeps it in memory (`startedWithPlanLink`, `peekIncomingPlan`, `clearIncomingPlan`), so the share pop-up never reopens by itself.

`journalNavigation.ts`: `revealMealSlot` / `revealLibraryItem` expand a Today meal or a Custom meal/recipe card (used by the photo viewer's Go to the meal).

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
| `src/utils/android.ts` | Typed local Capacitor plugin for launcher actions, nutrition and theme-style updates, native export (`exportBackup` / `exportFile` resolve `{ cancelled?, bytes? }`, `takeLastExport`, types `ExportResult` / `NativeExportRecord`), and `syncLaunchBackground` (sends the current `--bg` to the native launch surfaces). |
| `src/utils/notifications.ts` | Notification defaults and `normalizeNotificationSettings`, the pure `buildNotificationPlan` / `waterReminderMinutes`, permission helpers, the Android scheduler (`syncNativeNotifications`, tap listener, reminder scheduling via `@capacitor/local-notifications` (the test notification was removed)) and the browser timer fallback. See [Notifications](../notifications.md). |
| `src/utils/useNotificationScheduler.ts` | React hook that keeps the Android alarms / browser timers in step with Settings, language and custom buttons, and opens the right screen when a notification is tapped. |
| `src/utils/calculations.ts`, `waterTarget.ts` | Nutrition, activity, BMR, personal MET-based activity energy (`calculateMetCalories`), thermogenesis, and water-goal calculations. |
| `src/utils/activityLabel.ts` | Display name of a logged activity (Walk, Run, localized database name or custom name) shared by Today and the Day overview. |
| `src/utils/customTrackers.ts` | Quantity entry helpers, legacy migration, and per-day tracker totals. |
| `src/utils/period.ts`, `usePeriodDayDraft.ts` | Cycle calculations, tag catalogs, and drafts shared by the cycle log forms. |
| `src/utils/formatters.ts`, `amountMemory.ts`, `customPortions.ts`, `foodPortions.ts`, `usePersistentState.ts`, `cn.ts` | Dates and formatting with cached `Intl` formatters (`numberFormatter`, `dateFormatter`), remembered portions and the default-weight rule (`getDefaultAmount`: recipe portion, last used, explicit portion, primary standard portion, else 100), persistent per-food custom portions (`kcalsync_custom_portions`), pure portion math/decimal parsing (`foodPortions.ts`), persisted UI state, and class-name helpers. |
| `src/utils/fuzzy.ts` | Typo-tolerant matching and scoring (`fuzzyScore`, `fuzzyMatch`) plus the tokenized variants `tokenize`, `fuzzyScoreTokens`, `fuzzyMatchTokens`; allocation-free, early-exit edit distance. Same results as before the search round. |
| `src/utils/foodSearchIndex.ts` | `searchFoods(list, query, { combined })` and `searchMeals(list, query)`: names tokenized once (WeakMap), match first / score only matches, per-list result cache. Returns shared sorted arrays (do not modify). Used by Add food, planner, Custom pickers, Settings picker. |
| `src/utils/catalogueSearch.ts`, `useCatalogueSearch.ts`, `src/workers/offCatalogSearch.worker.ts` | Catalogue queries off the main thread: client with cache, in-flight de-duplication and main-thread fallback (`searchCatalogue`, `peekCatalogueSearch`, `findCatalogueBarcode`, `findCatalogueBarcodes`, `browseCatalogue`); the hook `useCatalogueSearch(query, enabled, limit, lang)` -> `{ foods, pending }` (2-character minimum, 90 ms debounce); the worker that downloads, parses and queries the 550k KOFF v2 `off-foods.bin`. See [../search-and-animation-performance.md](../search-and-animation-performance.md). |
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
| `src/utils/pageTransition.ts` | Page-change transition (replaces the deleted `pageFields.ts`): `canAnimatePages()` (feature + `prefers-reduced-motion`), `playPageChange(incoming, outgoing, side)` (outgoing 110 ms fade + 8 px drift, incoming 240 ms fade + 14 px slide after 60 ms, opacity / transform only) and the timing constants `PAGE_OUT_MS`, `PAGE_IN_MS`, `PAGE_IN_DELAY_MS`. Called by `PageSwiper.tsx` on every tap / Back page change. |
| `src/utils/journalStore.ts` | Versioned meal plans, memories and photos; shared reactive localStorage state, validation, cross-tab updates, food snapshots, and JSON backup helpers (backup without pictures, import of old and new files). |
| `src/utils/backupFormat.ts` | Format of the JSON backup version 2: version check, picture notes (no images), interface preferences, import report. Pure helpers, covered by `tests/backup.test.tsx` (and `tests/backup-ui.test.tsx` for the Settings UI). |

android.ts declares the local exportBackup / exportFile / takeLastExport bridge (answers: `{ cancelled?, bytes? }`). `nativeExport.ts`: `takeNativeExports` / `onNativeExportFinished` (exports that finished while the call was gone; never reject). planSharing.ts/`saveLocalFile(Blob | string, name)` is the one save helper of Export JSON, Excel and pictures: browser download or the APK document picker, always `{ cancelled?, bytes? }` (throws when a success has no byte count), plus `formatBytes` / `withSize`; native links use the existing public homepage, configurable with VITE_PUBLIC_APP_URL.

## Added in the performance, storage and tooling round

| File | Role |
| --- | --- |
| `src/storage/idb.ts`, `dayStore.ts`, `photoStore.ts`, `writeQueue.ts`, `usePersist.ts`, `status.ts`, `boot.ts` | The storage layer: IndexedDB wrapper, per-record day store with the schema migration, photo blobs / backups / storage info, coalescing write queue, effect-based localStorage persistence, failure status store, start-up loader awaited by `main.tsx`. See [storage-and-privacy.md](../storage-and-privacy.md). |
| `src/utils/useToday.ts`, `widgetDates.ts` | One-timer midnight rollover; the dates the widgets need. |

(Round: page-change follow-up) `idle.ts`: new `afterPaint(task)` (rAF + macrotask, returns a cancel function; a passive effect is not after paint for a tap). `pageTransition.ts`: `playPageChange` returns `{ incoming, outgoing }` (both animations; `PageChangeAnimations`). `journalStore.ts`: `usePhotosForLinked(linkedId)` / `usePhotosForSlot(date, slot)` (O(1) index per `photos` array, `WeakMap`). `planGroups.ts`: `planGroupViews` in one pass (`Map`), ISO-date compare. `mealSlots.ts` (`useMealSlots`) uses `useSettings()`; the same for `src/i18n/{journal,advanced,layout}.ts`.

## Settings restructure round

| File | Role |
| --- | --- |
| `src/utils/deleteData.ts` | `deleteCategory(category, allDayLogs)`: removes one kind of record (plans, saved meals, recipes, photos, meal notes, logged food, activities, water, weight, poop, custom tracker entries, body measurements, period records). See [settings-update.md](../settings-update.md). |
| `src/utils/pageVisibility.ts` | `isPageHiddenBySettings(tab, settings)`, `DEFAULT_PAGE_ORDER`, `normalizePageOrder(raw)`: page visibility & custom page order; used by `App.tsx`, `AppContext.tsx`, `Tabs.tsx`, `PagesSettings.tsx`. |
| `src/utils/preloadableLazy.tsx`, `src/utils/lazyScreens.ts` | Synchronous-on-ready lazy loader (`preloadableLazy`), staggered visible-tab idle preloading (`scheduleLazyScreenPreload`), and pointerdown/swipe preloading (`preloadTabScreen`). |
| `src/utils/dayMetricsCache.ts` | `getDayBaseMetrics(log)`: `WeakMap<DayLog, DayBaseMetrics>` caching meal/macro/activity/TEF sums across Statistics and CycleNutrition. |
| `src/utils/notifications.ts` | `sendTestNotification` removed (Send a test notification button is gone). |

## Food workflows

| File | Role |
| --- | --- |
| `undoRemoval.ts` | Session-only 2-second (`UNDO_REMOVAL_MS`) timed inverse operations, immediate `dismissRemoval`, per-draft scopes and cancellable bulk deletion. |
| `recipeImport.ts` | Preserves source order, candidates and unmatched/optional lines for ingredient review. |
| `journalStore.ts`, `advancedStore.ts`, `layoutStore.ts` | Targeted restore of removed records, measures and layout fields. |
