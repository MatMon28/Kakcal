---
name: kakcal-ui-mockup
description: >-
  Use when the user wants to design, prototype, or preview a UI mockup of a
  Kakcal page, card, or modal before editing real source code.
---

# Kakcal UI Mockup Workflow

1. **Do not touch repo files** (`src/`, `docs/`, `tests/`) while iterating on a mockup.
2. Read `docs/styles-guide.md` only if you need exact token/geometry details, and follow the `generative_ui` skill to build a self-contained `.html` artifact in the artifact directory (`UserFacing: true`, `RequestFeedback: false`).
3. Embed the prototype inline in chat with `<agent-embed src="file:///..."></agent-embed>`.
4. Build the mockup with:
   - The allowlisted Tailwind script: `https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js`.
   - A `390px` phone-width frame so mobile spacing matches Kakcal's single-column layout.
   - A compact top preview bar with a **Style switcher** (`Classic`, `Glass`, `Material`, `Pop`, `Minimal`) and **Light / Dark** mode toggle using Kakcal's colour, radius, and border rules.
   - Interactive state toggles (e.g., collapsed/expanded, empty/filled, sheet open/closed) so the user can test layout and contrast directly.
5. Wait for explicit user approval before modifying real React/TSX source files.
