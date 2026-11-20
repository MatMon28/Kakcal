# Advanced layout (edit Today, Statistics and Body)

> **Scope:** Settings > Advanced > *Advanced layout*: the pencil icon, dragging / resizing / removing fields, added meal types, and the *Restore original layout* button.
>
> **Read when:** you change the editable grid, the pencil toolbar, the layout store, or anything that lists meal types.
>
> **Related:** [advanced-personalisation.md](advanced-personalisation.md), [journal-pages.md](journal-pages.md), [storage-and-privacy.md](storage-and-privacy.md), [file-map/README.md](file-map/README.md)

Off by default. **Settings > Advanced** has an *Advanced layout* switch and, directly under it, a **Restore original layout** button (asks for confirmation).

## What the user sees

- With the switch on, a small **pencil** appears at the top of **Today**, **Statistics** and **Body** (not on other pages). Off = the original pages, byte-for-byte the same markup as before (Today, Statistics and Body keep their original code path).
- Pressing the pencil (tooltip *Edit this page*) starts editing that page: a toolbar (*Editing* - **Add**, **Reset page**, **Done**) appears. Fields are inert while editing, so nothing is logged by accident. Everything is done on the field itself:
  - **Editable fields are outlined:** as soon as the pencil is pressed, every field gets a **dashed (segmented) outline** that follows its corners, so you can see what can be edited. The outline is one SVG rectangle, so the dash pattern is the same all the way round.
  - **Select (touch):** touching a field turns its outline into a **solid border of the same thickness on all four sides** and shows its **resize knobs** (4 sides, the 2 bottom corners). A red **remove (X)** button sits in the **top-right corner** of the field (not in the middle) and, once the field was resized, a *back to the original size* button sits in the top-left corner. Touching blank space or another field un-highlights the previous one (and selects the other). Keyboard: Tab to a field, Enter selects, Esc clears.
  - **Move (long press):** hold a field for about 0.4 s: it lifts (shadow, slight zoom, solid outline, a short vibration where supported) and follows the finger. Moving the finger *before* the hold is over scrolls the page as usual; with a mouse or pen a drag starts immediately. While lifted, a dashed frame shows where it will land and the other fields already move out of the way. The page auto-scrolls near the top / bottom edge; *Esc* cancels. Keyboard: arrow keys move the selected field one column / 16 px (Shift = 64 px).
  - **Free placement (any shape):** the page is a 6-column canvas and a field sits at **any height** (px), not on rows. So a tall field can have two small ones stacked beside it, fields can be staggered or arranged like a pyramid, with blank space anywhere. A dropped field is **magnetic**: within 12 px it snaps below / above a field it shares columns with, or lines up with the top / bottom of any field; otherwise it moves in 4 px steps. **Fields never overlap**: a field dropped (or grown) onto another one pushes it down below itself, and the fields under it follow. Removing a field leaves blank space (move the others up if you like).
  - **Resize (select first, then pull a side or bottom corner):** left / right changes the width (snaps to the 6 columns, minimum 2, maximum 6), top / bottom changes the height (free, 4 px steps, 44-900 px; pulling the top edge moves the top, the bottom stays), a corner both. A field with a fixed height scrolls inside if its content is longer. Fields that were never resized keep their original (responsive) size. The side knobs are focusable: arrow keys resize them (Shift = bigger height steps).
  - **Meal fields** have a floor so they stay usable: at least **3 columns (2 in Compact) x 56 px (52 in Compact)**, which always shows the meal icon, the expand arrow and the **+** (name and numbers may be cut off).
  - **Expanding a shaped meal:** outside the edit mode, pressing the expand arrow of a meal (or tracker) field that has a chosen shape shows it in its **classic form** (original width, natural height) at its place, pushing the fields under it down. Pressing the arrow again collapses it and it **goes back to the shape chosen by the user**; the shape is never discarded (only *Back to the original size* / *Reset page* remove it). While the page is being edited a shaped meal is always drawn collapsed so the shape is what you see and edit.
  - While a move or resize is running nothing is stored; the new places / sizes are saved when you let go (the places of fields that were pushed are saved too, so the page looks the same afterwards).
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

