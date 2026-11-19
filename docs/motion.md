# Motion and animation

> **Scope:** Spring curves, press feedback, page swipe and handoff, dialog drag-dismiss, collapsibles, reduced motion.
>
> **Read when:** you touch `spring.ts`, `motion.ts`, `PageSwiper.tsx`, `Collapsible.tsx` or any animation timing.
>
> **Related:** gestures.md, launch-intro.md

Motion follows the usual guidelines: it is quick, driven by physics, interruptible at any moment and uses only `transform`/`opacity`. `src/utils/spring.ts` samples a damped spring into a CSS `linear()` curve, published as `--ease-soft` (about 3 % overshoot, **271 ms**: pages, sheets, docks, values) and `--ease-bounce` (about 20 % overshoot, **297 ms**: pressed controls and the dock). Browsers without `linear()` get a cubic-bezier fallback. The same curves drive CSS, keyframes and Web Animations.

- **Press feedback:** a pressed button shrinks to 90 % in 90 ms, then springs back with a small overshoot (`.pressable`).
- **Page swipe** (`src/components/common/PageSwiper.tsx`): The full-width `<main>` listens for Pointer Events, including in its margins and empty bottom padding. Only a horizontal drag past 10 px takes pointer capture; buttons still receive ordinary taps. The two pages follow the finger together with physical drag resistance (`0.72×` initial damping). A deliberate distance (`27 %` of the viewport width, 86–116 px) or a fast flick (`> 0.65 px/ms` past `12 %` width) is required on release so short, slow drags snap back without changing the page, then a single transform settles in 80 to 150 ms. Vertical scrolling, pinch zoom, cancelled drags and horizontal lists retain their own behaviour.
- **Page handoff:** both pages move on one rail. Releasing a completed swipe promotes the already-mounted destination rather than replacing it with a second copy. The rail settles to its normal position with no persistent animation fill. A new press cancels the settle, ordinary taps keep their original target, the outgoing page cannot expose a second quick-add dock, and as soon as the finger releases (`kc-page-dragging` removed), the floating dock and its action buttons immediately animate in over 130 ms from the swipe direction (`--kc-swipe-dir`, appearing from the right when moving to a right page and from the left when moving to a left page).
- **Dialogs:** drag the handle or title bar down to dismiss; a short or cancelled drag returns the sheet to rest. While a sheet is open, scroll chaining and browser pull-to-refresh are disabled. Closing it releases the scroll lock, leaving the original page, its scroll position and its dock in place. The dialog body still scrolls above the keyboard.
- **Settings groups** open with a 300 ms height animation (`src/components/common/Collapsible.tsx`); switches and chevrons use the bounce spring.
- Values that change (intake, burned) and the Today day change use the soft spring (`src/utils/motion.ts`, `.anim-value`).
- All of it, including the [launch intro](launch-intro.md), is disabled by `prefers-reduced-motion`.
