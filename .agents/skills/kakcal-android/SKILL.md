---
name: kakcal-android
description: >-
  Use when modifying Android native code (Java, XML layouts/drawables, Gradle),
  widgets, notifications, splash themes, or preparing/building the Android APK.
---

# Kakcal Android Workflow

1. Open the single matching doc (`docs/android-apk.md`, `docs/widgets.md`, `docs/notifications.md`, or `docs/android-gradle-guard.md`) and `docs/file-map/android-native.md`.
2. Keep project constraints in mind: package id `com.kcalsync.app`, JDK 21, SDK 36, Build Tools 35.0.0.
3. After web or widget/theme edits affecting Android:
   - Run `node scripts/generate-splash-themes.mjs` if any theme `--bg` changed.
   - Run `npm run android:prepare` (runs `scripts/check-widget-layouts.mjs` and `scripts/prepare-android.mjs`).
4. When adding, renaming, or changing native files or widget/notification behaviour, update `android/BUILD_APK.md` and `docs/file-map/android-native.md`.
