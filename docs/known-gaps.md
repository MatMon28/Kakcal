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
| 7 | The Android system launch screen (now the full-name wordmark, ink `#232325`) is always the Light cream `#EFE9DD`, whatever theme the user chose in the app. | Dark / Lite Dark users see the dark-ink wordmark on cream for a moment before the web boot screen and the animated intro (both use their theme). | Mirror the theme into a native `SharedPreferences` value (e.g. from `JournalDevicePlugin`) and pick a `values-night`-style splash colour in `MainActivity` before `super.onCreate`. |

Snippet for gap 1 and 2 (`package.json` > `scripts`):

```json
"android:prepare": "npm install && node scripts/check-widget-layouts.mjs && node scripts/prepare-android.mjs",
"android:sync": "npx cap sync android",
"android:open": "npx cap open android",
"android:check-widgets": "node scripts/check-widget-layouts.mjs",
"build:catalog": "node scripts/build-off-catalog.mjs"
```
