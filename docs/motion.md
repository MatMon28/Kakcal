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

## Popup exit: sucked into the bottom bar

Every way of closing a dialog (X, backdrop, Escape, Back, swipe down, or the parent closing it after Save) goes through the same exit in `Modal.tsx` (`playExit`):

- The dialog is simply unmounted at once. `playExit` runs from the layout-effect cleanup: it clones the overlay (or re-attaches it when React already detached it), starts from the sheet's *painted* transform (so a swiped sheet continues from the finger's position and speed) and animates the clone on the compositor. The page behind is usable immediately; there is no waiting for `onfinish` and no unmount flash. A refused swipe-close (the parent did not unmount) springs back after 120 ms.
- **Target:** `getDockTarget(dockId)` in `ActionDock.tsx`. If the dialog has a `dockId` (the id of a bar button that opens it: `food`, `activity`, `water`, `poop`, `weight`, `custom` on Today; `meal`, `recipe`, `food` on Meals; `cycle` on Period) and that button exists, the sheet shrinks (translate + scale, then fades) into the button, which gives a small pulse as it swallows it. Any other dialog (profile, settings, pickers...) shrinks into the **centre of the bar** (pulse on the bar). With no bar on screen, or when another dialog stays open below, the sheet leaves through the bottom edge.
- Durations: the exit is deliberately **barely perceivable**: 90 ms tap-close and 70 ms swipe-close into a button, 80 / 60 ms to the bottom, and a 110 ms pulse on the button (they used to be 300 / 250 / 220 / 200 ms and 340 ms). Constants live in `playExit` in `Modal.tsx`. `prefers-reduced-motion` skips it.

**Ending the exit early (interrupt round).** Every running exit registers itself in `activeExits` (`Modal.tsx`). A document-level guard (`installInputGuards`) ends all of them instantly, removing the ghost and cancelling the pulse, on the next `pointerdown`, `touchstart`, `keydown`, `wheel` or `kc:overlay-open`, so the animation never delays whatever you do next. `finishExitAnimations()` is exported for the same purpose.

**Tap rescue after a swipe-dismiss.** In Chromium (and so in the Android WebView) the handle's `touch-action: none` drag can make the browser swallow the *click* of the next taps for roughly 0.3-0.5 s: `pointerdown`/`pointerup` arrive but no `click`, which felt like a refractory period after the popup closed (reproduced in headless Chromium: taps right after a swipe-close did nothing; after an X-close they worked). For 900 ms after a swipe-dismiss (`TAP_RESCUE_MS`), a quick touch tap (< 12 px, < 700 ms, same target on down and up) whose `click` does not arrive within 80 ms is re-sent as a click on that element. Normal taps are untouched because a real click cancels the rescue.

## Bottom bar hides on scroll

`ActionDock.tsx` (`useHideOnScroll`): after 14 px of downward scroll (below 48 px from the top) the bar slides below the screen edge; 7 px of upward scroll brings it back; it is always visible near the top, and opening any dialog reveals it again (it is the dialog's exit target). CSS: `.kc-dock-wrap[data-hidden]` in `index.css` (transform on the wrapper, so it never fights `.anim-dock`).
