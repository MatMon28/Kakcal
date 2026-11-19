# Known gaps between documentation and repository

> **Scope:** things found during the documentation audit that the code or `package.json` does not (yet) do. Documents describe the repository as it **is**; this file lists what is missing or surprising.
>
> **Read when:** a documented command fails, or you plan housekeeping.
>
> **Related:** [setup-build.md](setup-build.md), [verification.md](verification.md), [provenance.md](provenance.md)

| # | Gap | Impact | Suggested fix |
| --- | --- | --- | --- |
| 1 | `package.json` defines only `dev`, `build`, `preview`, `android:prepare`. Earlier docs also listed `android:sync`, `android:build`, `android:build:win`, `android:open`, `android:check-widgets` and `build:catalog`, which do not exist. | The commands in those docs failed with "missing script". The docs now use the direct `node`/`npx` commands. | Add the scripts (snippet below) if you want the short aliases back. |
| 2 | `android:prepare` is `npm run build && npx cap sync android`. | It syncs the **browser preview** (demo data, service worker) into the APK. | Point it at `node scripts/prepare-android.mjs` (snippet below). |
| 3 | `playwright` is imported by `scripts/smoke.mjs` and `scripts/check-journal.mjs` but is not in `devDependencies`. | The tests fail with "Cannot find package 'playwright'". | `npm i -D playwright`. |
| 4 | The tour's **Android project** link (`AppTour.tsx`, asserted by `smoke.mjs`) points to `./downloads/Kakcalculator-Android-Studio.zip`, which is not tracked; older docs also mentioned a `public/changes.patch` copy. | The link returns 404 in a fresh build (and `smoke.mjs` step 1 fails on the missing file only if it fetches it). | Generate the ZIP with `scripts/package-android.py` before `npm run build`, or hide the link. |
| 5 | Next.js leftovers (`src/app/`, `src/db/`, `next.config.ts`, `drizzle.config.json`, `eslint.config.mjs`, unused `Toast.tsx`). | Inert, but `npx tsc --noEmit` is documented to report errors from them. | Delete them in a separate clean-up commit. |
| 6 | `.idea/` is tracked although `.gitignore` lists it. | Editor noise in diffs. | `git rm -r --cached .idea`. |
| 7 | The Android system launch screen follows the saved theme only on **Android 13+** (`Context.setSplashScreenTheme`, see [launch-intro.md](launch-intro.md)). On Android 12 and older it is always the Light cream `#EFE9DD`. It is also Light cream on the very first launch after install (no stored colour yet). | Dark users on Android 12 or older still see cream briefly before the themed boot layer. The window / WebView / boot layer are themed on every version. | No platform API exists for older versions; the only alternative is one launcher `activity-alias` per theme, which is not worth the cost. |
| 8 | The PWA install/offline flow (`offline-worker.js` v2, `InstallApp`, manifest) was verified only by build output, static serving and unit checks of the Android tag stripping; it was **not** run in a live browser (no Chromium libraries in the authoring environment). `scripts/smoke.mjs` was not extended for the manifest or install button. | A regression in install/offline would not be caught automatically. | Follow the manual checks in [pwa-setup.md](pwa-setup.md#5-verify); optionally add a Playwright step that waits for `navigator.serviceWorker.controller`, fetches `manifest.webmanifest` and reloads offline. |
| 9 | iOS Safari has no install prompt and may evict `localStorage`/caches of sites not opened for a while (not when installed to the Home Screen). | iOS users can lose offline cache or, in rare cases, data. | Tell iOS users to *Add to Home Screen* and to export a backup regularly. |

Snippet for gap 1 and 2 (`package.json` > `scripts`):

```json
"android:prepare": "npm install && node scripts/check-widget-layouts.mjs && node scripts/prepare-android.mjs",
"android:sync": "npx cap sync android",
"android:open": "npx cap open android",
"android:check-widgets": "node scripts/check-widget-layouts.mjs",
"build:catalog": "node scripts/build-off-catalog.mjs"
```
