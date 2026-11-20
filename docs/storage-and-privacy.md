# Storage, backup, network and privacy

> **Scope:** localStorage keys, what the JSON backup contains, camera/barcode and network use.
>
> **Read when:** you add or rename a persisted key, change backup/import, or need to know what goes over the network.
>
> **Related:** journal-pages.md, notifications.md, file-map/app-shell.md

The source of truth is the journal in WebView `localStorage`. `kcalsync_day_logs`, `kcalsync_profile`, `kcalsync_custom_foods`, `kcalsync_used_foods` (catalogue foods you picked or starred, so favorites, recents and recipes keep resolving), `kcalsync_prebuilt_meals`, `kcalsync_custom_activities`, `kcalsync_settings` and `kf_period_data` hold the main records. Language, recent portions and UI expansion preferences have separate local keys. The Settings JSON backup includes profile, day logs, custom and picked catalogue foods, meals, activities, settings and cycle data; it does **not** include every UI preference. Android export uses the system document picker. Backups are unencrypted. Clearing storage or uninstalling can remove the journal.

Camera scanning is optional and depends on `BarcodeDetector` and permission. Known barcodes (your own foods and the 130,000 catalogue products) and manual food entry work offline. New Open Food Facts searches and opening external nutrition references need internet. Native widgets use no network. The browser service worker is not used by the APK.

**Key inventory (checked against `src/`):** `kcalsync_day_logs`, `kcalsync_profile`, `kcalsync_custom_foods`, `kcalsync_used_foods`, `kcalsync_prebuilt_meals`, `kcalsync_custom_activities`, `kcalsync_settings` (includes `notifications`), `kf_period_data`, plus UI-preference keys `kcalsync_lang`, `kcalsync_last_amounts` (remembered portions), `kcalsync_stats_weight_open`, `kcalsync_stats_daily_open` and `kcalsync_intro_last` (last launch animation). Manifest has `allowBackup="false"`.

**PWA / service worker:** in the browser build `offline-worker.js` caches only the app shell (`index.html`), the PWA manifest and icons, and the static catalogue `data/off-foods.bin`. It never caches journal data, backups or barcode lookups, and adds **no new storage keys**. The install button (`src/utils/pwaInstall.ts`) keeps its state in memory only. See [pwa.md](pwa.md).

**Native-only setting:** the Android app stores the current background colour (`#rrggbb`, no personal data) in its own SharedPreferences file `launch_background` so the next launch starts on the same colour (see [launch-intro.md](launch-intro.md)). It is not part of the JSON backup and is rewritten from the theme on every start.

**Delete all data:** Settings > *Delete all data* (after two confirmations) runs `src/utils/deleteAllData.ts`: it cancels the pending reminder notifications (Android app only), calls `localStorage.clear()` and `sessionStorage.clear()` and reloads the page, so every key listed above (including the language, theme, intro and UI-preference keys) is removed and the app restarts empty. It does not touch files you exported yourself, and the Android SharedPreferences cache of the widgets is refreshed with empty figures by the next start-up publish.

**Advanced layout:** `kcalsync_layout` (switch, per-page field order / widths / sizes / removed fields, meal types added by the user). Food logged in an added meal type lives in the normal day logs under `meals.custom_*`. Included in the JSON backup as `layout`.

**Advanced personalisation:** `kcalsync_advanced` (goal/limit switches and values, body-measure switch, tracked measure ids, custom measures), `kcalsync_body` (recorded body measurements per measure id and date) and the UI key `kcalsync_body_range` (selected Body page period). The JSON backup gets an `advanced` section with the first two; older backups without it import fine. See [advanced-personalisation.md](advanced-personalisation.md).
