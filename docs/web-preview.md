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

- `/` (or `?view=tour`): the guided tour (for new visitors, see the next bullets). It explains each page beside a live copy of the journal (16 steps, including **Notifications**) and ends with the widgets. `?view=app`: the standalone browser journal. Inside the tour the journal is loaded with `?tour=1`, which shows the Period page for the tour only; the stored Settings switch is not changed. The prepared Android bundle always opens the journal, not the tour or a remote URL.
- **Normal use is the default:** the standalone journal (`?view=app`, the installed PWA, the Android app) starts empty. Only the tour's embedded phone (`?tour=1`) shows demo data, from an in-memory sandbox (`src/utils/tourStorage.ts`) that never touches the real journal. `VITE_DEMO_DATA=true npm run build` makes the standalone journal seed demo data for missing storage again (review builds, `scripts/check-journal.mjs`; PowerShell: `$env:VITE_DEMO_DATA='true'; npm run build`).
- **Who sees what at `/`:** new visitors in a browser tab get the tour with the Install guide; the installed PWA (standalone window / Home Screen app) and any browser tab on a device where it was installed open the journal directly. `?view=tour` forces the guide, `?view=app` forces the journal. The Android preparation script sets this flag itself. No build deletes an existing journal.
- `npm run build` produces an inlined `dist/index.html` and copies public assets. On HTTPS or localhost, a production browser install caches the app shell after its first successful online load, so it can reopen offline. A first-ever hosted visit or source download still needs a connection. The development server is not an offline installation.
- Optional: `python3 scripts/package-android.py` (after `node scripts/prepare-android.mjs`) writes the Android Studio handoff ZIP to `public/downloads/` (that ZIP is **not tracked in git**; the script refuses to run before the Android preparation step). Python is needed only for this. Do not run `cap sync` with the browser preview in `dist/` in place of the Android preparation step.

**Installable:** the same build is a PWA (manifest, icons, offline worker, Settings > *Install app*). To test install and offline locally run `npm run build && npm run preview` and open `http://localhost:4173`; details in [pwa.md](pwa.md) and [pwa-setup.md](pwa-setup.md).
