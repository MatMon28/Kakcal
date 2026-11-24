# Custom layout, photo diary and short links update

> **Scope:** Minimal-mode Custom layout, Custom entrance, photo diary pop-ups, "Go to the meal", short share links and the share pop-up rule.
> **Read when:** changing the Custom grid, the section header icons, the photo composer / gallery / viewer, or the plan-link format.
> **Related:** [meal-journal.md](meal-journal.md), [interaction-update.md](interaction-update.md), [file-map/components-pages.md](file-map/components-pages.md), [file-map/utils.md](file-map/utils.md)

## Custom layout

- **Minimal mode** (`settings.ultraMinimal`): every Custom field (Meal diary, Meals, Recipes, Meal planner, Photo diary, Foods) is a flex item of `.journal-minimal-grid`. A collapsed field is half a row (two next to each other) and grows to fill the row, so a lone one takes the whole row. An expanded field takes the whole row. The state is read from `data-section-open` on each `<section>` (set by `JournalSection` and by the three library sections), so Meal diary and Meal planner now compact like the others.
- **Header icons in compact fields:** `LibrarySectionHeader` measures the header (`useFitActions`, ResizeObserver). Optional buttons (search, share, filter, +) that do not fit a half-width field are hidden (`display: none` on the DOM node, the last button is kept longest). They are shown again when the field is expanded and hidden again when it is compacted. The chevron and the icon circle are always shown.
- **Not Minimal:** `.custom-library-grid` is a single column at every width, so each field takes the whole row (the old two-column rule at 760 px was removed).
- **No entrance animation on Custom:** the staggered `journal-arrive` animation on the grid sections was removed. (Until the page-transition rework the `data-static-fields` attribute also kept `animatePageFields` away from the grid; both are gone, and every page now changes with the same page-level fade-through, see [motion.md](motion.md).)

## Share pop-up rule

The "Good plans are better shared." pop-up opens only when (1) the app is opened from a plan link, (2) a plan link is opened in the already open tab, or (3) the user presses the share icon of the planner.

- `src/utils/incomingPlan.ts` reads `#p=` / `#meal-plan=` once at start-up, keeps the link in memory and removes the fragment from the address bar immediately. Settings changes, remounts of Custom, the Back guard (`kcGuard` history entries) and `hashchange` can no longer re-open the pop-up. The link is forgotten when the pop-up is closed or imported.
- The share icon opens on a real press or keyboard activation only; a stray click that lands on it while another pop-up (Settings) closes on top of it is ignored.
- `App.tsx` and `AppContext.tsx` use `startedWithPlanLink` (instead of reading the hash) to show the journal and open Custom.

## Short links (still serverless, offline)

Format 2 link: `<app address>#p=<z|j><base64url>`.
- The address is only the app address (no `?view=app&tab=custom`; the fragment alone opens Custom).
- Payload: `[2, baseDate, foods[], plans[]]` with positional arrays, day offsets instead of dates, and `0` instead of repeated food names.
- Deflate-compressed with the browser's `CompressionStream('deflate-raw')` (`z`); plain (`j`) when it is unavailable or not smaller. Importing a `z` link needs `DecompressionStream` (Chrome 80+, Safari 16.4+, Firefox 113+).
- A week of 21 meals with two foods each went from about 2,900 characters to about 430. Older `#meal-plan=` links and `.txt` exports still import. `createPlanLink` / `parsePlanInput` are now async.

## Photo diary

- **Composer:** a clickable calendar icon with the date below it (opens the native calendar), next to the meal select that shows only the chosen meal (no "Meal" caption); pressing it lists the other meals, choosing one closes the list (`journal/JournalPickers.tsx`). **Save photo** is in the pop-up footer: always visible, full width, never scrolled away. Without a photo it explains what is missing instead of being disabled.
- **Gallery** ("See all photos"): the search bar and the date field are as wide as the pop-up, the date field is a bar (calendar icon, date or "Any date", clear button) and the **Add photo** button was removed (add photos with the + of the section).
- **Go to the meal:** the photo viewer has a button. Meal photos select their date, open Today and expand the meal; photos attached to a saved meal or recipe open Custom and expand that card. `utils/journalNavigation.ts` stores the expanded state then notifies mounted pages (`kc:open-meal` in `TodayView`, `kc:open-library` in `PreBuiltMealsView`).

## Verification

`tsc` shows no new errors and `vite build` succeeds. The link codec was round-trip tested in Node (new, legacy and text formats). Layout, calendar opening and header hiding were **not** checked in a real browser or on a device; please test the Minimal mode on a phone width.
