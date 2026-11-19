# Startup performance

> **Scope:** What keeps the Android app fast to open: pre-paint theme script, latin-only fonts, cached Intl formatters, lazy catalogue, tree-shaking.
>
> **Read when:** you change fonts, `index.html`, `formatters.ts` or what is bundled into the Android build.
>
> **Related:** web-preview.md, data-off-catalogue.md

What the Android app does to open quickly: the HTML carries a tiny pre-paint script that applies the saved Lite Dark / Dark theme and background before any CSS or React runs (no light flash); fonts are declared in `src/index.css` as two latin-only woff2 faces instead of the fontsource stylesheets (−69 KB of inlined base64; other scripts fall back to the system font); `Intl` number/date formatters are created once per locale + options in `src/utils/formatters.ts` (`numberFormatter`, `dateFormatter`) instead of on every call, and the Today calendar computes its weekday labels only while it is open. The 12 MB food catalogue is not part of that bundle: it is fetched lazily (about 150 ms) the first time a food search opens, so it costs nothing at launch. The tour, widget gallery and demo data are tree-shaken out of the Android bundle by the `VITE_ANDROID_RELEASE` guard in `App.tsx`. Measured in headless Chromium with 4× CPU throttling (median of 5): first paint 304 → 272 ms, app ready 628 → 555 ms, first contentful paint 744 → 656 ms.
