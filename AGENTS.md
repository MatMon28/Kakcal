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

## Token efficiency
- **Grep before reading:** Use `rg -n` to locate symbols first, then read only the needed line range (never whole files unless small).
- **Batch tool calls:** Issue independent `read_file` and `edit_file` calls in parallel; finish all related edits before running verification commands.
- **Offload broad discovery:** Use a `research` subagent for multi-file exploration so raw file reads stay out of the main session context.
- **Skip planning overhead:** Execute directly without Plan Mode for small or clearly scoped tasks.
- **Keep replies concise:** Do not re-summarize diffs or repeat file contents.

## Hard invariants
- **Themes & styles parity:** When adding or editing any UI feature (page, card, field, modal, badge, tab, or dock item), follow [docs/styles-guide.md](docs/styles-guide.md#when-adding-a-new-feature-page-card-field-modal-or-control) (and `.agents/skills/kakcal-new-feature/SKILL.md`): ensure all 9 styles and 3 modes are wired using `.kc-themed-card`, `data-kc-tone` + `data-kc-tone-ink` (for Minimal), semantic CSS tokens (`--surface`, `--inset`, `--border`, `--text`, `--muted`, `--on-text`, `--tone-*`), and shared controls; never use raw Tailwind palette colour classes or hardcode `font-family`.
- **CSS order:** Never reorder `@import`s in `src/index.css` or `src/components/journal/journal.css` (`docs/file-organisation.md`).
- **i18n parity:** Edit the matching domain file in `src/i18n/parts/*.ts` (both `en` and `it` live in the same file; `it: typeof en` enforces parity), or add a small feature file like `src/i18n/advanced.ts` for new features.
- **Docs sync:** Update the matching `docs/*.md` and `docs/file-map/*.md` row in the same change (`docs/README.md#keeping-the-docs-current`).

## Verification ladder
1. Iterate with targeted checks: `npx vitest run tests/<file>` and `npm run typecheck`.
2. Run `npm run check` once before finishing.
3. Run `npm run test:browser` only for UI/browser flows not covered by Vitest.
