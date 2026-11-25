# File organisation: how the big files are split

> **Scope:** which large files were split into parts, where each part lives, the rules for editing the parts, and how the split was verified. No behaviour changed.
>
> **Read when:** you look for a CSS rule, a translation string, a piece of `AppContext` or a part of the Custom page and the old big file is now only an index.
>
> **Related:** [file-map/README.md](file-map/README.md), [file-map/app-shell.md](file-map/app-shell.md), [file-map/components-pages.md](file-map/components-pages.md), [changes-patch.md](changes-patch.md)

## CSS: `src/index.css` and `journal.css` are lists of `@import`s

`src/index.css` starts with `@import "tailwindcss";` and `@import "./components/journal/journal.css";` and then imports the parts below **in this order**. Cascade order equals import order, so **never reorder the imports** and add a new rule to the part whose topic fits (later parts win on equal specificity, as before).

| Part (`src/styles/`) | Contents |
| --- | --- |
| `fonts.css` | Latin-only `@font-face` rules (bundled typography). |
| `theme-tokens.css` | `@theme`, Classic `:root` / `[data-theme]` colour tokens, `@layer base`. |
| `motion.css` | Easing tokens, keyframes, dialogs, dock, pressable, accordion, reduced-motion, safe-area, edge-fade (`data-scroll-fade`), `.no-scrollbar`. |
| `theme-angular.css`, `theme-aurora.css`, `theme-pop.css`, `theme-playful.css` | One style theme each (variables per mode). |
| `theme-minimal-mono.css` | The Minimal and Mono themes. |
| `theme-glass.css`, `theme-material.css` | The Glass and Material themes: **tokens only**, three mode blocks each (see [glass-material-update.md](glass-material-update.md)). |
| `themed-chrome.css` | Rules shared by all style themes: header, navigation pill, Intake / Burned cards, macro cards, nutrient pills. |
| `themed-cards.css` | Meal slot / tracker / Custom cards, item fields, Period page, action dock, modals. |
| `themed-tones.css` | Tinted Today trackers (Movement, Water, Poop, Custom) and Custom sections across all non-Classic styles (full-field `--tone-*` for 7 styles, header text & icon `--tone-ink-*` for Minimal). Imported after `themed-overrides.css`. |
| `themed-glass.css`, `themed-material.css` | Component rules of the two styles (blur, dialog, scrim, re-tinted pastel buttons / no outlines, chips, elevation, state layers). Imported after `themed-tones.css` so they win ties with the generic themed rules. |
| `themed-overrides.css` | Angular chamfers, Pop elevation, the continuous page selector (`.kc-following-*`), page-moving rule. |
| `performance.css` | `.kc-body-skeleton` (placeholder of `DeferredBody`), `content-visibility` for expanded off-screen cards, and the meal card's container queries (`container-type` on `[data-meal-slot]`, `.kc-meal-kcal` / `.kc-meal-extras` hiding). Last in the `@import` list. |

| Part (`src/components/journal/css/`) | Contents |
| --- | --- |
| `journal-base.css` | Minimal grid, feature cards, search, recent meals, week and plan lists. |
| `journal-forms.css` | Photo grid, forms, slot options, segmented control, pickers, buttons. |
| `journal-diary.css` | Diary browser and results, meal detail, inline plans, photos, camera, lightbox, help, settings toggle, library grid. |
| `journal-responsive.css` | `journal-arrive` keyframes and the responsive / reduced-motion media queries. |
| `journal-shared-ui.css` | Shared search / chip / button / meal-choice styles, planner "different for each" rows, interaction polish. |
| `journal-photo-controls.css` | Photo date / meal controls, native date input, footer and go-to buttons. |
| `journal-planner-wizard.css` | Photo range and the planner wizard pages (days, weekdays, compressed meals, footer, food chips). |
| `journal-planner-dock.css` | Planner date pair, saved draft, quick foods, Custom > Foods pills. |
| `journal-planner-tones.css` | Planner colours that match Log food (saved meals, recipes, earlier days), the "..." recent chip. |
| `journal-plans-shopping.css` | Plan name field, plan cards (*See all plans*, shopping-list picker), shopping-list dialog. |

