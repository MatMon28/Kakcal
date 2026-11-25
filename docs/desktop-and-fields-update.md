# Desktop layout and Custom fields round

> **Scope:** the removal of the desktop sidebar / top bar (desktop now equals the phone layout) and the fix of Custom's Meals / Recipes card buttons in the styles that are not Classic.
>
> **Read when:** you change the page chrome at wide widths, add a rule behind a `min-width` media query, or style a button inside a Custom card.
>
> **Related:** [meal-journal.md](meal-journal.md), [journal-shell.md](journal-shell.md), [file-organisation.md](file-organisation.md), [file-map/components-common.md](file-map/components-common.md)

## 1. Desktop = the same layout as the others

**Rule: there is no desktop-specific layout.** Every width uses `Header.tsx` (profile button, wordmark, settings button, page pill), the centred `max-w-4xl` column, the bottom dock and the swipe pages.

Deleted:

- `src/components/journal/JournalChrome.tsx` (sidebar with brand, page links, *Food database / My profile / Settings*, the slogan block, the breadcrumb top bar with date, help, settings and profile, the *Test mode* label, the help pop-up). `App.tsx` no longer imports or mounts it.
- Every `@media (min-width: 1100px)` / `1450px` rule: in `journal-responsive.css` (sidebar, top bar, `margin-left: 222px` on the page, `.journal-main-container` 1250 px width, hiding `[data-mobile-journal-header]`, hiding the Custom dock on desktop, Classic light desktop colour tokens), in `journal-shared-ui.css` (sidebar width, `.journal-desktop-selector`, the Classic pastel colours that only existed on desktop, smaller card paddings) and in `themed-overrides.css` (hiding `.journal-mobile-demo`). The `.journal-sidebar` / `.journal-desktop-topbar` `display: none` base rule, `.journal-demo-label` and `.journal-help-content` are gone too.

Where the sidebar's items live now:

| Was in the sidebar / top bar | Now |
| --- | --- |
| Today / Custom / Period / Body / Statistics links, page pill | The pill under the wordmark (`Tabs`, same at every width) |
| My profile, Settings | The round buttons left and right of the wordmark |
| Food database | Custom > Foods (search / browse button and the Foods dock button) |
| Date chip | Today's date selector |
| Test mode label | `.journal-mobile-demo` line under the header (demo builds only) |
| Help pop-up | Removed (the guided tour and install guide stay) |

Because the Classic colours for desktop are gone, Classic shows the phone colours (the stronger pastels `#FAE0B4`, `#E2D6FF`, `#C9EFD3`, ...) at every width.

## 2. Custom fields in the non-Classic styles

Problem: in Angular, Aurora, Pop, Playful, Minimal and Mono the cards inside **Meals** and **Recipes** did not look like in Classic. Classic draws the edit / delete buttons in the card's own colour (bare icons) and **Log** as a soft tinted pill. In the other styles the card is tinted with `--inset`, so the buttons (`--surface`) became white boxes, and **Log** used the loud `--nav-active-bg` colour.

Fix (`src/styles/themed-cards.css`, right after the `[data-library-card]` rule; markup: `data-library-actions` on the button group in `MealsSection.tsx` and `RecipesSection.tsx`):

- edit / delete: transparent, muted icon, `--hover` background on hover, no border / shadow / chamfer;
- **Log** in Meals: `--protein-bg` / `--protein-text`; in Recipes: `--fat-bg` / `--fat-text` (the same colours as the macro pills in the same card, so each style stays coherent and Meals = orange-ish, Recipes = purple-ish as in Classic). Border is `--pill-border`, radius and chamfer still come from the style's `.kc-action-pill` rule.

Classic is untouched (all rules are scoped with `:not([data-style="classic"])`).

## Verification

`npm run typecheck`, `npm run lint` (0 errors, the 10 base warnings), `npm test` (92 passed) and `npm run build`. Looked at in headless Chromium 159 with demo data (`VITE_DEMO_DATA=true`): 390 px and 1400 px, Classic / Angular / Aurora / Pop / Playful / Minimal / Mono, light and dark. **Not verified:** a real phone, Android WebView, Safari.
