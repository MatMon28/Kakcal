# Launch intro

> **Scope:** The six one-phase launch animations, random pick, theme awareness, where it runs, URL switches and files.
>
> **Read when:** you touch `src/components/intro/` or `src/assets/kakcalculator_intro/`.
>
> **Related:** motion.md, file-map/android-native.md, ../src/assets/kakcalculator_intro/intro_animation.md (animation source spec)

When the app opens it plays one of the **six one-phase launch animations** supplied in `src/assets/kakcalculator_intro/` (`animations/01..06-*.svg`, documented in `intro_animation.md`): Sketch & Plop, Tactile Keypress, Swirl & Unfold, Polarity Iris Flip, Flush Vortex Spin and Modular Coil Stack. Only phase 1 is used (1.06 to 1.28 s, ending exactly on the brand icon); the `-lockup` files and the phase-2 wordmark morph are not used.

- **A different animation every launch.** `pickIntroAnimation()` chooses at random but never the animation of the previous launch (remembered in `localStorage` key `kcalsync_intro_last`). The choice is made once per page load.
- **Over a live boot.** The journal mounts underneath the overlay, so nothing waits for the animation. **The animation stops when loading stops:** `useAppReady()` (first screen committed + fonts loaded + two frames painted) interrupts it at whatever frame it has reached and the overlay fades out in 140 ms (`INTERRUPT_FADE_MS`, `data-fast` in `intro.css`). Only if loading takes longer than the animation does the final frame (the icon) stay for 220 ms before a 240 ms fade, so the timeline is the upper limit, never a minimum. Tap anywhere to skip.
- **Theme-aware, transparent card.** The SVG is inlined (so CSS variables resolve) and the overlay uses the app's `--bg`. The icon's rounded "card" (the `--kc-cream` token) is the page background itself in **every** theme (`.kc-intro { --kc-cream: var(--bg) }` in `intro.css`; it used to be `#FBF3E3` in Light, which showed as a lighter box on the beige background), so only the K and the poop are visible and no box shows. `--kc-ink` is `#232325` in Light and `#FBF3E3` in Lite Dark / Dark (section 5 of `intro_animation.md`). The keycap skirt (animation 2) and the dark iris layer (animation 4) sit under or behind the card and are hidden again before the last frame.
- **Where it runs.** Android, `?view=app` and the browser tour's top-level page. It never runs inside the tour's iframes (the live journal and widget gallery), with `?tour=1`, or when `prefers-reduced-motion` is set.
- **URL switches (review only).** `?intro=0` skips it; `?intro=1` to `?intro=6` forces one animation, e.g. `index.html?view=app&intro=4`.

Files: `src/components/intro/introAnimations.ts` (the six imported SVGs with durations, the picker and `shouldShowIntro`), `IntroSplash.tsx` (overlay, timing, skip, `ready` prop), `useAppReady.ts` (the loading-finished signal) and `intro.css` (overlay, tokens, fade). `App.tsx` renders `<IntroSplash />` next to the journal or tour.

## Only the animation: no logo and no colour jumps

The app used to show the full-name wordmark on a Light cream launch screen, then a cream WebView, then the themed boot screen: three different pages before the animation for Dark users. Now every surface that is visible before the animation is a **plain background colour equal to the current `--bg`**, so the first thing that appears is the animation itself:

1. **Android system launch screen.** It cannot be removed on Android 12+, so it is a transparent icon (`res/drawable/splash_blank.xml`, keep it explicit: with no icon Android falls back to the launcher icon) on the app background. The colour cannot be set at run time, so `scripts/generate-splash-themes.mjs` generates one tiny style per possible `--bg` (`Splash_<hex>` in `res/values/splash_themes.xml`: 6 presets x 3 modes + 10 mono hues x 3 modes = 48) and `LaunchBackground.java` activates the right one with `Context.setSplashScreenTheme` (**Android 13+**, applies from the next cold start). On Android 12 and older the launch screen stays the Light cream of `AppTheme.NoActionBarLaunch` (no platform API); known gap 7.
2. **Window and WebView.** `MainActivity` sets the window background and the WebView background to the saved colour before the page loads (this was the cream frame after the launch screen).
3. **Web boot layer.** `index.html` `#kc-boot` is a full-screen layer in `--bg` with no logo. It fades out over the already-rendered intro (`dismissBootSplash()`), so the cross-fade is invisible.

How the colour reaches native code: `applyThemeAttributes` runs on every theme / style / hue change and on start; `AppContext.tsx` then calls `syncLaunchBackground(--bg)` (`src/utils/android.ts`) which calls the `JournalDevice.setLaunchBackground` plugin method; `LaunchBackground.save` stores it in the `launch_background` SharedPreferences and switches the splash style. The very first launch after installing has no stored colour yet and uses the Light fallback.

Re-run `node scripts/generate-splash-themes.mjs` when a `--bg` in `src/index.css` or the mono palette in `src/utils/themes.ts` changes. `scripts/outline-wordmark.mjs` now only writes the logo into `index.html` / `splash_wordmark.xml` with `--launch-screens` (not used).
