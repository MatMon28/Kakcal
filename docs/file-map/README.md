# File map index

> **Scope:** one line per area of the repository, pointing at the file that lists each file's role.
>
> **Read when:** you need to find *which file implements something*. Open only the one area file you need.
>
> **Related:** [../README.md](../README.md)

| Looking for... | Open |
| --- | --- |
| `index.html`, `App.tsx`, context, types, i18n, themes/CSS, brand assets, root configs, Next.js leftovers | [app-shell.md](app-shell.md) |
| Anything in `src/utils/` (notifications, calculations, formatters, motion, favourites, android bridge) | [utils.md](utils.md) |
| `src/data/`, `src/config/` (foods, activities, demo data, OFF catalogue reader) | [data.md](data.md) |
| Shared components (`components/common/`: Modal, Header, PageSwiper, icons, amount selectors) | [components-common.md](components-common.md) |
| Today page cards (`components/dashboard/`) | [components-dashboard.md](components-dashboard.md) |
| Dialogs (`components/modals/`) | [components-modals.md](components-modals.md) |
| Custom/Foods/Statistics/Period pages | [components-pages.md](components-pages.md) |
| Guided tour, widget gallery, launch intro | [tour-widgets-intro.md](tour-widgets-intro.md) |
| Android Java/XML/Gradle | [android-native.md](android-native.md) |
| `scripts/`, `public/` (catalogue, service worker, licences) | [scripts-public.md](scripts-public.md) |

Keep these tables in step: add a row to the right area file whenever you add, rename or remove a file.
