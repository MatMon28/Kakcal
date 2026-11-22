# File map: Tour, widget gallery and launch intro

> **Scope:** `src/components/tour/`, `widgets/`, `intro/` and `src/assets/kakcalculator_intro/`.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/components/tour/NotificationShowcase.tsx` | The tour's notification previews (real EN/IT strings; each card opens its screen in the live journal). |
| `src/components/tour/AppTour.tsx`, `tourContent.ts` | Guided webview: a step for every page, including Notifications (English and Italian copy), the live journal beside each step, the widgets last, language and theme that follow the app, the Open full app link and an **install card** for iPhone/iPad, Android (PWA + APK) and desktop that calls `openInstallGuide()`. The old dead `downloads/Kakcalculator-Android-Studio.zip` link is gone. |
| `src/components/widgets/WidgetGallery.tsx`, `widget-preview.css` | The four widget designs: translucent Small and Extra-small trays, the Medium widget (no bars, no percentages, no icons on the intake / burned cards) and the Large widget (macro letters) in Ultra minimal Today's arrangement, with action button styles matching the active theme style (`classic`, `angular`, `aurora`, `pop`, `playful`, `minimal`, `mono`), Light/Dark look, and optional Custom button chosen in Settings. |
| `src/components/intro/bootSplash.ts` | `dismissBootSplash()`: fades out the `#kc-boot` background-colour layer (no logo) that `index.html` paints before React mounts. When the launch animation runs, `launchIntro.ts` has already removed the layer, so this only matters when no animation is shown (reduced motion). See [Launch intro](../launch-intro.md). |
| `src/components/intro/useAppReady.ts` | `useAppReady()`: true once the first screen is committed, fonts are loaded and two frames are painted. `IntroSplash` passes it to `launchIntro.ts`, which lets the overlay leave once the animation has also finished (it no longer interrupts the animation). |
| `src/components/intro/launchIntro.ts` | Plain-DOM launch controller: builds the overlay, removes `#kc-boot`, times the animation (+ 120 ms hold), waits for `markAppReady()`, fades (200 ms) and removes itself; tap-to-skip; exports `startLaunchIntro`, `markAppReady`, `onLaunchIntroEnd`, `afterFirstPaint`. See [Launch intro](../launch-intro.md). |
| `src/components/intro/earlyStart.ts` | Side-effect module imported by `main.tsx` before `./App`: calls `startLaunchIntro()` so the animation paints before the app is evaluated. |
| `src/components/intro/introAnimations.ts`, `IntroSplash.tsx`, `intro.css` | Launch intro data and React bridge: the six phase-1 animations from `src/assets/kakcalculator_intro/` (durations divided by `INTRO_SPEED` 2.5), a random pick that differs from the last launch, `IntroSplash` (renders nothing; reports `ready`, calls `onDone`) and the theme-aware overlay styles (its icon card is transparent: `--kc-cream` = `--bg`; `--kc-ink` is Koink's `#0B0F1E` / `#F9F3E6`). See [Launch intro](../launch-intro.md). |
| `src/assets/kakcalculator_intro/` | Launch-animation kit, **generated** by `scripts/generate-intro-animations.mjs` (the six animations, `wordmark-plop.svg`, overview sheet) and by `generate-icon.mjs` / `outline-wordmark.mjs` (`logos/`, `animations/wordmark.svg`); `intro_animation.md` documents it. Only the six phase-1 files are imported. |
| `src/components/widgets/widgetContract.ts` | Serializable widget actions/snapshot, message validation, and today's nutrition mapping using the app's existing calculations. |
