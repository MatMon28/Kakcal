# Named plans, plan library, shopping list and recent-food chips

> **Scope:** the round that added the plan name on planner page 1, the planner colours, *See all plans* (edit / reuse), the per-plan Shopping list on Custom and the "5 recent foods + ..." chips.
>
> **Read when:** changing any of those, or looking for the file that implements one.
>
> **Related:** [meal-journal.md](meal-journal.md), [new-features-update.md](new-features-update.md), [planner-dock-update.md](planner-dock-update.md), [storage-and-privacy.md](storage-and-privacy.md), [changes-patch.md](changes-patch.md)

| Feature | Where the user finds it | Files |
| --- | --- | --- |
| **Recent foods: 5 + "..."** | Log food (Add food pop-up) and the planner's meal editor show the 5 newest recent foods. A **...** chip reveals 10 more (15 in all); a chevron chip folds them away. No chip when there are 5 or fewer. | `common/RecentChips.tsx` (new: `RecentChips`, `RECENT_SHOWN`, `RECENT_MORE`), `modals/AddFoodModal.tsx`, `journal/PlannerWizard.tsx` (`MealEntryEditor`) |
| **One plan name, on page 1** | Planner page 1 starts with *Name of the plan* (required; **Next** says "Choose a name for the plan" until it is filled). Page 2 never asks for a name: a meal's own title is derived from its foods (unchanged). The name is kept in drafts (`PlannerDraft.name`). | `journal/PlannerWizard.tsx`, `utils/plannerDraft.ts`, `css/journal-plans-shopping.css` |
| **Planner colours = Log food colours** | Saved meals amber (`#FAE0B4` / hover `#F7D69E`, text `#7D4E14` / `#2D1E0B`), recipes purple (`#E2D6FF` / `#4D3582`), meals planned on earlier days blue (`#CFE7FE` / hover `#BDDDFC`, text `#183B5E`, `History` icon). Search results for saved meals use the amber icon circle + badge. | `journal/PlannerWizard.tsx`, `css/journal-planner-tones.css` |
| **See all plans** | Custom > Meal planner, expanded: **See all plans** under the week list opens *All plans*: **Current plans** (last day today or later) and **Past plans**. Press a plan to edit it as a whole; **Reuse** opens page 1 pre-filled; the bin deletes the plan (its meals and its shopping list; logged food is untouched). Meals planned one by one before plans had names sit in a folded "Single meals" list and open as before. | `journal/PlanLibrary.tsx` (new), `journal/MealPlanner.tsx`, `utils/planGroups.ts` (new) |
| **Edit a plan** | Opens on page 2 with every meal; **Name, days and meals** goes back to page 1 (rename, move the first day: the plan moves as a whole, change the last day, skip days, meals). **Save changes** replaces the plan; meals keep their ids and "logged" mark. Closing after a change asks before discarding. **Delete whole plan** is in the footer. | `journal/PlannerWizard.tsx` (`group` prop), `utils/journalStore.ts` (`savePlanGroup`) |
| **Reuse a plan** | Same page 1 as a new plan, already filled in: name "X (copy)", same number of days, same skipped days, same meals, starting today (or the browsed day when later). Page 2 holds the same foods day by day. A longer plan (e.g. 7 -> 14 days) leaves the extra days empty; a shorter one drops the last days; changing the first day moves the whole plan. Saving creates a **new** plan; the original stays. | `journal/PlannerWizard.tsx` (`reuse` prop) |
| **Shopping list** | Custom, **teal** section below the planner. **+** asks which plan, then lists every food the plan needs with the **total** quantity (same food and unit = one line; recipes are broken into ingredients scaled to the planned amount; notes add nothing). One list per plan. Open a list to tick what was bought (struck through, "3 of 12 bought" and a progress bar on the card). **Edit** (pencil): remove lines (bin) and add your own (name, optional quantity, g / ml). **Update from plan** (also offered in a blue notice when the plan changed) recalculates quantities, keeps ticks, removed lines stay removed and your own lines stay. | `journal/ShoppingLists.tsx` (new), `utils/shoppingList.ts` (new), `journal/JournalUI.tsx` (tone `teal`), `common/LibrarySectionHeader.tsx` (palette `shopping`), `prebuilt/PreBuiltMealsView.tsx` |

## Data

- `MealPlan.groupId?` ties a meal to a `PlanGroup { id, name, createdAt }`. Meals without a known group form the virtual group `UNGROUPED_PLAN_ID`.
- `ShoppingList { planId, items, dismissed, updatedAt }`, `ShoppingItem { id, name, amount | null, unit, foodId?, checked, custom? }`. A computed line's id is `foodId|unit`; `dismissed` holds the ids of computed lines the user removed.
- Both live in the existing `kcalsync_meal_journal` record as `planGroups` and `shoppingLists` (so JSON backups and imports carry them; older backups simply have none). No new key, package, permission or remote API.
- Plan share links and the Excel export do not carry plan names or shopping lists (imported meals become single meals).

## Verification

`tests/plans-shopping.test.tsx` (chips, grouping, shopping maths, storage normalising) and `tests/planner-wizard.test.tsx` (name on page 1, reuse with extra days, moving the first day, whole-plan edit, single-meal edit keeps its plan) run in `npm test`. `npx tsc --noEmit`, `npm run lint` (no new warnings) and `npm run build` pass. Not exercised in a real browser or on a device (no browser binary in the authoring environment): check with `VITE_DEMO_DATA=true npm run dev` > Custom.
