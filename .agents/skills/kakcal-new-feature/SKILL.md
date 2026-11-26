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
3. **Themes:** Style with Kakcal semantic tokens (`--surface`, `--text`, `--muted`, `--on-text`, `--tone-*`, and `--tone-ink-*` for Minimal) so all 9 styles × 3 modes work; never reorder `@import` lines in `src/index.css` or `src/components/journal/journal.css`.
4. **i18n:** Add both EN and IT strings in the matching `src/i18n/parts/*.ts` file (`it: typeof en` enforces parity), or create a small standalone `src/i18n/<feature>.ts` for a self-contained feature.
5. **Docs & verification:** Update the matching `docs/*.md` and `docs/file-map/*.md` rows, iterate with `npx vitest run tests/<file>` and `npm run typecheck`, then run `npm run check` once at the end.
