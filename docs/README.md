# Kakcal (formerly Kakcalculator) documentation index

**How to use this documentation (humans and LLMs):** read *only this file*, pick the single row that matches your task, open that one file, and stop. Every document starts with a *Scope / Read when / Related* box so you can tell in three lines whether it is the right one. Never read the whole set. To find the file that implements something, open [file-map/README.md](file-map/README.md) and then one area file.

## Task -> document

| I want to... | Open |
| --- | --- |
| Install, build, run scripts | [setup-build.md](setup-build.md) |
| Run the browser version, tour, URL flags, demo data | [web-preview.md](web-preview.md) |
| Make / host / install the PWA, offline mode, install button | [pwa.md](pwa.md), steps in [pwa-setup.md](pwa-setup.md) |
| Change the iPhone / Android (PWA + APK) / desktop install guide | [pwa.md](pwa.md) > Install guide |
| Build / sign / distribute the APK | [android-apk.md](android-apk.md), then [../android/BUILD_APK.md](../android/BUILD_APK.md) |
| Make the **Download APK** button on the website really download (publish the APK, release workflow) | [apk-download.md](apk-download.md) |
| Fix a Gradle / Capacitor sync error | [android-gradle-guard.md](android-gradle-guard.md) |
| Change widgets | [widgets.md](widgets.md) |
| Change reminders | [notifications.md](notifications.md) |
| Understand header / dialogs | [journal-shell.md](journal-shell.md) |
| Understand a page (Today, Food, Movement, Custom, Statistics, Period, Settings), or how the meal is preselected by the time of day | [journal-pages.md](journal-pages.md) |
| Change animations / springs / swipe feel / the logo-click poop animation | [motion.md](motion.md) |
| Change swipe rules or Back button | [gestures.md](gestures.md) |
| Change the launch animation or launch-screen colours | [launch-intro.md](launch-intro.md) |
| Speed up app start | [startup-performance.md](startup-performance.md) |
| Add or rename a stored key, backup, network behaviour | [storage-and-privacy.md](storage-and-privacy.md) |
| Calorie maths, colours | [calculations-colors.md](calculations-colors.md) |
| Goals / limits icons, Body measurements page, body-part icons (Settings > Advanced) | [advanced-personalisation.md](advanced-personalisation.md) |
| Advanced layout: pencil (edit) icon, dashed outlines, free placement at any height, resize / remove fields, expanded meals vs chosen shape, added meal types, restore layout | [advanced-layout.md](advanced-layout.md) |
| Icon, wordmark (Koink-style layout, where the poop sits), launcher art, launch animations, notification icon / badge, every place the logo appears | [brand.md](brand.md) |
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
| Goals / limits, Body page, Profile body section, body-part icons | [advanced-personalisation.md](advanced-personalisation.md), `file-map/components-pages.md`, `file-map/components-modals.md`, `file-map/components-common.md`, `file-map/utils.md` |
| Advanced layout (editable grid, pencil toolbar, layout store, meal types) | [advanced-layout.md](advanced-layout.md), `file-map/components-common.md`, `file-map/components-dashboard.md`, `file-map/components-pages.md`, `file-map/components-modals.md`, `file-map/utils.md` |
| Page behaviour or Settings layout | [journal-pages.md](journal-pages.md) / [journal-shell.md](journal-shell.md) |
| Animation constants | [motion.md](motion.md), [launch-intro.md](launch-intro.md) |
| Food/activity data or counts | [data-activities.md](data-activities.md), [data-nutrition.md](data-nutrition.md), [data-off-catalogue.md](data-off-catalogue.md) |
| Where the APK is published / the download button | [apk-download.md](apk-download.md), [pwa-setup.md](pwa-setup.md) §6 |
| Android version, permissions, modules | `android/BUILD_APK.md`, [android-apk.md](android-apk.md), [file-map/android-native.md](file-map/android-native.md) |
| Docs structure itself | this file and the root `README.md` |

Then regenerate the patch ([changes-patch.md](changes-patch.md)). Keep each document under roughly 120 lines; if one grows, split it and add a row above.

## Last audit

