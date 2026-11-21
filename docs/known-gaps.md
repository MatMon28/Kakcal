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
| 4 | The tour's header used to link the untracked `downloads/Kakcalculator-Android-Studio.zip` (smoke step 1). **Fixed:** the dead link is replaced by the install guide. The new `InstallGuide.tsx` APK button points at `downloads/Kakcalculator.apk`, which must be copied into `public/downloads/` before the build; when absent the guide explains this and links GitHub releases + `android/BUILD_APK.md`. | A missing APK still means no one-tap native download from the guide. | Add the signed APK to the release/hosting step (not tracked in git), or keep the release link. |
| 5 | Next.js leftovers (`src/app/`, `src/db/`, `next.config.ts`, `drizzle.config.json`, `eslint.config.mjs`, unused `Toast.tsx`). | Inert, but `npx tsc --noEmit` is documented to report errors from them. | Delete them in a separate clean-up commit. |
| 6 | `.idea/` is tracked although `.gitignore` lists it. | Editor noise in diffs. | `git rm -r --cached .idea`. |
| 7 | The Android system launch screen follows the saved theme only on **Android 13+** (`Context.setSplashScreenTheme`, see [launch-intro.md](launch-intro.md)). On Android 12 and older it is always the Light cream `#EFE9DD`. It is also Light cream on the very first launch after install (no stored colour yet). | Dark users on Android 12 or older still see cream briefly before the themed boot layer. The window / WebView / boot layer are themed on every version. | No platform API exists for older versions; the only alternative is one launcher `activity-alias` per theme, which is not worth the cost. |
| 8 | The PWA install/offline flow was not run in a live browser during the original audit. **Partly fixed in this round:** `npm run build` and `npx tsc --noEmit` were run, and headless Chromium checks captured the tour, the install guide (desktop, mobile, Android/APK panels) and a simulated installed launch (`matchMedia('(display-mode: standalone)')` patched) which opened the journal with no errors. Real install prompts, iOS Safari, APK installation and offline reloads were **not** exercised. | Device-specific install steps remain unverified on real hardware. | Install from Chrome/Edge and Safari, install the APK on Android 13+, and reload offline. |
| 9 | iOS Safari has no install prompt and may evict `localStorage`/caches of sites not opened for a while (not when installed to the Home Screen). | iOS users can lose offline cache or, in rare cases, data. | Tell iOS users to *Add to Home Screen* and to export a backup regularly. |
| 10 | Start-up round (R8 + `shrinkResources`, `res/raw/keep.xml`, hand-written `baseline-prof.txt`, `androidx.profileinstaller`, `applySplashThemeWhenIdle`) was written without an Android SDK; Gradle was never run. The 200 ms vs 1.6 s intro figure is from headless Chromium on a desktop CPU. | A keep-rule gap could break a *release* build only (plugin, widgets, launch colour, reminder icons). Real phones will time differently. | Build and test the signed **release** variant on Android 13+ and an older device. Generate a measured baseline profile in Android Studio ([startup-performance.md](startup-performance.md)). |
| 11 | The full-bleed large notification icon and the enlarged status-bar silhouette were checked only as an image and as valid XML. | Vendor skins crop and tint notification icons differently. | Send a test notification (Settings > Notifications) on your phone. |
| 12 | Koink-style branding rounds: the artwork, launch animations, lockups, overview sheet, launcher / PWA / notification icons and colours were all redrawn. They were checked as images, frame by frame (animations, the lockups' last frame equals the wordmark) and in a phone-sized headless Chromium (header, tour, launch intro in Light and Dark, Add food by clock time, `docs/branding-render.png`). `scripts/smoke.mjs` (needs `prepare-android.mjs` first) and a real Android device / installed PWA were **not** run, and the notification glyph and the dark Koink icon (Koink ships none) were only previewed as images. | The notification circle is now `#0B0F1E` instead of green; the launch animations were checked in Chromium only (WebKit / old Android WebViews not tested); installed PWAs get the new icons when the `v4` service worker activates. | Install the PWA / APK once and look at the launcher, the launch animation (`?intro=1` ... `?intro=6` in a browser), a test notification, and the dark theme. |

Snippet for gap 1 and 2 (`package.json` > `scripts`):

```json
"android:prepare": "npm install && node scripts/check-widget-layouts.mjs && node scripts/prepare-android.mjs",
"android:sync": "npx cap sync android",
"android:open": "npx cap open android",
"android:check-widgets": "node scripts/check-widget-layouts.mjs",
"build:catalog": "node scripts/build-off-catalog.mjs"
```

**Advanced personalisation round:** verified by `tsc`, `npm run build` and a jsdom run of the built bundle (goal icons, tab order, Body cards, dock buttons, pop-up). Visual layout (icon sizes in each of the 7 themes, charts) was **not** checked in a real browser or on a device. The guided tour does not mention the Body page (it is opt-in and off by default).
