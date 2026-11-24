# File map: Page components: prebuilt, database, history, period

(New features round) `src/components/journal/PlannerWizard.tsx`: two-page meal planner editor (`PlanWizard`: start date, day stepper, skipped weekdays, single days, meals; then the scrolling list with one open meal, footer arrows, copy to empty meals) and `MealEntryEditor` (search / favourites / recent / saved meals / amount + macros). `journal/CustomShortcuts.tsx`: Plan meals / Photo diary buttons at the top of Custom (`kc:open-planner`, `kc:open-photo-diary`). `journal/SaveAsMeal.tsx`: *Add to Meals*. `prebuilt/CustomFoodsQuick.tsx`: Recent / Favourites list in Custom > Foods. `history/WaterStatsCard.tsx`: Statistics water card. `PhotoDiary.tsx` (`PhotoBrowser`) has the From / To range; `PreBuiltMealsView.tsx` has the recipe *Standard portion* field. See [new-features-update.md](../new-features-update.md).

`src/components/journal/PlanTransfer.tsx`: serverless short share/copy links, plain-text export/import, import preview and start-date selection; opens only from a received link or a real press on the share icon.

`src/components/journal/JournalPickers.tsx`: `JournalDateField` (calendar icon + date, stack or full-width bar) and `JournalMealSelect` (shows only the chosen meal, pressing lists the others) for the photo diary pop-ups.

Minimal-mode Custom grid: `PreBuiltMealsView.tsx` (`journal-minimal-grid`, `data-section-open`, `data-library-id`, `kc:open-library`), `JournalUI.tsx` (`data-section-open`), `journal.css`; see [custom-photo-share-update.md](../custom-photo-share-update.md).

> **Scope:** Custom (meals) page, Foods database, Statistics, Period pages.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/components/prebuilt/PreBuiltMealsView.tsx` | Custom page (section header now imported from `common/LibrarySectionHeader.tsx`): collapsible sections (pastel in Classic, coherent theme surfaces with contrasting inner cards and readable text in the 6 style themes), transparent section-header/search/+ circles, Ultra Minimal labels and units, meal/recipe cards, search/edit/log actions, and ingredient pickers (search above the existing ingredients, favourites first and starred) that show each ingredient's macros. |
| `src/components/journal/JournalUI.tsx`, `MealPlanner.tsx` | Shared theme-aware journal section (uses `common/LibrarySectionHeader.tsx`), chips and search; week planner with plan search, multi-day / multi-meal editor with *Same for all* / *Different for each* modes, and planned-food or note suggestions shared by Today and Log food. |
| `src/components/journal/MealDiary.tsx` | Yellow Custom meal history (notebook icon, header search + filter, All / Favorites chips), date/weekday/slot/kcal/macro filters, ingredient/name/note search, favourites, meal details and note controls. |
| `src/components/journal/PhotoDiary.tsx` | Opt-in red photo gallery, device/live camera and image picker, compressed local photos, note search, detail/edit/delete, and saved meal/recipe attachments. |
| `src/components/database/FoodDatabaseView.tsx` | Browse, search, filter, favourite and log foods from the complete offline index and local records, with bounded pagination and an explicit catalogue-load retry. |
| `src/components/history/HistoryView.tsx` | Statistics with compact icon/number summaries in Ultra Minimal, bottom-right `/ day` labels, weight plot, theme-coherent custom tracker and poop summaries, and shared day overview. |
| `src/components/period/PeriodView.tsx`, `PeriodCalendar.tsx`, `PeriodTagEditor.tsx` | Cycle overview with a transparent droplet header icon circle, theme-coherent status cards/calendar markers/chips across all style themes, quick-action dock (droplet, pill, heart), non-shifting calendar markers, double-tap day inspection, Daily Log, and tag management. |
| `src/components/period/PeriodDayInfoModal.tsx` | Shared day overview for Today, Period, and Statistics: intake, burned, macros, poop, activity, weight, water, all logged custom trackers, and fixed Open in Today footer. |
| `src/components/period/CycleHistory.tsx`, `CycleNutrition.tsx`, `PeriodSettingsAccordion.tsx` | Cycle history, opt-in nutrition statistics, and cycle/pill settings. |
| `src/components/body/BodyView.tsx`, `BodyChart.tsx`, `BodyMeasureModal.tsx` | Body page (left of Statistics): range chips, a graph card per tracked measure, Upper/Lower/Custom dock buttons and the pop-up to update one body part. |
| (Advanced layout) `HistoryView.tsx`, `BodyView.tsx` | Statistics and Body build `LayoutItem[]` (range, averages, macros, fibre / salt / sugar as three fields, trackers, weight, daily breakdown / range chips, one card per measure) and render the pencil toolbar + `EditableGrid` when the advanced layout is on; off = the original markup. `PreBuiltMealsView.tsx` and the Add food / Barcode / Foods dialogs list meals through `useMealSlots()`. |
| (Round: meal by time of day) `FoodDatabaseView.tsx`, `PreBuiltMealsView.tsx`, `App.tsx` | Foods and Custom pages (and the widget / tour *food* action in `App.tsx`) preselect the meal of the moment instead of `lunch` / `breakfast` / the last used meal; see [journal-pages.md](../journal-pages.md). |
| (Round: left / right) `src/components/body/BodyView.tsx`, `BodyChart.tsx`, `BodyMeasureModal.tsx` | Paired measures (biceps, forearms, thighs, calves) show both sides: a card with two side chips and a two-line chart (`BodyChart` takes `series`), and a Left / Right switch in the update pop-up. |
| (Round: Today-style meals) `PreBuiltMealsView.tsx`, `journal/JournalChrome.tsx`, `journal/MealDiary.tsx`, `MealPlanner.tsx`, `MealSummaryCard.tsx`, `journal.css` | Custom has no heading / tagline / *Create new* menu (`CustomPageHeading` removed with its CSS). Diary previews and planner rows use the Today slot icon and show the note instead of the foods; diary and plan details are `MealSummaryCard` views; the filter Reset is an icon. See [meal-journal.md](../meal-journal.md). |

PhotoDiary: composer date control is first, followed by Today-style meal chips. MealPlanner: unfilled entries remember the last food/note editor type.
