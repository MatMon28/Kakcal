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
- **Icons** (`components/common/GoalBadge.tsx`): an 18 px inline SVG that **follows the active style and theme** instead of fixed colours. The outline and glyph use the ink of the card the badge sits on (`currentColor`, so contrast is always the card's own) tinted towards green (objective) or red (limit) with `color-mix`, over a faint wash of the same tint. The container follows the style (`STYLE_LOOK`): circle in classic / aurora / playful / mono, chamfered octagon in angular (mitred joins), hard square with a heavier line in pop, hairline rounded square in minimal. **Objective reached** = container with a check; **limit reached or exceeded** = warning triangle with an exclamation mark (different shapes as well as tints; the tooltip / accessible name says which). The badge renders nothing, so takes no space, until the goal is reached.
- Where: the calorie badge sits beside the *Intake* label (Today), the carbs/protein/fat badges in the top-right corner of their cards, fibre/salt/sugar beside their labels (`SecondaryNutrientRow`, daily totals only; Statistics averages show none). Sugar only appears when *Track sugar intake* is on.
- Pure logic: `goalState(config, key, amount)`; hook `useGoalState`.

## Body measurements

- Switch *Body measurements* in Settings > Advanced. It adds the **Body** page (pill-bar tab with a person icon, **immediately left of Statistics**) and the **Profile > Body measurements** section. Switching it off hides both and returns to Today if you were on the page; recorded values are kept.
- Default measures (labels follow the language): waist/Vita, neck/Collo, hips/Fianchi, chest/Petto, forearms/Avambracci, biceps/Bicipiti, thighs/Cosce, calves/Polpacci. Groups: **upper body** = neck, chest, forearms, biceps; **lower body** = waist, hips, thighs, calves; **custom** = your own.
- **Profile** (`modals/BodyMeasuresProfile.tsx`): tick which measures to track (applies at once, no need to press Save), and add a personalised measure (name + unit, default cm); remove it again after a confirmation (its values are deleted too). Un-ticking a default measure keeps its values.
- **Body page** (`components/body/BodyView.tsx`): range chips *3M / 6M / 1Y / Custom* (custom shows two date pickers; the choice is remembered in `kcalsync_body_range`), then one card per tracked measure: icon, name, latest value, change over the period and a line chart (`BodyChart.tsx`, time-scaled x axis, tap/hover a point to read it). Without tracked measures a card sends you to the Profile.
- **Bottom buttons** (the shared `ActionDock`): *Upper body*, *Lower body*, *Custom*. A button exists only if at least one tracked measure belongs to that group. A button opens a pop-up (`BodyMeasureModal.tsx`) listing those tracked measures; pick one, enter value and date (default today, no future dates), Save. The last five values can be deleted there. One value per measure per day (saving again replaces it).

## Body-part icons

`components/common/BodyPartIcon.tsx` draws the icons from `bodyIconPaths.ts` (React-free path data: `shape`, `detail`, `band`, optional `transform` and `extra`). Same language as the lucide icons used elsewhere: 24 px grid, round strokes, `currentColor`. Each icon shows the body part as a soft filled silhouette crossed by a bold measuring-tape band: **biceps** = flexed arm (lucide `biceps-flexed`) with the band wrapped around the muscle bulge, **forearms** = a raised fist on a forearm that widens towards the elbow (clearly not a wrist / hand icon), **thighs** = bent leg with knee, shin and foot, **calves** = lower leg with the calf bulge and the foot, **neck** = head, neck and narrow sloping shoulders, **chest** = V-shaped upper body with collar, two separate pectorals and the tape under them, plus waist and hips (pelvis and leg tops); `custom` is a tape measure. Colours come from the surrounding pastel chip, so they follow every theme.

## Data

Keys `kcalsync_advanced` (switches, goals, tracked ids, custom measures), `kcalsync_body` (`{ measureId: [{ date, value }] }`) and `kcalsync_body_range`. The JSON backup has an `advanced` section (`exportAdvanced` / `importAdvanced`, called from `AppContext`); older backups without it leave the current data untouched. Strings: `src/i18n/advanced.ts` (EN/IT, `useAdvancedText()`); only the tab label `nav.body` is in `translations.ts`.

See also [advanced-layout.md](advanced-layout.md) for the *Advanced layout* switch (same Settings > Advanced group).

## Settings / layout-editor round (goals for everything, tracking toggles)

- **Goal, not objective:** the label is *Goal* (Italian *Obiettivo*); the stored mode is still `'objective'` so saved settings and backups keep working. Every item offers both *Goal* and *Limit* (`GOAL_MODE_CHOICES`).
- **New items:** `burned` (calories burned, kcal; badge beside the Burned label) and `water` (ml; badge in the Water card headline). Units and maximums live in `GOAL_UNITS` / `GOAL_MAX` in `advancedStore.ts`. Older saved data without them gets the defaults (500 kcal goal, 2000 ml goal).
- **Settings text:** no description under *Goals & limits*, *Body measurements* or *Advanced layout*, and no "choose which ones" line. *Goals & limits* has a collapse arrow (`CollapseBody` / `CollapseArrow` from `common/InlineCollapse.tsx`) that hides the list of items.
- **Coherence checks (Settings):** the sugar goal notes that it needs *Track sugar*; the Quick add rows for poop (when *Track poop* is off) and Custom (no custom buttons) are greyed out; Today no longer offers an empty field for a Water tracker (shortcut off), a Custom tracker (no custom buttons) or Poop (not tracked).
- **Icons:** `neck` has a shorter neck; `forearms` is an open hand on a forearm that widens to the elbow; `custom` is a tape measure (case with reel, pulled-out tape with ticks and hook).
