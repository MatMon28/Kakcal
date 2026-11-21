# File map: Scripts and `public/`

> **Scope:** Build/test/data scripts and static public assets (catalogue, service worker, licences).
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `scripts/generate-usda-foods.py` | Extract the selected foods from the official USDA data archive. |
| `public/data/off-foods.bin`, `off-foods.meta.json` | The offline Open Food Facts catalogue (130,000 products, KOFF v1) and its statistics; see [Open Food Facts catalogue](../data-off-catalogue.md). Copied into the APK by `scripts/prepare-android.mjs`. |
| `scripts/build-off-catalog.mjs` | Streams the Open Food Facts CSV export, filters, ranks and writes the catalogue (`node scripts/build-off-catalog.mjs`). |
| `scripts/check-widget-layouts.mjs` | Fails the build when a widget layout uses a class RemoteViews cannot inflate. |
| `public/licenses/OpenFoodFacts.txt` | ODbL notice for the catalogue data. |
| `public/licenses/` | Bundled notices for Plus Jakarta Sans, Nunito, Lucide, React, Capacitor and runtime utilities; copied into the APK. |
| `scripts/brand-geometry.mjs` | Shared brand numbers: Koink's palette, K, pig box, the poop and where it stands (wordmark and icon). No dependency. See [brand.md](../brand.md). |
| `scripts/generate-intro-animations.mjs` | Writes the six launch animations, the six `-lockup` files and `logos-and-animations-overview.html` from the Koink-style K and poop (no dependency; run after `generate-icon` and `outline-wordmark`). See [brand.md](../brand.md). |
| `scripts/generate-icon.mjs` | Writes the Koink-style icon SVGs (`src/assets/brand/kakcalculator-icon.svg` and the three logos); run it before the PNG scripts. |
| `scripts/render-brand.mjs` | Renders the launcher, round, adaptive-foreground and Play Store PNGs from the icon SVG with Chromium (1024 canvas), then checks their sizes and the safe zone. |
| `scripts/outline-wordmark.mjs` | Generates the Koink-style wordmark (K, poop placed like Koink's pig, `kcal` as Nunito ExtraBold outlines): `kakcalculator-wordmark.svg`, `-outline.svg` and the five design-asset copies; the Android `splash_wordmark.xml` and the `index.html` boot SVG only with `--launch-screens` (unused now; needs `npm i --no-save opentype.js`; see [brand.md](../brand.md)). |
| `scripts/generate-splash-themes.mjs` | Reads every `--bg` from `src/index.css` and the mono palette from `src/utils/themes.ts` and writes `android/.../res/values/splash_themes.xml` (48 `Splash_<hex>` launch-screen styles). |
| `scripts/render-widget-tray.mjs` | Dependency-free generator of the chamfered widget tray 9-patch PNGs (angular style), light and dark, for five densities. |
| `scripts/smoke.mjs` | Browser checks for the actual production web assets and offline shell. |
| `scripts/check-journal.mjs` | Touch regression tests for single and interrupted swipes (including actual visibility and DOM identity), sheet dismissal without reload, and full-catalogue browse/search/retry/logging. Run `npm run build`, `npx playwright install chromium`, then `node scripts/check-journal.mjs`. |
| `public/offline-worker.js` | Caches only the production browser app shell, the PWA manifest and icons (`PWA_ASSETS`, incl. `icons/badge-96.png`, cache `kakcalculator-shell-v4`) and the static food catalogue `data/off-foods.bin` (bump `DATA_CACHE` when it is rebuilt), never a journal, backup, barcode response or source archive. |
| `scripts/prepare-android.mjs` | The clean Android release build: sets `VITE_DEMO_DATA=false` (no longer needed for the normal default, kept for clarity) and `VITE_ANDROID_RELEASE=true`, builds without `public/` (copies `public/licenses` and `public/data` explicitly, verifies the KOFF magic), removes the `<!-- pwa:start/end -->` tags from `index.html` (the APK ships no manifest), injects the `android-local-no-demo` meta tag, runs `cap sync android` and verifies the synced HTML and plugin list (`@capacitor/app`, `@capacitor/local-notifications`). Needs Node 22+ and installed `node_modules/`. |
| `scripts/package-android.py` | Zips the synced Android project (no keys or caches) to `public/downloads/Kakcalculator-Android-Studio.zip` (untracked output). Refuses to run before `prepare-android.mjs`. |
| `scripts/smoke-entry.tsx`, `scripts/smoke.bundle.js` | Legacy jsdom smoke harness (entry + prebuilt IIFE). Not referenced by `smoke.mjs`; safe to ignore. |
| `public/manifest.webmanifest`, `public/icons/*.png`, `public/_headers` | PWA manifest (relative `start_url`/`scope`, `start_url ./?view=app&source=pwa`, `prefer_related_applications: false`), the four PNG icons, and revalidation headers for Netlify/Cloudflare ([pwa.md](../pwa.md)). |
| `scripts/generate-notification-icon.mjs` | Generates `res/drawable/ic_stat_kak.xml` from the exact logo geometry (K cut around the poop, poop tier lines transparent); needs `npm i --no-save paper-jsdom`; `--preview out.svg` writes a preview. |
| `scripts/render-pwa-icons.mjs` | Renders the PWA icons from the brand SVG with `sharp` (`npm i --no-save sharp`). |
