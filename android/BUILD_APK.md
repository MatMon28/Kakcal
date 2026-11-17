# Building the Kakcalculator APK

## One-time setup
```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android   # already present in this repo
```

## Build steps
```bash
npm run build        # → dist/ (single inlined index.html)
npx cap sync         # copies dist/ into android/app/src/main/assets/public
npx cap open android # opens Android Studio
```
In Android Studio:
**Build → Build App Bundle(s) / APK(s) → Build APK(s)**
→ `android/app/build/outputs/apk/debug/app-debug.apk`

For a release build: **Build → Generate Signed App Bundle / APK** and follow the keystore wizard.

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
