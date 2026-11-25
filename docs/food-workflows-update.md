# Food workflows: ingredient review, navigation and undo

> **Scope:** the food logging, recipe builder, meal builder, Meal diary and delete workflows.
>
> **Read when:** you need the new screen order, persistence behavior or verification steps.
>
> **Related:** [Journal pages](journal-pages.md), [Meal journal](meal-journal.md), [Patch](changes-patch.md)

## Shared dialog controls

`WorkflowFooter.tsx` puts Add more on the left and the green Log/Save action on the right, outside the scroll body. `Modal.tsx` provides a labelled header Back control for nested screens. The active dialog renders `UndoRemovalNotice.tsx` above its footer (inside the focus trap); without an open dialog the notice sits above the page dock.

Undo is in memory for **6.5 seconds** (`undoRemoval.ts`). It reinserts the removed item without replacing unrelated later edits. If several items were removed, the latest notice is shown first. Unsaved ingredient/food drafts are only undoable while the draft is open. The two Settings bulk erases retain confirmation and give an Undo window *before* the irreversible erase and reload; Undo cancels the scheduled erase. Reloading the app during that window also cancels the pending operation.

## Log food → scanner or custom food

Use the scanner or **Add custom food** from the food picker. Back, Escape and the child dialog's Close return to the same search, selected meal, notes and queued foods. The scanner's custom-food fallback also returns to the scanner. Using a scan result or creating a food from Log food opens its amount step in your batch instead of immediately logging it. Standalone scanner/creator entry points keep their direct database and logging actions.

**Add more** queues the current amount and returns to the picker. **Log food** (or **Log all**) is green and stays visible for a single food or a batch. Editing a queued amount and then going Back preserves the original row.

## Ingredient picker

`IngredientPicker.tsx` uses the same search infrastructure and result rows as Log food: configured quick foods, recent foods with the expandable chip row, favorites, local fuzzy search and the offline catalogue worker. Scan or create a food from the picker; Back preserves the search. Selecting a result returns it to the ingredient draft, not to the diary. The configured quick foods are the Log food tiles (`QuickFoodButtons.tsx`: three-column grid with the kcal per 100 g / ml, no heading). In the recipe and meal builders a selected food opens its **quantity** (amount selector and nutrition) before it joins the list, and Back returns to the same search; see [ingredient quantities](ingredient-quantity-update.md).

## Recipes and saved meals

**Custom → Recipes → Import from a link** goes to **Review ingredients**. Each row shows the original ingredient and automatic candidate side by side, plus the currently selected food. A selected food shows its quantity, kcal and macros. The **pencil** (icon only) changes that quantity; **Swap** (icon and text, lines read from the website) or **Search** (lines without a food) opens a picker scoped to that row with available suggestions, followed by the quantity of the chosen food; **Use match** can accept an uncounted candidate. **Delete** removes the row, with Undo. Resolve or remove unmatched lines before continuing. Unselected *to taste* items are optional and don't enter the totals. Closing the picker never removes a source row.

**Continue to portions** opens **Recipe recap**. Use an ingredient's pencil to edit its amount; expand **Standard portion** for the input and fractions of the whole recipe, then collapse it to leave room for ingredients. It starts compact and shows the current default in its header. An imported serving is recalculated from the accepted ingredient weights unless you override it. The green **Save recipe** stays in the footer, with **Add more** at left. **Recipes → +** and editing an existing recipe start at the same ingredient review step, without the import-only fields: a chosen food asks for its quantity (**Add more** / **Add to recipe**), and a line's pencil changes the quantity instead of replacing the food (no Swap on lines added by hand). The saved recipe schema is unchanged.

**Custom → Meals → + → Add ingredient** opens the same picker in the selected meal slot. The meal builder is laid out like the recipe builder (same ingredient cards with pencil and bin, same quantity screen, a **Meal recap** of the nutrition). Choosing a food opens its amount; **Add more** keeps it and returns to the picker, **Add to meal** keeps it and returns to the list, where **Save meal** stays in the footer. Existing amounts stay in the draft if an edit is canceled. Logging a previously saved meal or recipe also keeps **Log** fixed in the footer.

## Meal diary

Open a past meal and select **Edit meal** to update a logged amount, remove a food or add more to that date and meal. The detail reads the live log after changes instead of retaining an old copy. **Go to day** opens Today on the original date and expands the corresponding meal card. Notes, favorites, *Log today* and *Add to Meals* remain available.

Saved food and recipe deletions, saved meals, logged foods, activity, water, stool, custom tracker entries, custom activity/button definitions, period entries and tags, meal plans, shopping lists/items and photos use the shared Undo notice. Photo undo restores the image blob as well as its metadata. Bulk categories and **Delete all data** wait until the cancellation window closes; no persistent Trash or backup copy is created.

The Body measurement history, custom measures, custom meal types, removed layout fields and planner draft/items also have Undo. Toggling a filter, unfavoriting, or choosing not to save an unfinished form is not record deletion. **Add more** in a saved meal/recipe or database quick-log sheet opens a seeded batch without logging yet.

## Verify

Run `npm run check` for TypeScript, lint, unit/component tests and the web build. `tests/undo-removal.test.ts` covers inverse operations, independent timeouts, draft dismissal and the bulk erase grace period. `tests/recipe-builder-ui.test.tsx` covers the review/recap boundary and fraction controls; `tests/ingredient-quantity.test.tsx` the quantity step, pencil / Swap, the meal builder and the shared quick-add tiles. After `VITE_DEMO_DATA=true npm run build` and `npx playwright install chromium`, run `node scripts/check-food-workflows.mjs` to exercise the actual screens (deterministic recipe and barcode responses; no real camera/device required).
