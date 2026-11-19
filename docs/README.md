# Kakcalculator documentation index

**How to use this documentation (humans and LLMs):** read *only this file*, pick the single row that matches your task, open that one file, and stop. Every document starts with a *Scope / Read when / Related* box so you can tell in three lines whether it is the right one. Never read the whole set. To find the file that implements something, open [file-map/README.md](file-map/README.md) and then one area file.

## Task -> document

| I want to... | Open |
| --- | --- |
| Install, build, run scripts | [setup-build.md](setup-build.md) |
| Run the browser version, tour, URL flags, demo data | [web-preview.md](web-preview.md) |
| Make / host / install the PWA, offline mode, install button | [pwa.md](pwa.md), steps in [pwa-setup.md](pwa-setup.md) |
| Change the iPhone / Android (PWA + APK) / desktop install guide | [pwa.md](pwa.md) > Install guide |
| Build / sign / distribute the APK | [android-apk.md](android-apk.md), then [../android/BUILD_APK.md](../android/BUILD_APK.md) |
| Fix a Gradle / Capacitor sync error | [android-gradle-guard.md](android-gradle-guard.md) |
| Change widgets | [widgets.md](widgets.md) |
| Change reminders | [notifications.md](notifications.md) |
| Understand header / dialogs | [journal-shell.md](journal-shell.md) |
| Understand a page (Today, Food, Movement, Custom, Statistics, Period, Settings) | [journal-pages.md](journal-pages.md) |
| Change animations / springs / swipe feel | [motion.md](motion.md) |
| Change swipe rules or Back button | [gestures.md](gestures.md) |
| Change the launch animation or launch-screen colours | [launch-intro.md](launch-intro.md) |
| Speed up app start | [startup-performance.md](startup-performance.md) |
| Add or rename a stored key, backup, network behaviour | [storage-and-privacy.md](storage-and-privacy.md) |
| Calorie maths, colours | [calculations-colors.md](calculations-colors.md) |
| Icon, wordmark, launcher art | [brand.md](brand.md) |
| Activities / METs | [data-activities.md](data-activities.md) |
| Bundled foods (USDA, curated) | [data-nutrition.md](data-nutrition.md) |
| 130,000-product Open Food Facts catalogue | [data-off-catalogue.md](data-off-catalogue.md) |
| Run tests / pre-release checks | [verification.md](verification.md) |
| Produce or apply `changes.patch` | [changes-patch.md](changes-patch.md) |
| Know why Next.js leftovers exist | [provenance.md](provenance.md) |
| See what docs and code disagree on | [known-gaps.md](known-gaps.md) |
| Find which file does X | [file-map/README.md](file-map/README.md) |

## Keeping the docs current

After **every** new feature or new/renamed/deleted file, update the matching document in the same change:

| If you change... | Update |
| --- | --- |
| Any file (add / rename / delete) | the row in the matching `file-map/*.md` |
| `package.json` scripts, requirements, build flow | [setup-build.md](setup-build.md), [known-gaps.md](known-gaps.md) |
| Manifest, icons, `offline-worker.js`, install button/guide, PWA tags in `index.html` | [pwa.md](pwa.md), [pwa-setup.md](pwa-setup.md), `file-map/scripts-public.md`, `file-map/components-common.md` |
| Widgets (Java, layouts, gallery, settings) | [widgets.md](widgets.md) and `android/BUILD_APK.md` > Widget behavior |
| Notifications | [notifications.md](notifications.md) and `android/BUILD_APK.md` > Reminder notifications |
| Persisted keys / backup | [storage-and-privacy.md](storage-and-privacy.md) |
| Page behaviour or Settings layout | [journal-pages.md](journal-pages.md) / [journal-shell.md](journal-shell.md) |
| Animation constants | [motion.md](motion.md), [launch-intro.md](launch-intro.md) |
| Food/activity data or counts | [data-activities.md](data-activities.md), [data-nutrition.md](data-nutrition.md), [data-off-catalogue.md](data-off-catalogue.md) |
| Android version, permissions, modules | `android/BUILD_APK.md`, [android-apk.md](android-apk.md), [file-map/android-native.md](file-map/android-native.md) |
| Docs structure itself | this file and the root `README.md` |

Then regenerate the patch ([changes-patch.md](changes-patch.md)). Keep each document under roughly 120 lines; if one grows, split it and add a row above.

## Last audit

