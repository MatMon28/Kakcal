# PWA setup instructions

> **Scope:** the steps *you* follow to get the PWA changes into your repository, build, host over HTTPS, install and verify the app.
>
> **Read when:** you apply the PWA patch, deploy the web app, or an install button/offline mode does not appear.
>
> **Related:** [pwa.md](pwa.md) (how it works), [changes-patch.md](changes-patch.md), [setup-build.md](setup-build.md)

## 1. Apply the patch

From the root of your clone of `MatMon28/Kakcalculator` (commit `6b6999e "Widget fix"` or a descendant whose touched files still match):

```sh
git apply --check changes.patch      # dry run, must print nothing
git apply --index changes.patch      # applies and stages (binary icon PNGs included)
# repository has moved on?  git apply --3way changes.patch
```

New files in this round: `public/manifest.webmanifest`, `public/_headers`, `public/icons/*.png`, `scripts/render-pwa-icons.mjs`, `src/utils/pwaInstall.ts`, `src/components/common/InstallApp.tsx`, `docs/pwa.md`, `docs/pwa-setup.md`. The install-guide round adds `src/components/common/InstallGuide.tsx` and rewrites `InstallApp.tsx`, updates `App.tsx`, `pwaInstall.ts`, `AppTour.tsx`/`tourContent.ts`, `config/demo.ts`, the manifest and the worker. Edited: `index.html`, `public/offline-worker.js`, `src/main.tsx`, `SettingsModal.tsx`, `translations.ts`, `scripts/prepare-android.mjs` and the docs. No new npm dependency, `package.json` is untouched.

## 2. Build

```sh
npm ci
npm run build
```

Check `dist/` contains `index.html`, `manifest.webmanifest`, `offline-worker.js`, `icons/` (4 PNGs), `data/off-foods.bin` and `_headers`.

Try it locally (service workers work on `localhost`):

```sh
npm run preview        # http://localhost:4173
```

## 3. Host it over HTTPS

Upload the **whole `dist/` folder**, not only `index.html` (the manifest, icons, worker and catalogue are separate files). Any static host works; keep the relative layout.

| Host | How |
| --- | --- |
| **GitHub Pages** | Settings > Pages > *GitHub Actions*, then add `.github/workflows/pages.yml` (below). The app is served from `https://<user>.github.io/Kakcalculator/`; the relative URLs already handle the sub-path. |
| **Netlify / Cloudflare Pages** | Build command `npm run build`, publish directory `dist`. `public/_headers` is picked up automatically. |
| **Own server (nginx)** | Serve `dist/` over HTTPS; send `Cache-Control: no-cache` for `index.html`, `offline-worker.js`, `manifest.webmanifest`, and the MIME type `application/manifest+json` for the manifest (snippet below). |

GitHub Pages workflow:

```yaml
name: Deploy PWA
on: { push: { branches: [main] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - id: deployment
        uses: actions/deploy-pages@v4
```

nginx:

```nginx
location = /offline-worker.js     { add_header Cache-Control "no-cache"; }
location = /index.html            { add_header Cache-Control "no-cache"; }
location = /manifest.webmanifest  { add_header Cache-Control "no-cache"; default_type application/manifest+json; }
location /icons/                  { add_header Cache-Control "public, max-age=31536000, immutable"; }
```

## 4. Install on a device

| Platform | Steps |
| --- | --- |
| **Android (Chrome / Edge / Samsung Internet)** | Open the HTTPS URL, then Settings > *Install app* > **Install** (or browser menu > *Install app*). |
| **Desktop (Chrome / Edge)** | Settings > *Install app* > **Install**, or the install icon in the address bar. |
| **iPhone / iPad (Safari)** | Share > **Add to Home Screen**. Safari offers no install button; Settings shows this hint. Open it from the home-screen icon once while online. |

Your journal stays on that browser/device (`localStorage`). A browser tab and the installed app on the same device share it; another device or browser does not, so use *Data Backup* (Export/Import JSON) to move data.

## 5. Verify

1. Chrome DevTools > **Application** > *Manifest*: no errors, three icons, "Installable" is shown. *Service Workers*: `offline-worker.js` is **activated and running**. *Cache Storage*: `kakcalculator-shell-v3` lists `index.html`, `manifest.webmanifest` and four icons.
2. Tick *Offline* (Application > Service Workers) or switch on flight mode and reload: the app must still open.
3. Run **Lighthouse** > Progressive Web App (or *Installable* audit); it should pass.
4. Open Settings and scroll to the bottom of the profile/backup group: the **Install app** card appears when the browser allows installation, and shows "Installed" inside the installed app.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| No install button | Page is not on HTTPS (or `localhost`); the app is already installed; the browser (iOS) offers no prompt; or you are inside the Android APK. Reload once after the first visit so the worker controls the page. |
| Old version keeps showing | Host caches `index.html` / `offline-worker.js`. Make sure they are sent with `no-cache` (section 3), then reload twice. In DevTools use *Application > Storage > Clear site data* (this also clears the journal, export a backup first). |
| Icons or manifest 404 on GitHub Pages | You uploaded only `index.html`, or `dist/` was not the artifact path. Upload the full `dist/`. |
| `render-pwa-icons.mjs` says "Run npm i --no-save sharp" | Install the helper first; it is intentionally not in `package.json`. |
| APK shows a manifest 404 | You built it with `npm run android:prepare`, which does not strip the PWA tags. Use `node scripts/prepare-android.mjs` ([setup-build.md](setup-build.md)). |

## 6. Install guide and APK (install-guide round)

The site now explains installation itself, so a visitor does not need this document: the tour landing page and Settings > *Install app* open `InstallGuide.tsx` with tabs for **iPhone/iPad** (Safari → Share → Add to Home Screen), **Android** (Chrome/Edge PWA steps) and **Computer** (Chrome/Edge install icon, Safari's Add to Dock, Firefox note).

For Android the guide also offers the **APK**. The button expects `public/downloads/Kakcalculator.apk`; the file is not tracked in git. Build and copy the signed APK there before `npm run build` if you want the direct download. **How to do that on GitHub Pages (commit with `git add -f`, or a GitHub Release fetched by the workflow): [apk-download.md](apk-download.md).** If the file is missing, the guide says so and links the official GitHub releases and `android/BUILD_APK.md`. It also explains, before the download, that Android/Play Protect may call a direct APK install “unknown source”, “unsafe” or “could be dangerous”, that this is the standard warning for sideloaded files, and that users should only install the file from this page or the official releases.

Installed copies always open the journal: the manifest starts at `./?view=app&source=pwa` and `App.tsx` detects standalone display mode (plus iOS Home Screen) and ignores `?view=tour`. The guide tells the user that after installation every launch goes straight to the journal.

Browser builds are in normal-use mode. To publish a populated demo instead, build with `VITE_DEMO_DATA=true`; the default build starts empty and preserves any journal already on the device.
