# Planner, Custom dock and clean-up round

> **Scope:** the round on top of commit `6245210` ("Improved meal planning and more"): Plan / Photo diary buttons in the Custom bottom bar, the planner's first / last day, earlier-plan shortcuts, quick foods, drafts, the Recent / Favourites pills in Custom > Foods, header icon order, removed taglines and the deleted Next.js / Drizzle leftovers.
>
> **Read when:** changing the Custom bottom bar, the planner wizard, planner drafts, the Foods pills or the section header icons.
>
> **Related:** [new-features-update.md](new-features-update.md), [meal-journal.md](meal-journal.md), [custom-photo-share-update.md](custom-photo-share-update.md), [changes-patch.md](changes-patch.md), [provenance.md](provenance.md)

| Change | Where the user finds it | Files |
| --- | --- | --- |
| **Plan / Photo diary in the bottom bar** | Custom: the round blue *Plan meals* and red *Photo diary* buttons sit in the bottom bar after Meal / Recipe / Food. The row of buttons at the top of Custom is gone. Settings > Today & pages: *Meal planner button* / *Photo diary button* still hide them (the photo button also hides while the Photo diary is off). | `journal/CustomShortcuts.tsx` (`useCustomDockActions`, the two window events), `prebuilt/PreBuiltMealsView.tsx` (`ActionDock`), `modals/SettingsModal.tsx` (texts), `journal.css` (old `.journal-shortcut*` rules removed) |
| **First and last day** | Planner page 1: two calendar icons next to each other, *First day* and *Last day*. The days counter (- / + buttons, quick 3 / 7 / 14 / 30 chips) is gone. The last day never comes before the first, a plan covers at most 90 days, and a fresh plan starts as a week (the last day can be changed at once). The day grid, skipped weekdays and meals work as before. | `journal/PlannerWizard.tsx` (`changeStart`, `changeEnd`), `journal/JournalPickers.tsx` (`caption`, `min`, `max`), `journal.css` (`.journal-date-pair`) |
| **Planned on earlier days** | Planner page 2, open meal, under the search bar: meals already planned for the **same meal time on earlier days** (earlier days of this plan first, then saved plans; newest first, no duplicates, up to 6). One tap adds those foods (or copies the note) to the open meal. | `journal/PlannerWizard.tsx` (`suggestionsFor`, `MealEntryEditor`), `journal.css` (`.journal-plan-suggestion`) |
| **Favourites only while searching** | The favourites list no longer sits in the empty planner. It opens when the search field is focused or one letter is typed (matching favourites), exactly like Add food; from two letters on favourites are pinned in the results. | `journal/PlannerWizard.tsx`, `journal/JournalUI.tsx` (`JournalSearch` `onFocus` / `onBlur`) |
| **Quick food shortcuts** | Under the planner search bar: the three foods chosen in Settings (default salt, bread, olive oil), then earlier plans, saved meals of the meal and recent foods of the meal. | `journal/PlannerWizard.tsx`, `journal.css` (`.journal-quick-food-grid`) |
| **Draft of an unfinished plan** | Closing the planner half way (X, tap outside, swipe, Back) asks **Save as draft / Discard / Keep planning**. Next time *Plan meals* opens, a *Continue your draft* card is at the top of page 1 (*Continue* or the bin). Saving the plans, or discarding a continued draft, removes it. One draft at a time; editing an existing plan never asks. | `journal/PlannerWizard.tsx`, `utils/plannerDraft.ts` (new), `common/SaveBeforeCloseDialog.tsx` (optional texts), `journal.css` (`.journal-draft-*`) |
| **Foods: Recent / Favourites pills** | Custom > Foods uses the Meal diary's *All / Favorites* pills (`JournalChip`), in the Foods green in Classic and in the theme colours (including both dark themes) elsewhere. Hint text and *Show all* follow the theme. | `prebuilt/CustomFoodsQuick.tsx`, `journal.css` (`[data-library-section='foods']`, `.kc-foods-*`) |
| **Search icon next to +** | Meal diary and Meal planner headers: the filter / share icon moved to the left, so the search icon is always right next to **+** like in Meals, Recipes and Photo diary. | `common/LibrarySectionHeader.tsx` (`extraActions` first) |
| **No taglines** | Removed "Good meals are worth remembering", "A little planning...", "Your meals. A different kind of memory.", "Your go-to combinations...", the pop-up subtitles of the diary, the photo composer / gallery and the share dialog (now titled *Share meal plans*). `JournalSection` takes an optional `summary`. | `journal/{MealDiary,MealPlanner,PhotoDiary,PlanTransfer,JournalUI}.tsx`, `prebuilt/PreBuiltMealsView.tsx` |
| **Deleted leftovers** | `drizzle.config.json` (it held a Postgres URL with credentials), `src/db/`, `src/app/` and `next.config.ts` are removed. Nothing imported them: `index.html` loads `src/main.tsx`, `vite.config.ts` has no reference, no script, workflow or test mentions them. `npm ci`, `npm run build` and `npm run dev` give the same result as before. | see [provenance.md](provenance.md) |

## Storage

New UI-only key `kcak_planner_draft` (the draft, device only; since the backup round it is also exported in the JSON backup as `plannerDraft`). No other keys, packages, permissions or remote APIs.

## Verification limits

`npm ci`, `npm run build` and the dev server start pass; `npx tsc --noEmit` reports only the three older errors in `common/Toast.tsx` (an unused file). The draft codec was run against bad input in Node. The screens were **not** viewed in a browser (none could run in the authoring sandbox): check with `VITE_DEMO_DATA=true npm run dev` in Classic and Aurora, light and dark.
