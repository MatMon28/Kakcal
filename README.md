# Kakcalculator

A mobile-first daily nutrition, energy, activity, and wellness journal. It runs in the browser and can be packaged for Android with Capacitor. It uses React 19, TypeScript, Vite, and Tailwind CSS v4. Journal data lives in `localStorage`; there is no account, backend, or cross-device sync.

## Run and build

Use Node.js 22 or newer so the Capacitor CLI and web build use the same environment.

```bash
npm install
npm run dev       # Local development server
npx tsc --noEmit # Type-check the project
npm run build     # Production builds to an inlined dist/index.html
npm run preview   # Serve the production build locally
```

## Pages and workflows

### Today

- Choose a date with the day arrows or calendar. The calendar marks days with entries, and the **Back to today** pill (with a return arrow, in the water blue `#CFE7FE` with the app’s pill typography) jumps to the current date — in the navigator and inside the calendar popover.
- Intake and estimated energy burned are shown side by side, together with net calories, carbs, protein, fat, fiber, and salt. In Compact, the Intake/Burned summaries also omit the visible `kcal` suffix; accessible labels still include the unit. The signed net balance is unchanged. **Ultra Minimal** removes the visible Intake/Burned labels and calorie/macro units, shows fiber and salt with icons, and tightens these fields. Their labels and units remain available to assistive technology.
- **Ultra Minimal** is a persistent Settings toggle (`settings.ultraMinimal` in `kcalsync_settings`, included in JSON backup). Today always uses Compact while it is enabled and hides the layout selector. The active tab shows only its icon; on Today the flame and calendar date controls are icon-only. Empty meal slots leave a blank summary row. Custom and Statistics similarly reduce section labels, units, and actions to numbers/icons while retaining accessible names and essential meal/recipe names.
- The second slot is called **Morning Snack** (Italian: *Spuntino Mattutino*); its id stays `mid_morning`.
- Six meal slots show nutrients and logged portions. **Compact / Normal / Expanded** controls the arrangement; there is no extra **Expand all / Collapse all** button. Meal cards stay neutral with their icon in a transparent circle (the circle takes the card colour, with no border or shadow, following the *Circle rule* below) and no item count. Macro pills show **numbers only**, in the fixed order **carbs (blue `#CFE7FE`), protein (peach `#FAE0B4`), fat (lavender `#E2D6FF`)**; full names and grams remain in accessible labels and hover titles. Compact hides meal names and the visible `kcal` unit (including food rows opened inside a compact card): icon, energy number, **+** and chevron on the first row, three equal-width numeric pills on the second. Normal/Expanded show the name, then a single nutrition row with **calories at the left and macros aligned beside them**. Expanded opens the food lists; individually opened cards and the selected layout are remembered. Dinner keeps its distinct crossed-utensils icon.
- **Tracker cards (Activity, Water, Poop, Custom) share the meal cards’ collapse/expand behaviour, not their neutral colour.** Their full pastel backgrounds are restored: **Activity lavender, Water blue, Poop peach, Custom lemon**. Each has an icon in a transparent circle, a headline value, a **+** button in a transparent circle and a chevron. The collapsed summary stays short; expansion reveals the editable entries. Activity calories are shown **without a negative sign**, including the activity dialog and day overview, and Compact omits the visible `kcal` suffix. In Compact, Poop shows its count without the “today” suffix (including when its entry list is opened). Ultra Minimal hides nonessential tracker text. Compact tracker summary rows keep a fixed height so **Activity and Water remain the same height**; an opened compact card spans both columns on phones. Compact icons, gaps and padding tighten on narrow phones to keep headline values readable down to 320 px. Tracker colours and dark text stay readable in all app themes. Open state is remembered (`kcak_today_trackers_open`); **Expanded** opens every card, with no separate *Expand all / Collapse all* button.
- **Today is the only page with the standard logging dock:** Food, Activity, Water, Poop, Weight, and an optional custom tracker button. Settings controls which shortcuts appear. Trackers and history still have their own relevant in-page actions.
- Open the Today calendar and **single-tap any date** to open the shared **Day overview** dialog while also selecting that day.
- **Add Food:** choose a meal slot, search the multilingual food catalog, use a shortcut, or reuse a saved meal or recent items. The app remembers portions and lets you queue several foods before logging the batch. You can also copy a meal slot from a previous day.
- **Activity** (formerly “Move/Movement”; the saved Settings key stays `quickAdd.movement` so existing settings keep working): the Activity button opens a dialog with four options — **Walk**, **Run**, **Other** and **Custom**.
  - **Walk / Run** can be recorded by distance or duration with a live calorie estimate (unchanged).
  - **Other** opens an **activity search page** modelled on the food search: a fuzzy search field with a clear button, category chips (walking & hiking, running, cycling, gym & fitness, yoga & stretching, water, team sports, racket sports, combat sports, dance, winter & outdoor, home & garden) and a result list of about 180 activities from the 2024 Compendium, searchable in English and Italian. Pick one, then choose the **duration** (stepper, free input or 15 / 30 / 45 / 60 / 90 / 120 min chips; the last duration used for that activity is remembered). The **estimated burn** updates live and the formula is shown under it.
  - **Favourite activities:** each row (and the duration step) has a star. Starred activities are pinned above everything else — in the suggestion list while browsing and in search results (`settings.favoriteActivities`).
  - **Custom** keeps the free-text name, optional duration and optional calories (auto-estimated from ~5 MET if empty). **Every custom activity is saved** (`kcalsync_custom_activities`, now `{ id, name, met, createdAt }`; older plain-name lists are migrated to 5 MET) with a MET derived from the calories and minutes you typed (`kcal ÷ (resting kcal/h × hours)`, 30 min assumed when only kcal is given, 5 MET when nothing is given). Saved customs then **appear under Other**: listed first while browsing, found by the search, filterable with the **My activities** chip, starrable, and removable with a trash icon on the row. Re-saving the same name updates its MET. Custom activities are included in JSON backups. If an *Other* search has no result, a button turns the typed text into a custom activity.
  - Logged database activities store `activityId`, the MET used and the calories at the time of logging, so later edits to the data file never change past days. Their names follow the app language.
