# Advanced layout (personalise Today, Statistics and Body)

> **Scope:** Settings > Advanced > *Advanced layout*: the pencil icon, dragging / resizing / removing fields, added meal types, and the *Restore original layout* button.
>
> **Read when:** you change the editable grid, the pencil toolbar, the layout store, or anything that lists meal types.
>
> **Related:** [advanced-personalisation.md](advanced-personalisation.md), [journal-pages.md](journal-pages.md), [storage-and-privacy.md](storage-and-privacy.md), [file-map/README.md](file-map/README.md)

Off by default. **Settings > Advanced** has an *Advanced layout* switch and, directly under it, a **Restore original layout** button (asks for confirmation).

## What the user sees

- With the switch on, a small **pencil** appears at the top of **Today**, **Statistics** and **Body** (not on other pages). Off = the original pages, byte-for-byte the same markup as before (Today, Statistics and Body keep their original code path).
- Pressing the pencil starts editing that page: a toolbar (*Personalising* - **Add**, **Reset page**, **Done**) appears. Fields are inert while editing, so nothing is logged by accident. There are no move buttons and no dashed outlines; everything is done on the field itself:
  - **Select (touch):** touching a field highlights its border (thick solid outline) and shows its **resize knobs** (4 sides, 4 corners) and, in the middle, a red **remove (X)** button (plus *back to the original size* once the field was resized). Touching blank space or another field un-highlights the previous one (and selects the other). Keyboard: Tab to a field, Enter selects, Esc clears.
  - **Move (long press):** hold a field for about 0.4 s: it lifts (shadow, slight zoom, a short vibration where supported) and follows the finger. Moving the finger *before* the hold is over scrolls the page as usual; with a mouse or pen a drag starts immediately. While lifted, a dashed frame shows the free place where it will land, or a solid bar shows that a **new row is inserted** there because another field is in the way (the field then takes that row and the rows below move down; the row it left is closed if empty). The page auto-scrolls near the top / bottom edge; *Esc* cancels. Keyboard: arrow keys move the selected field one column / row.
  - **Free placement:** the page is a 6-column grid with free rows. A field can be dropped on **any free cell**, so there can be blank space between fields, beside a field or between rows (a row without a field is a 40 px blank row; two extra blank rows are offered below the last field while editing). The cell a field leaves stays blank unless it was an insert (see above). Removing a field closes the row it leaves if nothing else is on it.
  - **Resize (select first, then pull a side or corner):** left / right changes the width (snaps to the 6 columns, minimum 2, maximum 6, and it stops at the neighbouring field on the same row), top / bottom changes the height (free, 4 px steps, 44-900 px), a corner both. A field with a fixed height scrolls inside if its content is longer. Fields that were never resized keep their original (responsive) size. The side knobs are focusable: arrow keys resize them (Shift = bigger height steps).
  - **Meal fields** have a floor so they stay usable: at least **3 columns (2 in Compact) x 56 px (52 in Compact)**, which always shows the meal icon, the expand arrow and the **+** (name and numbers may be cut off). Outside the edit mode, **pressing the expand arrow of a resized meal field puts it back to its classic size** (a closed one also opens, an open one stays open); its place is kept.
  - While a move or resize is running nothing is stored; the new place / size is saved when you let go.
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

- State: `src/utils/layoutStore.ts` (`kcalsync_layout`; `useLayout`, `useEditingPage`, `applyItemChanges` (several fields at once: `col`, `row`, `cols`, `height`; a key set to `undefined` = original), `setItemSize` (`{ cols?, height? }`), `hideItem` (also closes the row it leaves; the removed field forgets its place), `showItem` (the field comes back after the placed ones), `addMealType`, `removeMealType`, `resetLayout`, `resetPageLayout`, `exportLayout` / `importLayout`). `mergeOrder` keeps the stored order for existing fields and appends new ones. Limits: `MIN_COLS` 2, `MAX_COLS` 6, `MIN_HEIGHT` 44, `MAX_HEIGHT` 900, `HEIGHT_STEP` 4 (`clampCols`, `clampHeight`).
- Stored per field (`LayoutItemPrefs`): `col` (0-5) and `row` (0-200) = its place, `cols` (2-6) and `height` (px). A page that was never personalised has no places and is plain flow in the original `order`; the **first time the pencil is pressed every shown field gets a place measured from the screen**, so nothing jumps. Fields without a place (new measures, meal types, restored fields) flow after the placed ones. Fields that would overlap are pushed to the next free row (`resolvePlacements`). **Migration** in `normalizeLayout`: the first version's `width` (third / half / twothirds / full) becomes `cols` 2 / 3 / 4 / 6, the old `scale` zoom is dropped, and the old `nutrients` field becomes `fiber`, `salt`, `sugar` (in the order and in the removed list; its own size is dropped).
- Geometry: `utils/layoutGrid.ts` (pure, no React): `spanCols` (original responsive span to columns), `resolvePlacements`, `planMove` (free cell or row insert, row close), `planRemove`, `freeRange` (room left / right for resizing), `rowAt`.
- UI: `components/layout/EditableGrid.tsx` and `LayoutToolbar.tsx` (pencil, Add / Reset / Done). `EditableGrid` renders the page as a CSS grid with explicit `grid-column` / `grid-row` and explicit row tracks (`auto` for rows with fields, 40 px for blank rows), keeps one window-level pointer engine (press -> tap select / long press lift / mouse drag, resize, edge auto-scroll, Esc), draws the selected field's `Controls` (resize knobs, remove, original size) and a drop frame / insert bar. Row heights for hit-testing come from the browser (`getComputedStyle(grid).gridTemplateRows`). While a touch move or resize runs, a non-passive `touchmove` listener stops the page from scrolling. `LayoutItem` has optional `minCols` / `minHeight` (used by the meal fields in `TodayView.tsx`). While editing the grid has `data-no-swipe`, so `PageSwiper` does not change page under a drag.
- Pages build a `LayoutItem[]` and render `<LayoutToolbar/>` + `<EditableGrid/>`: `TodayView.tsx`, `HistoryView.tsx`, `BodyView.tsx`. Today's cards were split into `IntakeCard`, `BurnedCard`, `MacroCard`, `NutrientCard` (one of fibre / salt / sugar; `NutrientsRow` still draws the three together for the original layout) so they can be placed independently. `FoodMacroGrid.tsx` exports `SecondaryNutrientCard`, which `SecondaryNutrientRow`, Today and Statistics share.
- Types `types/layout.ts`; strings `i18n/layout.ts` (`useLayoutText()`); `MealSlotId` is now `BuiltInMealSlotId | \`custom_${string}\`` (`types/index.ts`).
- Backup: the JSON export has a `layout` section; older backups without it leave the current layout untouched.
