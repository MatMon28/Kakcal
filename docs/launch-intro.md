# Launch intro

> **Scope:** The six one-phase launch animations, random pick, theme awareness, where it runs, URL switches and files.
>
> **Read when:** you touch `src/components/intro/` or `src/assets/kakcalculator_intro/`.
>
> **Related:** motion.md, file-map/android-native.md, ../src/assets/kakcalculator_intro/intro_animation.md (animation source spec)

When the app opens it plays one of the **six one-phase launch animations** supplied in `src/assets/kakcalculator_intro/` (`animations/01..06-*.svg`, documented in `intro_animation.md`): Sketch & Plop, Tactile Keypress, Swirl & Unfold, Polarity Iris Flip, Flush Vortex Spin and Modular Coil Stack. Only phase 1 is used (1.06 to 1.28 s, ending exactly on the brand icon); the `-lockup` files and the phase-2 wordmark morph are not used.

- **A different animation every launch.** `pickIntroAnimation()` chooses at random but never the animation of the previous launch (remembered in `localStorage` key `kcalsync_intro_last`). The choice is made once per page load.
- **Over a live boot.** The journal mounts underneath the overlay, so nothing waits for the animation. The final frame (the icon) is held for 220 ms, then the overlay fades out over 240 ms. Tap anywhere to skip.
- **Theme-aware, transparent card.** The SVG is inlined (so CSS variables resolve) and the overlay uses the app's `--bg`. The icon's rounded "card" (the `--kc-cream` token) is the page background itself in **every** theme (`.kc-intro { --kc-cream: var(--bg) }` in `intro.css`; it used to be `#FBF3E3` in Light, which showed as a lighter box on the beige background), so only the K and the poop are visible and no box shows. `--kc-ink` is `#232325` in Light and `#FBF3E3` in Lite Dark / Dark (section 5 of `intro_animation.md`). The keycap skirt (animation 2) and the dark iris layer (animation 4) sit under or behind the card and are hidden again before the last frame.
- **Where it runs.** Android, `?view=app` and the browser tour's top-level page. It never runs inside the tour's iframes (the live journal and widget gallery), with `?tour=1`, or when `prefers-reduced-motion` is set.
- **URL switches (review only).** `?intro=0` skips it; `?intro=1` to `?intro=6` forces one animation, e.g. `index.html?view=app&intro=4`.

Files: `src/components/intro/introAnimations.ts` (the six imported SVGs with durations, the picker and `shouldShowIntro`), `IntroSplash.tsx` (overlay, timing, skip) and `intro.css` (overlay, tokens, fade). `App.tsx` renders `<IntroSplash />` next to the journal or tour.

## No blank page before the animation: the full-name logo

Two places used to show a blank cream page before the animation. Neither can be removed outright, so both now show the **full-name wordmark** (K, poop, "kcalculator") instead, in the same position and colour, so it reads as one logo:

1. **Android system launch screen.** It cannot be removed on Android 12+ (and it falls back to the launcher icon when no icon is set), so `AppTheme.NoActionBarLaunch` in `res/values/styles.xml` uses `@drawable/splash_wordmark` as `windowSplashScreenAnimatedIcon` (transparent icon background, `#EFE9DD` window background as before). `splash_wordmark.xml` is a 288 dp vector, scaled so the wordmark stays inside the 192 dp circle that Android 12+ masks the icon to (about 177 x 52 dp). Ink is `#232325` on cream. Do **not** point the attribute back at the launcher icon or at a blank drawable (`splash_blank.xml` was deleted).
2. **Web boot screen.** Between the web view starting and React mounting there is nothing to paint. `index.html` therefore contains `#kc-boot`: a fixed full-screen layer with the wordmark as inline SVG (text converted to outlines, so no font has to load) using `--bg` / `--text`, which are already defined in the inlined stylesheet (Light colours as fallback). It sits above the intro overlay; `dismissBootSplash()` (`src/components/intro/bootSplash.ts`, called from `App.tsx` once mounted) fades it out over 220 ms **on top of the already-rendered intro**, so the logo cross-fades into the animation. When there is no intro (`?intro=0`, reduced motion) it fades to the app. It is not rendered inside iframes, with `?intro=0` or `?tour=1` (`data-boot="off"` set by a tiny script in `<head>`).

The wordmark artwork for all three uses (`src/assets/brand/kakcalculator-wordmark-outline.svg`, `splash_wordmark.xml`, the SVG between the `kc-boot:start/end` markers in `index.html`) is **generated** by `node scripts/outline-wordmark.mjs` (needs `npm i --no-save opentype.js`), from the same geometry as `kakcalculator-wordmark.svg` and the bundled Nunito 800. Re-run it if the wordmark changes.

Known limit: the system launch screen and the first boot frame colours are chosen before the theme is known natively; the system screen is always the Light cream colour (the web boot screen does follow the saved theme). See [known-gaps.md](known-gaps.md).
