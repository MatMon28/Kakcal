# Kakcalculator documentation index

**How to use this documentation (humans and LLMs):** read *only this file*, pick the single row that matches your task, open that one file, and stop. Every document starts with a *Scope / Read when / Related* box so you can tell in three lines whether it is the right one. Never read the whole set. To find the file that implements something, open [file-map/README.md](file-map/README.md) and then one area file.

## Task -> document

| I want to... | Open |
| --- | --- |
| Install, build, run scripts | [setup-build.md](setup-build.md) |
| Run the browser version, tour, URL flags, demo data | [web-preview.md](web-preview.md) |
| Build / sign / distribute the APK | [android-apk.md](android-apk.md), then [../android/BUILD_APK.md](../android/BUILD_APK.md) |
| Fix a Gradle / Capacitor sync error | [android-gradle-guard.md](android-gradle-guard.md) |
| Change widgets | [widgets.md](widgets.md) |
| Change reminders | [notifications.md](notifications.md) |
| Understand header / dialogs | [journal-shell.md](journal-shell.md) |
| Understand a page (Today, Food, Movement, Custom, Statistics, Period, Settings) | [journal-pages.md](journal-pages.md) |
| Change animations / springs / swipe feel | [motion.md](motion.md) |
| Change swipe rules or Back button | [gestures.md](gestures.md) |
| Change the launch animation | [launch-intro.md](launch-intro.md) |
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

Checked against repository commit **`4552bf0`** (the later `f037263` only changed docs; the launch-screen change adds `splash_blank.xml`) ("Added animations"): npm scripts vs `package.json`, every path mentioned in the docs vs the file tree, activity count (181), tour steps (16), widget providers (4), Gradle modules (3), versions (versionCode 3 / 1.1.0, AGP 8.13.0, Gradle 8.14.3, minSdk 24, SDK 36), wrapper JAR SHA-256, notification IDs, storage keys, OFF catalogue statistics (130,000 products; 128,697 with sugar; 25,758 with portion), `DATA_CACHE` name and Capacitor config. Discrepancies are fixed in the text or listed in [known-gaps.md](known-gaps.md). Runtime/UI claims (animation timings, pixel sizes, screenshot-level UI behaviour) were carried over from the previous README and were **not** re-measured; the test scripts were not re-run.
