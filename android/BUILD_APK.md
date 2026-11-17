# Building the Kakcalculator APK

## One-time setup

Capacitor 8 uses Node.js 22+, Java 21, Android SDK 36, and Android Studio Otter (2025.2.1) or newer. The installer supports Android 7.0 (API 24) and newer; use an up-to-date Android System WebView.

```bash
npm install
```

## Build steps
```bash
npm run build        # → dist/ (single inlined index.html)
npx cap sync android # copies dist/ into android/app/src/main/assets/public
npx cap open android # opens Android Studio
```
In Android Studio:
**Build → Build App Bundle(s) / APK(s) → Build APK(s)**
→ `android/app/build/outputs/apk/debug/app-debug.apk`

For a release build: **Build → Generate Signed App Bundle / APK** and follow the keystore wizard.

For a debug APK from the command line, run `cd android && ./gradlew assembleDebug` after syncing. The first native build needs internet to download build dependencies; this is independent of app runtime.

## Offline check

1. Install the synced build and enable airplane mode before opening the app.
2. Log a local food (search for Ricotta), water, and a cycle marker, then close and reopen the app. Confirm the entries are still visible.
3. Try a known barcode such as Nutella (`8000500310427`). It should resolve from the bundled catalog. An unknown barcode should explain the connection requirement and offer manual food creation.
4. Focus an input in a long form. The dialog should move above the keyboard and its content should remain scrollable.

Keep `server.url` unset in `capacitor.config.json` for release builds. The app must load its own bundled assets, not a remote live-reload URL.

## Notes
- `appId`: `com.kcalsync.app` · `appName`: Kakcalculator · `versionName 1.0.0` (versionCode 2) in `app/build.gradle`.
- **CAMERA permission** is declared for barcode scanning (Open Food Facts); the camera is only
  opened when the user taps the scanner button in Barcode Lookup.
- All app data is stored in WebView `localStorage` — clearing app data erases it. Use the
  in-app **Export JSON** (Statistics page) to back up.
- Gestures: swipe left/right anywhere on a page to switch tabs; Android back closes the
  open modal/sheet first, then returns to the Today tab, then exits the app.
- `webContentsDebuggingEnabled` is `false` (production). For remote debugging during
  development set it to `true` in `capacitor.config.json` and re-run `npx cap sync`.
