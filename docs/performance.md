# Page-change performance (lag when opening Custom with a lot of data)

> **Scope:** why changing page (Today -> Custom, and back) froze the app for a moment when the journal held a lot of data, what was changed, how it was measured and the rules that keep it fast.
>
> **Read when:** a page change or a swipe stutters, you add something to the Custom page, a section / card list, or a `useLayoutEffect` that reads layout.
>
> **Related:** [startup-performance.md](startup-performance.md) (app start), [motion.md](motion.md) (the page-change animation itself), [verification.md](verification.md#page-change-benchmark)

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
| The tab label widths are measured only when the labels change (labels / Ultra Minimal); the ResizeObserver still handles resizes and fonts. The page-follow `glide` / `draw` effect is separate and unchanged. No more layout read after every render. | `common/Tabs.tsx` |
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

## Not changed (ideas)

`AppContext.Provider` passes a new `value` object on every render, so every `useApp()` consumer re-renders on any state change; memoising the value (or splitting the context) would cut re-renders app-wide but touches every consumer, so it was left alone. Today's `MealSlotCard` measures its width in layout effects (`useCramped`, `useExtrasFit`) and causes a second layout when Custom -> Today.