- **Water:** Compact uses a **continuous progress line**; Normal and Expanded use the **blocky glass indicator**, visible in the header even when collapsed. Opening the entry list does not duplicate the indicator. Each block represents 250 ml (the final block covers the remainder to the target), with partial fills. Compact shows **only the consumed number** (no `ml` unit) in its headline; the target remains in the progress label, tooltip and expanded details. The water goal is not displayed in Profile.
- **Poop:** choose a size, an optional Bristol type, and optional notes. The tracker can be hidden in Settings.
- **Favourites:** a star adds a food to your favourite list (`settings.favoriteFoods`). Favourites are pinned to the top of every food search (Add Food and the Foods catalog), the Add Food field shows the whole favourite list as soon as it is focused — before you type — and shows favourite matches as soon as one character is typed. The Foods catalog has a **Favourites** filter chip and narrows to favourites while the search field is focused. Activities have their own star list, described under **Activity**.
- **Custom trackers:** quantity entries accumulate instead of replacing one another. Logging 200 mg and then 50 mg gives two entries and a day total of 250 mg. Open the tracker to see amounts and times or remove an individual entry. Done / not done trackers retain one state per day. Statistics use the daily totals. Custom trackers use a distinct **lemon** palette, separate from the lavender Activity card.

### Custom and Foods

