# File map: App shell, config and contracts

> **Scope:** Entry HTML/TSX, `App.tsx`, context, types, i18n, themes/CSS, brand assets, root config files, leftovers.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `index.html`, `src/main.tsx` | Document shell with the pre-paint theme script (reads `kcalsync_settings.theme` before first paint), the `#kc-boot` boot layer (plain `--bg` colour, no logo; the `kc-boot:start/end` markers are kept for `outline-wordmark.mjs --launch-screens`; hidden in iframes / `?intro=0` / `?tour=1`) and the React entry point (which also registers the PWA worker, starts the install-prompt capture, imports `intro/earlyStart` before `./App` so the launch animation paints first, and delays the first React render until the animation's first frame has been painted). The `<!-- pwa:start/end -->` block in `index.html` holds the manifest and iOS tags and is removed by `prepare-android.mjs`. |
| `src/App.tsx` | Landing selection: an installed PWA (standalone), iOS Home Screen app or the Android bundle always gets the journal; the guided tour is only the browser-first default (`?view=app` skips it). Also mounts `InstallGuideHost` in both modes, plus the bridge that drives the journal for the tour and widgets (native and web), tab routing, global dialogs, page-specific docks, swipe and Back handling. |
| `src/index.css`, `src/utils/themes.ts` | Latin-only `@font-face` rules (Plus Jakarta Sans Variable, Space Grotesk Variable, Chakra Petch, Nunito 800), theme tokens for Classic plus the 6 style themes (`angular`, `aurora`, `pop`, `playful`, `minimal` with a deeper `#060911`/`#0d1320` Dark-mode palette, `mono` with a 10-swatch single-hue harmony generator) across Light, Lite Dark and Dark modes, coherent section/sub-card/chip/pill/field styling across Today, Custom, Period, Statistics and Day Overview, shared Intake/Activity/Weight accents, the opaque inverse-ink token `--on-text` (labels on `var(--text)` fills), keyboard-aware bottom-sheet dialog viewport, safe areas, the motion primitives (`anim-*`, `accordion-grid`, `pressable`) and their reduced-motion overrides. |
| `src/context/AppContext.tsx` | Local state, persistence, legacy migrations, logging actions, tag catalog changes, and JSON backup. |
| `src/types/index.ts`, `src/i18n/translations.ts` | TypeScript data contracts and English/Italian strings. |
| `src/vite-env.d.ts` | Vite environment typings used by the demo switch. |
| `src/assets/brand/kakcalculator-icon.svg`, `kakcalculator-wordmark.svg` | Supplied app icon and full wordmark: the source for the header, favicon and launcher artwork. |
| `src/assets/brand/kakcalculator-wordmark-outline.svg` | Generated: the wordmark with the text as outlines (transparent, `currentColor`), for places where Nunito is not loaded yet. |
| `capacitor.config.json`, `android/` | Local HTTPS asset origin, Android identity, native project, Gradle wrapper and [APK instructions](../../android/BUILD_APK.md). |
| `package.json` | Scripts `dev`, `build`, `preview`, `android:prepare` only (the other documented aliases do not exist; see [known gaps](../known-gaps.md)); Capacitor 8 (android, app, core, local-notifications), React 19.2.6, Tailwind 4.1.17, Vite 7.3.7, TypeScript 5.9.3. Setup: [setup-build.md](../setup-build.md). |
| `changes.patch` (untracked deliverable) | `git diff --binary` against commit `4552bf0`; see [changes-patch.md](../changes-patch.md). |
| `tsconfig.json`, `vite.config.ts` | Strict TypeScript with the `@/*` alias and `noUnused*` checks; Vite with React, Tailwind v4 (`@tailwindcss/vite`) and `vite-plugin-singlefile` (one inlined `dist/index.html`). |
| `capacitor.config.json` | `appId com.kcalsync.app`, `webDir dist`, no `server.url`, LocalNotifications status icon `ic_stat_kak`, SystemBars inset handling, no mixed content. |
| `src/app/`, `src/db/`, `next.config.ts`, `drizzle.config.json`, `eslint.config.mjs` | **Inert Next.js-era leftovers**, not imported by `src/main.tsx` (see [provenance](../provenance.md)). |
| `src/assets/themes_insp.txt` | Stand-alone HTML design exploration (6 themes x 3 modes). Reference only; not imported. |
| `docs/`, `README.md`, `android/BUILD_APK.md` | The documentation set; index at [docs/README.md](../README.md). |
