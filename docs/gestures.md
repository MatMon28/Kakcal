# Gestures and Android Back

## Continuous selector

`PageSwiper` publishes its fractional page index through `utils/pagePosition.ts`, following Koink's rail/pill pattern. `Tabs` interpolates the indicator edges, label widths and pastel layers during dragging, settling and cancellation. Taps glide to their destination. Bottom-of-page blank space remains in the main swipe surface; previews must not increase the document's scroll height. Reduced motion keeps navigation functional without travel animations.

> **Scope:** Which swipes switch tabs, which controls keep their own gestures, edge reservation and Back-button behaviour.
>
> **Read when:** you change swipe handling or Back handling in `App.tsx` / `PageSwiper.tsx`.
>
> **Related:** motion.md

Horizontal swipes on main content follow the finger and switch visible tabs, even on blank areas and ordinary fields (see [Motion](motion.md)); animations are interrupted by the next touch. Text areas, contenteditable areas, sliders, open dialogs, horizontal scrollers that can still move in the swipe direction, and marked controls keep their gestures. The Statistics weight trend accepts swipes. Dialogs close by swiping their handle or title bar down. The outer 8 CSS pixels are reserved for system-edge navigation; multi-touch, canceled gestures and predominantly vertical movement do not navigate. On Android, Back dismisses the top dialog or Today calendar, returns from the catalog, then returns to Today. At the root, it backgrounds the app. The keyboard and launcher-level long-press/resize are handled by Android.

**After a swipe-down close:** the next press or key ends the closing animation at once, and a tap in the next 0.9 s can never be lost (see *Ending the exit early* and *Tap rescue* in [motion.md](motion.md)).

## Sensitivity (gesture round)

All numbers are named constants at the top of `PageSwiper.tsx` / inside `Modal.tsx`:

| Gesture | Rule |
| --- | --- |
| Page swipe takes over | 6 px horizontal travel, horizontal must beat vertical by 1.1x (zero dead-zone jump on lock) |
| Page follows the finger | 0.94x initially, 1:1 past 72 px; smooth exponential rubber-band at edges without an adjacent tab |
| Page swipe commits | 44-72 px (14 % of the width), or a light flick (> 0.22 px/ms past max(24 px, 6 % width)) |
| Swipe back from the food catalogue | 56 px |
| Popup swipe-down starts | 2 px; dismisses past 56 px or on a flick (> 0.3 px/ms past 10 px); the handle area is taller |
| **Today: swipe the calendar row** | `DayNavigator.tsx`: swipe left = next day, right = previous day, exactly the arrows' action (`setSelectedDate(addDaysToDateString(...))`). 20 px (or a 12 px quick flick) = one day per swipe; a swipe never also taps the calendar button; ignored while the calendar popover is open. |

During rail movement the viewport clips both axes. Adjacent previews cannot enlarge scrollable document height when swiping from the bottom of Today.
