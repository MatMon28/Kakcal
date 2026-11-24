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

**PWA manual check:** after `npm run build && npm run preview`, DevTools > Application should show a valid manifest, an activated `offline-worker.js` and cache `kakcalculator-shell-v5`; reloading with *Offline* ticked must still open the app. Full list in [pwa-setup.md](pwa-setup.md#5-verify).

## Interaction Update

Optional browser suite: `npm install --no-save @playwright/test && npx playwright install chromium` (minimal Linux: `npx playwright install-deps chromium`), then run the demo dev server and `node scripts/verify-interaction-update.mjs`. It covers link validation, planner mode, diary actions, photo save/export, custom icons and real mobile touch swipes. Outputs go to untracked `.test-output/`. Results and limits: interaction-update.md.

## Page change benchmark

`scripts/bench-page-change.mjs` (needs `playwright`) seeds a large journal (500 logged days, 60 meals, 30 recipes, 14 photos), throttles the CPU 4x (`KC_THROTTLE=1` for none) and taps Today -> every other page -> Today three times, printing the longest main-thread block and the longest frame of each change. Compare before / after a change on the same machine; a long task above ~100 ms is felt as a freeze. Reference numbers and the reasoning are in [performance.md](performance.md).

## Page transition check

`scripts/check-page-transition.mjs` (needs `playwright` like the other scripts) loads the production `dist/` at 390x844 with touch and records one sample per animation frame while the page changes by tap, Back and the food catalogue. It fails on: a frame with nothing drawn, two pages both clearly visible, horizontal overflow, more than one document-height change per page change (a leftover old page stretching the document), a page left behind, running animations, rail / page `transform` or `style` left over, `kc-page-moving` left on `<html>`, a wrong scroll position, a tap lost during a transition, rapid taps ending on the wrong page, a second page or a fade under reduced motion, and page errors. `KC_REPORT_ONLY=1` prints the metrics without asserting (used to compare with the previous build); `KC_VIEWPORT=1280x800` runs it with the desktop layout. Known pre-existing failure, unrelated: `check-journal.mjs` stops after its second block at the Settings step (`Track sugar intake` button no longer exists); the swipe and sheet blocks before it pass.

## Search and dialog check

`scripts/check-search-and-dialog.mjs` (needs `playwright`; run after `npm run build`) loads the production `dist/` at 390x844 with touch and fails on: the 12 MB catalogue being requested before two characters are typed in Add food, no catalogue search worker running after typing, no catalogue results for "nutella", a main-thread task longer than `KC_LONGTASK_MS` (default 200) while typing, a closing dialog that is not the same element that was open / is not `inert` / loses the typed text / is ever joined by a second overlay (a clone), anything left behind after the exit (overlay, host children, running animations), a dialog that does not open again right away, and page errors. `KC_THROTTLE=4` throttles the CPU. Unit tests for the same round: `tests/fuzzy.test.ts` (new search vs a verbatim copy of the old one), `tests/catalogueSearch.test.tsx` (worker protocol, cache, fallback, hook), `tests/dialogExit.test.tsx` (both ways React removes a dialog, under `StrictMode`). Details: [search-and-animation-performance.md](search-and-animation-performance.md).

## Required checks (CI)

`.github/workflows/ci.yml` runs `npm run typecheck`, `npm run lint`, `npm test`, `vite build` (and checks the stamped worker) and `node scripts/check-widget-layouts.mjs`. `npm run check` runs the same locally. The Vitest suite in `tests/` covers food logging, navigation, settings saving, backup export / import (backup version 2 without pictures, picture notes, old 1.2 files, refusal of newer files: `tests/backup.test.tsx`, `tests/backup-ui.test.tsx` for the pictures warning), the IndexedDB day store and its migration, the write queue, photo blobs, midnight scheduling and widget dates, plus (plans round) the recent-food chips, plan grouping, the shopping-list maths, journal normalising and the planner wizard (name on page 1, reuse, whole-plan edit): `tests/plans-shopping.test.tsx`, `tests/planner-wizard.test.tsx`. Browser scripts (`npm run test:browser`) stay manual.
