# Run the web preview / guided tour

> **Scope:** Dev server, browser build, URL switches (`?view=`, `?tour=1`, `?intro=`), demo data and offline caching of the browser build.
>
> **Read when:** you run or build the browser version, or need a URL parameter or env flag.
>
> **Related:** setup-build.md, launch-intro.md, startup-performance.md

```sh
npm ci
npm run dev -- --host 0.0.0.0
npm run build
npm run preview
```

- `/` (or `?view=tour`): the guided tour, **only for browser visitors**. It explains each page beside a live copy of the journal (16 steps, including **Notifications**), ends with the widgets and starts with an install card for iPhone/iPad, Android (PWA + APK) and desktop. `?view=app`: the standalone browser journal. Inside the tour the journal is loaded with `?tour=1`, which shows the Period page for the tour only; the stored Settings switch is not changed. Installed PWAs (standalone display mode), iOS Home Screen apps and the prepared Android bundle always open the journal, even with `?view=tour`.
- Production browser builds are in **normal-use mode**: no demo data is seeded and each visitor starts with an empty journal. Use `VITE_DEMO_DATA=true npm run build` to produce a populated review/demo build (PowerShell: `$env:VITE_DEMO_DATA='true'; npm run build`). Demo data is only written for missing storage. The Android preparation script sets `VITE_ANDROID_RELEASE=true`, which forces demo seeding off. No build deletes an existing journal.
- `npm run build` produces an inlined `dist/index.html` and copies public assets. On HTTPS or localhost, a production browser install caches the app shell after its first successful online load, so it can reopen offline. A first-ever hosted visit or source download still needs a connection. The development server is not an offline installation.
- Optional: `python3 scripts/package-android.py` (after `node scripts/prepare-android.mjs`) writes the Android Studio handoff ZIP to `public/downloads/` (that ZIP is **not tracked in git**; the script refuses to run before the Android preparation step). Python is needed only for this. Do not run `cap sync` with the browser preview in `dist/` in place of the Android preparation step.

**Installable:** the same build is a PWA (manifest, icons, offline worker, Settings > *Install app*, and the device install guide on the tour page). To test install and offline locally run `npm run build && npm run preview` and open `http://localhost:4173`; details in [pwa.md](pwa.md) and [pwa-setup.md](pwa-setup.md).
