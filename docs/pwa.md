# Progressive Web App (PWA)

> **Scope:** how the browser build becomes an installable, offline-capable app: manifest, icons, service worker, install button, what is deliberately *not* part of it.
>
> **Read when:** you change `manifest.webmanifest`, the icons, `offline-worker.js`, the install button, or the PWA tags in `index.html`.
>
> **Related:** [pwa-setup.md](pwa-setup.md) (step-by-step instructions to host and install), [storage-and-privacy.md](storage-and-privacy.md), [brand.md](brand.md), [setup-build.md](setup-build.md)

## What makes it a PWA

| Piece | File | Notes |
| --- | --- | --- |
| Web app manifest | `public/manifest.webmanifest` | `display: standalone`, relative `start_url`/`scope` (`./`) so it works at a domain root **and** under a sub-path such as `https://user.github.io/Kakcalculator/`. `start_url` is `./?view=app&source=pwa`, so the installed copy always opens the journal itself. Theme/background `#EFE9DD` (the Light theme). |
| Icons | `public/icons/icon-192.png`, `icon-512.png` (purpose `any`), `maskable-512.png` (purpose `maskable`, artwork inside the 80 % safe zone), `apple-touch-icon.png` (180 px, iOS) | Generated from `src/assets/brand/kakcalculator-icon.svg` by `scripts/render-pwa-icons.mjs` (`npm i --no-save sharp` first). Served with `no-cache` (`public/_headers`): the names do not change when the art does. `badge-96.png` (white glyph on transparent, from `scripts/generate-notification-icon.mjs`) is the `badge` of browser notifications. |
| Document tags | `index.html`, between `<!-- pwa:start -->` and `<!-- pwa:end -->` | `rel="manifest"`, `apple-touch-icon`, `mobile-web-app-capable`, iOS web-app meta tags. |
| Service worker | `public/offline-worker.js` (registered in `src/main.tsx`) | Precaches the manifest and icons (`PWA_ASSETS`, best effort) and the shell. Cache `kakcalculator-shell-v5` (bumped for the new logo and icons, so installed copies fetch them). |
| Install capture | `src/utils/pwaInstall.ts`, started from `src/main.tsx` | Stores the browser's `beforeinstallprompt` event as soon as it fires, tracks `appinstalled` and standalone mode. States: `hidden`, `available`, `ios`, `installed`. |
| Install button | `src/components/common/InstallApp.tsx`, rendered in Settings under *Data Backup* (`SettingsModal.tsx`) | One-tap browser install when offered, otherwise/also a **How to install** button. Strings in `translations.ts` > `pwa` (English and Italian). Hidden inside the APK. |
| Install guide | `src/components/common/InstallGuide.tsx`, mounted by `src/App.tsx` (both tour and journal) | Self-contained, theme-aware sheet with iPhone/iPad (Safari Share → Add to Home Screen), Android (Chrome/Edge/Samsung PWA steps **plus the APK**, which explains the “unknown source / could be dangerous” Play Protect warning), and Windows/macOS/Linux steps. Opened with `openInstallGuide(target?, lang?)`; it is dispatched as a window event (`kc:open-install-guide`) and rendered above every journal modal. Detect target with `detectInstallTarget()`. |
| Host headers | `public/_headers` | Netlify / Cloudflare Pages: `offline-worker.js`, `index.html` and the manifest are always revalidated. See [pwa-setup.md](pwa-setup.md) for other hosts. |

## Behaviour

- **Single-file build.** `vite-plugin-singlefile` inlines all JS/CSS/fonts/logos into `dist/index.html`, so the shell is *one* file and offline support is trivial: the worker caches `index.html`. Everything the PWA needs besides it lives in `public/` and is copied verbatim to `dist/`. All URLs are relative (`./...`); do not change them to absolute paths.
- **Offline.** A navigation to the app root or `index.html` is network-first and falls back to the cached shell. `data/off-foods.bin` (the 130,000-product catalogue) is cached on first use (see [data-off-catalogue.md](data-off-catalogue.md)). Journal data lives in `localStorage` and never needs the network.
- **Updates.** Deploy a new build; the browser fetches `offline-worker.js` (revalidated), installs the new worker, which activates immediately (`skipWaiting` + `clients.claim`). Because the shell is network-first, the next normal launch while online shows the new version. When you change the worker or want to force-evict the shell, bump `CACHE` in `offline-worker.js`.
- **Install.** Chromium (Android, desktop) shows the *Install* button in Settings after `beforeinstallprompt`. Safari on iOS has no such event: Settings and the tour page show the install guide instead. The guide covers iPhone/iPad, Android PWA, the Android APK (with the “could be dangerous” explanation and alternative GitHub release/build links) and Windows/macOS/Linux. Once running standalone, Settings shows "Installed".
- **Installed launch.** An installed PWA (`display-mode: standalone`), an iOS Home Screen app and the Capacitor APK **always** open the journal. `App.tsx` ignores `?view=tour` there, and the manifest `start_url` requests `?view=app`. The tour is only the default for a first-time browser visit; `?view=app` opens the journal directly.
- **Normal-use mode.** Production browser builds no longer seed demo data: `DEMO_MODE` is true only with `VITE_DEMO_DATA=true` (and never when `VITE_ANDROID_RELEASE=true`), so new visitors start with their own empty journal. Review builds opt in explicitly.
- **APK download.** `InstallGuide.tsx` points at `./downloads/Kakcalculator.apk`. The file is not tracked in git; if it is missing, the guide says so and links the official GitHub releases and `android/BUILD_APK.md`. Copy the signed APK into `public/downloads/` before building if you want the direct button to work (it is also cached nowhere by design).
- **HTTPS required.** Service workers and install only work on `https://` or `http://localhost`. Over plain HTTP everything keeps working as a normal website without install/offline.
- **Android app.** The Capacitor APK is unaffected: `scripts/prepare-android.mjs` builds without `public/`, strips the PWA tags from `index.html` and the worker is never registered there. `InstallApp` hides itself inside the APK (`isAndroidApp()`).
- **Not included:** background sync, push notifications (reminders are native-Android only, see [notifications.md](notifications.md)), a custom "update available" banner, Windows/Play Store packaging.

## Changing things

- **New icon art:** edit `scripts/brand-geometry.mjs`, run `node scripts/generate-icon.mjs`, then `npm i --no-save sharp && node scripts/render-pwa-icons.mjs`, commit the PNGs in `public/icons/`.
- **New theme colour for the splash/title bar:** edit `theme_color` and `background_color` in the manifest. (The runtime `theme-color` meta tag is still set per theme by the pre-paint script in `index.html`.)
- **Add a file to the offline set:** add its relative path to `PWA_ASSETS` in `offline-worker.js` and bump `CACHE`.

## Service worker strategy (storage review round)

The build is no longer one inlined file (the catalogue search worker `assets/offCatalogSearch.worker-*.js` is one of the emitted assets, so it is precached like the rest and food search works offline): `dist/index.html` plus hashed `dist/assets/*`. `vite.config.ts` (`stampOfflineWorker`) stamps `offline-worker.js` with a build id (`kakcalculator-shell-<time>-<hash>`) and the asset list. Navigations are served from the cached shell at once and revalidated in the background (a conditional request, not a full download); `assets/*` are cache first; the newest **two** shell caches are kept so a page that is still open can lazy-load its own chunks after an update. `public/_headers` makes `/assets/*` immutable. Not yet tried on a real device or host.
