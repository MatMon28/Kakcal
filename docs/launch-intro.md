# Launch intro

> **Scope:** The six one-phase launch animations, random pick, theme awareness, where it runs, URL switches and files.
>
> **Read when:** you touch `src/components/intro/` or `src/assets/kakcalculator_intro/`.
>
> **Related:** motion.md, file-map/android-native.md, ../src/assets/kakcalculator_intro/intro_animation.md (animation source spec)

When the app opens it plays one of the **six one-phase launch animations** supplied in `src/assets/kakcalculator_intro/` (`animations/01..06-*.svg`, documented in `intro_animation.md`): Sketch & Plop, Tactile Keypress, Swirl & Unfold, Polarity Iris Flip, Flush Vortex Spin and Modular Coil Stack. Only phase 1 is used (1.06 to 1.28 s, ending exactly on the brand icon); the `-lockup` files and the phase-2 wordmark morph are not used.

- **A different animation every launch.** `pickIntroAnimation()` chooses at random but never the animation of the previous launch (remembered in `localStorage` key `kcalsync_intro_last`). The choice is made once per page load.
- **Over a live boot.** The journal mounts underneath the overlay, so nothing waits for the animation. The final frame (the icon) is held for 220 ms, then the overlay fades out over 240 ms. Tap anywhere to skip.
- **Theme-aware.** The SVG is inlined (so CSS variables resolve) and the overlay uses the app's `--bg`. In Light the cream/ink tokens are `#FBF3E3` / `#232325`; in Lite Dark and Dark the card takes the surface colour and only the cream strokes remain, as in section 5 of `intro_animation.md`.
- **Where it runs.** Android, `?view=app` and the browser tour's top-level page. It never runs inside the tour's iframes (the live journal and widget gallery), with `?tour=1`, or when `prefers-reduced-motion` is set.
- **URL switches (review only).** `?intro=0` skips it; `?intro=1` to `?intro=6` forces one animation, e.g. `index.html?view=app&intro=4`.

Files: `src/components/intro/introAnimations.ts` (the six imported SVGs with durations, the picker and `shouldShowIntro`), `IntroSplash.tsx` (overlay, timing, skip) and `intro.css` (overlay, tokens, fade). `App.tsx` renders `<IntroSplash />` next to the journal or tour.

## Only the animated intro on Android (no generic logo screen)

Android used to show its own system launch screen (the launcher logo on cream) *before* the web view started, so users saw two logo screens: a static one, then the animation. The system screen cannot be removed on Android 12+, so it is made **invisible** instead:

- `android/app/src/main/res/drawable/splash_blank.xml` is an empty (fully transparent) vector.
- `AppTheme.NoActionBarLaunch` in `res/values/styles.xml` uses it as `windowSplashScreenAnimatedIcon` (it was `@mipmap/ic_launcher`) and sets `windowSplashScreenIconBackgroundColor` to transparent. The background stays `#EFE9DD` (same as `capacitor.config.json` > `android.backgroundColor` and the Light `--bg`), so the hand-over to the web view and then to `IntroSplash` has no visible step.
- Do **not** point `windowSplashScreenAnimatedIcon` back at the launcher icon; Android 12+ also falls back to the launcher icon if the attribute is missing.
- Known limit: the system launch screen is always the Light cream colour (the theme is chosen in the app and stored in the web view, which native code cannot read before launch). Dark users therefore see a brief plain cream flash, never a logo. See [known-gaps.md](known-gaps.md).
