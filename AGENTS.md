# Kakcal Agent Router

## Start here (never start by reading `README.md`)
1. **Clarify before acting:** If a fix or change request is vague, ambiguous, or missing key details (e.g., which page, theme/mode, or expected behaviour), ask 1–3 concise clarifying questions **before** reading large files or making edits.
2. Open `docs/README.md` (task -> doc) and `docs/file-map/README.md` (feature -> file).
3. Read **only** the single matching doc and single matching area file for your task.

## Do not read unless explicitly asked
- `README.md` (overview / pointer only)
- `docs/changelog/`, `docs/changes-patch-history.md`, `docs/audit-log.md`
- `src/assets/themes_insp.txt`, `src/assets/kakcalculator_intro/logos-and-animations-overview.html`
- `src/data/verifiedFoods.ts`, `public/data/off-foods.bin`, `package-lock.json`, `dist/`

## Large files (grep symbol first; read only needed line range)
`PlannerWizard.tsx`, `AppContext.tsx`, `EditableGrid.tsx`, `HistoryView.tsx`, `AddFoodModal.tsx`, `MealDiary.tsx`, `PhotoDiary.tsx`, `InstallGuide.tsx`.

## Hard invariants
- **CSS order:** Never reorder `@import`s in `src/index.css` or `src/components/journal/journal.css` (`docs/file-organisation.md`).
- **i18n parity:** Edit the matching domain file in `src/i18n/parts/*.ts` (both `en` and `it` live in the same file; `it: typeof en` enforces parity), or add a small feature file like `src/i18n/advanced.ts` for new features.
- **Docs sync:** Update the matching `docs/*.md` and `docs/file-map/*.md` row in the same change (`docs/README.md#keeping-the-docs-current`).

## Verification ladder
1. Iterate with targeted checks: `npx vitest run tests/<file>` and `npm run typecheck`.
2. Run `npm run check` once before finishing.
3. Run `npm run test:browser` only for UI/browser flows not covered by Vitest.
