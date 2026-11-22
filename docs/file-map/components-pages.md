# File map: Page components: prebuilt, database, history, period

> **Scope:** Custom (meals) page, Foods database, Statistics, Period pages.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/components/prebuilt/PreBuiltMealsView.tsx` | Custom page: collapsible sections (pastel in Classic, coherent theme surfaces with contrasting inner cards and readable text in the 6 style themes), transparent section-header/search/+ circles, Ultra Minimal labels and units, meal/recipe cards, search/edit/log actions, and ingredient pickers (search above the existing ingredients, favourites first and starred) that show each ingredient's macros. |
| `src/components/journal/JournalUI.tsx`, `MealPlanner.tsx` | Shared theme-aware journal fields, week planner, multi-day / selected-slot editor, and planned-food or note suggestions shared by Today and Log food. |
| `src/components/journal/MealDiary.tsx` | Yellow Custom meal history, date/weekday/slot/kcal/macro filters, ingredient/name/note search, favourites, meal details and note controls. |
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
