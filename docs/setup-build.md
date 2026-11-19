# Setup and build

> **Scope:** requirements, the npm scripts that really exist in `package.json`, scripts you run directly with `node`/`python3`, and the recommended APK flow.
>
> **Read when:** you set up a fresh clone, build the web app, or prepare/build the Android app.
>
> **Related:** [android-apk.md](android-apk.md), [android-gradle-guard.md](android-gradle-guard.md), [known-gaps.md](known-gaps.md), [web-preview.md](web-preview.md)

**Requirements:** Node.js **22 or newer** (the Capacitor CLI and `prepare-android.mjs` refuse older versions), JDK **21**, Android SDK Platform **36**, Build Tools **35.0.0**. Android Studio Otter (2025.2.1) or newer with AGP 8.13.0 support; the wrapper pins Gradle 8.14.3.

> **Before you open or build `android/`:** run `npm install` and the Android preparation script (below) in the project root. Gradle resolves the Capacitor modules out of the root `node_modules/` ([why](android-gradle-guard.md)).

## npm scripts defined in `package.json`

| Script | What it really runs |
| --- | --- |
| `npm run dev` | `vite` dev server (`-- --host 0.0.0.0` to expose on the network). |
| `npm run build` | `vite build` -> one inlined `dist/index.html`, plus everything from `public/` (PWA `manifest.webmanifest`, `icons/`, `offline-worker.js`, `_headers`, catalogue, licences). This is the **browser/PWA build** (demo seeds, service worker), not an APK bundle. Host the whole `dist/` over HTTPS ([pwa-setup.md](pwa-setup.md)). |
| `npm run preview` | `vite preview` of `dist/`. |
| `npm run android:prepare` | `npm run build && npx cap sync android`. **This is not the clean no-demo Android build** (it keeps demo seeds and the service worker); use `node scripts/prepare-android.mjs` instead. See [known-gaps.md](known-gaps.md). |

## Scripts you run directly

| Command | Purpose |
| --- | --- |
| `node scripts/check-widget-layouts.mjs` | Fails if a widget layout uses a view class RemoteViews cannot inflate (a plain `<View>` gives "Can't load widget"). |
| `node scripts/prepare-android.mjs` | **The** Android release preparation: clean no-demo build, copies licences and the OFF catalogue, `npx cap sync android`, integrity checks. Needs `npm install` first. |
| `npx cap sync android` | Only re-syncs plugins/assets (use after native plugin changes when `dist/` is already a clean Android build). |
| `npx cap open android` | Opens `android/` in Android Studio. |
| `node scripts/build-off-catalog.mjs` | Rebuilds `public/data/off-foods.bin` ([details](data-off-catalogue.md)). |
| `node scripts/outline-wordmark.mjs` | Regenerates the outlined wordmark SVG asset (`--launch-screens` also rewrites `splash_wordmark.xml` and the `index.html` boot SVG, no longer used). Needs `npm i --no-save opentype.js`. |
| `node scripts/generate-splash-themes.mjs` | Regenerates `android/app/src/main/res/values/splash_themes.xml` (one launch-screen style per app background colour). Run it after changing a `--bg` in `src/index.css` or the mono palette ([launch intro](launch-intro.md)). |
| `node scripts/render-widget-tray.mjs` | Regenerates the chamfered widget tray 9-patches (no dependencies; [widgets](widgets.md)). |
| `node scripts/render-pwa-icons.mjs` | Regenerates the PWA PNG icons in `public/icons/` from the icon SVG. Needs `npm i --no-save sharp` ([pwa.md](pwa.md)). |
| `node scripts/render-brand.mjs` | Regenerates launcher PNGs from the icon SVG ([brand](brand.md)). |
| `python3 scripts/generate-usda-foods.py <zip>` | Regenerates the USDA rows ([data-nutrition](data-nutrition.md)). |
| `python3 scripts/package-android.py` | Optional handoff ZIP in `public/downloads/` (untracked). |
| `node scripts/smoke.mjs`, `node scripts/check-journal.mjs` | Browser tests; need Playwright ([verification](verification.md)). |

## Recommended APK flow (from a fresh clone)

```sh
npm ci
node scripts/check-widget-layouts.mjs
node scripts/prepare-android.mjs        # clean build + cap sync + checks
npx cap open android                    # or: cd android && ./gradlew assembleDebug   (Windows: gradlew.bat)
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Re-run `prepare-android.mjs` after every web-app change or Capacitor plugin change; Android Studio never runs `cap sync` itself. Native Java/XML edits only need a Gradle rebuild.