Checked against repository commit **`4552bf0`** (the later `f037263` only changed docs; later changes replace `splash_blank.xml` with `splash_wordmark.xml`, add the `#kc-boot` boot screen, the theme-matching widget trays and the transparent intro card) ("Added animations"): npm scripts vs `package.json`, every path mentioned in the docs vs the file tree, activity count (181), tour steps (16), widget providers (4), Gradle modules (3), versions (versionCode 3 / 1.1.0, AGP 8.13.0, Gradle 8.14.3, minSdk 24, SDK 36), wrapper JAR SHA-256, notification IDs, storage keys, OFF catalogue statistics (130,000 products; 128,697 with sugar; 25,758 with portion), `DATA_CACHE` name and Capacitor config. Discrepancies are fixed in the text or listed in [known-gaps.md](known-gaps.md). Runtime/UI claims (animation timings, pixel sizes, screenshot-level UI behaviour) were carried over from the previous README and were **not** re-measured; the test scripts were not re-run.

**PWA round (on top of `6b6999e`):** added `pwa.md`, `pwa-setup.md`, the manifest, icons, install button and worker update. Docs updated for this round: root README, this index, setup-build, known-gaps, storage-and-privacy, brand, verification, journal-pages, web-preview, changes-patch and the file maps (app-shell, utils, components-common, scripts-public). The PWA was checked by build output, static serving and the Android tag stripping; the browser install/offline flow was **not** exercised in a live browser (see [known-gaps.md](known-gaps.md) #8).

**Launch / search / style round (on top of `7288fe6`, "For github pages"):** launch screens are now logo-free and theme-coloured (`launch-intro.md`, `known-gaps.md` #7, `file-map/android-native.md`, `scripts-public.md`, `setup-build.md`, `storage-and-privacy.md`), notification icons use the app's K + poop (`notifications.md`, `brand.md`), Food search pins only matching favourites (`journal-pages.md`, `file-map/utils.md`), Aurora container radii and the Minimal Movement button (`journal-pages.md`, `widgets.md`). Verified by `npm run build` and XML validation only; the Android project was **not** compiled and nothing was run on a device (no Android SDK in the authoring environment), so test the launch on Android 13+ and on an older device.

**Readability / notification icon / start-up round (on top of `4e5b49d`, "Fixed error"):** Aurora Dark and Lite Dark labels on `var(--text)` fills no longer white-on-white (`calculations-colors.md`, `file-map/app-shell.md`); full-bleed large notification icon and bigger status-bar icon (`notifications.md`, `brand.md`, `file-map/scripts-public.md`, `file-map/android-native.md`); launch animation interrupted when loading finishes, deferred start-up work, R8 + resource shrinking, baseline profile (`startup-performance.md`, `launch-intro.md`, `file-map/utils.md`, `file-map/tour-widgets-intro.md`, `file-map/android-native.md`, `setup-build.md`, `android/BUILD_APK.md`, `known-gaps.md` #10-11, `changes-patch.md`). Verified by `npm run build`, headless-Chromium screenshots of Aurora Dark / Lite Dark and an intro timing run, XML validation and image inspection; the Android project was **not** compiled and nothing was run on a device.


**Launch animation round (on top of `e48d810`, "Updated PWA"):** the launch animation no longer stops when loading finishes: it starts before the app modules are evaluated (`intro/earlyStart.ts`, `intro/launchIntro.ts`, `main.tsx` awaits `afterFirstPaint()` before the first render), plays to its last frame, runs 1.35× faster (`INTRO_SPEED` in `introAnimations.ts`) and leaves when it has finished **and** the app is ready (hold 120 ms, fade 200 ms). Docs updated: `launch-intro.md`, `startup-performance.md`, `file-map/tour-widgets-intro.md`, `file-map/app-shell.md`, `changes-patch.md`, root README. Verified by `npm run build` and headless Chromium (timeline of all six animations, frame screenshots); not run on an Android device.

## Medium widget / Mono / favourites / notification round (on top of `e4270fe`, "App renamed")

**1.** Medium widget (4x2): the macro row is exactly as tall as the buttons (40 dp) and the intake / burned cards fill all the remaining height, so they are always the biggest items (`widget_medium.xml`, `widget_medium_dark.xml`, `widget_styles.xml`, `WidgetGallery.tsx`; [widgets.md](widgets.md)). **2.** Mono style: Food and Movement buttons use the same plate as the other buttons in the app dock, the gallery and the native widgets (`themes.ts`, `JournalWidgetProvider.java`). **3.** Meal / recipe ingredient search: favourites are pinned first and starred like in Add Food, one typed character lists matching favourites (`PreBuiltMealsView.tsx`; [journal-pages.md](journal-pages.md)). **4.** In the meal / recipe editors the search bar is above the ingredients already present (same file). **5.** Notification icon: the glyph is rebuilt from the exact logo geometry with the K cut around the poop and transparent poop tier lines (`ic_stat_kak.xml`, `scripts/generate-notification-icon.mjs`; [notifications.md](notifications.md), [brand.md](brand.md)). Verified with `tsc` (no new errors in the touched files), XML parsing and a rendered preview of the glyph; the Android project was **not** compiled and nothing was run on a device, so check the Medium widget height, the Mono buttons and the notification circle on the phone.

## Polish round (on top of `7a5ad44`, "Better animations")

Six small changes. **1.** Popup exit ("sucked into the bottom-bar button") is now barely perceivable: 90 / 70 ms into a button, 80 / 60 ms to the bottom, 110 ms pulse (`Modal.tsx`, [motion.md](motion.md)). **2.** Ultra minimal: the expanded Activity card shows each activity's name again (`ActivityCardSummary.tsx`). **3.** The Medium widget is **4x2** by default: `widget_medium_info.xml` (110 dp), compacted `widget_medium.xml` / `widget_medium_dark.xml`, new `widget_actions_five_compact.xml`, new styles in `widget_styles.xml` ([widgets.md](widgets.md)). **4.** The wordmark's poop is transparent in every theme (`index.css`, [brand.md](brand.md)). **5.** *Ultra minimal mode* is now *Ultra minimal* / *Ultra minimale* (`translations.ts`, `BUILD_APK.md`). **6.** New **Delete all data** card at the bottom of Settings with a double confirmation (`DeleteAllData.tsx`, `deleteAllData.ts`, `SettingsModal.tsx`, [storage-and-privacy.md](storage-and-privacy.md)). Verified with `npm run build` and XML parsing of the widget resources; the Android project was **not** compiled and the Medium widget was **not** seen on a device (the compacted layout needs about 112 dp, so check it on a launcher whose 2 rows are shorter than that).

## Gesture round (on top of `38d15c3`, "things")

More sensitive page/popup swipes, one exit animation for every popup close (sucked into the bottom-bar button, the bar's centre or the bottom edge), bottom bar hides on scroll down / returns on a small scroll up, and swiping the Today calendar row changes the day. **Files changed:** `Modal.tsx`, `ActionDock.tsx`, `PageSwiper.tsx`, `DayNavigator.tsx`, `index.css`, `dockId` on the modals that a bar button opens (`AddFood`, `LogActivity`, `Water`, `Poop`, `Weight`, `CustomFood`, `CustomButton`, `CustomPicker`, `PeriodSheet`, two in `PreBuiltMealsView`). **Docs updated:** `gestures.md`, `motion.md`, `journal-shell.md`, file maps (common, dashboard), `changes-patch.md`. Verified with `npm run build` and headless Chromium with touch emulation (day swipe, tap still opens the calendar, exit geometry ends exactly on the button, swipe continuity, scroll hide/show, page swipe thresholds); not run on a device.

## Install guide / normal-use round

**Files added:** `src/components/common/InstallGuide.tsx` (device guide: iPhone/iPad, Android PWA + APK, desktop; mounted by `src/App.tsx`, opened with `openInstallGuide()`). **Files changed:** `InstallApp.tsx` (always offers the guide in browsers), `App.tsx` (installed PWA / iOS standalone / Android always show the journal), `pwaInstall.ts` (`isStandaloneApp`, `isIosDevice`, `detectInstallTarget`), `AppTour.tsx` + `tourContent.ts` (install section on the landing page, dead Android ZIP link removed), `config/demo.ts` (normal-use default: `VITE_DEMO_DATA=true` opts into demo data), `public/manifest.webmanifest` (`start_url ./?view=app&source=pwa`, `display_override`, `prefer_related_applications: false`), `public/offline-worker.js` (cache `kakcalculator-shell-v3`), docs. Verified with `npm run build`, `npx tsc --noEmit` (only the documented Next.js leftovers fail) and headless-Chromium screenshots of the tour, guide (desktop/mobile) and a simulated installed launch. Regenerate `changes.patch` with [changes-patch.md](changes-patch.md).

## APK download round (documentation only)

**File added:** `docs/apk-download.md` (why the install guide's **Download APK** button shows "not attached", how to publish the signed APK either by committing it with `git add -f` or via a GitHub Release plus a `pages.yml` step, how to verify and troubleshoot). **Docs updated:** this index, root README, `android-apk.md`, `pwa-setup.md` §6, `changes-patch.md`. **No source, workflow or config file was changed**: the workflow snippet is in the document for you to apply. Checked against the live site: `…/downloads/Kakcalculator.apk` returned 404 and the repository had no release. The steps were not run end to end (no signing key, no Android SDK in the authoring environment).

## Notification / popup / delete round (on top of `dfd1d51`, "Various fixes")

**1.** Notifications: the large icon (square logo on the right) is gone (`largeIcon` removed in `notifications.ts`, `ic_notification_large.png` and `render-notification-icon.mjs` deleted) and the small icon `ic_stat_kak.xml` is now a disc with the K + poop cut out, so the logo fills the circle on the left; regenerate with `scripts/generate-notification-icon.mjs` ([notifications.md](notifications.md), [brand.md](brand.md)). **2.** Popups: the closing animation ends immediately on the next press / key / wheel / new popup. **3.** Popups: taps right after a swipe-down close are no longer lost (tap rescue) ([motion.md](motion.md), [gestures.md](gestures.md)). **4.** The bin icon in the confirmation dialog is inline with its label (`ConfirmDialog.tsx`). **5.** *Delete all data* is a plain solid red button at the end of Settings, no title or description (`DeleteAllData.tsx`). Verified with `npm run build` and headless Chromium touch tests of items 2-3; the Android project was **not** compiled and the notification was **not** seen on a device (the system decides how the small icon is drawn in its circle, and some Samsung versions draw the launcher icon there instead).

## Transparent icon / Medium widget round (on top of `d022963`, "Fixed animations and others")

**1.** The reminder notification icon `ic_stat_kak.xml` no longer has a disc behind the logo: it is the K + poop glyph alone on a transparent background (a thin gap separates the poop from the K's leg; the glyph fills 88% of the viewport), so it sits cleanly in the circle Android/Samsung draws (`scripts/generate-notification-icon.mjs`, [brand.md](brand.md), [notifications.md](notifications.md)). **2.** Medium widget: the sizes are inverted, so intake / burned are now the prominent cards (icon 16 -> 24 dp, value 19 -> 22 sp, card padding 5 -> 4 dp) and the macro values are smaller (15 -> 12 sp) (`widget_medium.xml`, `widget_medium_dark.xml`, `widget_styles.xml`, [widgets.md](widgets.md)). Verified by rendering the new icon to PNG and by XML diff only; the Android project was **not** compiled and nothing was run on a device (check the Medium widget at 4x2 on a launcher with short rows).

## Rename round: Kakcalculator -> Kakcal

User-visible name changed to **Kakcal**; code identifiers keep the old name. Details and the exact list of what was kept: [brand.md](brand.md#rename-kakcalculator--kakcal). Docs updated: root README, this index, `brand.md`, `changes-patch.md`, `android/BUILD_APK.md`. No files were added, renamed or deleted, so the file maps are unchanged. Verified with `npm run build` and a rendered preview of the new wordmark; the Android project was **not** compiled and the browser smoke test (`scripts/smoke.mjs`, expectations updated) was **not** re-run.

**Drag-and-drop / icons round (on top of `8b3bc1f`, "advanced layout"):** drag-and-drop and side / corner resize in the advanced layout, independent fibre / salt / sugar fields, new goal badges, clearer body-part icons, centred profile icon (Settings > Advanced > Body measurements), smaller muted *Delete all data*. Docs updated: root README, `advanced-layout.md`, `advanced-personalisation.md`, `journal-pages.md`, `changes-patch.md`, `file-map/components-common.md`, `components-dashboard.md`, `components-pages.md`. Verified by `tsc` (no new errors against the base), `npm run build`, and a Node test of the layout store (migration, clamping, reordering); the pointer interactions were **not** exercised in a live browser (none available in the authoring environment), so try drag, resize and auto-scroll on a phone and on desktop.
