# Ingredient quantities, Meal name and quick-add tiles

> **Scope:** the quantity step of the recipe and meal builders, the pencil / Swap actions of an ingredient line, the meal builder laid out like the recipe builder, the Log food quick-add tiles in the ingredient picker, and in the planner the date next to the meal type and the optional **Meal name**.
>
> **Read when:** you change how an ingredient is chosen, weighed, replaced or listed in a recipe or saved meal, the quick-add buttons, or the title of a planned meal.
>
> **Related:** [Food workflows](food-workflows-update.md) (review / recap, footer, Undo), [Meal journal](meal-journal.md) (planner), [Plans and shopping](plans-shopping-update.md) (plan name), [Patch](changes-patch.md)

## What changed

| Request | Now | Where |
| --- | --- | --- |
| Planner: show the date next to the meal type | Every meal card of the wizard reads `Lunch · Wed 25 Nov` (also when one meal is edited, where no day heading exists). The planner rows in Custom and the single meals of *See all plans* use the same form. | `journal/PlannerWizard.tsx`, `journal/MealPlanner.tsx` (`PlanRow`), `journal/PlanLibrary.tsx`, `journal/css/journal-planner-wizard.css` |
| Planner: a name for one meal, called **Meal name** | An open meal has a **Meal name** button under *Choose food / Write a note*. It turns into the field; a meal that already has a name opens with the field. The old field at the bottom (wrongly labelled *Plan name (optional)*) is gone. | `journal/PlannerWizard.tsx` (`MealEntryEditor`), `utils/planMealName.ts` |
| Recipe: choose the quantity (and see nutrition) when choosing a food | A food picked in the ingredient picker opens the **quantity** screen (amount selector + nutrition grid) before it joins the recipe. | `prebuilt/RecipeBuilderModal.tsx` |
| Recipe: *Change* edits the quantity, it does not swap | The line's **pencil** (icon only) opens the quantity of that food. | `common/IngredientRow.tsx`, `RecipeBuilderModal.tsx` |
| Recipe from a website: edit the quantity (pencil) or swap the food | Imported lines have the icon-only pencil **and** a **Swap** button (icon and text). | same |
| Meal builder more similar to the recipe builder | Same ingredient cards, same quantity screen, same footer logic, same nutrition recap. | `prebuilt/CreateMealModal.tsx` |
| Quick-add buttons in meals and recipes like in Log food | The picker renders Log food's own tiles through one shared component. | `common/QuickFoodButtons.tsx`, `common/IngredientPicker.tsx`, `modals/AddFoodModal.tsx` |

## Ingredient line (`IngredientRow.tsx`)

One component draws an ingredient in the recipe review, the recipe recap and the meal builder:

- the food name and its quantity (`Banana · 200 g`), with *Selected:* in front on imported lines;
- the kcal and the macro pills of that quantity;
- a **pencil without text** (`data-ingredient-edit`, named *Change amount for …*): changes the quantity, never the food;
- optionally a button with **icon and text** (`data-ingredient-swap`): **Swap** on a line read from a website, **Search** on a line that has no food yet;
- the bin (Undo as before).

A line the user added by hand has no Swap: delete it and add another food. A recipe that is edited later is a hand-made recipe (the source lines are not stored), so its lines have the pencil and the bin.

## Quantity screen

`RecipeBuilderModal.tsx` holds an `AmountDraft` (`food`, `mode`, `row`); nothing is written to the recipe until the green button is pressed.

| Mode | Opened by | Footer |
| --- | --- | --- |
| `add` | a food chosen in the picker for a new line | **Add more** (keeps it, opens a fresh picker) · **Add to recipe** (keeps it, back to the list) |
| `edit` | the pencil of a line | **Save amount** |
| `swap` | a food chosen after **Swap** / **Search** on a line | **Use this food** (replaces the food and the quantity of that line) |

The screen is `AmountSelector` + `FoodMacroGrid`, the same pair Log food uses. **Back** from a quantity opened by the picker returns to the same search: the picker stays mounted (hidden) behind the quantity screen, and `IngredientPicker` closes its scanner / custom-food child before it hands a food over. **Use match** still accepts the automatic candidate directly, with the quantity read from the source line. The saved recipe schema is unchanged.

## Meal builder

`CreateMealModal.tsx` uses the same blocks as the recipe builder: name field, one card per ingredient (`[data-ingredient-review]` / `[data-review-line]` with `IngredientRow`), the quantity screen, and a **Meal recap** card (kcal, macro pills, fibre / salt / optional sugar) like the recipe recap. The footer follows the recipe builder: **Add ingredient** · **Save meal** on the list, **Add more** · **Add to meal** on the quantity of a new food, **Save amount** for the pencil. The meal type chips and the description are the only meal-specific fields. The state hook (`usePreBuiltMealsState.tsx`) is unchanged; `handleSaveMeal(true)` (save including a pending food) is no longer called by the dialog.

## Quick-add tiles (`QuickFoodButtons.tsx`)

The quick food shortcuts of Settings > Today are a three-column grid of tiles (food name, kcal per 100 g / ml), without a heading. Log food and the ingredient picker both render `QuickFoodButtons`, so the meal and recipe pickers cannot differ from Log food. The picker's *Quick foods* heading and pills are gone; its recent chips and section labels use the Log food classes too.

## Planner

- **Date next to the meal type:** `PlanWizard` adds `<span class="journal-meal-card-date" data-plan-date>` after the meal type in each card head; `PlanRow` and the single meals of `PlanLibrary` use `journal-plan-row-date`. The day headings and the footer label are unchanged.
- **Meal name:** `MealPlan.title` always holds something to show (the name, or a summary of the foods / the first line of the note) and is not changed. `utils/planMealName.ts` tells a chosen name apart: `plannedMealName(plan)` returns `''` when the title is one of `automaticPlanTitles(plan)` (a food of the meal, its first two foods joined with ` + `, in any app language, or the first line of the note). The wizard loads only a chosen name into the field, shows it under the meal type of a planned card, and `PlanRow` shows it between the meal type and the note.
- Adding a food no longer turns the first food into the name. A saved meal added to an unnamed planned meal still gives it its name.
- Page 1 still asks for the one plan name; page 2 asks for nothing (the Meal name is an option).

No stored key, backup field or translation file changed.

## Verify

`npm run check`. `tests/ingredient-quantity.test.tsx` covers the tiles (and that Log food and the picker render the one component), the quantity step, pencil / Swap / Search, and the meal builder layout and footer; `tests/plan-meal-name.test.ts` the name rule; `tests/planner-wizard.test.tsx` the date in the card head and the Meal name option. `scripts/check-food-workflows.mjs` (Chromium, after `VITE_DEMO_DATA=true npm run build`) walks the import, hand-made recipe and meal flows through the quantity step.
