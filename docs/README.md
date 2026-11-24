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
| Change meal planning, meal notes, meal diary or photo diary | [meal-journal.md](meal-journal.md) |
| Planner wizard (days, weekdays, specific days), Excel export, *Add to Meals*, recipe portion, protein per kg, intake / burned target, water in Statistics, Custom shortcuts, photo time range, recent / favourite foods | [new-features-update.md](new-features-update.md) |
| Change the Custom grid in Minimal mode, header icons, photo diary pop-ups, "Go to the meal", short share links, when the share pop-up opens | [custom-photo-share-update.md](custom-photo-share-update.md) |
| Custom bottom bar (Plan / Photo diary), planner first / last day, planner drafts, earlier-plan and quick-food shortcuts, Foods pills, header icon order, removed taglines, deleted Next.js leftovers | [planner-dock-update.md](planner-dock-update.md) |
| Plan name on planner page 1, planner colours, *See all plans* (current / past, edit, reuse), shopping list per plan, "5 recent foods + ..." chips | [plans-shopping-update.md](plans-shopping-update.md) |
| Change animations / springs / swipe feel / the page-change (tap / Back) transition / the logo-click poop animation | [motion.md](motion.md) |
| Change swipe rules or Back button | [gestures.md](gestures.md) |
| Change the launch animation or launch-screen colours | [launch-intro.md](launch-intro.md) |
| Speed up app start | [startup-performance.md](startup-performance.md) |
| See what the performance / storage / tooling review changed, and what is still open | [performance-review.md](performance-review.md) |
| Typing in a food search lags, the 130,000-product catalogue is searched, result caches, the catalogue Web Worker, dialogs close slowly / clone the DOM, `dialogExit.ts` | [search-and-animation-performance.md](search-and-animation-performance.md) |
| Page change / swipe lags, the Custom page is slow with lots of data, lazy-mounted accordions, deferred section bodies (`LazyBody defer`), the contained leaving page, swipe placeholder, layout reads in effects, narrow `useSettings()` subscriptions, the page-change benchmark and its budget | [performance.md](performance.md) |
| Add or rename a stored key, backup, network behaviour | [storage-and-privacy.md](storage-and-privacy.md) |
| JSON export / import: what the backup contains, the pictures warning, backup version 2, how a new stored key must be added to the backup, the Android APK export writing a 0 B file | [backup-update.md](backup-update.md) |
| Calorie maths, colours | [calculations-colors.md](calculations-colors.md) |
| Goals / limits icons, Body measurements page, body-part icons (Settings > Advanced) | [advanced-personalisation.md](advanced-personalisation.md) |
| Advanced layout: pencil (edit) icon, dashed outlines, free placement at any height, resize / remove fields, expanded meals vs chosen shape, added meal types, restore layout | [advanced-layout.md](advanced-layout.md) |
| Icon, wordmark (Koink-style layout, where the poop sits), launcher art, launch animations, notification icon / badge, every place the logo appears | [brand.md](brand.md) |
| Activities / METs | [data-activities.md](data-activities.md) |
| Bundled foods (USDA, curated) | [data-nutrition.md](data-nutrition.md) |
| 130,000-product Open Food Facts catalogue | [data-off-catalogue.md](data-off-catalogue.md) |
| Run tests / pre-release checks | [verification.md](verification.md) |
| Produce or apply `changes.patch` | [changes-patch.md](changes-patch.md) |
| Know where the Android shell came from and which Next.js leftovers were removed | [provenance.md](provenance.md) |
| See what docs and code disagree on | [known-gaps.md](known-gaps.md) |
| Find which file does X | [file-map/README.md](file-map/README.md) |
| Find a CSS rule / translation string / `AppContext` part / Custom page part now that the big files are split | [file-organisation.md](file-organisation.md) |
| Read the history of earlier rounds (what the root README used to list) | [changelog/README.md](changelog/README.md) |
| See what an earlier `changes.patch` contained or which commit the docs were audited against | [changes-patch-history.md](changes-patch-history.md), [audit-log.md](audit-log.md) |

## Keeping the docs current

After **every** new feature or new/renamed/deleted file, update the matching document in the same change:

