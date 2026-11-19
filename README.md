# Kakcalculator

A local-first nutrition, activity and wellness journal built with React 19, TypeScript, Vite and Tailwind CSS v4. The browser opens a guided tour of every page, with the widgets last; Android has a bundled Capacitor app, four native home-screen widgets and optional reminder [notifications](docs/notifications.md). There is no account or application backend.

## Quick start

```sh
npm ci
npm run dev -- --host 0.0.0.0   # browser preview / guided tour
npm run build                   # inlined dist/index.html (browser preview)
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
| [Known gaps](docs/known-gaps.md) | [Creating `changes.patch`](docs/changes-patch.md) |

**Rule:** after every new feature or file, update the matching document (table in [docs/README.md](docs/README.md#keeping-the-docs-current)).