`scripts/generate-splash-themes.mjs` reads the `--bg` values from `index.css` **and** the `./styles/*.css` parts it imports (it inlines `@import "./styles/..."` lines). Keep that import syntax if you add a part.

## Strings: `src/i18n/`

`translations.ts` is the file everything imports (`translations`, `TranslationKey`); it only composes `translations.en.ts` (`export const en`) and `translations.it.ts` (`export const it`). Add every new key to **both** language files. `TranslationKey` is still `typeof translations.en`.

## Context: `src/context/`

| File | Contents |
| --- | --- |
| `AppContext.tsx` | `AppProvider` (state, persistence, logging actions, backup) and `useApp`; still re-exports `DEFAULT_QUICK_FOODS`. |
| `appContextType.ts` | The `AppContextType` interface (everything `useApp()` returns). Add a new context member here and in `AppProvider`. |
| `appStorage.ts` | `STORAGE_KEYS`, default profile / period settings / quick foods, and the normalisers for stored data. |
| `demoSeeds.ts` | `createDemoSeedDays(today, yesterday)`: the sample days written in demo mode only (`VITE_DEMO_DATA=true`). |

## Custom page: `src/components/prebuilt/`

| File | Contents |
| --- | --- |
| `PreBuiltMealsView.tsx` | The page: composes the sections, the Foods section, the delete dialog, the dock and the modals. |
| `usePreBuiltMealsState.tsx` | One hook with all state, derived lists and handlers; returns them in one object. `LibraryState` is its type. |
| `MealsSection.tsx`, `RecipesSection.tsx` | The yellow Meals and purple Recipes sections (props: `s: LibraryState`). |
| `LogToSlotModals.tsx` | `LogMealToSlotModal` and `LogRecipeToSlotModal`. |
| `CreateMealModal.tsx`, `RecipeBuilderModal.tsx` | The create / edit meal and recipe dialogs. |
| `CustomFoodsQuick.tsx` | Unchanged: recent / favourite foods in Custom > Foods. |

To add state: declare it in the hook **and** add it to the returned object; sections / modals read it with `const { ... } = s;`.

## Documentation

The root `README.md` is the overview; the round history is in [changelog/README.md](changelog/README.md); the docs index is [README.md](README.md) (the audit history moved to [audit-log.md](audit-log.md)); [changes-patch.md](changes-patch.md) keeps only the how-to and the current patch (older ones: [changes-patch-history.md](changes-patch-history.md)).

## Not split on purpose

Data and generated files (`public/data/off-foods.bin`, `scripts/smoke.bundle.js`, `src/data/verifiedFoods.ts`, `src/data/activities.ts`, `src/assets/themes_insp.txt`, the overview HTML, `package-lock.json`) are rarely read or edited by hand, so they stay whole. Other large components (`EditableGrid.tsx`, `PlannerWizard.tsx`, `AddFoodModal.tsx`, `SettingsModal.tsx`, `PhotoDiary.tsx`) were left as they are; split them the same way (state hook + parts typed by `ReturnType<typeof useX>`) only when you next change them.

## Verification of the split

- `npm run build` succeeds. After the CSS split alone, `dist/index.html` was **byte-identical** to the build before the split.
- `tsc --noEmit` reports exactly the same (pre-existing) errors before and after.
- `node scripts/generate-splash-themes.mjs` reproduces the same `splash_themes.xml`.
- The Custom page (demo data) was rendered under jsdom from the old and the new source, then the New meal / New recipe / Edit / Log / Delete / Expand buttons were pressed and typing was simulated: all snapshots (1.4 MB of HTML) were identical.
- Not re-run: the Playwright scripts in `scripts/` and any Android build.