| If you change... | Update |
| --- | --- |
| Any file (add / rename / delete) | the row in the matching `file-map/*.md` |
| `package.json` scripts, requirements, build flow | [setup-build.md](setup-build.md), [known-gaps.md](known-gaps.md) |
| Manifest, icons, `offline-worker.js`, install button/guide, PWA tags in `index.html` | [pwa.md](pwa.md), [pwa-setup.md](pwa-setup.md), `file-map/scripts-public.md`, `file-map/components-common.md` |
| Widgets (Java, layouts, gallery, settings) | [widgets.md](widgets.md) and `android/BUILD_APK.md` > Widget behavior |
| Notifications | [notifications.md](notifications.md) and `android/BUILD_APK.md` > Reminder notifications |
| Persisted keys / backup | [storage-and-privacy.md](storage-and-privacy.md), [backup-update.md](backup-update.md) (a new key must also go into `exportDataJson` / `importDataJson`, unless it is a `kcak_*` interface preference) |
| Goals / limits, Body page, Profile body section, body-part icons | [advanced-personalisation.md](advanced-personalisation.md), `file-map/components-pages.md`, `file-map/components-modals.md`, `file-map/components-common.md`, `file-map/utils.md` |
| Advanced layout (editable grid, pencil toolbar, layout store, meal types) | [advanced-layout.md](advanced-layout.md), `file-map/components-common.md`, `file-map/components-dashboard.md`, `file-map/components-pages.md`, `file-map/components-modals.md`, `file-map/utils.md` |
| Page behaviour or Settings layout | [journal-pages.md](journal-pages.md) / [journal-shell.md](journal-shell.md) |
| Animation constants | [motion.md](motion.md), [launch-intro.md](launch-intro.md) |
| Mount / render / layout cost of a page, collapsible bodies, benchmark script | [performance.md](performance.md), [verification.md](verification.md#page-change-benchmark), `file-map/components-common.md`, `file-map/scripts-public.md` |
| Food/activity data or counts | [data-activities.md](data-activities.md), [data-nutrition.md](data-nutrition.md), [data-off-catalogue.md](data-off-catalogue.md) |
| Where the APK is published / the download button | [apk-download.md](apk-download.md), [pwa-setup.md](pwa-setup.md) §6 |
| Android version, permissions, modules | `android/BUILD_APK.md`, [android-apk.md](android-apk.md), [file-map/android-native.md](file-map/android-native.md) |
| CSS parts (`src/styles/`, `journal/css/`), translations split, `AppContext` helpers, Custom page parts | [file-organisation.md](file-organisation.md), the matching `file-map/*.md` row |
| A finished round (history) | move its paragraph from [changes-patch.md](changes-patch.md) to [changes-patch-history.md](changes-patch-history.md); add the round to `changelog/*.md` and, if you audited, to [audit-log.md](audit-log.md) |
| Plans, plan groups, shopping lists, recent-food chips (`PlanLibrary.tsx`, `ShoppingLists.tsx`, `RecentChips.tsx`, `planGroups.ts`, `shoppingList.ts`) | [plans-shopping-update.md](plans-shopping-update.md), [meal-journal.md](meal-journal.md), [storage-and-privacy.md](storage-and-privacy.md), `file-map/components-pages.md`, `file-map/components-common.md`, `file-map/utils.md` |
| Storage layer (`src/storage/`), contexts, lazy screens, service worker, CI, lint | [performance-review.md](performance-review.md), [storage-and-privacy.md](storage-and-privacy.md), [pwa.md](pwa.md), [verification.md](verification.md) |
| Food search (`fuzzy.ts`, `foodSearchIndex.ts`, `catalogueSearch.ts`, `useCatalogueSearch.ts`, `src/workers/`), dialog exit (`Modal.tsx`, `dialogExit.ts`) | [search-and-animation-performance.md](search-and-animation-performance.md), [performance-review.md](performance-review.md), `file-map/utils.md`, `file-map/components-common.md`, [verification.md](verification.md#search-and-dialog-check) |
| Docs structure itself | this file and the root `README.md` |

Then regenerate the patch ([changes-patch.md](changes-patch.md)). Keep each document under roughly 120 lines; if one grows, split it and add a row above.

## Last audit

The audit history (what was checked against which commit, round by round) is in [audit-log.md](audit-log.md). The newest entries are the *page-change performance round* (see [performance.md](performance.md); the tree was read at commit **`2f61652`**) and the *file-organisation round* (no behaviour change; see [file-organisation.md](file-organisation.md)). The source tree was checked against commit **`cee71f4`** ("Fixes") for that round.
