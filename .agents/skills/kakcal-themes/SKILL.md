---
name: kakcal-themes
description: >-
  Use when creating or editing Kakcal theme styles, CSS tokens, themed components,
  widgets, or launch splash colours across the 9 styles and 3 modes.
---

# Kakcal Themes Workflow

1. Read `docs/styles-guide.md` first, and check `docs/file-organisation.md` for CSS part ownership (`src/styles/theme-*.css`, `themed-*.css`).
2. Never reorder `@import` lines in `src/index.css` or `src/components/journal/journal.css`.
3. Follow the style requirements:
   - Define `light`, `lite-dark`, and `dark` blocks with an opaque `#rrggbb` `--bg` hex. Classic (`src/styles/theme-tokens.css`) must stay token-complete across `light`, `lite-dark`, and `dark`; when modifying Classic widget colours or radii, sync both `src/components/widgets/widget-preview.css` and `android/app/src/main/res/drawable/widget_*.xml`.
   - Respect Minimal's text/icon-only rule (`--tone-ink-*` on neutral `--surface` fields).
   - Maintain WCAG AA contrast (`>= 4.5:1` for text/muted/on-surface across all 10 Mono hues x 3 modes; `>= 3.0:1` for `--water-fill`).
   - Provide opaque `@media (prefers-reduced-transparency: reduce)` fallbacks for translucent styles (`aurora`, `glass`).
4. If `--bg` changes for any theme/mode:
   - Run `node scripts/generate-splash-themes.mjs`.
   - Sync `BG_MAP` in `index.html`.
5. Verify with `npx vitest run tests/themes.test.ts` (and `npm run android:prepare` if widget layouts changed).
