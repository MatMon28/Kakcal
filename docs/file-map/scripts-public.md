# File map: Scripts and `public/`

> **Scope:** Build/test/data scripts and static public assets (catalogue, service worker, licences).
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `scripts/generate-usda-foods.py` | Extract the selected foods from the official USDA data archive. |
| `public/data/off-foods.bin`, `off-foods.meta.json` | The offline Open Food Facts catalogue (550,000 products, KOFF v2) and its statistics; see [Open Food Facts catalogue](../data-off-catalogue.md). Copied into the APK by `scripts/prepare-android.mjs`. |
| `scripts/build-off-catalog.mjs`, `scripts/build-off-catalog.d.mts` | Streams the Open Food Facts CSV export, filters obsolete/stale/duplicate records, balances IT/EU/US/UK quotas and writes the KOFF v2 catalogue (`node scripts/build-off-catalog.mjs`), plus TypeScript declarations for tests. |
| `scripts/check-widget-layouts.mjs` | Fails the build when a widget layout uses a class RemoteViews cannot inflate. |
| `public/licenses/OpenFoodFacts.txt` | ODbL notice for the catalogue data. |
| `public/licenses/` | Bundled notices for Plus Jakarta Sans, Nunito, Lucide, React, Capacitor and runtime utilities; copied into the APK. |
| `scripts/brand-geometry.mjs` | Shared brand numbers: palette, K, the poop (tip and three tiers), icon layout and scales of the derived images, `layoutWordmark()`. No dependency. See [brand.md](../brand.md). |
| `scripts/brand-animations.mjs` | Definitions of every Kakcal animation (six launch animations, wordmark plop, six logo-press animations) and their SVG builders; needs `opentype.js`. |
| `scripts/generate-poop-animations.mjs` | Writes `src/components/common/poop-anim.css` (logo-press keyframes) from `brand-animations.mjs`. |
| `scripts/generate-intro-animations.mjs` | Writes the six launch animations (`01-soft-serve.svg` ... `06-flush-return.svg`), `wordmark-plop.svg` and `logos-and-animations-overview.html` from `brand-animations.mjs` (needs `opentype.js`; run after `generate-icon` and `outline-wordmark`). |
| `scripts/generate-icon.mjs` | Writes the icon SVGs (`src/assets/brand/kakcalculator-icon.svg` and the three logos): solid poop, carved K; run it before the PNG scripts. |
| `scripts/render-brand.mjs` | Renders the launcher, round, adaptive-foreground and Play Store PNGs from the icon SVG with Chromium (1024 canvas; scales from `brand-geometry.mjs`), then checks their sizes and the safe zone. |
| `scripts/outline-wordmark.mjs` | Generates the wordmark (k + solid poop + kcal as Nunito Black outlines, layout from `layoutWordmark()`): `kakcalculator-wordmark.svg`, `-outline.svg` and the five design-asset copies; `--launch-screens` also rewrites `splash_wordmark.xml` and the `index.html` boot SVG. Needs `opentype.js`. |
| `scripts/generate-splash-themes.mjs` | Reads every `--bg` from `src/index.css` (inlining the `./styles/*.css` parts it imports) and the mono palette from `src/utils/themes.ts` and writes `android/.../res/values/splash_themes.xml` (48 `Splash_<hex>` launch-screen styles). |
| `scripts/render-widget-tray.mjs` | Dependency-free generator of the chamfered widget tray 9-patch PNGs (angular style), light and dark, for five densities. |
| `scripts/smoke.mjs` | Browser checks for the actual production web assets and offline shell. |
| `scripts/check-journal.mjs` | Touch regression tests for single and interrupted swipes (including actual visibility and DOM identity), sheet dismissal without reload, and full-catalogue browse/search/retry/logging. Run `npm run build`, `npx playwright install chromium`, then `node scripts/check-journal.mjs`. |
| `scripts/check-search-and-dialog.mjs` | Real-Chromium check of the search / dialog round: no catalogue download before two characters, the search worker runs and its results are listed, longest main-thread task while typing (`KC_THROTTLE`, `KC_LONGTASK_MS`), a closing dialog animates the same overlay (never a clone), is inert, keeps its typed text and leaves nothing behind. See [../verification.md](../verification.md#search-and-dialog-check). |
| `scripts/check-page-transition.mjs` | Frame-by-frame check of the tap / Back page transition (blank frames, ghosting, horizontal overflow, document-height jumps, leftover pages / animations / styles / classes, lost taps, rapid taps, scrolled page, catalogue and Back, reduced motion). Run `npm run build`, `npm i --no-save playwright`, `npx playwright install chromium`, then `node scripts/check-page-transition.mjs` (`KC_REPORT_ONLY=1` only prints the metrics, `KC_VIEWPORT=1280x800` tests the desktop layout). |
| `public/offline-worker.js` | Caches only the production browser app shell, the PWA manifest and icons (`PWA_ASSETS`, incl. `icons/badge-96.png`, cache `kakcalculator-shell-v5`) and the static food catalogue `data/off-foods.bin` (bump `DATA_CACHE` when it is rebuilt), never a journal, backup, barcode response or source archive. |
| `scripts/prepare-android.mjs` | The clean Android release build: sets `VITE_DEMO_DATA=false` (no longer needed for the normal default, kept for clarity) and `VITE_ANDROID_RELEASE=true`, builds without `public/` (copies `public/licenses` and `public/data` explicitly, verifies the KOFF magic), removes the `<!-- pwa:start/end -->` tags from `index.html` (the APK ships no manifest), injects the `android-local-no-demo` meta tag, runs `cap sync android` and verifies the synced HTML and plugin list (`@capacitor/app`, `@capacitor/local-notifications`). Needs Node 22+ and installed `node_modules/`. |
| `scripts/package-android.py` | Zips the synced Android project (no keys or caches) to `public/downloads/Kakcalculator-Android-Studio.zip` (untracked output). Refuses to run before `prepare-android.mjs`. |
| `scripts/smoke-entry.tsx`, `scripts/smoke.bundle.js` | Legacy jsdom smoke harness (entry + prebuilt IIFE). Not referenced by `smoke.mjs`; safe to ignore. |
| `public/manifest.webmanifest`, `public/icons/*.png`, `public/_headers` | PWA manifest (relative `start_url`/`scope`, `start_url ./?view=app&source=pwa`, `prefer_related_applications: false`), the four PNG icons, and revalidation headers for Netlify/Cloudflare ([pwa.md](../pwa.md)). |
| `scripts/generate-notification-icon.mjs` | Generates `res/drawable/ic_stat_kak.xml` and `public/icons/badge-96.png` from the logo geometry (poop merged into one outline, K as a hole); needs `npm i --no-save paper-jsdom sharp`; `--preview out.svg`. |
| `scripts/render-pwa-icons.mjs` | Renders the PWA icons from the brand SVG with `sharp` (`npm i --no-save sharp`). |

`public/images/demo-{breakfast,lunch,dinner}.jpg`: local Pexels photo fixtures used only by opt-in demo data (Miriam Alonso, Nadin Sh, cottonbro studio).

`scripts/verify-interaction-update.mjs`: optional Playwright desktop/mobile regression suite for the interaction update; see verification.md.

`scripts/bench-page-change.mjs`: Playwright benchmark of the page-change cost with a large seeded journal and a throttled CPU (see [../verification.md](../verification.md#page-change-benchmark), [../performance.md](../performance.md)).

## Added in the performance, storage and tooling round

`public/offline-worker.js` now holds `__BUILD_ID__` / `__PRECACHE_ASSETS__` placeholders that `vite.config.ts` fills in; `public/_headers` caches `/assets/*` as immutable; `scripts/smoke.bundle.js` is no longer tracked; `scripts/prepare-android.mjs` type-checks and verifies the synced `assets/*`.

(Round: page-change follow-up) `scripts/bench-page-change.mjs` now runs two scenarios (`KC_SCENARIO=collapsed|open|both`; `open` = 5 sections and 10 cards open) and exits with code 1 when Today -> Custom exceeds `KC_BUDGET_MS` (default 250 ms, only at 4x throttle or more). See [../verification.md](../verification.md#page-change-benchmark).

(Round: container queries) `scripts/measure-meal-card.mjs`: Playwright script that forces the Today meal card to every width, with the container-query hiding off, and prints the last width at which the calorie figure / the note and photo icons fit and the `@container` max-width to use (see [../performance.md](../performance.md#meal-card-container-queries)). `scripts/bench-page-change.mjs`: `rows` is now declared before the scenario loop (it crashed with `ReferenceError` before printing the table).

(Glass / Material round) `scripts/generate-splash-themes.mjs` also reads the `glass` and `material` `--bg` values (8 style presets x 3 modes). The `tests/` folder gained `themes.test.ts`.

| File | Role |
| --- | --- |
| `scripts/check-food-workflows.mjs` | Runs import, recipe/meal builder (quantity step, icon-only pencil, Swap, quick-add tiles), food batch, diary edit and Undo checks in Chromium against a demo Vite build. See [verification](../verification.md#food-workflow-regressions). |
| `scripts/export-agent-context.mjs` | Aggregates understanding-critical code and docs into category-named `.txt` bundles (`<= 250 KB` each) plus `README.md` under gitignored `exports/agent-context/`; `--check` verifies no new code/doc files are uncategorized. |
