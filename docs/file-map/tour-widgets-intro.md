# File map: Tour, widget gallery and launch intro

> **Scope:** `src/components/tour/`, `widgets/`, `intro/` and `src/assets/kakcalculator_intro/`.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/components/tour/NotificationShowcase.tsx` | The tour's notification previews (real EN/IT strings; each card opens its screen in the live journal). |
| `src/components/tour/AppTour.tsx`, `tourContent.ts` | Guided webview: a step for every page, including Notifications (English and Italian copy), the live journal beside each step, the widgets last, language and theme that follow the app, and the Open full app link. |
| `src/components/widgets/WidgetGallery.tsx`, `widget-preview.css` | The four widget designs: translucent Small and Extra-small trays, the Medium widget (no bars, no percentages) and the Large widget (macro letters) in Ultra minimal Today's arrangement, with action button styles matching the active theme style (`classic`, `angular`, `aurora`, `pop`, `playful`, `minimal`, `mono`), Light/Dark look, and optional Custom button chosen in Settings. |
| `src/components/intro/bootSplash.ts` | `dismissBootSplash()`: fades out the `#kc-boot` background-colour layer (no logo) that `index.html` paints before React mounts. See [Launch intro](../launch-intro.md). |
| `src/components/intro/useAppReady.ts` | `useAppReady()`: true once the first screen is committed, fonts are loaded and two frames are painted. `IntroSplash` stops the animation when it turns true. |
| `src/components/intro/introAnimations.ts`, `IntroSplash.tsx`, `intro.css` | Launch intro: the six phase-1 animations from `src/assets/kakcalculator_intro/`, a random pick that differs from the last launch, the theme-aware overlay (its icon card is transparent: `--kc-cream` = `--bg`) and its fade-out. See [Launch intro](../launch-intro.md). |
| `src/assets/kakcalculator_intro/` | Supplied launch-animation kit: `animations/` (six phase-1 SVGs, six lockups, wordmark), `logos/`, `intro_animation.md` and the overview sheet. Only the six phase-1 files are imported. |
| `src/components/widgets/widgetContract.ts` | Serializable widget actions/snapshot, message validation, and today's nutrition mapping using the app's existing calculations. |
| `src/components/tour/InstallGuide.tsx`, `installContent.ts` | The **Install** section at the top of the tour page: iPhone/iPad, Android (PWA + APK download with the "file could be harmful" notice) and Computer tabs, device-based default tab, *Install now* button, installed note. Texts (EN/IT) live in `installContent.ts`. See [PWA](../pwa.md#install-guide-and-always-open-the-app). |