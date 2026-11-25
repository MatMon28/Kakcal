# Calculations and colour palette

> **Scope:** BMR / burned / net formulas, water estimate, shared accent colours and nutrient field rules.
>
> **Read when:** you change energy maths, macro colours or the fibre/salt/sugar styling.
>
> **Related:** brand.md, file-map/utils.md

Food values are per 100 g/ml. Logged portions retain a nutrient snapshot. The journal and widget use the same calorie and macro functions. BMR uses Mifflin-St Jeor; total burned is BMR + activity + estimated thermogenesis. Net is intake minus expenditure. The water estimate uses the profile and activity. Estimates are not direct measurements.

Shared accents: intake/food green `#C9EFD3`, activity/burned red `#F6D0D0`, weight violet `#E2D6FF`, water/carbs blue `#CFE7FE`, protein/poop peach `#FAE0B4`, fat lavender `#E2D6FF`, and custom tracker lemon `#F7E9AA`. Fibre, salt and sugar all use the same lemon field with dark ink, including in dark themes. Portion selectors use the wheat, salt-crystal and candy icons instead of those three text headings, with localized accessible names and gram values. Unknown values remain unknown and the sugar switch still governs visibility. Meal and tracker header icon circles are transparent; dock and widget actions keep their filled circles.

**Inverse ink token `--on-text`** (`src/index.css` (rules in `src/styles/*.css`, see [file-organisation.md](file-organisation.md)), `:root`, = `var(--bg)`). Selected segments, active chips, toasts and dark buttons are filled with `var(--text)`; their label must use `text-[var(--on-text)]`, **never `text-[var(--surface)]`**. In Aurora Dark and Lite Dark `--surface` is a translucent white (`rgba(255,255,255,.07/.11)`), so the label became white on a white pill and was unreadable (e.g. the Compact / Normal / Expanded switch). `--bg` is opaque in every theme and style.

**Calorie-surplus pill (`.kc-balance-badge-intake`).** The `+kcal` pill on the Intake card (Today, Statistics, Day overview, widget gallery) used the same `--badge-bg` / `--badge-text` as the red deficit pill on Burned, so in every non-classic style it showed up red on a green card. It now has its own tokens `--intake-badge-bg` / `--intake-badge-text` (defined next to `--intake-fill` in every style and theme block of `src/index.css`, and in `getMonoVariables`), applied by `html[data-style]:not([data-style="classic"]) .kc-balance-badge.kc-balance-badge-intake`. Burned keeps `--badge-*`. When you add a style or theme, define both pairs.

**Mono surface accents and Classic Light muted ink.** `getMonoVariables` emits dedicated `--intake-on-surface`, `--activity-on-surface` and `--weight-on-surface` values checked at `>= 4.5:1` against `--surface` across all 10 hues and 3 modes (so Light mode never renders white text on white cards, and Dark / Lite Dark charts stay legible). Classic Light `--muted` is `#696158` (`5.04:1` on `--bg`).

**Glass and Material.** `--surface` is translucent in Glass (all modes), so the `--on-text` rule above applies there too. Both styles override the shared `--color-nutrient / -intake / -activity / -weight` pastels in **light mode only** (in dark modes those tokens are used as *ink* on dark surfaces and keep the Classic values). Their palettes: [glass-material-update.md](glass-material-update.md).
