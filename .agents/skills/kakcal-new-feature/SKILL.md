---
name: kakcal-new-feature
description: >-
  Use when implementing a new Kakcal feature, tracker, modal, or page in source
  code to ensure storage/backup, performance, themes, i18n, and docs stay consistent.
---

# Kakcal New Feature Checklist

Route first via `docs/README.md` and `docs/file-map/README.md` (open only the matching doc and area file), then verify each item below:

1. **Persistence & backup:** If adding a stored key, register it in `src/context/appStorage.ts` and wire it into `exportDataJson` / `importDataJson` (unless it is a `kcak_*` UI preference; see `docs/backup-update.md`).
2. **Performance:** Subscribe with narrow hooks (`useSettings`, `useJournalData`, `useNav`, `useNavActions`), keep collapsible bodies lazy (`LazyBody` / `DeferredBody`), and avoid forced layout reads inside `useLayoutEffect`.
3. **Themes (cross-style coherence — follow `docs/styles-guide.md#when-adding-a-new-feature-page-card-field-modal-or-control` across all 9 styles and 3 modes):**
   - Neutral cards/surfaces: use `.kc-themed-card` and tokens (`--bg`, `--surface`, `--inset`, `--border`, `--text`, `--muted`, `--on-text`).
   - Tinted cards/sections: reuse existing `data-*` hooks (`[data-tracker]`, `[data-library-section]`, `[data-stats-tone]`, `[data-period-card]`) or use `.kc-themed-card` + `data-kc-tone="diary|meals|recipes|planner|photo|foods|teal"` (with `data-kc-tone-ink` on header text/icons for Minimal).
   - Controls & badges: reuse `[data-dock-action]`, `[data-settings-badge]`, `[data-settings-switch]`, `[data-range-switch]`, `[data-stat-pill]`, `Modal`, and `.pressable`. Never use raw Tailwind palette colour classes (`bg-slate-*`, `bg-amber-*`, etc.), hardcode `font-family`, or reorder `@import` lines in `src/index.css` or `journal.css`.
4. **i18n:** Add both EN and IT strings in the matching `src/i18n/parts/*.ts` file (`it: typeof en` enforces parity), or create a small standalone `src/i18n/<feature>.ts` for a self-contained feature.
5. **Docs & verification:** Update the matching `docs/*.md` and `docs/file-map/*.md` rows, iterate with `npx vitest run tests/<file>` and `npm run typecheck`, run `npm run check` once at the end, and visually inspect UI changes (e.g. via Chrome DevTools) across the **5-style canary matrix**: `Classic · Light`, `Glass · Light`, `Pop · Dark`, `Angular · Lite Dark`, `Minimal · Dark`.
