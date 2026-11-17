# Kakcalculator

A mobile-first **daily energy intake & expenditure tracker** built with **Vite + React 19 + TypeScript + Tailwind CSS v4**. It runs in the browser and ships as an **Android APK via Capacitor** (the `android/` project is already generated — open it in Android Studio to build). All data lives in `localStorage`; there is no backend.

Two languages: **EN / IT** (switchable in Settings). Two themes: **light** (warm oat-cream `#EFE9DD` / cream cards) and **dark** (charcoal `#13151A` / `#1B1E26`), both driven by CSS variables. UI accents are **solid pastels only** (rose `#F6D0D0`, mint `#C9EFD3`, peach `#FAE0B4`, sky `#CFE7FE`, lavender `#E2D6FF`, lemon `#F7E9AA`) — zero gradients.

---

## Table of contents
1. [Pages & features](#pages--features)
2. [Data model & formulas](#data-model--formulas)
3. [Project structure (file-by-file)](#project-structure-file-by-file)
4. [Local state keys](#local-state-keys)
5. [Run & build](#run--build)
6. [Android APK](#android-apk)

---

## Pages & features

### Header (always visible, sticky)
- Left: **profile button** (opens Profile & BMR editor). Center: app name **Kakcalculator**. Right: **settings gear**.
- Below: pill tab bar — **Today / Meals / Period / Statistics**. Only the *active* tab shows its text label; the others are icon-only (with `title` tooltips). The bar scrolls horizontally on small screens with an arrow indicator.

### Today page
- **DayNavigator** at top center: `‹` `›` arrows to move previous/next day, a date pill that opens a **calendar popover** (month navigation, today highlighted), and a **Today** shortcut button when viewing another day.
- **Intake / Burned cards** side by side (rose / mint), bars scaled relative to each other (no intake target). The signed **net difference pill** sits on the **Intake** card when intake > burned, otherwise on the **Burned** card.
- **Macros**: Carbs (peach) / Protein (rose) / Fat (lavender) cards with grams and % of macro kcal below; below them **Fiber** and **Salt** white cards — same layout in Statistics.
- **6 meal slots** (Breakfast, Mid-Morning, Lunch, Afternoon Snack, Dinner, Extra): each card shows icon, slot name, kcal + C/P/F summary; **collapsed by default** (click to expand), with a global collapse/expand toggle. Collapse state is **persisted**. Inside: logged items with amount editing (stepper: 10 g steps below 100 g, 50 g at/above; quick chips 10/50/100/150/200/250 g/ml) and delete.
- **Movement card** (lavender, below meals): BMR · activity · TEF breakdown, list of logged activities (walking/running/custom), add + delete.
- **Water card** (sky, below movement) — **only rendered if the water quick-add button is enabled**: a **block bar where each block = 250 ml** and blocks can be partially filled (120 ml → half a block). Daily goal computed from profile + activity (see formulas). Each water addition is its **own entry** (list with time + delete).
- **Poop card** (peach, below water, hidden if "hide poop" is on): today's entries with size, optional Bristol badge `B#`, optional description; add + delete.
- **Custom button cards** (lavender, below poop): one per user-defined custom button (quantity or done/not-done).
- **Floating quick-add bar** (bottom): icon-only circular buttons — Food, Movement, Water, Poop, Weight (each toggleable) **plus a single custom button** (opens its tracker directly if only one exists, otherwise a picker). The bar hides while any modal is open.
- **Energy difference indicator**: when intake > burned, a **red-ish pill** appears **only on the Intake card**; when burned > intake, a mint pill sits on the Burned card.

### Add Food flow (`AddFoodModal`)
1. Meal-slot pills on top (target slot).
2. **3 quick shortcut foods** (configured in Settings; default: table salt, bread roll, olive oil).
3. **Saved meals tagged for this slot** (one-tap whole-meal log).
4. **Recent items**: foods/recipes logged in this slot over the last **7 days, up to 20**.
5. Whole-slot copies from previous days.
6. **Search**: results appear only while typing (min 2 chars) and match **fuzzy** (diacritic-insensitive, per-word Levenshtein with length-aware threshold — `skir` finds *Skyr*). Results include **individual foods, recipes (tagged), and saved meals** (meals log the whole meal in one tap).
7. Tapping a food/recipe jumps **straight to quantity selection**: stepper + quick chips + live kcal/macro preview; default amount = **last used amount for that product** (persisted per food). Then **"Add another item"** (queues and returns to picker) or **"Add to Meal / Log all"** (logs the queue as individual items, still editable afterwards).
8. Empty results offer **Add custom food** or **Barcode**.

### Movement modal
- Types: **Walking / Running / Custom**. Walking/running: **distance (km) is the default**, with **±0.5 km arrow buttons** and quick chips, or duration (min); intensity light/moderate/vigorous; live calorie estimate.
- **Custom activity**: name (previous custom names suggested as chips), **optional duration** and **optional calories** (auto-estimated ≈5 MET × weight × duration if calories left empty). No distance field.

### Water modal
- Quick chips: glass 250 ml, 0.5 L, 0.75 L, 1 L, plus custom stepper. Shows `total / target ml`.

### Weight modal
- Defaults to the **last recorded weight** (scans up to 60 days back); ± buttons step by **100 g**; quick ±0.5/±1 kg chips.

### Poop modal
- First field is **Size** (5 levels with growing poop icons): Very little / Little / Normal / A lot / Huge dump (IT: *Molto poca, Poca, Normale, Molta, Stronzo gigante*).
- Optional **Bristol scale 1–7** with dedicated icons and short descriptors.
- Optional free-text **description**.

### Meals page (tab: **Meals** / **Pasti**)
Three coherent colored sections in one column, each with an icon circle, a colored heading and **white (`surface`) buttons with colored text** — same style as the Foods card:

- **Meals** (peach `#FAE0B4`): user-saved pre-built meals. Section search field does **fuzzy, type-to-search** matching on meal names (results appear from 2 characters, never a full list). Meal cards are collapsed by default (persisted): name, slot tag, kcal, C/P/F; expanded adds description, macro tiles, ingredient list and actions (Log Meal → slot picker, Edit, Delete).
- **Recipes** (lavender `#E2D6FF`): its own section with its own **New Recipe** button (never shared with the meals button) and its own fuzzy search. Recipe cards are collapsible with per-100 g macros and **Log Recipe** (slot picker + amount selector).
- **Foods** (mint `#C9EFD3`): has an icon like the others, and two white buttons — **Custom Food** (manual form) and **Barcode**.

Flows:
- **New Meal**: name + slot tag (Breakfast/Lunch/…) + ingredient flow identical to Add Food — tap a food → **immediate quantity selection** → "Add another ingredient" or "Save Meal". The ingredient search uses the same fuzzy/type-to-search behaviour as adding food intake.
- **New Recipe**: ingredients with **any quantity**; the app computes **per-100 g macros** live and saves the result as a `FoodItem` with `isRecipe: true` into the food database (tagged "Recipe").


### Period page (`Period` / `Ciclo` tab, right after My Meals)
All cycle logs, predictions and stats live only here (`localStorage` key `kf_period_data`, included in JSON export/import). Settings → "Hide Period page" removes the tab and its dock but keeps the data.

**Page order:** status card → monthly calendar + collapsible legend → daily log (selected date) → cycle history & stats → nutrition & weight by cycle (opt-in) → cycle settings accordion (collapsed by default).

- **Status card**: cycle day (days since last start + 1), phase with a hedged note, next period (mean of the last 3–6 completed cycles if ≥3 exist, else the setting; a range is shown when std-dev ≥ 2), ovulation estimate (next − 14, labelled "estimate" with a disclaimer), "N days late" when overdue (phase stays Luteal, no negative countdown), empty state explaining how to log the first period. With pill tracking on: phase/ovulation hidden, pack day and expected withdrawal bleed shown instead.
- **Period start definition**: a marked day with no marked day in the previous 3 days (`PERIOD_START_GAP_DAYS`). Cycles are derived from logs, never stored.
- **Calendar**: month navigation, Monday-first weeks + IT date format in Italian, 44px cells with day number on top and a 14px pill capsule row below. Markers are shape-distinct: logged period = filled pink cell, predicted = lighter pink with dashed border (whole range), ovulation = green ring on the number, today = filled dark circle, selected = outlined cell. Pill: filled capsule+check (taken), outlined (missed, only after pack start and the date tracking was enabled), slashed (break/placebo), dashed pulsing (due today), faint (future). Each cell has an aria-label.
- **Daily log**: draft edited locally, saved with the add-food-style **Log Day** button (auto-saved when switching day). Period toggle, flow (none/light/medium/heavy — any flow marks the day, unmarking resets flow), moods and symptoms as multi-select chips with built-ins (stable ids `mood.*`, `sym.*`) and **custom tags** (`c_xxxx`, 1–24 chars, unique case-insensitively, max 30/group, created inline with "+ Add"), pill toggle (disabled on break days), expandable Day Recap, delete with confirmation.
- **Cycle history & stats**: avg cycle / avg period / shortest / longest / std-dev over the last 6 completed cycles with an "All time" toggle; newest-first list (ongoing cycle shows "day X, ongoing") expandable to peak flow and top moods/symptoms; bar chart of cycle lengths with the setting as a dashed reference; gentle (non-diagnostic) flags for cycles < 21 / > 35 days or bleeding > 7 days.
- **Nutrition & weight by cycle** (opt-in, read-only): per-phase averages (intake, burned, net, C/P/F) for the current cycle and the last 3 completed, counting only days with food logged ("n days", "not enough data" below 3). Weight-by-cycle-day chart (last 3 cycles, phase bands, Absolute/Relative toggle, start → end). Intake on days tagged with any mood/symptom vs other days. Pill mode replaces phases with active vs inactive pack days.
- **Settings accordion**: cycle length 15–60, period duration 1–15 (validated on blur, revert on invalid), pill tracking with pack length 1–365, inactive days 0..packLength−1 (0 = continuous), pack start date + "Start new pack today", show nutrition toggle, phase bands on Statistics toggle, custom tag management (rename/delete customs, hide built-ins), hide page, privacy note. Legacy 21/28 packs migrate to packLength 28 / inactive 7 with a prompt for the start date.
- **Dock on the Period tab**: the shared floating dock swaps to **Period** (opens a sheet: period toggle, flow, "Period started on this date" = mark date + next periodDuration−1 days, "Period ended on this date" = truncate the run) and **Pill** (one-tap toggle with toast + Undo; break days show a notice and write nothing). Target date = the calendar selection.
- **Pill logic**: pack day = ((date − packStart) mod packLength) + 1; last `inactiveDays` of each pack are inactive.
- Statistics tab: optional phase bands on the weight chart (off by default).

### Foods database page (Settings → Foods Database)
- Search (fuzzy, same engine), category icon filter pills, ~1,000 food cards with per-100 g macro tiles (C/P/F/Fiber/Salt, `—` when unreported) and a quick-log button.

### Barcode lookup (Open Food Facts)
- Manual entry, sample barcodes, or **live camera scanning** (`getUserMedia` + `BarcodeDetector` where supported; CAMERA permission declared in the Android manifest). Fetches `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`; unreported nutrients stay `null`. Found product → save to foods + log with quantity in one tap.

### Statistics page (tap any day → editable day inspector)
- **Range filter**: 7 days / 30 days / custom from–to.
- Avg **Intake** & **Burned** cards side by side with net pill; macro averages (C/P/F) and **Fiber/Salt averages in the same layout as the daily overview**.
- **Poops field**: count like `3/7` (days pooped / days in range) and one marker per day — poop icon (×N) or **×** for days without. No icon next to the "Poops" label itself.
- **Weight trend graph** — collapsible (persisted), below the poop field.
- **Custom button trackers** below the weight graph: toggle → `done/total`, quantity → average per day with unit.
- **Daily breakdown** — visible **only for the 7-day filter**, **collapsed by default** (persisted): per-day intake/burned bars, net pill, poop marker (×N); no macros. Tap a day → **day inspector** with all meal slots (collapsible, editable), movement, weight, water, poop, all modifiable.
- **Backup**: Export / Import JSON (profile, custom foods, day logs incl. water/weight/poop/custom, meals, settings).

### Settings
- Language EN/IT; theme Light/Dark.
- Toggle each of the 5 quick-add buttons.
- Pick the 3 quick-food shortcuts with the **same fuzzy food picker** used in Add Food.
- **Custom buttons**: create fields with a **name**, an **icon picker** (12 tracker icons), a type — *Quantity* (with unit, e.g. mg/tablets) or *Done / not done* (binary) — and a question **"Add the statistics view for this tracker?"** (controls whether it appears in Statistics). Existing trackers can be **renamed/recycled via the pencil (edit)** or deleted. They appear as one extra quick-add icon (direct open if only one, picker if several), as a card below poop on Today, and in Statistics when enabled.
- **Hide poop fields** toggle.
- **Hide Period page** toggle (droplet icon — same as the Period tab; hiding removes the tab + its dock, keeps data).
- Foods Database entry.

---

## Data model & formulas

Types live in `src/types/index.ts`:
- `FoodItem`: `{ id, name_de, name_it, name_en, brand?, store, category, unit: 'g'|'ml', calories, carbs, protein, fat, fiber, salt, barcode?, isCustom?, isRecipe? }` — nutrients are per 100 g/ml; unreported = `null`.
- `DayLog`: `{ date: 'YYYY-MM-DD', meals: { breakfast, mid_morning, lunch, midday_snack, dinner, extra: LoggedFoodItem[] }, activities: ActivityLog[], weightKg?, waterEntries?: WaterEntry[], poops?: PoopEntry[], custom?: Record<string, number|boolean> }` (legacy `waterMl` totals are migrated into entries on load).
- `ActivityLog`: walking/running (distance or duration + intensity, weight-based kcal) or custom (`customName`, optional `durationMin`, `caloriesBurned`).
- `PoopEntry`: `{ id, size: 'very_little'|'little'|'normal'|'a_lot'|'huge', bristol?: 1..7, description?, timestamp }`.
- `PreBuiltMeal`: `{ id, name, description?, slot?: MealSlotId, ingredients: {foodId, amount}[] }`.
- `Settings`: `{ theme, quickAdd: {food,movement,water,poop,weight}, hidePoop, quickFoods: string[3], customButtons: CustomButtonDef[] }`.

Formulas (`src/utils/calculations.ts`):
- **BMR, Mifflin-St Jeor**: men `10·kg + 6.25·cm − 5·age + 5`; women `… − 161`.
- **Walking**: 0.68–0.83 kcal/kg/km by intensity; **Running**: 0.95–1.12 kcal/kg/km; duration mode via METs (2.8/3.5/4.5 walk, 7/9/11.5 run). Custom: `caloriesBurned` entered, else ≈ `5 MET · kg · min/60`.
- **TEF** (food thermogenesis): `0.25·proteinKcal + 0.07·carbKcal + 0.02·fatKcal`.
- **Total burned** = BMR + activity + TEF. **Net** = intake − burned.
- **Daily water goal** (`src/utils/waterTarget.ts`), beverages only (food water excluded), per **EFSA 2010 / Italian LARN 2014**: base 2000 ml (men) / 1600 ml (women) — EFSA total-water AIs are 2.5 L / 2.0 L with ~20% from food — × weight factor around 70 kg (±25% cap) × +5% if age ≥ 65, + 250 ml per 300 kcal of activity (max +750 ml).

---

## Project structure (file-by-file)

```
index.html                     App shell: fonts (Plus Jakarta Sans), title, theme-color
capacitor.config.json          Capacitor config: appId com.kakcalculator.app, appName Kakcalculator, webDir "dist"
android/                       GENERATED Android Studio project (CAMERA permission in app/src/main/AndroidManifest.xml)
package.json                   deps: react, react-dom, lucide-react, tailwindcss v4 (+ @capacitor/*)
src/
  main.tsx                     React root mount
  App.tsx                      Layout: Header (contains Tabs), active page, all global modals
  index.css                    Tailwind import + CSS vars for light/dark themes (--bg/--surface/--inset/--border/--text/--muted), scrollbar, safe-area, no-scrollbar
  types/index.ts               All TypeScript interfaces & union types (see Data model above)
  i18n/translations.ts         EN + IT dictionaries; every UI string via t.* keys
  data/
    verifiedFoods.ts           Base food list (supermarket brands + staples + kebab + skyr flavors) and the combined VERIFIED_FOODS export
    foodRows.ts                Compact Row type + toFoods() mapper for the generic expansion
    genericFoods1..6.ts        ~880 generic foods as rows (fruit/veg/legumes, grains/bakery, meat/fish/dairy, nuts/sweets/oils/drinks, prepared dishes, extras)
    genericFoods.ts            Combines chunks into GENERIC_EXPANSION (total DB ≈ 1,008 items)
    samplePreBuiltMeals.ts     Default pre-built meals (empty by default)
  utils/
    calculations.ts            BMR, activity kcal, TEF, macro/total aggregations
    formatters.ts              YYYY-MM-DD date math, localized date/kcal formatting
    fuzzy.ts                   Typo-tolerant search (normalized per-word Levenshtein, prefix/substring boost)
    amountMemory.ts            Last-used portion per food id (localStorage)
    waterTarget.ts             EFSA/LARN-based daily water goal
    usePersistentState.ts      useState persisted to localStorage (collapse states)
  context/
    AppContext.tsx             Provider with ALL global state & actions: language, theme, settings, profile,
                               day logs, foods, meals, custom activities, modal open-states, log/remove actions
                               (food items, activities, water entries, weight, poop, custom values),
                               JSON export/import, computed macros/intake/expenditure/net for the selected date
  components/
    common/
      Header.tsx               Sticky header: profile btn, centered app name, settings gear, Tabs
      Tabs.tsx                 Icon-only pill nav (label shows only on the active tab) + scroll arrow
      TrackerIcon.tsx          12-icon set used by custom tracker buttons (settings, dock, cards, stats)
      Modal.tsx                Bottom-sheet (mobile) / centered dialog, theme-aware, backdrop
      NumericInput.tsx         Numeric text input allowing empty string; coerces to 0 on blur
      AmountStepper.tsx        − / + stepper (10 g < 100 g, 50 g ≥ 100 g)
      AmountSelector.tsx       Stepper + quick chips 10/50/100/150/200/250
      PoopIcon.tsx             Poop swirl SVG icon ({ size, strokeWidth, face, ...props })
      Toast.tsx                Bottom toast with optional Undo (used by the Period dock)
      BristolIcon.tsx          7 Bristol stool scale shapes
    dashboard/
      TodayView.tsx            Today assembly + persisted meal-slot collapse state
      DayNavigator.tsx         Day arrows + calendar popover + Today button
      EnergyBalanceCards.tsx   Intake/Burned cards; net pill on Intake when surplus
      MacroNutrientsOverview.tsx  Carbs/Protein/Fat cards + Fiber/Salt cards
      MealSlotCard.tsx         Collapsible meal slot with editable items (reused in day inspector)
      ActivityCardSummary.tsx  Movement card
      WaterCard.tsx            250 ml block bar (partial fills) + entry list; only if water button enabled
      PoopCard.tsx             Today's poop entries
      CustomButtonsCard.tsx    Cards for user-defined custom buttons
      QuickAddBar.tsx          Floating dock: standard icons on normal tabs, Period/Pill on the Period tab
    period/
      PeriodView.tsx           Period page: status card, daily-log draft/save, custom tags, composition
      PeriodCalendar.tsx       Monthly calendar with markers, pill capsules, legend, aria labels
      CycleHistory.tsx         Derived cycle stats, list, bar chart, gentle flags
      CycleNutrition.tsx       Opt-in per-phase nutrition averages, weight-by-cycle-day chart, tag comparison
      PeriodSettingsAccordion.tsx  Blur-validated cycle/pill settings, tag manager, privacy note
    prebuilt/
      PreBuiltMealsView.tsx    Meals page: 3 colored sections (Meals / Recipes / Foods) with fuzzy
                               search, collapsible cards, new-meal + recipe builder modals
    database/
      FoodDatabaseView.tsx     Foods DB browse/search/quick-log (opened from Settings)
    history/
      HistoryView.tsx          Statistics: range filter, averages, poop field, collapsible weight graph,
                               custom trackers, collapsible 7-day breakdown, day inspector, backup
    modals/
      AddFoodModal.tsx         Add food flow (shortcuts, slot meals, 20 recents, fuzzy search incl. meals/recipes, queue)
      LogActivityModal.tsx     Walking/running/custom movement logging
      BarcodeLookupModal.tsx   Open Food Facts lookup + camera scan
      CustomFoodModal.tsx      Manual custom food form
      UserProfileModal.tsx     Profile & BMR editor (sex, weight, height, age → BMR)
      SettingsModal.tsx        Language, theme, quick-add toggles, quick-food picker, custom buttons CRUD, hide poop, Foods entry
      WaterModal.tsx           Add water (chips + custom), total/target
      WeightModal.tsx          Log weight (±100 g, last-weight default)
      PoopModal.tsx            Size + optional Bristol + optional description
      CustomButtonModal.tsx    Log a custom button value (quantity stepper or done/not-done)
      CustomPickerModal.tsx    Picker shown when several custom trackers exist
      PeriodSheet.tsx          Period dock sheet = full daily log (period, flow, moods, symptoms,
                               pill, note) + started/ended-here actions
```

---

## Local state keys
`kf_period_data` (period tracker), `kcalsync_lang`, `kcalsync_profile`, `kcalsync_custom_foods`, `kcalsync_day_logs`, `kcalsync_prebuilt_meals`, `kcalsync_settings`, `kcalsync_custom_activities`, `kcalsync_last_amounts`, plus UI keys: `kcak_today_meals_open`, `kcak_day_meals_open`, `kcak_my_meals_open`, `kcak_stats_weight_open`, `kcak_stats_breakdown_open`.

---

## Run & build
```bash
npm install
npm run dev      # dev server
npm run build    # production → dist/ (single inlined index.html via vite-plugin-singlefile)
```

## Android APK (gestures + deployment files)
In-app Android gestures:
- **Swipe horizontally** on any page to move between tabs (works around horizontally scrollable rows).
- **Back button / edge-back gesture**: closes the topmost layer first (modal → sheet → custom tracker),
  then returns from any tab to Today, then exits the app.

```bash
npm run build
npx cap sync     # copy dist/ into android/app/src/main/assets/public
npx cap open android   # or open ./android in Android Studio
```
Then in Android Studio: **Build → Build App Bundle(s) / APK(s) → Build APK(s)** (debug APK in `android/app/build/outputs/apk/debug/`). For release, use **Generate Signed Bundle / APK**. Barcode scanning needs the CAMERA permission already declared in `android/app/src/main/AndroidManifest.xml`.
See `android/BUILD_APK.md` for the full APK build checklist (versioning, release signing, debugging flags). To regenerate the native project from scratch: `npm i @capacitor/core @capacitor/cli @capacitor/android && npx cap add android && npx cap sync`.