Checked against repository commit **`4552bf0`** (the later `f037263` only changed docs; later changes replace `splash_blank.xml` with `splash_wordmark.xml`, add the `#kc-boot` boot screen, the theme-matching widget trays and the transparent intro card) ("Added animations"): npm scripts vs `package.json`, every path mentioned in the docs vs the file tree, activity count (181), tour steps (16), widget providers (4), Gradle modules (3), versions (versionCode 3 / 1.1.0, AGP 8.13.0, Gradle 8.14.3, minSdk 24, SDK 36), wrapper JAR SHA-256, notification IDs, storage keys, OFF catalogue statistics (130,000 products; 128,697 with sugar; 25,758 with portion), `DATA_CACHE` name and Capacitor config. Discrepancies are fixed in the text or listed in [known-gaps.md](known-gaps.md). Runtime/UI claims (animation timings, pixel sizes, screenshot-level UI behaviour) were carried over from the previous README and were **not** re-measured; the test scripts were not re-run.

**PWA round (on top of `6b6999e`):** added `pwa.md`, `pwa-setup.md`, the manifest, icons, install button and worker update. Docs updated for this round: root README, this index, setup-build, known-gaps, storage-and-privacy, brand, verification, journal-pages, web-preview, changes-patch and the file maps (app-shell, utils, components-common, scripts-public). The PWA was checked by build output, static serving and the Android tag stripping; the browser install/offline flow was **not** exercised in a live browser (see [known-gaps.md](known-gaps.md) #8).

**Launch / search / style round (on top of `7288fe6`, "For github pages"):** launch screens are now logo-free and theme-coloured (`launch-intro.md`, `known-gaps.md` #7, `file-map/android-native.md`, `scripts-public.md`, `setup-build.md`, `storage-and-privacy.md`), notification icons use the app's K + poop (`notifications.md`, `brand.md`), Food search pins only matching favourites (`journal-pages.md`, `file-map/utils.md`), Aurora container radii and the Minimal Movement button (`journal-pages.md`, `widgets.md`). Verified by `npm run build` and XML validation only; the Android project was **not** compiled and nothing was run on a device (no Android SDK in the authoring environment), so test the launch on Android 13+ and on an older device.

**Readability / notification icon / start-up round (on top of `4e5b49d`, "Fixed error"):** Aurora Dark and Lite Dark labels on `var(--text)` fills no longer white-on-white (`calculations-colors.md`, `file-map/app-shell.md`); full-bleed large notification icon and bigger status-bar icon (`notifications.md`, `brand.md`, `file-map/scripts-public.md`, `file-map/android-native.md`); launch animation interrupted when loading finishes, deferred start-up work, R8 + resource shrinking, baseline profile (`startup-performance.md`, `launch-intro.md`, `file-map/utils.md`, `file-map/tour-widgets-intro.md`, `file-map/android-native.md`, `setup-build.md`, `android/BUILD_APK.md`, `known-gaps.md` #10-11, `changes-patch.md`). Verified by `npm run build`, headless-Chromium screenshots of Aurora Dark / Lite Dark and an intro timing run, XML validation and image inspection; the Android project was **not** compiled and nothing was run on a device.


**Launch animation round (on top of `e48d810`, "Updated PWA"):** the launch animation no longer stops when loading finishes: it starts before the app modules are evaluated (`intro/earlyStart.ts`, `intro/launchIntro.ts`, `main.tsx` awaits `afterFirstPaint()` before the first render), plays to its last frame, runs 1.35× faster (`INTRO_SPEED` in `introAnimations.ts`) and leaves when it has finished **and** the app is ready (hold 120 ms, fade 200 ms). Docs updated: `launch-intro.md`, `startup-performance.md`, `file-map/tour-widgets-intro.md`, `file-map/app-shell.md`, `changes-patch.md`, root README. Verified by `npm run build` and headless Chromium (timeline of all six animations, frame screenshots); not run on an Android device.

## Install guide / normal-use round

**Files added:** `src/components/common/InstallGuide.tsx` (device guide: iPhone/iPad, Android PWA + APK, desktop; mounted by `src/App.tsx`, opened with `openInstallGuide()`). **Files changed:** `InstallApp.tsx` (always offers the guide in browsers), `App.tsx` (installed PWA / iOS standalone / Android always show the journal), `pwaInstall.ts` (`isStandaloneApp`, `isIosDevice`, `detectInstallTarget`), `AppTour.tsx` + `tourContent.ts` (install section on the landing page, dead Android ZIP link removed), `config/demo.ts` (normal-use default: `VITE_DEMO_DATA=true` opts into demo data), `public/manifest.webmanifest` (`start_url ./?view=app&source=pwa`, `display_override`, `prefer_related_applications: false`), `public/offline-worker.js` (cache `kakcalculator-shell-v3`), docs. Verified with `npm run build`, `npx tsc --noEmit` (only the documented Next.js leftovers fail) and headless-Chromium screenshots of the tour, guide (desktop/mobile) and a simulated installed launch. Regenerate `changes.patch` with [changes-patch.md](changes-patch.md).
