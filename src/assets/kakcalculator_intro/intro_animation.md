# Kakcal — Launch Animation System

A set of **six bespoke app-load animations** for the Kakcal icon, each one written to
do a single job: fill the dead second between tapping the app and seeing the calculator,
then land **pixel-perfect on the brand mark** so the transition into the app UI is invisible.

Everything here is pure vector SVG + CSS keyframes. No JavaScript, no fonts loaded from the
network, no raster frames, no libraries. A file is typically **5–7 KB**, plays on the compositor,
and works identically in iOS `WKWebView`, Android `WebView`, React Native `WebView`, Flutter
`webview_flutter`, Electron or a plain browser tab.

---

## 1. The brand it has to serve

| Element | Spec |
| --- | --- |
| Paper (light) | `#F9F3E6` (Koink's) |
| Ink (light) | `#0B0F1E` (Koink's) |
| Dark surface / dark ink | `#070A14` / `#F9F3E6` (Koink's) |
| Typeface | heavy rounded geometric sans (Nunito / Quicksand / Rubik as fallbacks), weight 800, `-2px` tracking |
| Icon | `1024 × 1024` canvas, full-bleed tile `rx=240` (Koink's icon) |
| Wordmark | `531 × 150` view box (the lockups use `1062 × 300`, two units per view-box unit): K + poop + `kcal`, Nunito ExtraBold outlines |

The icon is **Koink's K** (a stem and two arms, drawn as filled shapes, not strokes) with the
tiered **poop mascot** in the place of Koink's pig: same left and right edge, same line weight (26 icon
units), same halo that clears the K. That's the whole vocabulary the animations are allowed to use:
a tile, three bars, and a doodle. Nothing else is invented — every animation is made of those
three parts moving. The numbers live in `scripts/brand-geometry.mjs`; the six animations are
**generated** by `scripts/generate-intro-animations.mjs` (see §9), never hand-edited.

### The geometric anchors (used by every animation)

These are the numbers that make the "settle to the exact icon" guarantee work:

| Part | Shape (icon units) | Pivot used by the animations |
| --- | --- | --- |
| Stem | rounded rect `246.5, 224.5, 121.7 × 567.6`, `rx 54` | top centre `(307.35, 224.5)`, grows downwards (`scale(1, 0)` → none) |
| Upper arm | Koink's ARM path | `(352, 515)`, points up-right at 46.3° |
| Lower leg | Koink's LEG path | `(352, 495)`, points down-right at 46.4° |
| Poop | `translate(509.67 473.07) scale(5.404)`, line 4.8111 (= 26 icon units) | centre `(682.6, 637.9)`, base `(682.6, 775.7)` |

Because the K parts are filled shapes, they are *grown* with a scale along their own axis (a
`rotate(θ) scale(s, 1) rotate(-θ)` list) where the previous set drew round-capped strokes with
`stroke-dashoffset`. The poop's three crease lines are still drawn with `stroke-dashoffset`
(`pathLength="100"`).

Animation is always applied to **wrapper `<g>` elements whose transform is a `translate()` to
the pivot plus a nested `translate(-x -y)` branch**, rather than to CSS `transform-origin`.
That matters: `transform-origin` on SVG children is resolved inconsistently across WebKit and
Blink, whereas a matrix built from `translate`/`rotate`/`scale` on a wrapper is deterministic
everywhere. It is the single biggest reason these files look the same on an iPhone as in Chrome.

---

## 2. Style guide — the visual language

The animations are not generic "logo spins". They are all derived from what the app *is*:
**a calculator with a poop joke in it.**

1. **Tactile, not glossy.** Movement reads like pressing keys, stamping, stacking, flushing —
   physical verbs. No glow, no gradient, no blur, no bouncy-cartoon exaggeration beyond
   squash-and-stretch.
2. **Ink on cream, always.** The palette never gains a third colour. Dark mode doesn't add a
   new hue, it *inverts the whole mark* so the card becomes the background and only the cream
   strokes remain (`logos/kakcalculator-icon-theme-aware.svg`).
3. **One idea per animation.** Each concept has a single mechanic (draw, press, unfold, invert,
   spiral, stack). Two mechanics fighting each other reads as noise at 136 px.
4. **The mascot is the punchline.** The swirl is almost never the first thing on screen — it
   arrives last, as the payoff. That is what makes the icon feel authored instead of generated.
5. **Fast and confident.** Everything lands in **1.0–1.3 s**. Nothing loops, nothing idles,
   nothing waits for a network call. If the app is ready sooner, cut it short; if later, it
   stays on the final frame, which *is* the icon.
6. **Motion grammar.** Ease-out for entrances (`cubic-bezier(0.22, 1, 0.36, 1)`), a small
   overshoot for anything that lands with weight (`cubic-bezier(0.34, 1.56, 0.64, 1)`), and
   linear only when a value is being scrubbed (stroke dash, reel travel). Squash-and-stretch is
   applied on the axis of impact — never uniformly.
7. **Never a dead frame.** At `0%` something is already visible; at `100%` everything is
   exactly at its rest position. There is no cross-fade to a different image at the end.

---

## 3. The six animations

All durations are the phase-1 length. Add **1760 ms** (260 ms hand-off + 1500 ms morph) for the optional phase 2 (see §4).

### `01 · Sketch & Plop` — 1150 ms
*Stroke draw + squash & stretch*

The three bars of the K are drawn in, one after the other (stem → upper arm → lower leg, each
grown along its own axis), then the swirl falls from above, deforms on impact (`scale(1.26, 0.72)`),
bounces twice with decreasing amplitude, and its three creases draw themselves last. The card
itself dips ~5 px on the impact frame so the whole icon feels weight-bearing.

**Feels like:** a note being doodled. Best default for a friendly, handmade brand.

### `02 · Tactile Keypress` — 1120 ms
*3D keycap click + result pop*

The icon rises as a physical keycap: a dark "skirt" sits underneath, the cap floats, then
drives down 14 px into the housing and rebounds. On release the swirl pops out like a computed
answer with three comic burst ticks around it, then the skirt retracts and disappears.

**Feels like:** the satisfying click of the calculator it's selling. Strongest metaphor of the set.

### `03 · Swirl & Unfold` — 1280 ms
*Mascot hero intro + scissor K*

Inverted structure: the **swirl** draws itself centre-stage at 1.4×, wiggles, then scoots into
its corner perch while the K "scissors" open from its vertical spine — stem first, then the arms
swing out around their real pivots (46.3° / 46.4°).

**Feels like:** a character entering, then the logo assembling around it. Most personality.

### `04 · Polarity Iris Flip` — 1060 ms
*Dark → cream inverted shockwave*

Boots as the **inverted** icon (ink card, cream strokes, ink swirl), then a circular iris mask
detonates outward from the swirl badge and inverts the artwork into the signature cream icon,
with an expanding ring riding the shockwave. Ends with the light swirl spinning into place.

**Feels like:** a system-level boot with a wink. Fastest of the six; the only one that uses both
polarities in one play.

### `05 · Flush Vortex Spin` — 1220 ms
*Whirlpool swirl + corkscrew pop*

Two dashed rings spiral down a whirlpool centred on the corner badge while the whole card spins
out of a −26° tilt. The K spins upright with liquid momentum, then the swirl corkscrews up out
of the vortex, overshooting 15 % before settling.

**Feels like:** water going down. The most kinetic; good if the brand leans into the joke.

### `06 · Modular Coil Stack` — 1240 ms
*Magnetic tangram K + 4-tier build*

The most "systemic" of the set: each bar of the K enters strictly along its **own geometric
vector** (the stem from below, the upper arm along its own slope, the lower leg along its own)
and they collide magnetically at the vertex. Meanwhile the swirl reveals bottom-up in four
stepped tiers via a `<mask>` wiper, and the stack gets a decaying bounce as each tier lands.

**Feels like:** a modular build / assembly line. Good for a "tool, not toy" framing.

---

## 4. Phase 2 — "K becomes the app name"

Every animation can optionally run a **second act**, where the logo stops being an icon and
becomes the wordmark.

1. **Phase 1** plays exactly as described, and settles on the icon. **The wordmark is not
   visible at any point during phase 1.**
2. **Hand-off.** The icon's tile fades out while an identical plate stays behind the
   K and poop — the two are pixel-identical at the swap instant, so nothing is seen.
3. **Morph.** The plate stretches from the 300 px tile into the `1062 × 300` banner
   while the **K slides and grows** into the wordmark's exact slot (Koink's
   `translate(8.94 19.44) scale(0.20374)`, doubled), and the **poop hops across on an arc** into
   the wordmark's slot (`translate(153.21 72.15) scale(1.871)`, doubled) while its halo and body fill fade
   and its line weight eases from 4.81 to 4.26 (the wordmark's pig-matched weight). The `kcal`
   letters slide in last.
4. **Result.** The K and poop now read as the first glyphs of `kcal`, and the last frame is
   `src/assets/brand/kakcalculator-wordmark.svg` (checked pixel for pixel).

Timing: `phase-2 delay = phase-1 duration + 260 ms`, then `1500 ms` of morph, so the
configurations total **2.82–3.04 s**. This is the right shape for a launch screen only if the
app genuinely needs the extra second (cold DB, auth check, remote config) — otherwise use
phase 1 alone and let the app UI take over.

Design rules for phase 2:

- The wordmark must be **resting** at `100%`, never mid-drift.
- The K and swirl keep travelling along one continuous arc — no teleport, no re-entry.
- The lettering is the outlined `kcal` path of the wordmark, so it needs no font.

---

## 5. Dark mode

Dark mode is a **material change, not a background swap**. The tokens are:

```css
--kc-cream /* icon card, swirl fill, wordmark plate */
--kc-ink   /* K strokes, swirl linework, wordmark text */
--kc-edge  /* keycap skirt */
```

| Backdrop | `--kc-cream` | `--kc-ink` | Result |
| --- | --- | --- | --- |
| Dark `#070A14` | `#070A14` (= surface) | `#F9F3E6` | tile **disappears into the background**; only cream shapes remain, no shadow |
| Paper `#F9F3E6` (seamless) | `#F9F3E6` | `#0B0F1E` | normal light mark, blends edge-to-edge |

In dark mode the card and wordmark plate take the surface colour *exactly* and drop shadows are
removed — otherwise the invisible card's silhouette shows up as a faint rounded rectangle. The
standalone files `logos/*-theme-aware.svg` use `var(--kc-surface)` / `var(--kc-contrast)` so you
can drop one file into either theme.

---

## 6. Files in this folder

```
kakcalculator-intro/
├── intro_animation.md               ← you are here
├── logos-and-animations-overview.html  ← static contact sheet of everything, opens in any browser
├── logos/
│   ├── kakcalculator-icon.svg                   1024×1024 paper tile, ink K    (primary)
│   ├── kakcalculator-icon-inverted.svg          1024×1024 dark tile, cream K
│   ├── kakcalculator-icon-theme-aware.svg       1024×1024 uses --kc-surface/--kc-contrast
│   ├── kakcalculator-wordmark.svg               531×150 view box, paper plate
│   ├── kakcalculator-wordmark-inverted.svg      531×150, dark plate
│   ├── kakcalculator-wordmark-transparent.svg   531×150, no plate
│   └── kakcalculator-wordmark-theme-aware.svg   531×150, uses CSS variables
└── animations/
    ├── 01-sketch-and-plop.svg          phase 1 only, 1024×1024 view box (shown at 512)
    ├── 01-sketch-and-plop-lockup.svg   phase 1 + phase 2, 1062×300
    ├── 02-tactile-keypress.svg
    ├── 02-tactile-keypress-lockup.svg
    ├── 03-swirl-and-unfold.svg
    ├── 03-swirl-and-unfold-lockup.svg
    ├── 04-polarity-iris-flip.svg
    ├── 04-polarity-iris-flip-lockup.svg
    ├── 05-flush-vortex-spin.svg
    ├── 05-flush-vortex-spin-lockup.svg
    ├── 06-modular-stack.svg
    ├── 06-modular-stack-lockup.svg
    └── wordmark.svg                    source wordmark, 531×150
```

The `-lockup` files use a `1062 × 300` viewBox: the 1024 icon is shown 300 px tall in the centre of the
banner, and the banner is the wordmark at twice its view-box size.

The overview sheet has replay buttons and a light / dark switch. (The interactive player that used
to be mentioned here is not part of this repository.)

---

## 7. Implementing them

### A. As a launch-screen WebView (recommended)

Load the whole animated SVG inline into a full-bleed WebView, and signal completion to the
native side when the timeline ends:

```html
<div class="splash-icon"><!-- paste the contents of the .svg here --></div>
<script>
  const DURATION_MS = 2910; // phase 1 + phase 2 for 01, see table below
  setTimeout(() => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SPLASH_FINISHED' }));
    } else if (window.webkit?.messageHandlers?.splash) {
      window.webkit.messageHandlers.splash.postMessage('SPLASH_FINISHED');
    }
  }, DURATION_MS + 160);
</script>
```

| Animation | Phase 1 | With phase 2 |
| --- | --- | --- |
| 01 Sketch & Plop | 1150 ms | 2910 ms |
| 02 Tactile Keypress | 1120 ms | 2880 ms |
| 03 Swirl & Unfold | 1280 ms | 3040 ms |
| 04 Polarity Iris Flip | 1060 ms | 2820 ms |
| 05 Flush Vortex Spin | 1220 ms | 2980 ms |
| 06 Modular Coil Stack | 1240 ms | 3000 ms |

### B. Over a live app boot

Put the SVG over your app's first frame and remove it when the animation reports finished —
never wait for the network in the animation itself. On a slow boot, hold the final frame (it
is the exact icon) rather than looping.

### C. As a video / store asset

Each file can be captured headlessly: open it in a browser, record 1.5 s at 2× device pixel
ratio, and trim. Because they settle on-frame, the last frame is a clean still for the App
Store icon shot.

### D. Never do this

- Don't put it in a `<img>` tag if you need the theme variables to resolve — `var()` inside
  `<img>` won't inherit from the page. Inline the SVG (or use the non-theme-aware files).
- Don't add `animation-iteration-count: infinite` to the launch animation.
- Don't swap the final frame for a raster PNG; the whole point is that it *is* the vector icon.

### Accessibility

Respect `prefers-reduced-motion` by collapsing the timeline to ~1 ms — the icon and wordmark
are both already at their resting positions at `100%`, so nothing is lost but the movement:

```css
@media (prefers-reduced-motion: reduce) {
  .splash-icon * { animation-duration: 1ms !important; animation-delay: 0ms !important; }
}
```

---

## 8. Choosing one

| If the app should feel… | Pick |
| --- | --- |
| Friendly, handmade, default-safe | **01 Sketch & Plop** |
| Literally like pressing a calculator key | **02 Tactile Keypress** |
| Character-led, playful | **03 Swirl & Unfold** |
| Fast, system-level, "inverted" identity | **04 Polarity Iris Flip** |
| Kinetic and joke-forward | **05 Flush Vortex Spin** |
| Precise, tool-like, modular | **06 Modular Coil Stack** |

All six end on the identical icon, so they are drop-in interchangeable — you can A/B them
per platform or per app version without touching the rest of the identity.

---

## 9. Regenerating the files

The six animations, the six lockups and `logos-and-animations-overview.html` are **generated**:

```
node scripts/generate-intro-animations.mjs
```

(no dependency; geometry from `scripts/brand-geometry.mjs`). The logos come from
`scripts/generate-icon.mjs` and `scripts/outline-wordmark.mjs`. Run them in this order after
changing the brand art: `generate-icon` → `outline-wordmark` → `generate-intro-animations`
(the lockups read the outlined `kcal` path from the wordmark).

The overview inlines every SVG rather than referencing it with `<img>`, because the theme-aware
logos rely on `var(--kc-surface)` / `var(--kc-contrast)` cascading from the page — which does not
happen inside `<img>`. The same rule applies when you drop these files into an app.
