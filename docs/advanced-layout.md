# Advanced layout (personalise Today, Statistics and Body)

> **Scope:** Settings > Advanced > *Advanced layout*: the pencil icon, dragging / resizing / removing fields, added meal types, and the *Restore original layout* button.
>
> **Read when:** you change the editable grid, the pencil toolbar, the layout store, or anything that lists meal types.
>
> **Related:** [advanced-personalisation.md](advanced-personalisation.md), [journal-pages.md](journal-pages.md), [storage-and-privacy.md](storage-and-privacy.md), [file-map/README.md](file-map/README.md)

Off by default. **Settings > Advanced** has an *Advanced layout* switch and, directly under it, a **Restore original layout** button (asks for confirmation).

## What the user sees

- With the switch on, a small **pencil** appears at the top of **Today**, **Statistics** and **Body** (not on other pages). Off = the original pages, byte-for-byte the same markup as before (Today, Statistics and Body keep their original code path).
- Pressing the pencil starts editing that page: a toolbar (*Personalising* - **Add**, **Reset page**, **Done**) appears and every field gets a dashed outline, a small control chip in the middle and resize knobs on its edges. Fields are inert while editing, so nothing is logged by accident.
  - **Move (drag and drop):** drag the dark **move handle** (four-arrow button) in the chip. With a mouse or pen you can also grab the field anywhere. The field follows the pointer, a dashed slot shows where it will land, and the other fields make room live as you move over them; dropping on empty space below / above the last / first field sends it to the end / start. The page scrolls by itself when you hold the field near the top or bottom of the screen. *Esc* cancels. On touch screens only the handle drags, so the page can still be scrolled with a finger.
  - **Resize (pull the sides):** pull the **left / right** side to change the width (snaps to the page's 6 columns, minimum 2 = one third, maximum 6 = full width), the **top / bottom** side to change the height (free, 4 px steps, 44-900 px), or a **corner** for both. A field with a fixed height scrolls inside if its content is longer. Fields that were never resized keep their original (responsive) size. The side knobs are focusable: arrow keys resize them (Shift = bigger height steps).
  - **arrows** = move one place earlier / later (keyboard-friendly alternative to dragging); **reset** (round arrow, only on resized fields) = back to the original size; red **X** = remove the field.
  - While a drag or resize is running nothing is stored; the new order / size is saved when you let go.
- **Add** lists the removed fields (tap to bring one back) and, per page:
  - **Today:** *New meal type* (name field). The meal appears on Today right after the last meal.
  - **Body:** *New body measure* (name + unit), created and tracked like a Profile custom measure.
  - **Statistics:** removed fields only.
- Removed custom meal types can be deleted for good from the same list (trash button, with confirmation).

## Fields per page

| Page | Field ids (original order) |
| --- | --- |
| Today | `intake`, `burned`, `carbs`, `protein`, `fat`, `fiber`, `salt`, `sugar` (three independent fields; `sugar` only while *Track sugar intake* is on), `layoutSwitch` (Compact/Normal/Expanded), `meal:<slot>` for the 6 meals + added meal types, `tracker:activity`, `tracker:water`, `tracker:poop`, `tracker:custom` |
| Statistics | `range`, `intake`, `burned`, `carbs`, `protein`, `fat`, `fiber`, `salt`, `sugar`, `poop`, `tracker:<id>` (one per custom tracker shown in Statistics), `weight`, `daily` |
| Body | `range`, `measure:<id>` (one per tracked measure) |

Original widths are Tailwind spans on a 6-column grid (`LayoutItem.span`): Intake/Burned 3, macros 2, fibre/salt/sugar 2 each (3 each while sugar is not tracked), everything else 6; meal and tracker cards keep the original responsive 1/2/3-column behaviour (`col-span-6 md:col-span-3`, compact `col-span-3 md:col-span-2`). New fields (e.g. a newly tracked measure) appear at the end of the page order until moved.

## Meal types added by the user

- Stored in the layout store (`mealTypes`, ids `custom_<random>`), **not** in the journal. Food logged in one is stored in `DayLog.meals['custom_...']`.
- Every place that used to list the six meals now uses `useMealSlots()` (`utils/mealSlots.ts`): Add food, barcode lookup, Foods database, Custom meals (meal / recipe slot choosers and labels). It returns the visible slots in the order of the Today page, and `label(id)` for any slot.
- Totals everywhere use `allMealItems(day.meals)` (`utils/mealItems.ts`), which sums **every** key of `meals`, so intake, macros, Statistics, Period nutrition, day overview, widgets and "copy yesterday" include added meal types.
- Removing a meal field only hides it (food stays and still counts). Deleting a meal type keeps its logged food in the journal and in totals.
- With the switch **off**, added meal types still show at the end of the original meal grid (they are data, not layout).
- **Restore original layout** resets order, widths, sizes and removed fields on all pages; added meal types and all data are kept. *Reset page* in the toolbar does the same for one page.

## Code

- State: `src/utils/layoutStore.ts` (`kcalsync_layout`; `useLayout`, `useEditingPage`, `moveItem` (one step), `reorderItems` (new order after a drop; removed fields keep their slots), `setItemSize` (`{ cols?, height? }`, a key set to `undefined` = original), `hideItem`, `showItem`, `addMealType`, `removeMealType`, `resetLayout`, `resetPageLayout`, `exportLayout` / `importLayout`). `mergeOrder` keeps the stored order for existing fields and appends new ones. Limits: `MIN_COLS` 2, `MAX_COLS` 6, `MIN_HEIGHT` 44, `MAX_HEIGHT` 900, `HEIGHT_STEP` 4 (`clampCols`, `clampHeight`).
- Stored per field (`LayoutItemPrefs`): `cols` (2-6) and `height` (px). **Migration** in `normalizeLayout`: the first version's `width` (third / half / twothirds / full) becomes `cols` 2 / 3 / 4 / 6, the old `scale` zoom is dropped, and the old `nutrients` field becomes `fiber`, `salt`, `sugar` (in the order and in the removed list; its own size is dropped).
- UI: `components/layout/EditableGrid.tsx` and `LayoutToolbar.tsx` (pencil, Add / Reset / Done). `EditableGrid` keeps one window-level pointer engine (move / resize gesture, 4 px drag threshold, live reorder preview, edge auto-scroll, Esc to cancel) and renders, per field, a drop slot while dragging, the field itself (absolutely positioned and translated while it is dragged) and the `Controls` overlay (move handle, arrows, reset, remove, 8 resize handles). Previews are local state; the store is written once on pointer-up. While editing the grid has `data-no-swipe`, so `PageSwiper` does not change page under a drag.
- Pages build a `LayoutItem[]` and render `<LayoutToolbar/>` + `<EditableGrid/>`: `TodayView.tsx`, `HistoryView.tsx`, `BodyView.tsx`. Today's cards were split into `IntakeCard`, `BurnedCard`, `MacroCard`, `NutrientCard` (one of fibre / salt / sugar; `NutrientsRow` still draws the three together for the original layout) so they can be placed independently. `FoodMacroGrid.tsx` exports `SecondaryNutrientCard`, which `SecondaryNutrientRow`, Today and Statistics share.
- Types `types/layout.ts`; strings `i18n/layout.ts` (`useLayoutText()`); `MealSlotId` is now `BuiltInMealSlotId | \`custom_${string}\`` (`types/index.ts`).
- Backup: the JSON export has a `layout` section; older backups without it leave the current layout untouched.
