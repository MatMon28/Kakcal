# Kakcal

## Current update — Ingredient quantities, Meal name and quick-add tiles

In **Recipes** and **Meals** a chosen food now asks for its **quantity** (with its nutrition) before it joins the list. The **pencil** of an ingredient (icon only) changes its quantity instead of replacing the food; ingredients of a recipe **read from a website** also have **Swap** (icon and text). The meal builder is laid out like the recipe builder (same ingredient cards, quantity screen, footer and recap), and the ingredient picker shows the **quick-add buttons exactly as Log food does** (one shared component). In the **planner** every meal shows its date next to the meal type (`Lunch · Wed 25 Nov`) and an open meal offers the optional **Meal name**. See [ingredient quantities](docs/ingredient-quantity-update.md) and [the patch guide](docs/changes-patch.md).

Earlier updates are archived in [docs/changelog/rounds-recent.md](docs/changelog/rounds-recent.md) and [docs/changelog/README.md](docs/changelog/README.md).

> **Renamed:** the app is now called **Kakcal** everywhere the end user can see it (wordmark, intro/tour, install guide, manifest, Android launcher and widget names, page title, exported file names). Internal identifiers keep the old name on purpose so nothing breaks: the GitHub repository, `kakcalculator-*.svg` file names, `WIDGET_CHANNEL`, cache names (`kakcalculator-shell-*`), the `Kakcalculator-Android-Studio.zip` path and the package id `com.kcalsync.app` (the APK itself is now `kakcal.apk`, [docs/apk-download.md](docs/apk-download.md)). See [docs/brand.md](docs/brand.md#rename-kakcalculator--kakcal).

A local-first nutrition, activity and wellness journal built with React 19, TypeScript, Vite and Tailwind CSS v4. The browser opens a guided tour of every page, with the widgets last; Android has a bundled Capacitor app, four native home-screen widgets and optional reminder [notifications](docs/notifications.md). There is no account or application backend. The browser build is also an installable, offline-capable [PWA](docs/pwa.md) ([setup instructions](docs/pwa-setup.md)); the landing page opens an install guide for iPhone/iPad, Android (web app **and** APK, including the “unknown source / could be dangerous” warning) and desktop. Installed copies always open the journal itself, never the tour. Browser builds are in normal-use mode: they start with the visitor's own empty journal, and demo seeding has to be requested with `VITE_DEMO_DATA=true`. On Android the first thing drawn is the launch animation: the system launch screen, the window, the WebView and the web boot layer are all plain background colour in the colour of your saved theme (no logo, no cream or white flash) and the [animated intro](docs/launch-intro.md) plays straight on top: it starts before the app is even evaluated, runs 2.5× faster than the files (about 0.8-0.96 s) and always plays to its last frame.

**Gestures:** page and popup swipes are tuned to be sensitive; closing a popup sucks it into the bottom-bar button that opens it (a barely perceivable 60-90 ms, cut short by your next tap, and taps right after a swipe-down close are never lost); the bottom bar hides on scroll down and returns on a small scroll up; swiping the Today calendar changes the day ([gestures](docs/gestures.md), [motion](docs/motion.md)).

**Meal journal:** Custom now includes a yellow searchable/filterable Meal diary, a blue selected-day / selected-meal planner below Recipes, and an optional red Photo diary. Plans and read-acknowledgeable notes flow into Today and Log food. Enable Photo diary and Meal notes in Today in Settings > Today & pages; both default to off. Meal memories, plans and picture notes are included in JSON backups; **the picture files are not** (use *Export meal pictures*). Existing themes and mobile navigation are preserved; since the desktop-layout round the desktop browser shows the same single-column layout as the phone (no sidebar). See [docs/meal-journal.md](docs/meal-journal.md) for workflows, file roles, storage limits and verification.

## Quick start

```sh
npm ci
npm run dev -- --host 0.0.0.0   # browser preview / guided tour
npm run build                   # inlined dist/index.html + PWA files (manifest, icons, worker); host dist/ over HTTPS
node scripts/prepare-android.mjs && npx cap open android   # clean Android build, then Android Studio
```

Requires Node.js 22+ (Android: JDK 21, SDK 36, Build Tools 35.0.0). More in [docs/setup-build.md](docs/setup-build.md).

## Documentation

The documentation is split into small single-topic files so that you (or an LLM) only load what is needed:

1. Open **[docs/README.md](docs/README.md)**: a task -> file lookup table.
2. Open the one document it points to. Each starts with a *Scope / Read when / Related* box.
3. To locate code, use **[docs/file-map/README.md](docs/file-map/README.md)** and then a single area file.

| Most used | |
| --- | --- |
| [Setup and build](docs/setup-build.md) | [Android APK](docs/android-apk.md) / [BUILD_APK.md](android/BUILD_APK.md) |
| [Widgets](docs/widgets.md) | [Notifications](docs/notifications.md) |
| [Journal pages](docs/journal-pages.md) | [File map](docs/file-map/README.md) |
| [PWA: how it works](docs/pwa.md) / [PWA setup](docs/pwa-setup.md) | [Known gaps](docs/known-gaps.md) |
| [Creating `changes.patch`](docs/changes-patch.md) | [Making the Download APK button work](docs/apk-download.md) |
| [Advanced personalisation: goals/limits, body measurements](docs/advanced-personalisation.md) | [Advanced layout: personalise Today, Statistics, Body](docs/advanced-layout.md) |

Settings ends with a muted red **Delete all data** button (translucent red tint, as wide as the other Settings fields; double confirmation, no section title) that erases the local journal; the Medium widget is 4x2 by default (macro row as tall as the buttons, intake/burned cards fill the rest and are always the biggest); in the Mono style every dock/widget button has the same colour; meal and recipe ingredient searches show favourites first (starred) and sit above the existing ingredients when editing; the reminder notification icon is the real K + poop logo as a transparent-background glyph (K cut around the poop, poop tier lines visible).

## Round history

The round-by-round notes that used to be listed here (journal, advanced layout / personalisation, logo, polish rounds) now live in [docs/changelog/README.md](docs/changelog/README.md). They are history only; use [docs/README.md](docs/README.md) to find the document for a task.

**Source layout note:** large files are split into small parts so that an LLM only loads what it needs. `src/index.css` and `src/components/journal/journal.css` are lists of `@import`s (parts in `src/styles/` and `src/components/journal/css/`); the Custom page is `PreBuiltMealsView.tsx` plus its state hook and section / modal components; `AppContext.tsx` has its types, storage helpers and demo seeds next to it; the strings are `translations.en.ts` / `translations.it.ts`. See [docs/file-organisation.md](docs/file-organisation.md).

**Rule:** after every new feature or file, update the matching document (table in [docs/README.md](docs/README.md#keeping-the-docs-current)).
