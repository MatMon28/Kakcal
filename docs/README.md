# Kakcalculator documentation index

**How to use this documentation (humans and LLMs):** read *only this file*, pick the single row that matches your task, open that one file, and stop. Every document starts with a *Scope / Read when / Related* box so you can tell in three lines whether it is the right one. Never read the whole set. To find the file that implements something, open [file-map/README.md](file-map/README.md) and then one area file.

## Task -> document

| I want to... | Open |
| --- | --- |
| Install, build, run scripts | [setup-build.md](setup-build.md) |
| Run the browser version, tour, URL flags, demo data | [web-preview.md](web-preview.md) |
| Change the install instructions (iOS / Android / PC / APK) or when the app opens instead of the guide | [pwa.md](pwa.md#install-guide-and-always-open-the-app) |
| Make / host / install the PWA, offline mode, install button | [pwa.md](pwa.md), steps in [pwa-setup.md](pwa-setup.md) |
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
| Manifest, icons, `offline-worker.js`, install button, PWA tags in `index.html` | [pwa.md](pwa.md), [pwa-setup.md](pwa-setup.md), `file-map/scripts-public.md` |
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

**Install guide round (on top of `492413d`, "Faster startup and fixes"):** install instructions for iOS, Android (with the APK and its warning) and desktop on the tour page, an installed PWA (and a browser tab on a device where it was installed) always opens the journal, and the web build left review mode: no demo data in the real journal, the tour's phone runs on an in-memory sandbox. Docs updated: root README, this index, pwa, pwa-setup, web-preview, setup-build, storage-and-privacy, verification, known-gaps (#12-14) and the file maps (app-shell, utils, data, tour-widgets-intro). Verified by `npm run build` and jsdom runs of the built bundle only; no real browser or device install was run.
