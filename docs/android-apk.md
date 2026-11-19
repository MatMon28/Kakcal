# Android APK overview

> **Scope:** the short path to an APK, app identity and what is (not) shipped. Detailed steps live in `android/BUILD_APK.md`.
>
> **Read when:** you want to build, sign or distribute the Android app.
>
> **Related:** [setup-build.md](setup-build.md), [android-gradle-guard.md](android-gradle-guard.md), [widgets.md](widgets.md), [../android/BUILD_APK.md](../android/BUILD_APK.md)

- **From the editable source:** follow [setup-build.md](setup-build.md#recommended-apk-flow-from-a-fresh-clone), then open `android/` in Android Studio (JDK 21, SDK 36, Build Tools 35.0.0; internet is needed for the first Gradle dependency download only).
- **Optional prepared ZIP:** `python3 scripts/package-android.py` creates `public/downloads/Kakcalculator-Android-Studio.zip` (project + synced assets + the three Capacitor modules, no keystore). The ZIP is **not tracked in git**, so the tour's **Android project** link only works if you generate it before `npm run build`.
- **Identity:** `com.kcalsync.app` (kept from the upstream project), `versionCode 3`, `versionName 1.1.0`, `minSdk 24`, `compileSdk/targetSdk 36`. Production signing keys are not included (`*.jks`, `*.keystore`, `*.apk` are git-ignored).
- **Guide with signing, widget behaviour, offline operation and the on-device checklist:** [../android/BUILD_APK.md](../android/BUILD_APK.md).
