# Performance, storage and tooling review: what changed

> **Scope:** the single authoritative status of the 20-point performance / architecture / tooling review (base commit `7eb4b63`). One row per point: done, partial, or not done, with the files that implement it.
>
> **Read when:** you want to know what the review changed, or where to continue.
>
> **Related:** [storage-and-privacy.md](storage-and-privacy.md), [verification.md](verification.md), [pwa.md](pwa.md), [setup-build.md](setup-build.md), [launch-intro.md](launch-intro.md)

| # | Point | Status | Where |
| --- | --- | --- | --- |
| 1 | One big shared context | **Done** (migration ongoing) | `src/context/contexts.ts`: `UiContext`, `SettingsContext`, `JournalDataContext`; every function is stable (`useStableActions`). `useApp()` still merges all three. `Header`, `JournalChrome`, `QuickAddBar`, `MainContent` use `useShell()`, `Modal` uses `useSettings()`. About 90 other components still call `useApp()`; move them to `useJournalData()` / `useSettings()` / `useUiState()` when profiling shows a cost. Test: `tests/context.test.tsx` (a settings consumer is not re-rendered by logging food or changing tab). |
| 2 | One large initial bundle | **Partial** | `vite-plugin-singlefile` removed, `base: './'`. Lazy: tour, install guide, scanner, Settings, Profile, Activity, Period sheet and the Period / Body / Statistics pages (preloaded when idle, see `preloadOptionalScreens` in `App.tsx`). The main chunk is still about 800 kB (bundled foods, translations, Today / Custom pages). |
| 3 | Saving rewrites whole collections | **Done** for journal days; **partial** elsewhere | `src/storage/dayStore.ts` (one IndexedDB record per date), `writeQueue.ts` (coalesced, flushed on hide), `usePersist.ts`, `status.ts` + `components/common/StorageNotice.tsx` (failures are shown). No `localStorage.setItem` remains inside a state updater in `AppContext.tsx`. Small collections (foods, meals, settings, period) are still JSON in localStorage but written once per burst, from effects. `advancedStore` / `layoutStore` were not changed. |
| 4 | Photos as base64 | **Done** | `src/storage/photoStore.ts`: blobs in IndexedDB, `MealPhoto.src = 'idb:<id>'`, legacy `data:` photos migrate when idle, quota errors are reported by the composer, `components/common/StorageInfo.tsx` (usage, browser-reported quota, persistence request), backups embed data URLs (`photosForBackup` / `photosFromBackup`). The old 350 kB-per-photo string budget is gone (1600 px JPEG, about 1 MB). No fixed photo limit is assumed. |
| 5 | Search work while typing | **Not done** | Precomputed names, a cache and a worker are still to do (`AddFoodModal.tsx`, `src/data/offCatalog.ts`). |
| 6 | Catalogue loads early | **Partial** | `AddFoodModal.tsx` loads the 12 MB catalogue only after two typed characters, so favourites, quick foods and saved meals never download it. An explicit offline-download button and a loading indicator are still to do. |
| 7 | Launch animation delay | **Done** | First launch plays fully; later launches leave when the app is ready (quick fade); tap still skips; `?intro=N` always plays in full. `introAnimations.ts` (`isReturningLaunch`), `launchIntro.ts`. See [launch-intro.md](launch-intro.md). |
| 8 | Tour runs a second app | **Partial** | The journal is the default for everyone (`?view=tour` opens the tour) and the tour is lazy-loaded (`App.tsx`). The tour's live iframe still exists inside the tour; screenshot previews are still to do. |
| 9 | Expensive animation DOM work | **Not done** | Not examined (`Modal.tsx` clone / measurement). |
| 10 | Components declared inside components | **Done** | `ActivityRow`, `SwitchVisual` hoisted, `FoodRow` removed; ESLint `react/no-unstable-nested-components` is an error (`eslint.config.mjs`). |
| 11 | Startup / widget history work | **Done** | Days are normalised once during the schema 1 -> 2 migration (`dayStore.ts`, `meta.daySchema`); later starts only run a cheap structural check and repair single bad records. `utils/widgetDates.ts` limits widget publishing to today, yesterday and future days; an unchanged payload is not republished (`App.tsx`). |
| 12 | Minute interval | **Done** | `utils/useToday.ts`: one timer to the next midnight, rechecked on focus / visibility. Test: `tests/midnight.test.ts`. |
| 13 | Cached launches wait on the network | **Done** (not tried on a real device) | `public/offline-worker.js`: cached shell first, background revalidation (`cache: 'no-cache'`, a conditional request), hashed `assets/*` cache first, build id + asset list stamped by `vite.config.ts` (`stampOfflineWorker`), the newest two caches are kept so an open page can still lazy-load. `public/_headers`: immutable caching for `/assets/*`. |
| 14 | Build without type check | **Done** | `Toast.tsx` deleted; `npm run build` = `tsc --noEmit && vite build`. |
| 15 | Broken lint / test setup | **Done** | `eslint.config.mjs` (typescript-eslint, react, react-hooks), `playwright`, `vitest`, `jsdom`, `fake-indexeddb`, `@testing-library/react` declared; `npm ci` verified from a clean install. |
| 16 | Checks not enforced | **Done** | `.github/workflows/ci.yml`: typecheck, lint, tests, build, worker stamp check, widget layouts. Browser scripts stay manual (`npm run test:browser`). |
| 17 | Android guard bypass | **Done** | `npm run android:prepare` = widget check + `scripts/prepare-android.mjs` (now also type-checks and verifies every referenced `assets/*` file was synced). This repository has no Android release workflow; any future one must call this script. |
| 18 | Large mixed files | **Partial** | New `src/storage/*` (services), `contexts.ts`, `useToday.ts`, `widgetDates.ts`, `LazyInstallGuideHost.tsx`, `installGuideEvents.ts`. `AppContext.tsx` (about 900 lines) and the big dialogs are still large. |
| 19 | Repo hygiene | **Partial** | `.idea/` and `scripts/smoke.bundle.js` untracked and ignored, package name / version set, APK validated in `pages.yml` before publishing. The `Kakcalculator.apk` file name stays on purpose ([brand.md](brand.md)). |
| 20 | Docs and code disagree | **Partial** | This file is the one authoritative review document; behaviour docs were updated in the same change. Shared animation constants were not centralised yet. |

## Behaviour changes you can see

- A red notice appears when a save fails (full storage, blocked storage).
- Settings > Backup shows storage usage and can ask the browser to keep the data.
- Backups are now version `1.2` and contain photos as data URLs; importing a backup stores photos first and changes nothing if that fails.
- `exportDataJson` / `importDataJson` are async (`AppContextType`).
- The guided tour is opt-in: `?view=tour`.
