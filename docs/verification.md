# Verification and test scripts

> **Scope:** Browser smoke tests, journal touch tests, Android on-device checks and what has/has not been verified.
>
> **Read when:** you run or change `scripts/smoke.mjs`, `scripts/check-journal.mjs` or need the pre-release checklist.
>
> **Related:** setup-build.md, known-gaps.md, ../android/BUILD_APK.md

The guided tour is covered by `scripts/smoke.mjs`: all 16 pages in order (the Notifications step shows its five previews and expands Settings > Notifications in the live journal), the journal's response on each page (Statistics, Settings, Day overview, Period), the widget-only step with its 18 default shortcuts, the Large widget's content, the language switch, offline reloads, the supplied salt drawing, gestures, and the native payload (intake, burned, macros, percentages and BMR).

For repeatable web checks, prepare Android assets, run `npm run build`, install Chromium with `npx playwright install chromium` (on minimal Linux systems use `--with-deps`), then run `node scripts/smoke.mjs`. The script checks all 18 default icon-only shortcuts, the header wordmark with its bundled font, the favicon, the launcher PNG sizes, the exact three salt paths, responsive touch targets, offline persistence, clean native assets, swipes and a simulated native action/snapshot/Back protocol. The simulation is not a device test.

**Historical record (upstream authoring session, not reproducible from this repository because the ZIP is not tracked):** The prepared source ZIP was extracted separately and built with JDK 21 and SDK 36, without installing npm packages in the extraction. Debug, unsigned release, and the Android instrumentation-test APK compiled; the release vital-lint check passed. The current manifest registers four widget providers. No signed production APK or keystore is distributed. Physical launcher behavior, real system gestures, camera, document picker and background scheduling remain device checks in [the Android guide](../android/BUILD_APK.md).

**Prerequisite not declared in `package.json`:** both test scripts `import { chromium } from 'playwright'`, but `playwright` is not a dependency. Install it first (`npm i -D playwright && npx playwright install chromium`) or run them with `npx -p playwright`. `scripts/smoke-entry.tsx` and the committed `scripts/smoke.bundle.js` are an older jsdom harness that `smoke.mjs` no longer references.

**Verification status of this documentation:** the doc set was audited against repository commit `4552bf0` (see [README.md](README.md#last-audit)). The test scripts themselves were **not** re-run in that audit.

**PWA manual check:** after `npm run build && npm run preview`, DevTools > Application should show a valid manifest, an activated `offline-worker.js` and cache `kakcalculator-shell-v2`; reloading with *Offline* ticked must still open the app. Full list in [pwa-setup.md](pwa-setup.md#5-verify).

**Demo data and the test scripts:** the standalone journal now starts empty (normal use). `scripts/check-journal.mjs` and the journal steps of `scripts/smoke.mjs` were written against the populated review build; build with `VITE_DEMO_DATA=true npm run build` before running them. These scripts were not re-run after the install-guide round.

**Install guide round (checked):** `npm run build` passes, and the built bundle was exercised in jsdom: fresh visitor sees the guide with the right tab for desktop / Android / iPhone user agents; Android tab shows the APK link and the warning; standalone display mode opens the journal and sets `kc_pwa_installed`; a normal tab with the flag opens the journal; `?view=tour` still shows the guide; the tour sandbox keeps demo data out of the real storage and writes only theme/language back. A real browser install (beforeinstallprompt, iOS Share sheet, a real APK) was **not** exercised.
