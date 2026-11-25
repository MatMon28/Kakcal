# Glass and Material styles

> **Scope:** the two theme styles added after Mono: **Glass** (frosted translucent panels on a lavender-blue gradient, tinted gradient tiles) and **Material** (Material You / Material 3 tonal containers). Which files hold what, the token list a style must define, how the tinted Custom sections work, how to add a ninth style.
>
> **Read when:** you change either style, add a style, or find a screen that does not follow the active style.
>
> **Related:** [file-organisation.md](file-organisation.md) (CSS parts and cascade order), [calculations-colors.md](calculations-colors.md), [widgets.md](widgets.md), [changes-patch.md](changes-patch.md)

## What was added

| Where | What |
| --- | --- |
| `src/types/index.ts` | `ThemeStyle` also accepts `'glass'` and `'material'`. |
| `src/utils/themes.ts` | `THEME_STYLE_LIST` ends with `glass`, `material`; two entries (name, tag, swatches, English / Italian) at the end of `SIX_NEW_THEMES` (the name is historical: the list now has eight presets, and Settings > Theme style renders it as is). No new translation key. |
| `src/styles/theme-glass.css`, `theme-material.css` | **Tokens only**, one block per mode (`light`, `lite-dark`, `dark`): `--bg` (an opaque `#rrggbb`, the Android splash generator needs it), surfaces, text, header / nav / dock colours, Intake / Burned, macro tiles and pills, fibre / salt / sugar, `--dock-1..6`, the section tones (`--tone-*`), the shared `--color-*` pastels (light mode only, in dark the Classic ones are used as ink) and radii. |
| `src/styles/themed-tones.css` | Tinted Custom sections for both styles (see below). |
| `src/styles/themed-glass.css`, `themed-material.css` | Component rules that must come **after** `themed-chrome / themed-cards / themed-overrides` (same specificity, later wins): blur, header, dialog, scrim, re-tinted pastel buttons (Glass); no outlines, 8 px chips, elevation, state layers, focus ring (Material). |
| `src/index.css` | Imports: `theme-glass`, `theme-material` after `theme-minimal-mono`; `themed-tones`, `themed-glass`, `themed-material` after `themed-overrides`. |
| `src/components/common/GoalBadge.tsx` | `STYLE_LOOK` has the two new keys (circle badge). |
| `src/components/widgets/widget-preview.css` | Browser widget gallery: Material tray radius, frosted Glass tray. |
| `android/.../JournalDevicePlugin.java`, `JournalWidgetProvider.java`, `res/drawable/widget_tray_material*.xml` | The native widgets accept the two styles: Glass plates (white rim), Material rounded-square plates and a concentric tray. |
| `android/.../res/values/splash_themes.xml`, `scripts/generate-splash-themes.mjs` | Six more launch-screen colours (54 in total); the script lists both styles. |
| `tests/themes.test.ts` | Both styles exist, every mode has `--bg` and every required token, the tone rules exist, the import order is right. |

## Glass

* Background: `--app-bg-image` (gradient lavender > blue in Light, dusk violet in Lite Dark, deep violet in Dark), fixed behind the page.
* Panels (meal cards, trackers, Custom sections, nav pill, round header buttons, dock, Period cards) are translucent white (`--surface`) with `backdrop-filter: blur(20px) saturate(160%)`, a white 1 px rim and an inner top highlight (both in `--card-shadow`). Nested cards use a lighter blur (12 px).
* Intake, Burned, Carbs, Protein, Fat, Fibre / Salt are translucent **gradient tiles**; Today in the page pill is pink; the dock buttons are mint, pink, blue, orange, purple and yellow.
* Dialogs are frosted panes (`--glass-dialog`, 90 % opaque so text behind never competes) over a tinted scrim (`--glass-scrim`; the scrim blur is desktop-only like the base one, because blur is costly on phones). The header is a thin sheet of glass.
* The fixed pastel buttons and rows written as Tailwind arbitrary colours (`bg-[#C9EFD3]` mint, `#CFE7FE` blue, `#FAE0B4` orange, `#E2D6FF` purple, `#F6D0D0` red, `#F7E9AA` yellow: Log food, Water, Poop, Custom ... dialogs) are re-tinted by attribute selectors in `themed-glass.css` into translucent, more saturated glass with a white rim. Their dark ink classes are untouched, so the tint must stay light; do not darken them.
* `prefers-reduced-transparency: reduce` removes every blur and makes the surfaces opaque.

## Material

* Flat, tonal and borderless: `--card-border: none`, `--card-shadow: none`. Elevation is only on floating things (dock, dialogs), as in Material 3. Light is a warm lilac-white (`#FFF7FF`) with pastel containers; Dark is the Material baseline dark (`#141218`); Lite Dark is a step lighter.
* Shapes: 24 px cards, 28 px dialogs and dock, 16 px rounded-square dock buttons, 8 px macro pills and chips (`var(--pill-radius, 8px)` on `[data-slot-chip]`, `.journal-chip`), round header buttons and page pill. Generic `main section.rounded-3xl` containers and `.journal-search` stay borderless (matched specificity).
* Dialog scrim is plain black at 32 / 50 / 60 % (no blur). Hover and press tint the container (`.pressable`), keyboard focus gets a 3 px ring.
* Font: `Roboto, 'Google Sans', 'Plus Jakarta Sans Variable', system-ui` (Android has Roboto; elsewhere the bundled Plus Jakarta Sans is used, so **no font file or package was added**).
* Nested cards lose their 1 px `--border` (`themed-material.css`, last rule).

## Tinted Today trackers and Custom sections (`themed-tones.css`)

Classic paints each Today tracker (Movement, Water, Poop, Custom) and each Custom section with its own pastel while keeping meal cards neutral `--surface`. `themed-tones.css` applies the same local `--tone` / `--tone-in` mechanism across Angular, Aurora, Pop, Playful, Mono, Glass and Material for both `[data-tracker]` and `[data-library-section]`, while **Minimal** keeps neutral `--surface` fields and tints only the header text and icons via `--tone-ink-*`.

## Adding another style

1. Add the id to `ThemeStyle` and `THEME_STYLE_LIST`, a preset to `SIX_NEW_THEMES`, a key to `GoalBadge` `STYLE_LOOK`.
2. `src/styles/theme-<id>.css` with the three mode blocks (copy the token list from `theme-material.css`), import it before `themed-chrome.css`; component rules, if any, in `themed-<id>.css` after `themed-overrides.css`.
3. Add the id to the list in `scripts/generate-splash-themes.mjs` and run it; add it to `JournalDevicePlugin.java` (whitelist) and a branch in `renderStyledActionBitmap` (`JournalWidgetProvider.java`).
4. Extend `tests/themes.test.ts` and update this document, `file-organisation.md` and `file-map/app-shell.md`.

## Verified here

On a fresh copy of the base revision with the patch applied: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass; `node scripts/generate-splash-themes.mjs` reproduces the committed `splash_themes.xml`; screenshots in headless Chromium at 390 px (Today, Custom with Meal diary and Meal planner open, Log food) in Glass and Material, light and dark, were compared with the design renders. **Not verified here:** a real phone, Android WebView (`backdrop-filter` needs Android System WebView 76+), Safari, the native widgets on a device (no Android SDK), and Lite Dark by eye beyond the token review.

## Known differences from the design renders

* The icons are the app's own (the renders show a few wrong ones, the brief was to keep the current icons); no icon file was touched.
* The Material render uses Roboto; see the font note above.
* In Glass the dark modes are an interpretation (the renders are light only).
