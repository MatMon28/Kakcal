# Android APK overview

> **Scope:** the short path to an APK, app identity and what is (not) shipped. Detailed steps live in `android/BUILD_APK.md`.
>
> **Read when:** you want to build, sign or distribute the Android app.
>
> **Related:** [apk-download.md](apk-download.md), [setup-build.md](setup-build.md), [android-gradle-guard.md](android-gradle-guard.md), [widgets.md](widgets.md), [../android/BUILD_APK.md](../android/BUILD_APK.md)

- **From the editable source:** follow [setup-build.md](setup-build.md#recommended-apk-flow-from-a-fresh-clone), then open `android/` in Android Studio (JDK 21, SDK 36, Build Tools 35.0.0; internet is needed for the first Gradle dependency download only).
- **Optional prepared ZIP:** `python3 scripts/package-android.py` creates `public/downloads/Kakcalculator-Android-Studio.zip` (project + synced assets + the three Capacitor modules, no keystore). The ZIP is **not tracked in git**; the tour no longer links it (the install guide replaced that dead link), so share it yourself if you generate it. For a one-tap APK download, copy the signed APK to `public/downloads/kakcal.apk` before `npm run build`; the install guide falls back to the GitHub releases when it is missing. **Step-by-step (commit the APK or attach it to a GitHub Release): [apk-download.md](apk-download.md).**
- **Identity:** `com.kcalsync.app` (kept from the upstream project), `versionCode 3`, `versionName 1.1.0`, `minSdk 24`, `compileSdk/targetSdk 36`. Production signing keys are not included (`*.jks`, `*.keystore`, `*.apk` are git-ignored).
- **Guide with signing, widget behaviour, offline operation and the on-device checklist:** [../android/BUILD_APK.md](../android/BUILD_APK.md).
