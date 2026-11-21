# File map: `src/components/dashboard/`

> **Scope:** Today page widgets: day navigator, energy, macros, meal slots, tracker cards.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/components/dashboard/TodayView.tsx`, `QuickAddBar.tsx` | Today layout, persistent Compact/Normal/Expanded meal arrangement (switch centred), forced Compact layout in Ultra Minimal, back-to-today control, and standard logging shortcuts. |
| `src/components/dashboard/DayNavigator.tsx` (swiping the calendar row = previous/next day, same as the arrows), `EnergyBalanceCards.tsx`, `MacroNutrientsOverview.tsx` | Date navigation, icon-only calendar/active tab in Ultra Minimal, single-tap day overview, and daily energy/nutrient summaries with the same yellow fields for fibre, salt and optional sugar; Ultra minimal uses icons. |
| `src/components/dashboard/MealSlotCard.tsx` | Neutral meal cards with transparent icon and + circles (Circle rule); number-only macros, Compact arrangement, and blank empty-slot summary in Ultra Minimal. |
| `src/components/dashboard/TrackerCard.tsx` | Shared collapsible tracker shell with red/blue/peach/lemon palettes, transparent icon and + circles (Circle rule), readable theme-independent text, equal compact heights and a full-width summary option for water blocks. |
| `src/components/dashboard/ActivityCardSummary.tsx`, `WaterCard.tsx`, `PoopCard.tsx`, `CustomButtonsCard.tsx` | Activity, water, poop and custom-tracker cards with compact Ultra Minimal summaries and the Poop compact label exception. In Ultra minimal the expanded Activity card shows each activity's name (type) again. |
| (Advanced layout) `TodayView.tsx`, `EnergyBalanceCards.tsx`, `MacroNutrientsOverview.tsx`, `MealSlotCard.tsx` | With Settings > Advanced > Advanced layout on, Today is an `EditableGrid` of fields. `EnergyBalanceCards.tsx` exports `IntakeCard` / `BurnedCard`, `MacroNutrientsOverview.tsx` exports `MacroCard` / `NutrientCard` (fibre, salt or sugar as a field of its own) / `NutrientsRow`, and `MealSlotCard.tsx` renders meal types added by the user (soup icon). `TodayView.tsx` gives the meal fields `minCols` / `minHeight` (icon, arrow and + stay visible) and resets a resized meal field to its classic size when its expand arrow is pressed. Off = the original markup. |
| (Item nutrition) `src/components/dashboard/MealSlotCard.tsx` | Each item of an expanded meal shows its own macros, fibre, salt and sugar through `FoodMacroGrid dense`. |

| (Round: calories auto-hide, pencil row) `MealSlotCard.tsx`, `DayNavigator.tsx`, `EnergyBalanceCards.tsx`, `WaterCard.tsx` | `MealSlotCard` hides the calories when too narrow (`useCramped`); `DayNavigator` accepts `trailing` (the pencil); Burned and Water cards show the new goal badges. |
| (Round: meal totals) `src/components/dashboard/MealNutrientTotals.tsx`, `MealSlotCard.tsx` | New `MealNutrientTotals` shows the whole meal's fibre, salt and (with Track sugar) sugar as yellow `bg-nutrient` fields at the top of an expanded meal, above the items (icon + number only in Compact). Values come from `calculateMacros(items)` (`fiberGrams`, `saltGrams`, `sugarGrams`). |
| (Round: meal totals theme fix) `src/components/dashboard/MealNutrientTotals.tsx` | Each field has `data-nutrient="fiber\|salt\|sugar"` (besides `data-meal-total`), the attribute `index.css` uses to apply `--fiber-bg` / `--fiber-text`, `--micro-radius`, card border / shadow and `--clip-sm`; icons are `currentColor`, 15 px. |
