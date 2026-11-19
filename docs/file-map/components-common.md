# File map: `src/components/common/`

> **Scope:** Shared UI: modal, header, tabs, swiper, icons, amount selectors, backup, brand.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/components/common/FoodResultRow.tsx`, `FoodMacroGrid.tsx` | Shared food-search rows, portion-scaled nutrition grids and the daily secondary-nutrient row. Fibre, salt and optional sugar use one yellow palette, with localized accessible labels for their portion icons. |
| `src/components/common/PageSwiper.tsx` | Main-page Pointer Event navigation on the entire `<main>` (blank padding included): pointer capture, transform-only following and settling, distance/velocity commit, interruption, and dock sequencing via `kc-page-moving`. |
| `src/components/common/Collapsible.tsx` | Collapsible settings group with an animated height, used for Appearance, Today & pages, Custom buttons and Notifications (optionally controlled with `open` / `onOpenChange`). |
| `src/components/common/Modal.tsx`, `ActionDock.tsx` | Shared keyboard-aware dialogs (bottom sheet on phones, centred on wider screens, closed by swiping the handle down) with optional always-visible footers, and accessible icon-only floating docks (48–52 px buttons, 22 px icons). |
| `src/components/common/FavoriteButton.tsx`, `src/utils/favorites.ts` | Star toggle for the favourite food list (`kind="activity"` for the favourite activity list) and favourites-first search-ordering helpers. |
| `src/components/common/MacroPills.tsx` | Shared numeric-only macro pills (carbs blue, protein peach, fat lavender), with full accessible names and units. |
| `src/components/common/ConfirmDialog.tsx` | "Are you sure?" dialog used before deleting meals, recipes and custom foods. |
| `src/components/common/DataBackup.tsx` | Settings-based JSON export/import controls and inline result messages. |
| `src/components/common/Header.tsx`, `Tabs.tsx` | Scroll-aware app header (44 px profile/settings buttons, wordmark, and full-width header background/border that hide when scrolling down) and the low 40 px tab pill that hides on downward scroll and smoothly reappears with floating transparency (without the header background) on upward scroll; active-tab labels collapse to icons in Ultra Minimal. |
| `src/components/common/AmountSelector.tsx`, `AmountStepper.tsx`, `NumericInput.tsx` | Shared portion presets, steppers, and decimal fields. **Food portions** (`AmountSelector` → `AmountStepper foodSteps`) step by **10 g below 100 g, 20 g from 100 g up to 200 g and 50 g from 200 g** (`foodStepUp` / `foodStepDown`, snapping to the grid, symmetrical for the − button and for press-and-hold). Water and custom trackers keep the plain `stepUp` / `stepDown` steps. |
| `src/components/common/PoopIcon.tsx`, `BristolIcon.tsx`, `TrackerIcon.tsx`, `SaltCrystalIcon.tsx` | Bowel, tracker, and faceted salt-crystal icon sets. |
| `src/components/common/Brand.tsx` | Inline `Wordmark` (transparent, header on every page, using the bundled Nunito font) and `AppIcon` (the icon artwork). |
