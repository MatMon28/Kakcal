# File map: Page components: prebuilt, database, history, period

> **Scope:** Custom (meals) page, Foods database, Statistics, Period pages.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/components/prebuilt/PreBuiltMealsView.tsx` | Custom page: collapsible sections (pastel in Classic, coherent theme surfaces with contrasting inner cards and readable text in the 6 style themes), transparent section-header/search/+ circles, Ultra Minimal labels and units, meal/recipe cards, search/edit/log actions, and ingredient pickers that show each ingredient's macros. |
| `src/components/database/FoodDatabaseView.tsx` | Browse, search, filter, favourite and log foods from the complete offline index and local records, with bounded pagination and an explicit catalogue-load retry. |
| `src/components/history/HistoryView.tsx` | Statistics with compact icon/number summaries in Ultra Minimal, bottom-right `/ day` labels, weight plot, theme-coherent custom tracker and poop summaries, and shared day overview. |
| `src/components/period/PeriodView.tsx`, `PeriodCalendar.tsx`, `PeriodTagEditor.tsx` | Cycle overview with a transparent droplet header icon circle, theme-coherent status cards/calendar markers/chips across all style themes, quick-action dock (droplet, pill, heart), non-shifting calendar markers, double-tap day inspection, Daily Log, and tag management. |
| `src/components/period/PeriodDayInfoModal.tsx` | Shared day overview for Today, Period, and Statistics: intake, burned, macros, poop, activity, weight, water, all logged custom trackers, and fixed Open in Today footer. |
| `src/components/period/CycleHistory.tsx`, `CycleNutrition.tsx`, `PeriodSettingsAccordion.tsx` | Cycle history, opt-in nutrition statistics, and cycle/pill settings. |
