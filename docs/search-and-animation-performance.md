# Search and animation performance (review points 5 and 9)

> **Scope:** how food search avoids doing work while the user types (precomputed names, cached results, a Web Worker for the 130,000-product catalogue, deferred rendering) and how a closing dialog is animated without cloning it. Files, measurements, behaviour changes and what was deliberately **not** changed.
>
> **Read when:** you touch food / meal / recipe search (`fuzzy.ts`, `foodSearchIndex.ts`, `catalogueSearch.ts`, `useCatalogueSearch.ts`, the worker), `Modal.tsx` / `dialogExit.ts`, or you profile typing or dialog-closing jank.
>
> **Related:** [performance-review.md](performance-review.md) (rows 5, 6, 9), [motion.md](motion.md) (Popup exit), [data-off-catalogue.md](data-off-catalogue.md), [verification.md](verification.md#search-and-dialog-check), [performance.md](performance.md) (page-change work)

## 1. Search no longer works on the main thread while typing

Before: every keystroke in *Add food* (and the planner, the Custom ingredient / recipe pickers and the Settings food picker) tokenized and normalized the name and brand of **every** food several times, computed four fuzzy scores per food (with an allocating Levenshtein) before throwing most of them away with a second pass, and then scanned the 12 MB catalogue text on the UI thread.

| Part | What it does now | File |
| --- | --- | --- |
| Faster fuzzy core | Same maths, same results. `tokenize` is exported, `fuzzyScoreTokens` / `fuzzyMatchTokens` work on tokenized text, the edit distance reuses two typed arrays, and the yes/no match gives up as soon as a row cannot stay within the allowed distance (`withinDistance`). `fuzzyScore` / `fuzzyMatch` keep their signatures (used by Activity search and the food database page). | `src/utils/fuzzy.ts` |
| Precomputed names | Each food / saved meal is tokenized **once** (`WeakMap` keyed by the object, so it disappears with the food). | `src/utils/foodSearchIndex.ts` |
| Match first, score later | Only foods that match are scored (before: all of them). | same |
| Result cache | The sorted result of a query is cached per food list (24 queries; a new food list = fresh results), so backspacing, retyping and reopening a dialog cost nothing. `searchFoods(list, query, { combined })` and `searchMeals(list, query)` return **shared, already sorted arrays: do not modify them** (spread first). | same |
| Catalogue in a worker | The catalogue is downloaded, parsed and searched in a Web Worker; the UI thread only receives at most 25-50 `FoodItem`s. If workers are unavailable or the worker script fails, the same search runs on the main thread (`loadOffCatalog()`, exactly as before). Answers are cached by normalized query + limit (60 entries, empty answers included). | `src/workers/offCatalogSearch.worker.ts`, `src/utils/catalogueSearch.ts` |
| Hook | `useCatalogueSearch(query, enabled, limit)` returns `{ foods, pending }`: nothing runs below 2 characters, 90 ms debounce (cached queries skip it), the previous list stays visible while the next one is on its way if the text only grew / shrank, `pending` lets a dialog hold back its "no results" message. | `src/utils/useCatalogueSearch.ts` |
| Deferred results | The input value stays urgent; the lists use `useDeferredValue(query)` so React can interrupt result rendering when the next key arrives. | `AddFoodModal.tsx`, `PlannerWizard.tsx`, `usePreBuiltMealsState.tsx`, `SettingsModal.tsx` |

Callers moved to the new helpers: `AddFoodModal.tsx`, `journal/PlannerWizard.tsx` (entry editor), `prebuilt/usePreBuiltMealsState.tsx` (ingredient search, recipe ingredient search, meal and recipe filters), `modals/SettingsModal.tsx` (quick-food picker). `FoodDatabaseView.tsx` (browse / filter of the whole catalogue page) and `BarcodeLookupModal.tsx` still use the main-thread catalogue from `src/data/offCatalog.ts` (`parseOffCatalog` is now exported so the worker can share the parser). `ActivitySearch.tsx` still calls `fuzzyScore` / `fuzzyMatch` directly (about 300 activities, not a hot spot).

### Measurements

Desktop Node (vitest, 410 bundled foods, 8 keystrokes "ch" -> "chicken br"): old pipeline **80 ms**, new **21 ms** on the first (cold: includes building the name index), **0.01 ms** for a repeated query. Catalogue on the same machine: parse 22 ms, one search 0.6-7 ms (about 5-30 ms on a mid-range phone), now all off the UI thread.

Real Chromium, 390x844 touch viewport, typing "nutella" into *Add food* with the CPU throttled (`scripts/check-search-and-dialog.mjs`, `KC_THROTTLE`; one run each, expect some variance):

| CPU throttle | Before: long tasks while typing | After |
| --- | --- | --- |
| 4x | 9 tasks, longest **150 ms** | 0 tasks (another run: 1 task, 72 ms) |
| 6x | 9 tasks, longest **246 ms** | 3 tasks, longest **62 ms** |

### Behaviour changes (small, intended)

- The catalogue is fetched in the worker, still **only after two typed characters** (item 6 rule kept). The planner entry editor used to fetch it as soon as it mounted (`useOffCatalog(true)`); it now waits for two characters like *Add food*.
- While a catalogue answer is pending, *Add food* and the planner show a short "..." (Add food) or nothing (planner) instead of "No results", so the empty message does not flash before catalogue-only matches such as "nutella" arrive.
- Ranking is unchanged for Add food. The planner's meal suggestions are now sorted by match quality (before: list order); the Custom recipe ingredient search also scores the brand; the Custom recipe list and the Settings picker use the combined-name score as before.
- The main thread still holds its own copy of the catalogue once the food database page or a barcode lookup is opened (the worker has a second copy). It is fetched from the HTTP / service-worker cache, not downloaded twice.

## 2. Dialog animation does less DOM work

Before (`Modal.tsx` > `playExit`): closing a dialog called `overlay.cloneNode(true)` (the whole open dialog, results lists included, twice in the DOM), copied input values and scroll positions to the clone, read `getComputedStyle` three times and `getBoundingClientRect` on the clone in separate steps, and removed every `id`.

Now (`src/components/common/dialogExit.ts`):

1. **The live dialog is animated.** Each `Modal` portals its overlay into its own host element (`createDialogHost`, `display: contents`, kept last in `<body>` while open so the newest dialog is on top). When React removes the overlay (the parent set `isOpen` to false, **or** stopped rendering the `Modal` altogether, which many callers do with `{open && <Modal isOpen ...>}`), React calls `host.removeChild(overlay)`; the host answers by animating the overlay for 60-110 ms and removing it itself at the end. No clone, no copying of inputs / scroll / focus, no duplicate ids.
2. **One batch of measurements.** The painted transform / opacity (`getComputedStyle`), the overlay rectangle and the sheet's layout box (`offsetLeft/Top/Width/Height`, which ignore the transform it is painted with) are all read together **before** the first write, then the dialog is made `inert` / `aria-hidden` and animated (`transform` + `opacity`, compositor only). No layout read happens afterwards.
3. Same behaviour as before: swipe-close continues from the finger, the sheet is sucked into its bar button (or bar centre, or the bottom edge when another dialog stays open), every press / key / wheel / new dialog ends the exit at once (`finishExitAnimations`, `installInputGuards`), the post-swipe tap rescue (`armTapRescue`), reduced motion removes the dialog at once. New safety net: a timer removes a dialog whose animation never reports "finished" (hidden tab). `Modal.tsx` re-exports `finishExitAnimations`; the stack, focus, scroll lock and keyboard handling stay in `Modal.tsx`.

While the 60-110 ms exit runs, the dialog's own content has been unmounted by React (its refs / effects are cleaned up) but its DOM is still painted: the scroll-edge fade mask (`data-scroll-fade`) is the one visible difference and is dropped at once.

**Risk note.** The host overrides `removeChild` on an element it created; this relies on React calling that method when it removes a portal child (true for React 19). `tests/dialogExit.test.tsx` covers both removal routes under `StrictMode`, and `scripts/check-search-and-dialog.mjs` checks it in a real browser. If a future React version changes how portal children are removed, those two fail first, and the fallback is simply that dialogs close without the animation.

## 3. Not changed on purpose

- **`flushSync` in `PageSwiper.tsx`** (page-change end, peer page mount when a swipe starts [since the page-change follow-up round this mounts an empty placeholder, and the real page at 60 % of the commit distance], swipe commit): the calls themselves are not touched. Each one keeps the DOM and the gesture in the same frame (an invisible old page must not stretch the document for one frame; the destination page must exist under the finger on the first move; the swipe commit must swap pages in the same layout pass as the scroll-to-top). They were not profiled on a device in this round; before changing one, run `scripts/bench-page-change.mjs` and `scripts/check-page-transition.mjs` ([verification.md](verification.md)).
- **Other measurement code** (`MealSlotCard.tsx` fitting [since replaced by container queries, see [performance.md](performance.md#meal-card-container-queries)], `EditableGrid.tsx` layout editor, `LibrarySectionHeader.tsx` action fitting, `poopAnimations.ts` forced reflow to restart keyframes): outside gestures or one-off; not examined further.
- `fuzzy.ts` scoring rules, `offCatalog.ts` search rules and the FOOD DATABASE page: unchanged.

## Tests and checks

- `tests/fuzzy.test.ts`: new scoring / matching / search pipeline against a verbatim copy of the previous implementation (same scores, same order), cache identity, combined scoring, meals.
- `tests/catalogueSearch.test.tsx`: the real worker code driven by a fake `Worker` (results equal the direct catalogue search, cached second call, main-thread fallback, unavailable catalogue, hook idle below 2 characters, pending / results, one search for a burst of keystrokes).
- `tests/dialogExit.test.tsx`: the same overlay node is animated and removed after `onfinish`, a press ends the exit, reopening during an exit, reduced motion; for both removal routes.
- `scripts/check-search-and-dialog.mjs` (manual, real Chromium): see [verification.md](verification.md#search-and-dialog-check).
