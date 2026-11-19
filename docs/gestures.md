# Gestures and Android Back

> **Scope:** Which swipes switch tabs, which controls keep their own gestures, edge reservation and Back-button behaviour.
>
> **Read when:** you change swipe handling or Back handling in `App.tsx` / `PageSwiper.tsx`.
>
> **Related:** motion.md

Horizontal swipes on main content follow the finger and switch visible tabs, even on blank areas and ordinary fields (see [Motion](motion.md)); animations are interrupted by the next touch. Text areas, contenteditable areas, sliders, open dialogs, horizontal scrollers that can still move in the swipe direction, and marked controls keep their gestures. The Statistics weight trend accepts swipes. Dialogs close by swiping their handle or title bar down. The outer 8 CSS pixels are reserved for system-edge navigation; multi-touch, canceled gestures and predominantly vertical movement do not navigate. On Android, Back dismisses the top dialog or Today calendar, returns from the catalog, then returns to Today. At the root, it backgrounds the app. The keyboard and launcher-level long-press/resize are handled by Android.
