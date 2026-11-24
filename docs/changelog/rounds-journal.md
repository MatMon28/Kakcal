# Journal rounds (moved from the root README)

> **Scope:** Round-by-round notes for the meal journal: planner, meal / photo diary, Custom page, share links, interaction update.
>
> **Read when:** you need the history or the exact intent of a Custom / diary / planner change. For current behaviour open [../meal-journal.md](../meal-journal.md).
>
> **Related:** [../meal-journal.md](../meal-journal.md), [../new-features-update.md](../new-features-update.md), [../custom-photo-share-update.md](../custom-photo-share-update.md), [../planner-dock-update.md](../planner-dock-update.md), [../interaction-update.md](../interaction-update.md)

**New features round:** photo diary time range; recent and favourite foods in Custom > Foods; a standard portion for recipes (logged by default instead of 100 g); a two-page meal planner (first / last day, weekdays to skip, specific days, then a scrolling list where only the meal being planned is open, with arrows at the bottom); Excel (.xlsx) export; *Add to Meals* for logged meals; protein target per kg of body weight; water in Statistics; a deficit / surplus target for intake minus burned; Plan meals / Photo diary buttons in the Custom bottom bar that can be hidden in Settings. See [docs/new-features-update.md](../new-features-update.md).

**Custom / photo diary / short links round:** in Minimal mode the Custom fields (Meal diary and Meal planner included) compact two per row and hide the header icons that do not fit; outside Minimal every field takes the whole row; Custom fields appear together with no entrance stagger; the share pop-up opens only from a received link or a real press on the share icon; share links are much shorter (compressed, still serverless and offline); photo diary pop-ups got a calendar-icon date, a compact meal select, a footer Save button, full-width gallery search/date and a *Go to the meal* button in the viewer. See [docs/custom-photo-share-update.md](../custom-photo-share-update.md).

Continuous Koink-style page selector, bottom-of-page swipes, cleaner Custom headers, personalized icons, readable diary actions, remembered planner entry mode, local link sharing/import, improved photo controls and picture exports. Review with `VITE_DEMO_DATA=true npm run dev`. See [docs/interaction-update.md](../interaction-update.md).

**Journal consistency round:** Meal diary, Meal planner and Photo diary now use the same section header (new `LibrarySectionHeader.tsx`), search, chips and buttons as Meals, Recipes and Foods; the Meal diary icon is a notebook; and the planner offers *Same for all* or *Different for each* when several days / meals are selected.

**Today-style meals round:** the Custom page no longer has the heading block (title, "Your favorites…" line, *Create new* button); the Meal diary and Meal planner use the same colourless meal icons as Today, previews show the note (or nothing) under the meal name, pressing a meal or plan opens a Today-style meal card (new `MealSummaryCard.tsx`, `common/mealSlotIcon.tsx`), the diary filter Reset is an icon, Today's empty meals lose *+ Log Food*, and Compact note / photo icons join the header bar. See [docs/meal-journal.md](../meal-journal.md).
