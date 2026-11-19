# Progressive Web App (PWA)

> **Scope:** how the browser build becomes an installable, offline-capable app: manifest, icons, service worker, install button, what is deliberately *not* part of it.
>
> **Read when:** you change `manifest.webmanifest`, the icons, `offline-worker.js`, the install button, or the PWA tags in `index.html`.
>
> **Related:** [pwa-setup.md](pwa-setup.md) (step-by-step instructions to host and install), [storage-and-privacy.md](storage-and-privacy.md), [brand.md](brand.md), [setup-build.md](setup-build.md)

## What makes it a PWA

| Piece | File | Notes |
| --- | --- | --- |
| Web app manifest | `public/manifest.webmanifest` | `display: standalone`, relative `start_url`/`scope` (`./`) so it works at a domain root **and** under a sub-path such as `https://user.github.io/Kakcalculator/`. Theme/background `#EFE9DD` (the Light theme). |
| Icons | `public/icons/icon-192.png`, `icon-512.png` (purpose `any`), `maskable-512.png` (purpose `maskable`, artwork inside the 80 % safe zone), `apple-touch-icon.png` (180 px, iOS) | Generated from `src/assets/brand/kakcalculator-icon.svg` by `scripts/render-pwa-icons.mjs` (`npm i --no-save sharp` first). |
| Document tags | `index.html`, between `<!-- pwa:start -->` and `<!-- pwa:end -->` | `rel="manifest"`, `apple-touch-icon`, `mobile-web-app-capable`, iOS web-app meta tags. |
| Service worker | `public/offline-worker.js` (registered in `src/main.tsx`) | Already existed for offline use; now also precaches the manifest and icons (`PWA_ASSETS`, best effort) and its shell cache is `kakcalculator-shell-v2`. |
| Install capture | `src/utils/pwaInstall.ts`, started from `src/main.tsx` | Stores the browser's `beforeinstallprompt` event as soon as it fires, tracks `appinstalled` and standalone mode. States: `hidden`, `available`, `ios`, `installed`. |
| Install button | `src/components/common/InstallApp.tsx`, rendered in Settings under *Data Backup* (`SettingsModal.tsx`) | Strings in `translations.ts` > `pwa` (English and Italian). Renders nothing when the app cannot be installed. |
| Host headers | `public/_headers` | Netlify / Cloudflare Pages: `offline-worker.js`, `index.html` and the manifest are always revalidated. See [pwa-setup.md](pwa-setup.md) for other hosts. |

## Behaviour

- **Single-file build.** `vite-plugin-singlefile` inlines all JS/CSS/fonts/logos into `dist/index.html`, so the shell is *one* file and offline support is trivial: the worker caches `index.html`. Everything the PWA needs besides it lives in `public/` and is copied verbatim to `dist/`. All URLs are relative (`./...`); do not change them to absolute paths.
- **Offline.** A navigation to the app root or `index.html` is network-first and falls back to the cached shell. `data/off-foods.bin` (the 130,000-product catalogue) is cached on first use (see [data-off-catalogue.md](data-off-catalogue.md)). Journal data lives in `localStorage` and never needs the network.
- **Updates.** Deploy a new build; the browser fetches `offline-worker.js` (revalidated), installs the new worker, which activates immediately (`skipWaiting` + `clients.claim`). Because the shell is network-first, the next normal launch while online shows the new version. When you change the worker or want to force-evict the shell, bump `CACHE` in `offline-worker.js`.
- **Install.** Chromium (Android, desktop) shows the *Install* button in Settings after `beforeinstallprompt`. Safari on iOS has no such event: Settings shows the *Share > Add to Home Screen* hint instead. Once running standalone, Settings shows "Installed".
- **HTTPS required.** Service workers and install only work on `https://` or `http://localhost`. Over plain HTTP everything keeps working as a normal website without install/offline.
- **Android app.** The Capacitor APK is unaffected: `scripts/prepare-android.mjs` builds without `public/`, strips the PWA tags from `index.html` and the worker is never registered there. `InstallApp` hides itself inside the APK (`isAndroidApp()`).
- **Not included:** background sync, push notifications (reminders are native-Android only, see [notifications.md](notifications.md)), a custom "update available" banner, Windows/Play Store packaging.

## Install guide and "always open the app"

- **Install guide.** The tour page (`/`, for new visitors in a browser tab) starts with an *Install* section, `src/components/tour/InstallGuide.tsx`, texts in `installContent.ts` (English and Italian). Tabs: **iPhone / iPad** (Safari > Share > Add to Home Screen), **Android** (Chrome install, plus an **APK download** with the yellow notice that Android / Play Protect may call the file harmful and how to continue), **Computer** (Chrome/Edge install icon and menu, Safari *Add to Dock*, Firefox cannot). The tab matching the device is selected first (`detectPlatform()`); an *Install now* button appears when the browser has fired `beforeinstallprompt`; once installed the section shows a green "installed" note. A header button *Install app* scrolls to it.
- **APK link.** `src/config/install.ts`: `APK_URL` defaults to the asset `Kakcalculator.apk` of the latest GitHub release (`.../releases/latest/download/Kakcalculator.apk`). Build the APK, create a release and upload it under that name; or build with `VITE_APK_URL=https://... npm run build`. APKs are git-ignored, so the file is never in the repository.
- **Installed = app only.** `App.tsx` calls `shouldOpenJournal(view)` (`src/utils/pwaInstall.ts`): in standalone / fullscreen / minimal-ui / window-controls-overlay display mode (or iOS `navigator.standalone`) the journal always opens, whatever the URL (`?view=tour` is ignored there, because older iOS saves the *current* URL when adding to the Home Screen). The decision is made in JavaScript, so the service worker and manifest are unchanged.
- **Remembered per browser.** When the app is installed (`appinstalled`, accepted prompt) or ever runs standalone, `localStorage.kc_pwa_installed = '1'` is set. In a normal tab of the same browser profile the root URL then also opens the journal; the guide only shows to new visitors. `?view=tour` always shows the guide again. iOS keeps the Home Screen app's storage separate from Safari, so the flag only matters where the installed app and the browser share storage (Chrome/Edge/Android/desktop); the standalone check covers iOS.
- **Normal-use mode (no demo data).** The PWA used to ship in *review mode*: an empty journal was filled with sample meals, activity, recipes, favourites, custom buttons and period data. Now the app starts empty. The tour's embedded phone (`?tour=1`) still shows demo data, but `src/utils/tourStorage.ts` swaps `localStorage` there for an in-memory copy (language and theme are copied in and written back, nothing else), so demo data can never reach the real journal. `src/config/demo.ts` enables demo data only for that sandbox, or for `VITE_DEMO_DATA=true` builds.

## Changing things

- **New icon art:** edit the brand SVG, run `npm i --no-save sharp && node scripts/render-pwa-icons.mjs`, commit the PNGs in `public/icons/`.
- **New theme colour for the splash/title bar:** edit `theme_color` and `background_color` in the manifest. (The runtime `theme-color` meta tag is still set per theme by the pre-paint script in `index.html`.)
- **Add a file to the offline set:** add its relative path to `PWA_ASSETS` in `offline-worker.js` and bump `CACHE`.