- **Custom** groups saved meals, recipes, and food tools. The creation dock has three icon-only shortcuts, with accessible names for New Meal, New Recipe, and New Food.
- **The Custom sections have their colours back:** **Meals peach, Recipes lavender, Foods mint**, while the individual meal/recipe cards remain neutral. All sections retain their collapsible behaviour. On saved meals and recipes the nutrition row occupies the full card width: **calories at the left, numeric-only macro pills beside them on the same line**, with no wrapping underneath the action buttons. Macro initials are also removed from expanded nutrient tiles and the recipe editor preview; accessible names and units remain available. In Ultra Minimal the section labels, slot labels, nutrition units, and action text are hidden while names, values, icons, and accessible labels remain. The **Edit · Delete · + Log** actions stay above this row, with **+ Log** at the far right. The Log buttons use their section accent instead of the Foods mint: **meals peach**, **recipes lavender** (the log dialogs and selected-slot pills follow the same colours).
- **Each section is collapsible:** tap the title row or the chevron to fold Meals, Recipes or Foods; the state is remembered (`kcak_custom_sections_open`). Opening a section's search also expands it.
- In Meals and Recipes, tapping the magnifying glass opens a full-width fuzzy search bar across the section card, and the **+** button beside it opens the creation form. The magnifying-glass and **+** circles are transparent, so they take the section colour (peach, lavender or mint) and show only the dark glyph. On each card the buttons are ordered **Edit · Delete · + Log**, with **+ Log** (always just the plus icon and "Log") at the far right. Saved meals include a slot and editable ingredients; recipes store their **original ingredient quantities** (shown when expanded, with per-ingredient kcal) and can be edited.
- **Deleting asks first:** the trash icon on a meal, a recipe, or a custom food in **Browse Foods** opens an *Are you sure?* dialog naming the item (`ConfirmDialog.tsx`); nothing is removed until you confirm.
- In the mint Foods section, **Barcode** and **Custom Food** sit side by side with **Browse Foods** directly below; all three use cream buttons and leading icons (`ScanBarcode`, `Plus`, `BookOpen`). The catalog includes filters for legumes and soy, nuts and seeds, soups and stews, and desserts, and **Prepared** replaces the former Kebab & Prepared label.
- Barcode lookup checks built-in and saved products first. Only new barcode queries to [Open Food Facts](https://world.openfoodfacts.org/) need internet. Where `BarcodeDetector` is supported, the camera can scan the code; manual lookup and manual food creation are also available.

### Period

- The Period page is **hidden by default when the profile sex is Male** and shown by default when set to Female. Switching sex in Profile updates visibility automatically unless the user has manually toggled **Hide Period page** in Settings; hiding never deletes stored cycle data.
- The calendar and Daily Log cover flow, moods, symptoms, optional pill tracking, intercourse, and notes. Cycle estimates are not intended for contraception or fertility timing.
- Pick a date on the calendar. In the floating cycle dock, the **droplet** opens Quick Log with start and end shortcuts, the **pill** marks whether a pill was taken (available when pill tracking is enabled and the day is not a scheduled break), and the **heart** toggles intercourse for that date. Marked days display a small filled heart positioned slightly above the top of the day number so the number never shifts position.
- **Double-click (or double-tap on touch screens)** any date in the Period calendar to open the shared **Day overview** dialog summarizing that day's energy intake and expenditure, macros, logged movement, weight, water, poop entries, and every custom tracker logged on that date (including an explicit “not done” state). The **Open in Today** action stays fixed in a visible footer even when the overview content scrolls. The same dialog opens from a single tap in Today’s calendar and from Statistics poop markers, custom-tracker days, and daily-breakdown rows.
- The Daily Log also has a **Quick log** button. Pending edits save when moving to another date, opening Quick Log, or inspecting a day. Intercourse markers are stored on-device and included in JSON backups.
- Add or manage moods and symptoms right in the Daily Log, not in Cycle Settings. In each **Manage** menu, removing a tag deletes the choice and its references in saved days. **Reset to defaults** restores that group's original choices and removes custom tags from that group and its logs. It does not recreate previously deleted selections.
- Cycle Settings contains cycle length, period duration, optional pill schedule, and display preferences. Cycle history and statistics show completed cycles; nutrition and weight by cycle are opt-in.

### Statistics, Profile, and Settings

- Statistics opens with a centered 7-day, 30-day, and custom date-range selector (and centered custom date inputs when selected). It shows energy and nutrient averages, optional custom-tracker charts, then the **weight trend** (moved below the custom charts whenever they are shown), and a collapsible daily breakdown for the 7-day range. Ultra Minimal reduces the range controls and data to icons/numbers, uses fiber and salt icons, and keeps `/ day` at the bottom-right of the nutrient-average and custom quantity fields. Tapping a poop marker, custom-tracker day, or daily-breakdown row now opens the shared **Day overview** dialog instead of the old separate day inspector; use its always-visible **Open in Today** footer for full editing.
- **Weight trend** plots stored readings in the selected range. If there are none, it plots a point labeled **Profile weight** without creating a dated reading. Saving a weight records it for the selected day and updates the profile weight used for estimates.
- **Profile** edits weight, height, age, and sex and previews basal metabolic rate (BMR), syncing default Period-tab visibility when sex changes (unless manually overridden in Settings).
- **Settings** offers English and Italian plus three themes: **Light** (warm oat cream), **Lite Dark** (soft slate), and **Dark** (deep charcoal), and a persistent **Ultra Minimal** display toggle for Today, Custom, and Statistics. Themes keep solid pastel accents. The six quick-add switches use a compact two-column grid; the Hide poop and Hide Period switches sit above the three pinned-food shortcuts. **Data Backup** (Export / Import JSON) also lives in Settings rather than Statistics. Backup files contain private data, including cycle entries if present, and are not encrypted.
- Logging and creation dialogs sit above the middle of the visible screen. They resize with the mobile keyboard and scroll internally. Saving and deleting update the relevant view without transient confirmation pop-ups. Validation and backup errors are displayed inline.

## Demo data for testing (easy to disable before deployment)

Fresh installs currently start with a realistic demo journal: seven days of meals, movement, water, weight, bowel entries, six pre-starred favourites and two custom trackers; three saved custom meals; two saved recipes; and multiple period cycles with flow, moods, symptoms, pill and intercourse markers. This makes Today, Statistics, Period and Custom useful immediately for testing. Seeds are only used when the corresponding storage is empty, so they do not overwrite existing user data.

- Switch: [`src/config/demo.ts`](src/config/demo.ts) (`DEMO_MODE`).
- Seed definitions and generators: [`src/data/demoData.ts`](src/data/demoData.ts).
- **Before a real production deployment**, build with `VITE_DEMO_DATA=false npm run build` (or change the single default in `src/config/demo.ts`). This disables all demo day logs, meals, recipes, custom trackers and period logs.
- If you previously opened a demo build on the same device, clear that device's app/site storage or restore a real backup before shipping; the flag prevents new seeding but intentionally does not erase data already saved.

## Data and calculations

- Foods supply nutrition per 100 g or 100 ml; missing macro values can remain `null`. Logged food portions retain a snapshot of those values. Saved meals reference food IDs and amounts.
- Each `DayLog` contains its meal slots, activity entries, and optional water, bowel, and weight records. `customEntries` maps quantity-tracker IDs to arrays of `{ id, amount, timestamp? }`. Boolean tracker states live in `custom`. Older backups with a numeric `custom` total are migrated to one entry for that day; if no real timestamp exists, it is labeled as a previous total. Individual water records also support migration from older daily totals.
- Cycle data is stored separately as `PeriodData`, with editable mood and symptom catalogs and date-keyed daily logs. Legacy custom tags and existing logs load from older backups.
- BMR uses the **Mifflin–St Jeor** formula. Walking/running estimates use pace-adjusted distance factors or duration-based METs. **Total burned = BMR + activity + estimated food thermogenesis.** Net is intake minus total burned.
- **Database activities (Activity → Other)** use `kcal = MET × (BMR ÷ 24) × hours` (`calculateMetCalories` in `src/utils/calculations.ts`). The Compendium defines 1 MET as resting energy use; instead of the flat “1 MET = 1 kcal per kg per hour”, the profile's own resting rate (Mifflin–St Jeor from **weight, height, age and sex**) is used, so a smaller, older or female profile gets a lower, more personal number than the per-kg shortcut. Like Walking/Running the figure is gross (the Today page adds BMR separately). If weight, height or age are missing in Profile, the generic 1600 kcal/day fallback is used and the dialog says so. Example: 30 min of brisk walking (4.8 MET) with a resting rate of 68 kcal/h → 4.8 × 68 × 0.5 ≈ 163 kcal.
- The water target is a beverage estimate based on the profile and logged activity, using the app's EFSA/LARN-based calculation. It is separate from the profile display.

### Activity sources

- [`src/data/activities.ts`](src/data/activities.ts) holds **181 activities** with MET values copied from the [2024 Adult Compendium of Physical Activities](https://pacompendium.com/) (Herrmann SD, Willis EA, Ainsworth BE, et al., *J Sport Health Sci* 2024;13(1):6-12, [doi:10.1016/j.jshs.2023.10.010](https://doi.org/10.1016/j.jshs.2023.10.010)). Each row keeps its Compendium **specific-activity code** (e.g. `17200` = walking 3.5–3.9 mph, 4.8 MET), English and Italian names and a category. Every code and MET value was cross-checked against the official category tables.
- The 2024 edition changed many values compared with the 2011 edition used by most calculators (e.g. running 6.0–6.3 mph is now **9.3** MET instead of 9.8, 7 mph is 11.0, brisk walking 3.5–3.9 mph is 4.8). Values here follow 2024.
- **Adding an activity:** append a row `[code, id, category, met, name_en, name_it]` to `ACTIVITY_ROWS`. The `id` is saved in logs and favourites, so never rename an existing one.
- MET values are population averages for adults and a good estimate, not a measurement; individual cost varies with fitness, terrain, technique and conditions.

### Nutrition sources

- **84 new reference entries** come from the [USDA FoodData Central SR Legacy release (April 2018)](https://fdc.nal.usda.gov/download-datasets/), including whole-milk and part-skim ricotta, legumes, grains, snacks, and prepared dishes. Each new entry links to its source. Carbohydrates follow the dataset's carbohydrate-by-difference value (including fiber); salt is calculated as sodium × 2.5, converted from mg to g.
- The [Bakkerij Van Hecke rice pie](https://bakkersonline.be/be-nl/vanhecke-ferrerlaan/product/92214/rijsttaart) uses the bakery's per-100-g product label. Values are specific to that product, not a universal estimate for homemade rice pie.
- The source-backed data is bundled with the app and is separate from the original catalog and its estimated preparation variants. To regenerate the USDA selection, download the [official SR Legacy CSV zip](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip) and run `python3 scripts/generate-usda-foods.py <path-to-zip>`.

## Feature recap

One place to see what the app does and where each part lives. Data stays on the device in `localStorage`; there is no account or server sync.

### Screens and workflows

| Area | What it does |
| --- | --- |
| **Today** | Day navigation (arrows, calendar popover, Back to today, single-tap day overview); Intake / Burned summaries with net badge; carbs, protein, fat percentages; fiber and salt; six meal slots (Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner, Extra) in **Compact / Normal / Expanded** layouts with numeric macro pills, add/edit/delete of logged foods, and remembered open state; collapsible Activity, Water, Poop and Custom tracker cards; the logging dock (Food, Activity, Water, Poop, Weight, optional custom tracker). Optional Ultra Minimal mode forces Compact, hides the layout picker and replaces most labels/units with icons and numbers. |
| **Add Food** | Meal-slot target, multilingual fuzzy search with favourites pinned first, barcode shortcut, custom foods, saved meals and recent items, multi-item queue, remembered portions, and copy-from-a-previous-day. |
| **Activity** | Walk, Run, Other (searchable 181-entry MET database with favourites and category chips), and Custom. Duration/distance entry, profile-based calorie estimates, custom activities saved and searchable under Other. |
| **Water / Poop / Weight** | Individual water entries with a 250 ml glass indicator and goal; poop size, Bristol type and notes; body-weight logging that feeds BMR and statistics. |
| **Custom** | Saved meals (ingredients + slot) and recipes (per-100 g nutrition + original ingredient quantities), search, edit, delete confirmation, one-tap logging, plus Barcode, Custom Food and Browse Foods shortcuts; Ultra Minimal hides section/action labels and units. |
| **Foods (catalog)** | Browse ~1,000+ foods with categories, favourites, custom-food creation and barcode lookup (Open Food Facts for new codes). |
| **Statistics** | 7-day / 30-day / custom range, energy and macro averages, custom-tracker charts, weight trend, 7-day daily breakdown, and the shared day-overview dialog; Ultra Minimal uses icon/number summaries and bottom-right `/ day` labels. |
| **Period** | Optional cycle calendar, daily log (flow, moods, symptoms, pill, intercourse, notes), quick-log dock, cycle history/settings and opt-in cycle nutrition. Visibility follows the profile sex unless overridden. |
| **Profile & Settings** | Weight, height, age, sex with BMR preview; language (EN/IT), three themes, Ultra Minimal toggle, quick-add switches, hidden trackers, pinned foods, custom trackers and JSON export/import backup. |

### Calculation rules

- BMR uses Mifflin–St Jeor; walking/running use pace/duration factors; database activities use `MET × (BMR ÷ 24) × hours`.
- Total burned = BMR + logged activity + macro-weighted TEF; net = intake − burned. The water goal follows an EFSA/LARN-based beverage estimate.
- Food values are per 100 g/ml; logged portions snapshot their nutrition. MEТ values come from the 2024 Adult Compendium (see *Activity sources*).

### Colour system

Pastel accents carry meaning everywhere (cards, charts, pills, dialogs and the day overview): **intake pink `#F6D0D0`**, **burned mint `#C9EFD3`**, **carbs blue `#CFE7FE`**, **protein peach `#FAE0B4`**, **fat lavender `#E2D6FF`**, **water blue `#CFE7FE`**, **activity lavender**, **poop peach** and **custom-tracker lemon `#F7E9AA`**. Meal cards and the Custom page's item cards stay neutral (`--surface`), with colour reserved for the macro pills, tracker cards and section headers. All three themes keep these accents with readable dark text.

**Circle rule.** Every circular container around an icon on a meal card, activity or tracker card, and section header — plus the **+** circle and the search (magnifying glass) circle — is visually invisible: `bg-transparent` (so it is exactly the colour of the card or section it sits on), with no border and no shadow. Width, height and round shape are kept, so the layout does not move, and the icon glyph stays fully visible in its normal dark colour. The rule does **not** apply to the coloured circles in the bottom dock, the profile and settings buttons in the header, or the active-tab pill; those keep their filled colours.

Reference palette check (for the restyle): **carbs blue `#CFE7FE`**, **protein peach `#FAE0B4`** (shown as amber in the reference), **fat lavender `#E2D6FF`**, **Activity lavender `#E2D6FF`**, **Water blue `#CFE7FE`**, **Poop peach `#FAE0B4`**, **Custom lemon `#F7E9AA`** and neutral meal cards (`--surface`). The app already uses these values, so only the circles changed in this restyle.

## Project structure

| File or directory | Role |
| --- | --- |
| `index.html`, `src/main.tsx` | Document shell, bundled typography, and React entry point. |
| `src/App.tsx` | Tab routing, global dialogs, page-specific docks, and gesture/Back handling. |
| `src/index.css` | Theme tokens, keyboard-aware dialog sizing, safe areas, reduced-motion styles, and accordion transitions. |
| `src/context/AppContext.tsx` | Local state, persistence, legacy migrations, logging actions, tag catalog changes, and JSON backup. |
| `src/types/index.ts`, `src/i18n/translations.ts` | TypeScript data contracts and English/Italian strings. |
| `src/data/verifiedFoods.ts`, `extraFoods.ts` | Curated products and the additional multilingual food catalog. |
| `src/data/referenceFoods.ts`, `usdaFoodRows.ts`, `foodCategories.ts` | Source-linked additions (recipes also keep `recipeIngredients`), generated USDA nutrient rows, and shared food categories. |
| `scripts/generate-usda-foods.py` | Extract the selected foods from the official USDA data archive. |
| `public/licenses/Plus-Jakarta-Sans-OFL.txt` | License for the bundled Plus Jakarta Sans font. |
| `src/data/activities.ts` | **Activities database** (181 entries from the 2024 Compendium of Physical Activities): MET, Compendium code, EN/IT names, categories and lookup helpers. |
| `src/data/samplePreBuiltMeals.ts` | Empty production saved-meal list used when demo mode is disabled. |
| `src/config/demo.ts`, `src/data/demoData.ts` | Single demo-mode switch and removable sample journal, period logs, custom trackers, meals and recipes. |
| `src/vite-env.d.ts` | Vite environment typings used by the demo switch. |
| `src/utils/calculations.ts`, `waterTarget.ts` | Nutrition, activity, BMR, personal MET-based activity energy (`calculateMetCalories`), thermogenesis, and water-goal calculations. |
| `src/utils/activityLabel.ts` | Display name of a logged activity (Walk, Run, localized database name or custom name) shared by Today and the Day overview. |
| `src/utils/customTrackers.ts` | Quantity entry helpers, legacy migration, and per-day tracker totals. |
| `src/utils/period.ts`, `usePeriodDayDraft.ts` | Cycle calculations, tag catalogs, and drafts shared by the cycle log forms. |
| `src/utils/formatters.ts`, `fuzzy.ts`, `amountMemory.ts`, `usePersistentState.ts`, `cn.ts` | Dates and formatting, fuzzy search, remembered portions, persisted UI state, and class-name helpers. |
| `src/components/common/Modal.tsx`, `ActionDock.tsx` | Shared keyboard-aware dialogs with optional always-visible footers, and accessible icon-only floating docks. |
| `src/components/common/FavoriteButton.tsx`, `src/utils/favorites.ts` | Star toggle for the favourite food list (`kind="activity"` for the favourite activity list) and favourites-first search-ordering helpers. |
| `src/components/common/MacroPills.tsx` | Shared numeric-only macro pills (carbs blue, protein peach, fat lavender), with full accessible names and units. |
| `src/components/common/ConfirmDialog.tsx` | "Are you sure?" dialog used before deleting meals, recipes and custom foods. |
| `src/components/common/DataBackup.tsx` | Settings-based JSON export/import controls and inline result messages. |
| `src/components/common/Header.tsx`, `Tabs.tsx` | App header and tab navigation; active-tab labels collapse to icons in Ultra Minimal. |
| `src/components/common/AmountSelector.tsx`, `AmountStepper.tsx`, `NumericInput.tsx` | Shared portion presets, steppers, and decimal fields. |
| `src/components/common/PoopIcon.tsx`, `BristolIcon.tsx`, `TrackerIcon.tsx`, `SaltCrystalIcon.tsx` | Bowel, tracker, and faceted salt-crystal icon sets. |
| `src/components/dashboard/TodayView.tsx`, `QuickAddBar.tsx` | Today layout, persistent Compact/Normal/Expanded meal arrangement, forced Compact layout in Ultra Minimal, back-to-today control, and standard logging shortcuts. |
| `src/components/dashboard/DayNavigator.tsx`, `EnergyBalanceCards.tsx`, `MacroNutrientsOverview.tsx` | Date navigation, icon-only calendar/active tab in Ultra Minimal, single-tap day overview, and daily energy/nutrient summaries with icon-only fiber and salt in Ultra Minimal. |
| `src/components/dashboard/MealSlotCard.tsx` | Neutral meal cards with transparent icon and + circles (Circle rule); number-only macros, Compact arrangement, and blank empty-slot summary in Ultra Minimal. |
| `src/components/dashboard/TrackerCard.tsx` | Shared collapsible tracker shell with lavender/blue/peach/lemon palettes, transparent icon and + circles (Circle rule), readable theme-independent text, equal compact heights and a full-width summary option for water blocks. |
| `src/components/dashboard/ActivityCardSummary.tsx`, `WaterCard.tsx`, `PoopCard.tsx`, `CustomButtonsCard.tsx` | Activity, water, poop and custom-tracker cards with compact Ultra Minimal summaries and the Poop compact label exception. |
| `src/components/prebuilt/PreBuiltMealsView.tsx` | Custom page: pastel collapsible sections, transparent section-header/search/+ circles, Ultra Minimal labels and units, neutral meal/recipe cards, and search/edit/log actions. |
| `src/components/database/FoodDatabaseView.tsx` | Browse, filter, and log catalog items; transparent header icon and back circles (Circle rule). |
| `src/components/history/HistoryView.tsx` | Statistics with compact icon/number summaries in Ultra Minimal, bottom-right `/ day` labels, weight plot, tracker summaries, and shared day overview. |
| `src/components/period/PeriodView.tsx`, `PeriodCalendar.tsx`, `PeriodTagEditor.tsx` | Cycle overview with a transparent droplet header icon circle, and quick-action dock (droplet, pill, heart), non-shifting calendar markers, double-tap day inspection, Daily Log, and tag management. |
| `src/components/period/PeriodDayInfoModal.tsx` | Shared day overview for Today, Period, and Statistics: intake, burned, macros, movement, weight, water, poop, all logged custom trackers, and fixed Open in Today footer. |
| `src/components/period/CycleHistory.tsx`, `CycleNutrition.tsx`, `PeriodSettingsAccordion.tsx` | Cycle history, opt-in nutrition statistics, and cycle/pill settings. |
| `src/components/modals/AddFoodModal.tsx`, `CustomFoodModal.tsx`, `BarcodeLookupModal.tsx` | Food logging, custom food creation, and barcode lookup. |
| `src/components/modals/LogActivityModal.tsx` | Activity dialog: Walk / Run / Other / Custom, duration step and live energy estimate for database activities. |
| `src/components/modals/ActivitySearch.tsx` | Activity → Other search page: saved custom activities first, fuzzy search, category chips (incl. My activities), favourites pinned first. |
| `src/components/modals/WaterModal.tsx`, `WeightModal.tsx`, `PoopModal.tsx` | Hydration, weight, and bowel logging. |
| `src/components/modals/CustomButtonModal.tsx`, `CustomPickerModal.tsx` | Individual quantity/toggle tracker dialog, entry history, and tracker selection. |
| `src/components/modals/PeriodSheet.tsx`, `UserProfileModal.tsx`, `SettingsModal.tsx` | Period Quick Log, Profile/BMR fields, and app Settings including the Ultra Minimal toggle. |
| `capacitor.config.json`, `android/` | Capacitor and Android Studio project configuration. |

### Local storage keys

- Journal and setup: `kcalsync_profile`, `kcalsync_day_logs`, `kcalsync_custom_foods`, `kcalsync_prebuilt_meals`, `kcalsync_lang`, `kcalsync_settings` (theme, Ultra Minimal preference, shortcuts, pinned foods, favourite foods and favourite activities), `kcalsync_custom_activities` (saved custom activities with MET), `kcalsync_last_amounts` (last food portions, plus `activity:<id>` keys for the last duration used per activity).
- Cycle history and tag catalogs: `kf_period_data`.
- UI preferences: `kcak_today_meals_open`, `kcak_today_meal_layout`, `kcak_today_trackers_open`, `kcak_custom_sections_open`, `kcak_day_meals_open`, `kcak_my_meals_open`, `kcak_my_recipes_open`, `kcalsync_stats_daily_open`, `kcalsync_stats_weight_open`.

## Android

The Android package loads the web bundle, fonts, and catalog from APK assets, not a development server. Once installed, the journal, local food search, meals, cycle tracker, and statistics do not require Wi-Fi or mobile data. New barcode lookups and opening external nutrition references require an internet connection.

```bash
# For a clean deployment, disable the demo seeds first:
VITE_DEMO_DATA=false npm run build
npx cap sync android
npx cap open android
```

Open the Android project in Android Studio to build a debug APK or generate a signed release. See [android/BUILD_APK.md](android/BUILD_APK.md) for native setup, signing, and an airplane-mode checklist. Camera scanning needs camera permission and a compatible Android WebView. Horizontal swipes navigate the main tabs; Back dismisses the topmost dialog first.

## Running this copy in the Vite sandbox

This working copy is the Vite app: `index.html` → `src/main.tsx` → `src/App.tsx`. `npm run dev` starts the dev server and `npm run build` writes a single inlined `dist/index.html` (via `vite-plugin-singlefile`). `src/config/demo.ts` reads `VITE_DEMO_DATA`.

What was copied from the repository: `src/` (except the parts below), `public/`, `scripts/`, `index.html` and this README. What was left out, because the sandbox does not run Next.js or Postgres: the Next wrapper `src/app/` (`layout.tsx`, `page.tsx`, `KakApp.tsx`, `globals.css`, `api/health/route.ts`), the Drizzle/Postgres layer `src/db/`, and the unused `src/components/common/Toast.tsx`. `package.json` and `vite.config.ts` are the sandbox template files; the only packages added are `lucide-react` and `@fontsource-variable/plus-jakarta-sans`, installed with `npm install`.

## Sandbox changelog

- **Repository copied** into the Vite project (see above). The `index.html` title is *Kakcalculator — Daily Nutrition & Wellness*.
- **Packages:** `lucide-react` (icons) and `@fontsource-variable/plus-jakarta-sans` (the app font, imported in `src/main.tsx`), installed with `npm install`.
- **Restyle, circle rule:** transparent icon circles, transparent **+** circles and transparent search circles in `MealSlotCard.tsx`, `TrackerCard.tsx` and `PreBuiltMealsView.tsx` (section headers, search, +); the Foods header icon and back circle in `FoodDatabaseView.tsx`; the Period header icon in `PeriodView.tsx`; and the weight-trend header icon in `HistoryView.tsx`. Width, height and round shape are unchanged. The bottom dock, the header profile/settings buttons and the active-tab pill keep their fills.
- **Search open state:** the search circle no longer uses a `ring` (a box-shadow, which the rule forbids). When search is open, its magnifier is drawn with a heavier stroke instead.
- **Palette:** the reference colours (blue `#CFE7FE`, peach `#FAE0B4`, lavender `#E2D6FF`, lemon `#F7E9AA` and neutral cards) were already in use and were kept.
- **Ultra Minimal:** added a persisted Settings toggle (`settings.ultraMinimal`) and English/Italian labels. Today forces Compact and reduces energy, nutrient, navigation and tracker text; Custom keeps names and values but hides nonessential labels/units and uses icon-only actions; Statistics uses number/icon summaries with `/ day` at field bottom-right. Fiber and salt use icons in Today and Statistics, and Compact Poop omits “today”.
- **Ultra Minimal Refinements:**
  - **Salt Crystal Icon:** created `SaltCrystalIcon.tsx` (clean isometric mineral salt crystal with faceted geometry) replacing droplet icons in `MacroNutrientsOverview`, `HistoryView`, and `PreBuiltMealsView`.
  - **Tracker Card presentation (matching reference):** Activity displays Footprints icon, bold expenditure number, and a route pill with `<Route />` and distance; Water displays droplet icon, bold intake number, and continuous progress bar; Poop displays Poop icon, bold count, and size signal-bars + poop icon + Bristol score pill; Custom displays Sparkles icon, `{logged} / {total}`, and individual custom tracker pills with icon and value/checkmark.
  - **Centered Energy Numbers:** Intake and Burned calorie numbers are horizontally centered in their respective pastel cards.
  - **Date Navigator:** When a date different from today is selected in ultra-minimal mode, it displays formatted as `dd/mm` (e.g. `05/03` or `18/11`).
  - **Custom Page:** The 3 section cards (Meals, Recipes, Foods) sit side-by-side next to each other in 3 columns (`grid grid-cols-3`); item count badges and the magnifying-glass search toggle are removed. When expanded, sections span the grid with full editing and logging preserved.
  - **Statistics Page:** The `/day` label is displayed small directly to the right of the numbers in the fiber and salt fields, as well as the 3 macro fields. Intake and Burned summaries include an explicit `avg` badge with icons to make the daily averages immediately clear.