- State: `src/utils/layoutStore.ts` (`kcalsync_layout`; `useLayout`, `useEditingPage`, `applyItemChanges` (several fields at once: `col`, `top`, `cols`, `height`; a key set to `undefined` = original), `setItemSize` (`{ cols?, height? }`), `hideItem` (the removed field forgets its place), `showItem` (the field comes back after the placed ones), `addMealType`, `removeMealType`, `resetLayout`, `resetPageLayout`, `exportLayout` / `importLayout`). `mergeOrder` keeps the stored order for existing fields and appends new ones. Limits: `MIN_COLS` 2, `MAX_COLS` 6, `MIN_HEIGHT` 44, `MAX_HEIGHT` 900, `HEIGHT_STEP` 4 (`clampCols`, `clampHeight`).
- Stored per field (`LayoutItemPrefs`): `col` (0-5) and `top` (px from the top of the page, 0-20000) = its place, `cols` (2-6) and `height` (px) = its shape. A page that was never edited has no places and is plain flow in the original `order`; the **first time the pencil is pressed every shown field gets a place measured from the screen** (fields that only stretched to their neighbour keep that height), so nothing jumps. Fields without a place (new measures, meal types, restored fields) flow below the placed ones. **Migration** in `normalizeLayout`: layouts saved by the previous row-based editor (`col` + `row`) keep `row` until the page is shown; it is drawn once on the old row grid, measured and converted to `top` automatically (then `row` is dropped). The first version's `width` becomes `cols` 2 / 3 / 4 / 6, the old `scale` zoom is dropped, and the old `nutrients` field becomes `fiber`, `salt`, `sugar`.
- Geometry: `utils/layoutGrid.ts` (pure, no React): `resolveFree` (the real place of every field: the pinned field being dragged / resized keeps its place, the others are pushed down below whatever is in the way, top to bottom; unplaced fields flow at the bottom), `snapTop` (magnetic drop height), `spanCols` (original responsive span to columns) and the legacy `resolvePlacements` used only for the one-time conversion of old row layouts.
- UI: `components/layout/EditableGrid.tsx` and `LayoutToolbar.tsx` (pencil, Add / Reset page / Done). In *free* mode `EditableGrid` positions every field absolutely (`left` / `width` from the 6 columns and the measured gap, `top` in px) inside a container whose height is the lowest field (+160 px while editing). Heights of fields without a stored height are measured (`offsetHeight`, before every paint and through `ResizeObserver`) and fed to `resolveFree`, so a field that grows pushes the ones below it down (animated). It keeps one window-level pointer engine (press -> tap select / long press lift / mouse drag, resize, edge auto-scroll, Esc), draws a dashed `Outline` on every field while editing (solid when selected or lifted), the selected field's `Controls` (resize knobs, X in the top-right corner, original size in the top-left corner) and a drop frame. `LayoutItem` has optional `minCols` / `minHeight` (meal fields) and `expanded` (an open meal / tracker: classic width and natural height outside the edit mode, chosen shape kept). While editing the grid has `data-no-swipe`, so `PageSwiper` does not change page under a drag.
- Pages build a `LayoutItem[]` and render `<LayoutToolbar/>` + `<EditableGrid/>`: `TodayView.tsx`, `HistoryView.tsx`, `BodyView.tsx`. Today's cards were split into `IntakeCard`, `BurnedCard`, `MacroCard`, `NutrientCard` (one of fibre / salt / sugar; `NutrientsRow` still draws the three together for the original layout) so they can be placed independently. `FoodMacroGrid.tsx` exports `SecondaryNutrientCard`, which `SecondaryNutrientRow`, Today and Statistics share.
- Types `types/layout.ts`; strings `i18n/layout.ts` (`useLayoutText()`); `MealSlotId` is now `BuiltInMealSlotId | \`custom_${string}\`` (`types/index.ts`).
- Backup: the JSON export has a `layout` section; older backups without it leave the current layout untouched.
