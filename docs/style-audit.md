# Style consistency audit

> **Scope:** cross-style (vs. Classic baseline) and intra-style (across Light, Lite Dark and Dark) fixes applied across all nine theme styles, the continuous tab selector, Today dock bindings, pre-paint script, Android widgets and theme regression tests.
>
> **Read when:** you add or edit a theme style, change `Tabs.tsx` / `ActionDock.tsx`, or touch `src/styles/theme-*.css` or `src/utils/themes.ts`.
>
> **Related:** [glass-material-update.md](glass-material-update.md), [calculations-colors.md](calculations-colors.md), [widgets.md](widgets.md), [changes-patch.md](changes-patch.md)

## Baseline and cross-style fixes

* **Continuous page pill (`themed-overrides.css`, `themed-chrome.css`):** `.kc-following-indicator` and `.kc-following-tab` now read `--nav-active-bg`, `--nav-active-color`, `--nav-inactive-color`, `--nav-pill-radius` and `--clip-xs` instead of forcing `var(--text)` / `99px` in every non-classic style. Dead `.kc-nav-tab` / `.kc-nav-tab-active` rules were removed.
* **Semantic Today dock colours (`themed-cards.css`):** `[data-dock-action="food"|"activity"|"water"|"poop"|"weight"|"custom"]` bind directly to `--dock-1..6` / `--dock-icon-1..6` so hiding a shortcut in Settings > Today never shifts the remaining buttons' colours (matching Classic and the widget gallery).
* **Custom Meals / Recipes `Log` pill (`themed-cards.css`):** switched from `--protein-bg` / `--fat-bg` to `--pill-p-bg` / `--pill-f-bg` so Aurora and Minimal keep tinted amber / purple `Log` pills instead of neutral white / grey boxes.
* **Shared `--color-*-accent` tokens (`theme-angular/aurora/pop/playful/minimal-mono.css`):** light-mode intake / activity / weight surface accents now match each style instead of inheriting Classic's pastel accents.
* **Generic `main section.rounded-3xl` containers (`themed-glass.css`, `themed-material.css`):** Glass applies frosted blur + `--card-border` / `--card-shadow` / `--card-radius`; Material strips the 1 px Tailwind border so Statistics, Body and Period sections follow each style.
* **Pre-paint launch colour (`index.html`):** the pre-paint IIFE now maps `--bg` for all nine styles across Light, Lite Dark and Dark instead of only Classic and Minimal dark modes.

## Intra-style and mode-parity fixes

* **Classic (`theme-tokens.css`):** Light `--muted` darkened from `#736B62` (4.33:1 on `--bg`) to `#696158` (5.04:1).
* **Mono (`src/utils/themes.ts`):** `getMonoVariables()` now emits dedicated `--intake-on-surface`, `--activity-on-surface`, `--weight-on-surface` and `--water-fill` tokens, fixing 1.00:1 white-on-white labels in Light mode and 1.14–3.91:1 low-contrast chart/table values in Lite Dark / Dark across all 10 hues.
* **Pop (`theme-pop.css`, `themed-cards.css`):** added `--water-fill` (fixing 1.11:1 black-on-dark water bars in Dark / Lite Dark), aligned Lite Dark hard shadows and pill/dock-button borders with Pop Dark (`#fde047` shadow, `#e2e8f0` border), and tinted Light fibre/salt/sugar tiles to `#fef08a`.
* **Playful (`theme-playful.css`, `JournalWidgetProvider.java`):** Dark `--carbs-bg` changed from `#312e81` (same as `--surface`) to `#1e3a8a`, Dark gained subtle card/dock borders matching Light / Lite Dark, Dark `--fiber-bg` / `--dock-6` darkened to `#854d0e` (5.98:1), Light `--nav-active-bg` darkened to `#e11d48` (4.70:1), and the native widget now honours the `dark` palette.
* **Aurora (`theme-aurora.css`, `themed-cards.css`):** Light surfaces are lightly translucent (`rgba(255,255,255,0.78)`) so `backdrop-filter` works consistently across all three modes, and `prefers-reduced-transparency: reduce` now falls back to solid tones.
* **Minimal (`theme-minimal-mono.css`, `JournalWidgetProvider.java`):** unified `1px` hairline borders and `--card-shadow: none` across all three modes, gave Light dock buttons and fibre tiles `#f1f5f9` inset separation, and distinguished Food (`--dock-icon-1` emerald) from Water (blue).
* **Angular (`theme-angular.css`):** aligned Lite Dark macro cards (`#254a8f`, `#6b5312`, `#4a2c7a`) with its dark macro pills and removed the clipped `--card-shadow` from Light.
* **Glass (`theme-glass.css`, `themed-glass.css`):** lightened Dark / Lite Dark `--brand-flame-color` to `#c4b5fd` and made `prefers-reduced-transparency` opaque across `--inset`, header, nav and dock tokens.
* **Material (`themed-material.css`):** aligned chip radius to `var(--pill-radius, 8px)` (8 px) and raised `.journal-search` borderless selector specificity to beat `journal-diary.css`.

## Regression coverage

`tests/themes.test.ts` now checks the continuous tab indicator tokens, semantic dock bindings, Material chip / search rules and `>= 4.5:1` WCAG AA contrast for all 10 Mono hues × 3 modes.
