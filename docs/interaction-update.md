# Interaction Update

> Scope: the interaction, personalization, meal sharing and picture-export round.
> Base: `32841a6e85323eded337dde9e608fc015e3e6bfa` (Improved Diary and planner).
> Related: gestures.md, meal-journal.md, storage-and-privacy.md, verification.md.

## Navigation And Custom

- The selector follows the finger and blends adjacent page colors continuously, including settling and cancellation, using Koink's rail/pill pattern. It also appears on desktop.
- Preview clipping prevents the adjacent page from growing the document while swiping from the bottom of Today. Taps, reduced motion, interrupted gestures and native vertical scrolling remain supported.
- Labels are remeasured after font loads and desktop/mobile resizes. Long optional tab lists remain horizontally scrollable, and the selected tab stays in view.
- Recipes and Foods lose their descriptive text. Foods retains a search shortcut when collapsed. Classic's warmer surfaces are kept (the desktop sidebar of this round was later removed, see desktop-and-fields-update.md); other themes keep their own surfaces.
- Settings > Custom buttons offers 24 built-in icons or private image upload. Images are decoded and reduced to 96 px PNG; SVG is not accepted. One tracker uses its selected icon in the dock and Today field; several use the default Sparkles picker.
- Custom meal categories get their own icons through Today > Edit > Add when Advanced layout is enabled. Existing categories can be edited there. Icons survive settings/layout backup and restore.

## Diary And Planner

- See all meals has an opaque, contrasting background. All 21 style/appearance combinations were measured above WCAG AA's 4.5:1 threshold (lowest 7.58:1).
- Log today always logs to the actual current day, even when another day is selected.
- Different for each retains the chosen food/note editor for unfilled meals without copying content or overriding existing entries.
- The planner's share icon opens share/import. Share this week or all plans by self-contained link, using the device share sheet or copy/select fallback. No backend, URL shortener or new third-party API is used.
- Links contain selected meals, food snapshots and notes in the URL fragment. Anyone with the link can read them. Read/logged state, photos and the rest of the journal are not shared.
- Import accepts a link or readable `.txt` export, validates the bundle, previews meals and allows moving the start date before an additive save. It never logs food or replaces existing plans. Unknown meal categories map to Lunch with a warning.
- UTF-8 text is supported. Food snapshots are deduplicated and links are compressed (format 2, see [custom-photo-share-update.md](custom-photo-share-update.md)). Payloads over 12,000 encoded characters use the readable text fallback; import sizes/counts/amounts/dates are bounded and checked.
- Browser/PWA links use the current web host. APK links use the repository's existing public homepage, `https://matmon28.github.io/Kakcal/`, not the device-local origin. Self-hosters can set `VITE_PUBLIC_APP_URL` at build time.

## Pictures And Mobile

- Photo composer and gallery put a compact calendar/date control above Today-style meal buttons. Camera/image selection follows these controls in the composer.
- Settings > Data backup > Export meal pictures creates a standard ZIP containing JPG/PNG/WebP pictures, dated filenames, per-picture `.txt` notes and a CSV index. JPEG notes are additionally embedded as standard XMP descriptions. PNG/WebP notes use sidecars.
- The ZIP is a readable export, not a restore file. JSON remains the full restorable backup of all data except the pictures (see [backup-update.md](backup-update.md)). Spreadsheet-formula prefixes are escaped in CSV; picture metadata and text notes retain the original note.
- Browser/PWA files download normally. The APK uses the existing JournalDevice plugin/document picker, extended for bounded ZIP/text exports with cancellation reporting and cache cleanup. No Android permission or remote API is added. Rebuild the APK to include the updated local plugin. (Later fix: the same save path no longer leaves 0 B files, see [backup-update.md](backup-update.md#saving-the-file-on-android-the-apk-the-0-b-file-fix).)

## Test Mode

`VITE_DEMO_DATA=true npm run dev` opens Custom directly and seeds only missing data with fictional meals, plans, notes, favorites and local photo fixtures. Missing demo settings enable Photo diary and meal notes. Desktop/mobile identify Test mode. Existing journals are never replaced; ordinary browser and Android release builds remain unseeded. This workspace opts in with `.env.local`, which is excluded from the patch.

Photo fixtures are Pexels images by Miriam Alonso, Nadin Sh and cottonbro studio; the local files are `public/images/demo-{breakfast,lunch,dinner}.jpg`.

## New Files

- `src/utils/pagePosition.ts`: continuous rail-position publisher.
- `src/components/common/IconPicker.tsx`: built-in and local-image chooser.
- `src/components/journal/PlanTransfer.tsx`: share/import UI and confirmation.
- `src/utils/planSharing.ts`: portable codec, validation and local file saving.
- `src/utils/photoExport.ts`: on-device ZIP, JPEG XMP, text notes and CSV.
- `src/data/journalDemo.ts`: opt-in fictional journal fixtures.
- `scripts/verify-interaction-update.mjs`: optional desktop/mobile regression suite.
- `docs/interaction-update.md`: this implementation/verification guide.

## Verification

Passed: `npm run build`; strict TypeScript checking of the shipped `src/main.tsx` import graph; 17 browser regression checks including real mobile touch swipes at the bottom of Today, cancellation, uploaded icons, received links, import date shifting and responsive labels; 21 measured button-contrast checks; standard ZIP CRC checks and parsed JPEG XMP/CSV/sidecars; and an unseeded production build check. No uncaught browser errors occurred.

Optional browser suite: `npm install --no-save @playwright/test`, `npx playwright install chromium`, then run the demo dev server and `node scripts/verify-interaction-update.mjs`. Minimal Linux also needs `npx playwright install-deps chromium`. Use `TEST_URL` for another Vite development origin. Artifacts under `.test-output/` are not part of the patch.

(Later: the Next.js / database files were deleted; only the unused `Toast.tsx` still reports typecheck errors.) The repository-wide typecheck included unused Next.js/database/Toast leftovers with pre-existing errors. The shipped Vite application graph typechecks cleanly. Android Java compilation, real document/camera pickers and native share sheets were not run on a physical device. PWA install/offline behavior was not re-tested in this round.

Patch verification passed: `git apply --check --cached changes.patch` against a clean index of the stated base revision. Legacy local image references are retained in normalization and export.
