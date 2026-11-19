# Journal shell: header and dialogs

> **Scope:** Header behaviour (profile, wordmark, settings, tabs, scroll hiding) and dialog/sheet layout rules.
>
> **Read when:** you change `Header.tsx`, `Tabs.tsx`, `Modal.tsx`, the dock or sheet sizing.
>
> **Related:** motion.md, gestures.md, file-map/components-common.md

- **Header:** every page starts with the profile button (left), the Kakcalculator wordmark (centre, which returns to Today) and the settings button (right), followed by the page tabs. The two round buttons are 44 px touch targets; the tab pill below them is deliberately low (32 px buttons in a 40 px pill) so the header stays short. Scrolling down collapses and hides the top app-name row (`48 px` scroll range) together with the full-width header background and border, as well as the pages indicator pill bar below it (`68 px` downward delta); scrolling back up smoothly reveals only the translucent floating page pill (`68 px` upward delta with `requestAnimationFrame` damping and smoothstep easing, without clipping the pill height or bringing back the header background), while the top app-name row and full header surface return when scrolling back to the top of the page.
- **Dialogs:** on phones every dialog opens as a sheet anchored to the bottom of the *visual* viewport (8 px above the edge or the gesture area), so it is as low as possible and rises with the keyboard instead of hiding behind it; on `sm` and wider screens it is centred. The Today quick-add dock uses 48–52 px buttons with 22 px icons. A popup hides the dock without remounting the page or replaying its entrance on dismissal.
