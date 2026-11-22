# Kakcal: launch animation system

Six app-load animations for the Kakcal icon. Each fills the dead second between tapping the app and seeing the
calculator, then **lands pixel-for-pixel on the brand icon** (the solid poop with the K carved out), so the hand-over
to the app is invisible. Pure vector SVG + CSS keyframes: no JavaScript, no fonts, no raster frames, about 3.5-4.7 KB
per file. They are **generated** by `scripts/generate-intro-animations.mjs` from the definitions in
`scripts/brand-animations.mjs` (never hand-edit the SVGs).

## 1. The brand it serves

| Element | Spec |
| --- | --- |
| Paper (light) / ink (light) | `#F9F3E6` / `#0B0F1E` (Koink's) |
| Dark surface / dark ink | `#070A14` / `#F9F3E6` |
| Icon | `1024 x 1024` canvas, full-bleed tile `rx=240` |
| Mark | a **solid poop**, made of four parts: a pointed **tip** and three rounded **tiers** (`t1` top, `t2`, `t3` bottom), plus the **K** of the Koink brand carved out of the belly (the K is painted in the tile colour) |
| Wordmark | `509 x 150` view box: k + the poop (as the first "a") + kcal, Nunito Black outlines |

The numbers live in `scripts/brand-geometry.mjs`. The animations move the same five parts (tip, three tiers, K) and
the tile, nothing else is invented, apart from the vortex rings of animation 6.

## 2. The six animations

Durations are the length of the file on its own. The app plays them **2.5x faster** (`INTRO_SPEED` in
`src/components/intro/introAnimations.ts`), see section 4.

| # | File | Name | File length | In the app | Idea |
| --- | --- | --- | --- | --- | --- |
| 1 | `01-soft-serve.svg` | Soft-serve | 2200 ms | 880 ms | The tiers swirl up tier by tier like soft-serve, each growing out of the last, the tip flicks, then the K is pressed into the belly. |
| 2 | `02-stack-plop.svg` | Stack & plop | 2000 ms | 800 ms | The four parts plop down one after another with a squash each; the K slides in and presses. |
| 3 | `03-jelly-press.svg` | Jelly key-press | 2000 ms | 800 ms | The poop bounces in whole, the K drops onto it like a pressed key, and the tiers wobble like jelly one after the other. |
| 4 | `04-iris-flip.svg` | Iris flip | 2100 ms | 840 ms | The logo starts inverted (light poop on a dark tile) and a circular iris opens from the K to reveal the real colours. |
| 5 | `05-swirl.svg` | Swirl & unfold | 2300 ms | 920 ms | The tiers spiral in from the sides, spinning as they grow; the tip spins up last before the K pops open. |
| 6 | `06-flush-return.svg` | Flush & return | 2400 ms | 960 ms | The poop is flushed down a spinning vortex and comes straight back with a bounce and a freshly pressed K. |

They are the successors of the previous set (sketch & plop, tactile keypress, swirl & unfold, polarity iris flip, flush
vortex spin, modular stack, 1.06-1.28 s, played 1.35x faster = 0.79-0.95 s), redrawn for the new logo. In the app they
take 0.80-0.96 s, the same as before.

`wordmark-plop.svg` (2200 ms, design asset, not used by the app) animates the wordmark: the letters drop in one after another and the poop stacks up as the "a".

## 3. Dark mode and tokens

The files paint themselves with two tokens (with the light colours as fallback):

```css
var(--kc-cream, #F9F3E6) /* the icon tile (= the page background in the app) */
var(--kc-ink, #0B0F1E)   /* the poop */
```

`src/components/intro/intro.css` sets `--kc-cream` to the app background and `--kc-ink` to `#0B0F1E` (Light) or `#F9F3E6`
(Lite Dark / Dark). The tile therefore disappears into the page in every theme and only the poop and the carved K show; the
inverted start of animation 4 and the rings of animation 6 use the same two tokens, so no extra colour exists. The
standalone files `logos/*-theme-aware.svg` use `var(--kc-surface)` / `var(--kc-contrast)` instead.

## 4. Rules for the files (what the app relies on)

- The only time values in a file are **animation durations written as `NNNms`** (one `--d: NNNms` per file). The app divides every
  `NNNms` by `INTRO_SPEED`, so keep it that way: no delays in the launch animations, no `s` units.
- Every animation is `both`-filled and ends on the exact icon; nothing loops or idles.
- Motion grammar: ease-out for entrances (`cubic-bezier(0.22, 1, 0.36, 1)`), a small overshoot for anything that lands with weight
  (`cubic-bezier(0.3, 1.5, 0.5, 1)`), squash and stretch on the axis of impact only. Transform and opacity only, plus a clip-path
  circle for the iris.
- Each file's classes are prefixed (`kcsoftserve`, `kcstackplop`, ...), so two of them never clash on one page.
- Everything is applied to `<g>` wrappers with `transform-box: fill-box`, which renders the same in Blink, WebKit and Android WebView.

## 5. Files in this folder

- `animations/01..06-*.svg`: the launch animations (the ones the app imports). `animations/wordmark-plop.svg` and `animations/wordmark.svg` (the static wordmark).
- `logos/`: icon (light, inverted, theme-aware) and wordmark (plain, inverted, theme-aware, transparent), written by `generate-icon.mjs` and `outline-wordmark.mjs`.
- `logos-and-animations-overview.html`: every logo and animation with replay buttons and a light / dark switch (open it in a browser).
- Regenerate: `npm i --no-save opentype.js && node scripts/generate-icon.mjs && node scripts/outline-wordmark.mjs && node scripts/generate-intro-animations.mjs`.
