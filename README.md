# Kakcal

> **Renamed:** the app is now called **Kakcal** everywhere the end user can see it (wordmark, intro/tour, install guide, manifest, Android launcher and widget names, page title, exported file names). Internal identifiers keep the old name on purpose so nothing breaks: the GitHub repository, `kakcalculator-*.svg` file names, `WIDGET_CHANNEL`, cache names (`kakcalculator-shell-*`), the `Kakcalculator.apk` / `Kakcalculator-Android-Studio.zip` file paths and the package id `com.kcalsync.app`. See [docs/brand.md](docs/brand.md#rename-kakcalculator--kakcal).

A local-first nutrition, activity and wellness journal built with React 19, TypeScript, Vite and Tailwind CSS v4. The browser opens a guided tour of every page, with the widgets last; Android has a bundled Capacitor app, four native home-screen widgets and optional reminder [notifications](docs/notifications.md). There is no account or application backend. The browser build is also an installable, offline-capable [PWA](docs/pwa.md) ([setup instructions](docs/pwa-setup.md)); the landing page opens an install guide for iPhone/iPad, Android (web app **and** APK, including the “unknown source / could be dangerous” warning) and desktop. Installed copies always open the journal itself, never the tour. Browser builds are in normal-use mode: they start with the visitor's own empty journal, and demo seeding has to be requested with `VITE_DEMO_DATA=true`. On Android the first thing drawn is the launch animation: the system launch screen, the window, the WebView and the web boot layer are all plain background colour in the colour of your saved theme (no logo, no cream or white flash) and the [animated intro](docs/launch-intro.md) plays straight on top: it starts before the app is even evaluated, runs about 1.35× faster than the supplied SVGs (about 0.8-0.95 s) and always plays to its last frame.

**Gestures:** page and popup swipes are tuned to be sensitive; closing a popup sucks it into the bottom-bar button that opens it (a barely perceivable 60-90 ms, cut short by your next tap, and taps right after a swipe-down close are never lost); the bottom bar hides on scroll down and returns on a small scroll up; swiping the Today calendar changes the day ([gestures](docs/gestures.md), [motion](docs/motion.md)).

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

Settings ends with a plain red **Delete all data** button (double confirmation, no section title) that erases the local journal; the Medium widget is 4x2 by default (macro row as tall as the buttons, intake/burned cards fill the rest and are always the biggest); in the Mono style every dock/widget button has the same colour; meal and recipe ingredient searches show favourites first (starred) and sit above the existing ingredients when editing; the reminder notification icon is the real K + poop logo as a transparent-background glyph (K cut around the poop, poop tier lines visible).

**Rule:** after every new feature or file, update the matching document (table in [docs/README.md](docs/README.md#keeping-the-docs-current)).
