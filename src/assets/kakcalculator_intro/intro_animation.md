# Kakcalculator — Launch Animation System

A set of **six bespoke app-load animations** for the Kakcalculator icon, each one written to
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
| Cream | `#FBF3E3` |
| Ink | `#232325` |
| Dark surface | `#141417` |
| Typeface | heavy rounded geometric sans (Nunito / Quicksand / Rubik as fallbacks), weight 800, `-2px` tracking |
| Icon | `512 × 512`, squircle `rect x=8 y=8 w=496 h=496 rx=116` |
| Wordmark | `820 × 260`, K + swirl + `kcalculator` |

The icon is a **bold "K" drawn as three round-capped strokes** (stroke-width 96) with a small
**swirl/poop mascot** in the bottom-right corner. That's the whole vocabulary the animations
are allowed to use: a cream squircle, three thick bars, and a doodle. Nothing else is invented —
every animation is made of those three parts moving.

### The geometric anchors (used by every animation)

These are the numbers that make the "settle to the exact icon" guarantee work:

| Part | Path | Length | Pivot / midpoint |
| --- | --- | --- | --- |
| Stem | `M148 132 V392` | 260 | `(148, 262)` |
| Upper arm | `M156 268 L304 132` | 201 | `(230, 200)`, sits at `+42.58°` from horizontal |
| Lower leg | `M196 252 L312 392` | 181.81 | `(254, 322)`, sits at `-50.36°` |
| Swirl badge | `translate(274 282) scale(2.85)` | — | global centre `(365.2, 373.2)`, base `(365.2, 441.6)` |

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

All durations are the phase-1 length. Add **1760 ms** for the optional phase 2 (see §4).

### `01 · Sketch & Plop` — 1150 ms
*Stroke draw + squash & stretch*

Three marker strokes sketch the K in sequence (stem → upper arm → lower leg, each drawn by
`stroke-dashoffset`), then the swirl falls from above, deforms on impact (`scale(1.26, 0.72)`),
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
swing out around their real pivots (±42.58° / −50.36°).

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
2. **Hand-off.** The icon's cream squircle fades out while an identical plate stays behind the
   K and swirl — the two are pixel-identical at the swap instant, so nothing is seen.
3. **Morph.** The plate stretches from the 341 px squircle into the `820 × 260` wordmark banner
   while the **K slides and shrinks** into the wordmark's exact `translate(38 58) scale(0.52)`
   slot, and the **swirl hops across on an arc** with a squash landing into
   `translate(128 108) scale(1.45)`.
4. **Result.** The K and swirl now read as the first glyphs of `kcalculator`.

Timing: `phase-2 delay = phase-1 duration + 260 ms`, then `1500 ms` of morph, so the default
configurations total **2.91–3.04 s**. This is the right shape for a launch screen only if the
app genuinely needs the extra second (cold DB, auth check, remote config) — otherwise use
phase 1 alone and let the app UI take over.

Design rules for phase 2:

- The wordmark must be **resting** at `100%`, never mid-drift.
- The K and swirl keep travelling along one continuous arc — no teleport, no re-entry.
- Typography is pinned with `textLength="552" lengthAdjust="spacingAndGlyphs"` so the word
  always ends flush inside the plate regardless of which fallback font is installed.

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
| Dark `#141417` | `#141417` (= surface) | `#FBF3E3` | card **disappears into the background**; only cream strokes remain, no shadow |
| Cream `#FBF3E3` (seamless) | `#FBF3E3` | `#232325` | normal light mark, blends edge-to-edge |
| Linen `#E8DEC8` | `#FBF3E3` | `#232325` | light mark on a warm sheet |

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
│   ├── kakcalculator-icon.svg                   512×512 cream card, ink K     (primary)
│   ├── kakcalculator-icon-inverted.svg          512×512 ink card, cream K
│   ├── kakcalculator-icon-theme-aware.svg       512×512 uses --kc-surface/--kc-contrast
│   ├── kakcalculator-wordmark.svg               820×260, cream plate
│   ├── kakcalculator-wordmark-inverted.svg      820×260, ink plate
│   ├── kakcalculator-wordmark-transparent.svg   820×260, no plate
│   └── kakcalculator-wordmark-theme-aware.svg   820×260, uses CSS variables
└── animations/
    ├── 01-sketch-and-plop.svg          phase 1 only, 512×512
    ├── 01-sketch-and-plop-lockup.svg   phase 1 + phase 2, 860×380
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
    └── wordmark.svg                    source wordmark, 820×260
```

The `-lockup` files use an `860 × 380` viewBox because they have to contain both the centred
512 px icon and the wide wordmark in the same coordinate space.

The interactive version of all of this — scrubbing, speed, backdrop switching, per-animation
phase-2 toggles, phone simulator and code export — is `../index.html`.

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

## 9. Rendering the contact sheet

`logos-and-animations-overview.html` is generated, not hand-maintained. If you add or rename a
file in `logos/` or `animations/`, rebuild it with the script below (it inlines every SVG so the
sheet works offline, in an email, or inside a sandboxed iframe with no network access):

```python
import glob, os

def cells(files):
    out = []
    for f in files:
        name = os.path.basename(f).replace('.svg', '')
        svg = open(f, encoding='utf-8').read()
        cls = ' cell'
        out.append(f'<figure class="cell{cls}"><div class="art">{svg}</div>'
                   f'<figcaption>{name}</figcaption></figure>')
    return '\n'.join(out)

logos = sorted(glob.glob('logos/*.svg'))
anims = sorted(glob.glob('animations/*.svg'))
# ... assemble the page around cells(logos) / cells(animations) ...
```

Each SVG is inlined rather than referenced by `<img>`, because the theme-aware logos rely on
`var(--kc-surface)` / `var(--kc-contrast)` cascading from the page — which does not happen
inside `<img>`. The same rule applies when you drop these files into an app.
