# Advanced layout (personalise Today, Statistics and Body)

> **Scope:** Settings > Advanced > *Advanced layout*: the pencil icon, moving / resizing / removing fields, added meal types, and the *Restore original layout* button.
>
> **Read when:** you change the editable grid, the pencil toolbar, the layout store, or anything that lists meal types.
>
> **Related:** [advanced-personalisation.md](advanced-personalisation.md), [journal-pages.md](journal-pages.md), [storage-and-privacy.md](storage-and-privacy.md), [file-map/README.md](file-map/README.md)

Off by default. **Settings > Advanced** has an *Advanced layout* switch and, directly under it, a **Restore original layout** button (asks for confirmation).

## What the user sees

- With the switch on, a small **pencil** appears at the top of **Today**, **Statistics** and **Body** (not on other pages). Off = the original pages, byte-for-byte the same markup as before (Today, Statistics and Body keep their original code path).
- Pressing the pencil starts editing that page: a toolbar (*Personalising* - **Add**, **Reset page**, **Done**) appears and every field shows a small control box:
  - arrows = move earlier / later (the page is a flow grid, so "later" = right, then the next row);
  - **width** button cycles *Auto (original) -> 1/3 -> 1/2 -> 2/3 -> full*;
  - **-** / **+** = size (5 steps, CSS `zoom` 0.75 / 0.88 / 1 / 1.15 / 1.3);
  - red **X** = remove the field.
  Fields are inert while editing, so nothing is logged by accident.
- **Add** lists the removed fields (tap to bring one back) and, per page:
  - **Today:** *New meal type* (name field). The meal appears on Today right after the last meal.
  - **Body:** *New body measure* (name + unit), created and tracked like a Profile custom measure.
  - **Statistics:** removed fields only.
- Removed custom meal types can be deleted for good from the same list (trash button, with confirmation).

## Fields per page

| Page | Field ids (original order) |
| --- | --- |
| Today | `intake`, `burned`, `carbs`, `protein`, `fat`, `nutrients` (fibre/salt/sugar row), `layoutSwitch` (Compact/Normal/Expanded), `meal:<slot>` for the 6 meals + added meal types, `tracker:activity`, `tracker:water`, `tracker:poop`, `tracker:custom` |
| Statistics | `range`, `intake`, `burned`, `carbs`, `protein`, `fat`, `nutrients`, `poop`, `tracker:<id>` (one per custom tracker shown in Statistics), `weight`, `daily` |
| Body | `range`, `measure:<id>` (one per tracked measure) |

Original widths are Tailwind spans on a 6-column grid (`LayoutItem.span`): Intake/Burned 3, macros 2, everything else 6; meal and tracker cards keep the original responsive 1/2/3-column behaviour (`col-span-6 md:col-span-3`, compact `col-span-3 md:col-span-2`). New fields (e.g. a newly tracked measure) appear at the end of the page order until moved.

## Meal types added by the user

- Stored in the layout store (`mealTypes`, ids `custom_<random>`), **not** in the journal. Food logged in one is stored in `DayLog.meals['custom_...']`.
- Every place that used to list the six meals now uses `useMealSlots()` (`utils/mealSlots.ts`): Add food, barcode lookup, Foods database, Custom meals (meal / recipe slot choosers and labels). It returns the visible slots in the order of the Today page, and `label(id)` for any slot.
- Totals everywhere use `allMealItems(day.meals)` (`utils/mealItems.ts`), which sums **every** key of `meals`, so intake, macros, Statistics, Period nutrition, day overview, widgets and "copy yesterday" include added meal types.
- Removing a meal field only hides it (food stays and still counts). Deleting a meal type keeps its logged food in the journal and in totals.
- With the switch **off**, added meal types still show at the end of the original meal grid (they are data, not layout).
- **Restore original layout** resets order, widths, sizes and removed fields on all pages; added meal types and all data are kept. *Reset page* in the toolbar does the same for one page.

## Code

- State: `src/utils/layoutStore.ts` (`kcalsync_layout`; `useLayout`, `useEditingPage`, `moveItem`, `setItemWidth`, `setItemScale`, `hideItem`, `showItem`, `addMealType`, `removeMealType`, `resetLayout`, `resetPageLayout`, `exportLayout` / `importLayout`). `mergeOrder` keeps the stored order for existing fields and appends new ones.
- UI: `components/layout/EditableGrid.tsx` (grid + per-field controls, `LayoutItem` contract) and `LayoutToolbar.tsx` (pencil, Add / Reset / Done).
- Pages build a `LayoutItem[]` and render `<LayoutToolbar/>` + `<EditableGrid/>`: `TodayView.tsx`, `HistoryView.tsx`, `BodyView.tsx`. Today's cards were split into `IntakeCard`, `BurnedCard`, `MacroCard`, `NutrientsRow` so they can be placed independently.
- Types `types/layout.ts`; strings `i18n/layout.ts` (`useLayoutText()`); `MealSlotId` is now `BuiltInMealSlotId | \`custom_${string}\`` (`types/index.ts`).
- Backup: the JSON export has a `layout` section; older backups without it leave the current layout untouched.
