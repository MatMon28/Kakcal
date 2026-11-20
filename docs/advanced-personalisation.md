# Advanced personalisation (goals / limits and body measurements)

> **Scope:** Settings > Advanced: daily objectives and limits with their small icons, and the Body measurements page.
>
> **Read when:** you change goal/limit behaviour, the goal icons, the Body page, the body-part icons or the Profile "Body measurements" section.
>
> **Related:** [journal-pages.md](journal-pages.md), [storage-and-privacy.md](storage-and-privacy.md), [file-map/components-pages.md](file-map/components-pages.md)

Everything is **off by default** and is switched on in **Settings > Advanced** (a collapsible group below *Custom buttons*). The state lives in its own store, `src/utils/advancedStore.ts` (`useSyncExternalStore`, no changes to `kcalsync_settings`).

## Goals and limits

- Master switch *Goals & limits*, then one independent switch per item: **calories, fibre, carbs, protein, fat, salt, sugar**.
- **Calories and fibre** can be an *objective* or a *limit* (segmented control). **Carbs, protein, fat, salt and sugar** are *limits*. The choices per item are the table `GOAL_MODE_CHOICES` in `advancedStore.ts`: add `'objective'` to a list to offer it for that item.
- Values: kcal for calories, grams for the rest. Defaults when first switched on: 2000 kcal limit, 25 g fibre objective, 250 g carbs, 120 g protein, 70 g fat, 5 g salt, 50 g sugar.
- **Icons** (`components/common/GoalBadge.tsx`): a 16 px round badge in the pastel palette of the app. A check on green = objective reached (intake >= value); an exclamation on red = limit reached or exceeded (the tooltip / accessible name says which). The badge renders nothing, so takes no space, until the goal is reached.
- Where: the calorie badge sits beside the *Intake* label (Today), the carbs/protein/fat badges in the top-right corner of their cards, fibre/salt/sugar beside their labels (`SecondaryNutrientRow`, daily totals only; Statistics averages show none). Sugar only appears when *Track sugar intake* is on.
- Pure logic: `goalState(config, key, amount)`; hook `useGoalState`.

## Body measurements

- Switch *Body measurements* in Settings > Advanced. It adds the **Body** page (pill-bar tab with a person icon, **immediately left of Statistics**) and the **Profile > Body measurements** section. Switching it off hides both and returns to Today if you were on the page; recorded values are kept.
- Default measures (labels follow the language): waist/Vita, neck/Collo, hips/Fianchi, chest/Petto, forearms/Avambracci, biceps/Bicipiti, thighs/Cosce, calves/Polpacci. Groups: **upper body** = neck, chest, forearms, biceps; **lower body** = waist, hips, thighs, calves; **custom** = your own.
- **Profile** (`modals/BodyMeasuresProfile.tsx`): tick which measures to track (applies at once, no need to press Save), and add a personalised measure (name + unit, default cm); remove it again after a confirmation (its values are deleted too). Un-ticking a default measure keeps its values.
- **Body page** (`components/body/BodyView.tsx`): range chips *3M / 6M / 1Y / Custom* (custom shows two date pickers; the choice is remembered in `kcalsync_body_range`), then one card per tracked measure: icon, name, latest value, change over the period and a line chart (`BodyChart.tsx`, time-scaled x axis, tap/hover a point to read it). Without tracked measures a card sends you to the Profile.
- **Bottom buttons** (the shared `ActionDock`): *Upper body*, *Lower body*, *Custom*. A button exists only if at least one tracked measure belongs to that group. A button opens a pop-up (`BodyMeasureModal.tsx`) listing those tracked measures; pick one, enter value and date (default today, no future dates), Save. The last five values can be deleted there. One value per measure per day (saving again replaces it).

## Body-part icons

`components/common/BodyPartIcon.tsx` draws the icons from `bodyIconPaths.ts` (React-free path data). Same language as the lucide icons used elsewhere: 24 px grid, round strokes, `currentColor`. A soft filled silhouette of the body part is crossed by a bold measuring-tape band; `custom` is a tape measure. Colours come from the surrounding pastel chip, so they follow every theme.

## Data

Keys `kcalsync_advanced` (switches, goals, tracked ids, custom measures), `kcalsync_body` (`{ measureId: [{ date, value }] }`) and `kcalsync_body_range`. The JSON backup has an `advanced` section (`exportAdvanced` / `importAdvanced`, called from `AppContext`); older backups without it leave the current data untouched. Strings: `src/i18n/advanced.ts` (EN/IT, `useAdvancedText()`); only the tab label `nav.body` is in `translations.ts`.
