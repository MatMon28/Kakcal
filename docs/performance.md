# Page-change performance (lag when opening Custom with a lot of data)

> **Scope:** why changing page (Today -> Custom, and back) froze the app for a moment when the journal held a lot of data, what was changed, how it was measured and the rules that keep it fast.
>
> **Read when:** a page change or a swipe stutters, you add something to the Custom page, a section / card list, or a `useLayoutEffect` that reads layout.
>
> **Related:** [startup-performance.md](startup-performance.md) (app start), [motion.md](motion.md) (the page-change animation itself), [verification.md](verification.md#page-change-benchmark)
>
> **Three rounds:** the third, [*Meal card container queries*](#meal-card-container-queries), removes the mount-time measuring of the Today meal cards.
>
> **Two rounds:** the first (sections below, up to *Not changed*) removed the big costs; the second, [*Follow-up round: stop paying twice*](#follow-up-round-stop-paying-twice), removes what the first one still left on the first frame of a page change.

## The problem

The page-change animation is compositor-driven (opacity + transform), so it is smooth *once it runs*. What you felt was the time **before** the first frame: the new page is mounted, rendered and laid out in one synchronous task (React commit -> layout effects -> `window.scrollTo` -> first paint), and the browser cannot show anything until that task ends. With little data the task is short; with data it grows, and the Custom page grew the most. Measured in headless Chromium with 4x CPU throttling (about a mid-range phone) and a large journal (500 logged days, 60 saved meals, 30 recipes, 14 photos), Today -> Custom was **one 1.0-1.3 s block** and Custom -> Today 0.8-1.4 s. The same block also happens when a *swipe* starts, because the neighbouring page is mounted (`flushSync`) as soon as the finger moves.

Causes, found with a CPU profile of the tap (biggest first):

1. **Every collapsed card was fully built.** Each saved meal / recipe card rendered its hidden accordion body too (photo `<img>` of a base64 JPEG, macro grid, ingredient list). A collapsed `accordion-grid` is only `0fr` high: its content is still created, styled and laid out. 90 cards -> thousands of nodes, plus image decoding. The same for the Meals / Recipes / Foods / journal sections when the section itself was collapsed.
2. **Forced synchronous layout in a layout effect.** `Tabs.tsx` ran a `useLayoutEffect` with no dependency list: after *every* render it read `label.scrollWidth` of each tab. Reading `scrollWidth` forces the browser to lay out the **whole document immediately** - with the new, huge page already in the DOM. (`window.scrollTo` in `App.tsx` forces one more.) Profile: `get scrollWidth` 524 ms + `scrollTo` 413 ms of the 1.3 s.
3. **Linear searches in render.** `allFoods.find(...)` (a scan of all ~2000 bundled foods) ran for every ingredient of every meal and recipe, on every render of the page; `calculateMealNutrition` ran for every meal on every render.
4. **Meal diary filtered the whole history on each render.** `matchesSearch` built a long string (all names, recipe ingredients, note) and lower-cased it for every logged meal - even with an empty search box. The Photo diary re-sorted all photos on each render; `DiaryBrowser` summed calories / macros of every meal even with no such filter.
5. **Layout and paint of off-screen cards** that nobody could see yet.

## The fix

| Change | File |
| --- | --- |
| New `LazyBody` / `useMountedOnce`: a collapsed body is mounted the first time it opens and then stays mounted (closing animation, state and *Go to the meal* keep working). Used for every meal / recipe card body, the Meals / Recipes / Foods sections and `JournalSection` (Meal diary, planner, Photo diary). | `components/common/LazyBody.tsx`, `prebuilt/MealsSection.tsx`, `RecipesSection.tsx`, `PreBuiltMealsView.tsx`, `journal/JournalUI.tsx` |
| The tab label widths are measured only when the labels change (labels / Ultra Minimal); the ResizeObserver still handles resizes and fonts. The page-follow `glide` / `draw` effect was separate and unchanged in this first round; the follow-up round gave it a dependency list too. No more layout read after every render. | `common/Tabs.tsx` |
| `foodById` (`Map`) replaces `allFoods.find`; `mealNutrition` (`Map`, memoised) holds every saved meal's nutrition. | `prebuilt/usePreBuiltMealsState.tsx`, `MealsSection.tsx`, `RecipesSection.tsx` |
| No search text -> no haystack is built; kcal / macros are summed only when their filter is set; the slot order array is a constant. | `journal/MealDiary.tsx` |
| Photos sorted in `useMemo`; saved-photo `<img>` use `decoding="async"`. | `journal/PhotoDiary.tsx` |
| A collapsed card that is off screen gets `content-visibility: auto` (`[data-library-card][data-card-open='false']`, estimate 118 px). Expanded cards are always rendered. | `journal/css/journal-diary.css`, `data-card-open` in the two sections |

## Result (same machine, 4x CPU throttle, same data; longest main-thread block)

| Change | Before | After |
| --- | --- | --- |
| Today -> Custom | 1000-1250 ms | 260-320 ms |
| Custom -> Today | 770-1480 ms | 300-420 ms |
| Today -> Statistics | ~240 ms | 140-190 ms |
| Today -> Period | 220-230 ms | 130-190 ms |
| Statistics / Period -> Today | 250-340 ms | 210-320 ms |

What is left is one unavoidable layout of the incoming page and the React render of the page itself. Behaviour is unchanged: the screenshots of Custom (collapsed and with a card open) were compared before / after and the tab label widths are identical; opening / closing a card, collapsing a section, the Meal diary search and *Go to the meal* were exercised.

## Rules for new code

- **Collapsed means not mounted.** Wrap the body of a collapsible in `<LazyBody open={open}>` unless it is tiny.
- **Never read layout (`offsetWidth`, `scrollWidth`, `getBoundingClientRect`, `scrollY` after a DOM change) in a layout effect that runs on every render.** Give it a dependency list, or use a `ResizeObserver`.
- **No `array.find` inside a list render:** build a `Map` with `useMemo` once.
- **Do not filter / sort / format the whole history in render** without `useMemo`, and skip the work when no filter is set.
- Long lists of cards: keep `content-visibility: auto` on collapsed ones.

## Follow-up round: stop paying twice

The first round got Today -> Custom from 1000-1250 ms to 260-320 ms **in the best case** (collapsed cards, nothing opened yet). What was left is an accounting problem: a tab change paid for *both* page trees, and paid again on every visit to Custom, because a section left open is rebuilt from scratch (Custom is unmounted when you leave it). Three structural facts drove it: (1) the outgoing page stayed mounted and laid out for the whole ~300 ms animation while the incoming one was laid out too; (2) every Custom section was open by default, so `LazyBody` never deferred anything on the first render; (3) `LazyBody`'s "once opened, stays mounted" rule cannot help a page that is unmounted on leaving.

| # | Problem | Fix (this round) | Where |
| --- | --- | --- | --- |
| P1 | Two full pages mounted; the ghost was switched to `position: absolute` (a second full layout) and kept ~190 ms after its own fade-out. | The ghost / swipe neighbour gets `[contain:layout_paint]` and `will-change: opacity`. `playPageChange` now returns **both** animations; the old page is unmounted when **its** fade-out ends (`PAGE_OUT_MS`, 110 ms), not when the incoming one ends (~300 ms). The incoming `onfinish` still clears the swipe peer and the `kc-page-moving` class. | `PageSwiper.tsx`, `utils/pageTransition.ts` |
| P2 | All seven Custom sections were open by default, so all seven bodies were built in the tab-change commit. | Default **closed** for Meals / Recipes / Foods and the four journal sections (a header row each). Nothing to migrate: the value is stored only when the user toggles, so everyone who ever opened or closed a section keeps their choice. A section that **is** open when the page is shown mounts its body after the first paint behind a fixed-height skeleton: `<LazyBody open defer>` -> `DeferredBody` (`whenIdle`, at most 150 ms). A body opened by a tap is mounted at once (no skeleton): "defer" applies only to bodies that were open on the first render of their page. | `JournalUI.tsx`, `usePreBuiltMealsState.tsx`, `common/LazyBody.tsx`, new `common/DeferredBody.tsx`, new `styles/performance.css` |
| P2 | `MealDiary` built `matches` over the whole history on every render. | With no search text and no favourites filter `matches` *is* the diary (no copy, no pass); the 3-row preview is O(1). The filter is a `useMemo`. The history sort uses a plain `YYYY-MM-DD` comparison and a slot-rank `Map` instead of `localeCompare` / `indexOf`. | `journal/MealDiary.tsx` |
| P3 | `DiaryBrowser` filtered unmemoised on every keystroke, rebuilt a haystack per meal per keystroke and walked + sorted the history a second time (`useDiaryMeals()` was called twice). | One `useDiaryMeals()` (the browser receives `meals` and the search function as props). `useDeferredValue(query)` in both. Haystack built **once per meal** and cached (`Map<mealKey, string>`, renewed when the diary, the foods or the notes change; the meal-type label is added at query time so the text searched is identical). The ten-clause filter is a `useMemo` on the complete filter state. | `journal/MealDiary.tsx` |
| P4a | `Tabs` had a layout effect with **no dependency list**: `draw()` read `offsetLeft` / `offsetWidth` after every render (a whole-document forced layout). | Dependency list `[labelKey, activeTab, items.length, ultraMinimal, draw, glide]`; page-position changes during a swipe still come from `subscribePagePosition`. `Tabs` uses `useShell()` (no journal data). | `common/Tabs.tsx` |
| P4b | `LibrarySectionHeader` passed a JSX node (`extraActions`) in the deps of `useFitActions`: seven headers re-measured on every render of Custom. | The dependency is the scalar `extraActionCount`; the measuring (`clientWidth` / `offsetWidth`) happens in a `requestAnimationFrame` / `ResizeObserver` callback, only when the header is compact; otherwise the effect just clears `display` (a write, no read). | `common/LibrarySectionHeader.tsx` |
| P4c | `window.scrollTo` in a layout effect right after the DOM changed (forced layout). | Moved into `PageSwiper`, which knows the kind of change: nothing is done if the page was not scrolled (the scroll is read while rendering, before the DOM changes); a **tap** resets it after the first frame (`afterPaint()`; the incoming page is still invisible during its 60 ms delay and the old page is shifted up by the scroll it had, as before); a **swipe** (both pages under the finger) and the no-animation / reduced-motion path reset it in the same commit as before. `App.tsx` scrolls only once, on start. A passive effect would not do: React flushes the effects of a discrete event (a tap) before the browser paints. | `PageSwiper.tsx`, `utils/idle.ts` (`afterPaint`), `App.tsx` |
| P5 | `useJournalText`, `useMealSlots`, `useAdvancedText`, `useLayoutText` called `useApp()` for one string: ~85 call sites re-rendered on every tab change / dialog. | They use `useSettings()` (re-render only when a setting changes). `LibrarySectionHeader`, `Tabs`, `JournalSection`, `MealDiary`, `PhotoDiary`, `PlanLibrary`, `ShoppingLists`, `MealPlanner`, `MealSummaryCard` moved to the narrow hooks. The page elements in `MainContent` are memoised (`pageElements`, keyed on the active tab and the two optional pages), so a dialog opening (which changes `useShell()`) no longer re-renders both whole pages. | `i18n/{journal,advanced,layout}.ts`, `utils/mealSlots.ts`, `App.tsx`, the components above |
| P6 | Every expanded card ran `photos.filter(...)`; expanded off-screen cards were fully laid out. | `usePhotosForLinked(linkedId)` / `usePhotosForSlot(date, slot)`: an index built once per `photos` array (`WeakMap`), arrays keep their identity until a photo changes. `content-visibility: auto` + `contain-intrinsic-size: auto 240px` also for expanded cards (`[data-card-open='true']`). | `utils/journalStore.ts`, `journal/PhotoDiary.tsx`, `styles/performance.css` |
| P7 | The swipe neighbour was mounted (rendered and laid out) inside the pointer event at the 6 px lock: the page "caught" under the finger. | At the lock the neighbour is an **empty placeholder panel** (`peer.placeholder`); the real page is mounted once, when the drag has covered 60 % of the commit distance (`PREVIEW_AT`). A swipe that commits earlier (a quick flick) mounts it in the commit, like a tap. | `common/PageSwiper.tsx` |
| - | `planGroupViews` was O(groups x plans) (`plans.filter` per group). | One pass into a `Map<groupId, MealPlan[]>`; ISO-date comparison in the per-group sort. Same result (test against the old implementation). | `utils/planGroups.ts` |

**Not changed on purpose**

- ~~`MealSlotCard`'s `useCramped` / `useExtrasFit`~~ (mount-time layout reads on Today): **done** in the next round, see [Meal card container queries](#meal-card-container-queries).
- Replacing the ghost with a snapshot (fade-in only, or `document.startViewTransition`), a virtualised "See all" list, splitting `UiSlice` into navigation vs dialog flags, `React.memo` on `MealSlotCard` / `JournalSection` (their props, `onToggle` and `children`, are new on every parent render, so a memo would do nothing until the parents are stabilised) and moving `TodayView` / `MealSlotCard` off `useApp()` (they need `selectedDate` and dialog setters from the UI slice, whose value changes on every dialog) are not done. The ghost now lives 110 ms and is contained, which is the cheap part of that idea.
- `flushSync` calls in `PageSwiper` stay (see [search-and-animation-performance.md](search-and-animation-performance.md)); only *what* is mounted inside them changed.

**Result.** The numbers below are **not measured yet**: the sandbox this round was written in cannot start Chromium (missing system libraries), so `scripts/bench-page-change.mjs` was updated but not run. Run it before and after applying the patch on the same machine (see [verification.md](verification.md#page-change-benchmark)) and write the figures here. The 250 ms budget in the script is the documented best-case of the first round, not a measured result of this one. Verified by `tsc`, the existing 63 tests and the new `tests/page-change.test.tsx` (9 tests).

| Change (4x CPU, 500 days) | First round | This round |
| --- | --- | --- |
| Today -> Custom, collapsed page | 260-320 ms | to be measured |
| Today -> Custom, 5 sections + 10 cards open | to be measured | to be measured |

**Rules added**

- **Fitting decisions that only depend on the width of a card are a CSS `@container` query** (`[data-meal-slot]`), not a `ResizeObserver` / layout effect. Measure the widths (`scripts/measure-meal-card.mjs`), do not guess them.
- **Never put a JSX node (or any value created per render) in a dependency list** of an effect that reads layout. Pass a scalar.
- **Do the measuring after the commit** (`requestAnimationFrame`, `ResizeObserver`, `afterPaint()`); a layout read in a commit is a forced layout of the page that was just mounted.
- **A hook that needs one string (language, labels) subscribes to `useSettings()`**, not `useApp()`.
- **Section bodies that may be open on the first render use `<LazyBody open defer>`.**
- **Anything indexed by a key that a list render asks for belongs in the store as an O(1) lookup** (`usePhotosFor...`, `foodById`), not in a `filter` inside the card.
- **Do not keep the outgoing page longer than its own animation.**

## Today performance round (collapsed means not mounted)

**Problem.** Opening Today from another tab blocked the main thread for 300-830 ms (4x CPU, desktop Chromium; treat as ratios). Two causes, measured: (C1, primary) every Today meal and tracker card rendered its whole hidden body inside a `0fr` accordion - per logged item a row and a six-field `FoodMacroGrid`, plus planned meals, photos and the note; a 72-item day had 4,625 DOM nodes, 92 % of them in closed accordions. (C2, amplifier) the active tab lived in the UI slice that every Today card subscribed to through `useApp()`, so the outgoing page re-rendered in full during the ~300 ms fade and `pageElements` was rebuilt on every tab change.

| # | Change | Where |
| --- | --- | --- |
| C1 | The meal body is `MealSlotBody` and is mounted through `LazyBody`: closed = not mounted; open on arrival (`kcak_today_meals_open`) = mounted after the first paint behind `DeferredBody` (`defer`); opened by a tap = mounted at once; once mounted it stays mounted so the closing animation plays. `MealNutrientTotals` (the header's fibre / salt / sugar row) uses `LazyBody`. `TrackerCard` wraps its children in `<LazyBody open defer>`, so every tracker body gets the same rules. | `dashboard/MealSlotCard.tsx`, new `dashboard/MealSlotBody.tsx`, `dashboard/TrackerCard.tsx` |
| C2 | `NavContext` carries `{ activeTab, setActiveTab, returnFromDatabase }`; `NavActionsContext` carries the two functions only (stable identity, so a setter-only caller never re-renders on a tab change). The tab is out of the UI slice and out of `useApp()`. `pageElements` depends only on the two optional pages; the page dock decides by itself with `<ActionDock activeOn>` (reads `NavContext`), so `hideDock` is gone. Components that show the tab read it with `useNav()`. | `context/contexts.ts`, `context/AppContext.tsx`, `context/appContextType.ts`, `App.tsx`, `common/ActionDock.tsx` |
| C3 | The Header's tab effect reads `scrollY` and writes styles: it runs in `afterPaint()`, and `applyHeaderProgress` skips the whole write when the rounded values are unchanged. | `common/Header.tsx` |
| C4 | One empty `DayLog` per date (`emptyDayOnce`) instead of a new object per read. It is never written into state. | `context/AppContext.tsx` |
| C5 | `plansForSlotOf` / `usePlansForSlot`: a `WeakMap` index by day and slot, built once per `plans` array (the same pattern as the photo index); the output equals the old filter + stable sort (tested). `knownFoodIds(allFoods)`: the food-id set is built once per `allFoods` array, not once per card. | `utils/journalStore.ts`, new `utils/knownFoods.ts`, `journal/MealPlanner.tsx` (`PlannedMeals`), `journal/SaveAsMeal.tsx` |
| C6 | `TodayView` builds the advanced-layout field list only while the layout is on. | `dashboard/TodayView.tsx` |

**Tests.** `tests/today-performance.test.tsx`: a collapsed meal has zero item rows; re-closing keeps the body mounted; a meal open on arrival shows the skeleton first and the rows after; changing the tab does not re-render a mounted meal card (`Profiler` commit count); `plansForSlotOf` equals the old filter + sort for a seeded fixture; `knownFoodIds` is built once per list. `tests/context.test.tsx` and `tests/page-change.test.tsx` now read the tab through `useNav` / `useNavActions`.

**Benchmark.** `scripts/bench-page-change.mjs` also gates `X -> Today` (rich seed: 20 logged items on the current day) against the same 250 ms budget. The base commit fails it; the patched tree must pass it where Chromium runs. Numbers from the environment that wrote this round are in the patch notes (see [changes-patch.md](changes-patch.md)).

**Not done (on purpose, or left for later):** the other pages still call `useApp()` (see *Not changed*); Statistics' accordions are not wrapped in `LazyBody` yet; `NavContext` has no transition direction (the swipe code derives it from the tab order and no consumer needed it yet); keep-alive Today, a display snapshot / `startViewTransition` for the leaving page, and the swipe-mount change are not done.

**Rules (for every page, from now on)**

- **Collapsed means not mounted.** Every accordion body on every page is wrapped in `<LazyBody open={open}>` (or `defer` when it may be open on arrival), unless it is a single line of text.
- **A component that does not display the active tab must not subscribe to it.** Read the tab with `useNav()` only where the tab is displayed; use `useNavActions()` (or the UI slice's dialog setters) for changing it. `useApp()` inside a page tree is a latent bug: it re-renders the page on every dialog and data change.
- **No read-then-write of layout during a page change, in any effect.** Defer the read with `afterPaint()`, and skip a style write whose value did not change.

## Meal card container queries

**Problem.** Every `MealSlotCard` ran two layout effects on mount (`useCramped`, `useExtrasFit`) that read `clientWidth` / `offsetWidth` / `getBoundingClientRect()` and called `setState` before the first paint. Today builds up to ~10 cards, so entering Today did a forced whole-document layout (a trace of Custom -> Today shows it as the first, largest `Layout` of the entry: ~830 dirty nodes) and a re-render of the cards, on every entry.

**Fix (round: "remove Today's mount-time measurement").** The card is now a size container and CSS decides, with no JS and no layout read:

| Piece | Where |
| --- | --- |
| `[data-meal-slot] { container-type: inline-size }` | `src/styles/performance.css` |
| `.kc-meal-kcal` (the calorie figure) is hidden by `@container`; `.kc-meal-extras` (note / photo icons of the Compact header) likewise; without container-query support the extras are hidden and the figure shown | `src/styles/performance.css` |
| `useCramped`, `useExtrasFit`, `PILLS_RESERVE`, the four refs, `data-cramped`, `data-shown` and the `invisible absolute` classes are gone; the markup carries the two class names | `src/components/dashboard/MealSlotCard.tsx` |

**Measured widths** (`node scripts/measure-meal-card.mjs`; Chromium 159, 1,234 kcal, the widest figure a meal realistically has). A container query measures the content box of the whole card (the card has a 1 px border; padding, icon and gaps are inside), so the widths are *card* widths, not the 126 px of the old `PILLS_RESERVE`. `max-width` = last width that fits - 2 px border + margin.

| Rule | Last fit (card) | `@container` max-width |
| --- | --- | --- |
| Normal: figure next to the three pills | 210 px | **216 px** (+8) |
| Compact, viewport >= 359 px: figure in the header row | 166 px | **168 px** (+4) |
| Compact, viewport < 359 px (`max-[359px]` sizes: smaller icon, gaps, text) | 135 px | **135 px** (+2) |
| Compact: note / photo icons next to the figure | 202 px | **208 px** (+8) |

Two things differ from the first guess (`148 px` / `210 px`): (1) one width cannot serve Normal and Compact (Normal needs the pills too: `148` would have clipped them below ~210 px), and the Compact header row changes size below a 359 px viewport (Tailwind emits `max-[359px]` as `not all and (min-width:359px)`, so the media queries copy that); (2) the margin is smaller where a default card is close to the limit: a 2-column Compact card is **173 px at 390 px** and **138 px at 320 px**, so +8 would hide the figure on every phone. Re-run the script if a font, padding or icon size of the card changes.

**Result** (4x CPU, Chromium, the 500-day journal of `bench-page-change.mjs`, `collapsed`; one run each, so +-15 %): the longest task of every `X -> Today` change went from a mean of **369 ms (277-434)** to **239 ms (203-299)** (`Custom -> Today` 402 -> 261, `Period -> Today` 369 -> 215, `Statistics -> Today` 335 -> 241). Trace of the tap into Today: the old build has the forced whole-page layout from the meal cards plus a second one; the new build has one. Layout count in the first two frames, 6 cards: 5.8 -> 5.0 (one fewer; the "~10" of the task needs more cards than the test journal has: all effects of one commit share one layout). Pixel comparison of the Today meal grid, old vs new build, Normal / Compact / Expanded at 320 / 390 / 768 px in light and dark: identical, except the Compact cards below.

**Known differences.** The old code measured the real width of the figure; CSS only knows the card. (1) A Compact card with a *short* figure ("0" for an empty meal, "8") used to show the note / photo icons on a phone (they fitted); they now appear only when the card is >= 210 px wide (e.g. an opened Compact meal, which spans the row, or a tablet). (2) A short figure ("350") is hidden at the same width as "1,234", i.e. a little earlier than before; a five-digit figure (12,345) overflows its room by up to ~3 px in the narrowest default card. (3) The old rule showed the extras of an *open* narrow card; the open prop no longer matters for them (an open Compact card is full-width on phones). Per-digit widths (a `data-digits` attribute set in React, still no measuring) would remove (1) and (2); not done.

**Rollback.** Revert `MealSlotCard.tsx` and `performance.css`; the hooks were self-contained.

## Not changed (older ideas, status updated)

The shared context **is** memoised: the three slices (`UiContext`, `SettingsContext`, `JournalDataContext`) are `useMemo`'d in `AppContext.tsx` and every action has a stable identity (`useStableActions`). What remains is *broad subscriptions*: after this round `useApp()` is called from 66 places in 58 files (it was 97 in 73 files), plus the ~85 call sites that reached it through `useJournalText` / `useMealSlots` / `useAdvancedText` / `useLayoutText`, which no longer do. The remaining ones read UI-slice values (`selectedDate`, dialog flags) or several slices at once; moving them needs the UI slice split into navigation and dialog flags first. `MealSlotCard`'s mount-time layout effects are scheduled, not accepted: see *Not changed on purpose* above.

## First-load performance for Period, Body, and Statistics

- **Preloadable lazy screens (`utils/preloadableLazy.tsx`, `utils/lazyScreens.ts`):** replaces raw `React.lazy` so preloaded modules render synchronously with zero Promise throw / `<Suspense>` flash, staggered one per idle slice (`scheduleLazyScreenPreload`, visible tabs first) and triggered immediately on tab pointerdown/focus (`Tabs.tsx`) or swipe lock (`PageSwiper.tsx`).
- **Cached day base metrics (`utils/dayMetricsCache.ts`):** `WeakMap<DayLog, DayBaseMetrics>` shared by `HistoryView.tsx` and `CycleNutrition.tsx` so unchanged days never recompute meals/macros/TEF.
- **Lazy & deferred bodies:** `HistoryView.tsx` (`weightOpen` / `dailyOpen` via `<LazyBody defer>`, `items` only when `layoutEnabled`), `PeriodView.tsx` (`CycleHistory` and `CycleNutrition` inside `<DeferredBody>`), `PeriodCalendar.tsx` (`legendOpen` in `<LazyBody>`, memoised month grid), `PeriodSettingsAccordion.tsx` (`<LazyBody>`), and `BodyView.tsx` (cards `>= 3` in `<DeferredBody>`, `[data-measure]` `content-visibility: auto`, narrow `useSettings()` subscriptions).
