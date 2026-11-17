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

- Choose a date with the day arrows or calendar. The calendar marks days with entries and offers a way back to today.
- Intake and estimated energy burned are shown side by side, together with net calories, carbs, protein, fat, fiber, and salt.
- Six collapsible meal slots show nutrients and logged portions. Open a slot to edit or remove its entries. The expanded state is remembered.
- **Today is the only page with the standard logging dock:** Food, Move, Water, Poop, Weight, and an optional custom tracker button. Settings controls which shortcuts appear. Trackers and history still have their own relevant in-page actions.
- **Add Food:** choose a meal slot, search the multilingual food catalog, use a shortcut, or reuse a saved meal or recent items. The app remembers portions and lets you queue several foods before logging the batch. You can also copy a meal slot from a previous day.
- **Movement:** log walking, running, or a custom activity. Walking and running can be recorded by distance or duration with a live calorie estimate.
- **Water:** individual additions count toward an estimated goal, with a progress bar in the water tracker. The water goal is not displayed in Profile.
- **Poop:** choose a size, an optional Bristol type, and optional notes. The tracker can be hidden in Settings.
- **Custom trackers:** quantity entries accumulate instead of replacing one another. Logging 200 mg and then 50 mg gives two entries and a day total of 250 mg. Open the tracker to see amounts and times or remove an individual entry. Done / not done trackers retain one state per day. Statistics use the daily totals.

### Custom and Foods

- **Custom** groups saved meals, recipes, and food tools. The creation dock has three icon-only shortcuts, with accessible names for New Meal, New Recipe, and New Food.
- In Meals and Recipes, tapping the magnifying glass opens a full-width fuzzy search bar across the section card, and the **+** button beside it opens the creation form. Saved meals include a slot and editable ingredients; recipes are stored with nutrition per 100 g.
- In Foods, **Barcode** and **Custom Food** sit side by side with **Browse Foods** directly below; all three share the same solid cream pill button style and leading icons (`ScanBarcode`, `Plus`, `BookOpen`). The catalog includes filters for legumes and soy, nuts and seeds, soups and stews, and desserts, and **Prepared** replaces the former Kebab & Prepared label.
- Barcode lookup checks built-in and saved products first. Only new barcode queries to [Open Food Facts](https://world.openfoodfacts.org/) need internet. Where `BarcodeDetector` is supported, the camera can scan the code; manual lookup and manual food creation are also available.

### Period

- The Period page is **hidden by default when the profile sex is Male** and shown by default when set to Female. Switching sex in Profile updates visibility automatically unless the user has manually toggled **Hide Period page** in Settings; hiding never deletes stored cycle data.
- The calendar and Daily Log cover flow, moods, symptoms, optional pill tracking, intercourse, and notes. Cycle estimates are not intended for contraception or fertility timing.
- Pick a date on the calendar. In the floating cycle dock, the **droplet** opens Quick Log with start and end shortcuts, the **pill** marks whether a pill was taken (available when pill tracking is enabled and the day is not a scheduled break), and the **heart** toggles intercourse for that date. Marked days display a small filled heart positioned slightly above the top of the day number so the number never shifts position.
- **Double-click (or double-tap on touch screens)** any date in the Period calendar to open a **Day overview** dialog summarizing that day's energy intake and expenditure, macros, logged movement, weight, water, poop entries, and custom trackers, with a one-tap **Open in Today** shortcut.
- The Daily Log also has a **Quick log** button. Pending edits save when moving to another date, opening Quick Log, or inspecting a day. Intercourse markers are stored on-device and included in JSON backups.
- Add or manage moods and symptoms right in the Daily Log, not in Cycle Settings. In each **Manage** menu, removing a tag deletes the choice and its references in saved days. **Reset to defaults** restores that group's original choices and removes custom tags from that group and its logs. It does not recreate previously deleted selections.
- Cycle Settings contains cycle length, period duration, optional pill schedule, and display preferences. Cycle history and statistics show completed cycles; nutrition and weight by cycle are opt-in.

### Statistics, Profile, and Settings

- Statistics opens with a centered 7-day, 30-day, and custom date-range selector (and centered custom date inputs when selected). It shows energy and nutrient averages, optional tracker summaries, weight trend, and a collapsible daily breakdown for the 7-day range. The Day Inspector opens individual dates for review and editing.
- **Weight trend** plots stored readings in the selected range. If there are none, it plots a point labeled **Profile weight** without creating a dated reading. Saving a weight records it for the selected day and updates the profile weight used for estimates.
- **Profile** edits weight, height, age, and sex and previews basal metabolic rate (BMR), syncing default Period-tab visibility when sex changes (unless manually overridden in Settings).
- **Settings** offers English and Italian plus three themes: **Light** (warm oat cream), **Lite Dark** (soft slate), and **Dark** (deep charcoal). Themes keep solid pastel accents. Settings also controls tracker and Period-page visibility, Today shortcuts, and the 3 pinned foods.
- Logging and creation dialogs sit above the middle of the visible screen. They resize with the mobile keyboard and scroll internally. Saving and deleting update the relevant view without transient confirmation pop-ups. Validation and backup errors are displayed inline.
- **Data Backup** in Statistics exports or imports a JSON snapshot. Files contain private data, including cycle entries if present, and are not encrypted.

## Data and calculations

- Foods supply nutrition per 100 g or 100 ml; missing macro values can remain `null`. Logged food portions retain a snapshot of those values. Saved meals reference food IDs and amounts.
- Each `DayLog` contains its meal slots, activity entries, and optional water, bowel, and weight records. `customEntries` maps quantity-tracker IDs to arrays of `{ id, amount, timestamp? }`. Boolean tracker states live in `custom`. Older backups with a numeric `custom` total are migrated to one entry for that day; if no real timestamp exists, it is labeled as a previous total. Individual water records also support migration from older daily totals.
- Cycle data is stored separately as `PeriodData`, with editable mood and symptom catalogs and date-keyed daily logs. Legacy custom tags and existing logs load from older backups.
- BMR uses the **Mifflin–St Jeor** formula. Walking/running estimates use pace-adjusted distance factors or duration-based METs. **Total burned = BMR + movement + estimated food thermogenesis.** Net is intake minus total burned.
- The water target is a beverage estimate based on the profile and logged activity, using the app's EFSA/LARN-based calculation. It is separate from the profile display.

### Nutrition sources

- **84 new reference entries** come from the [USDA FoodData Central SR Legacy release (April 2018)](https://fdc.nal.usda.gov/download-datasets/), including whole-milk and part-skim ricotta, legumes, grains, snacks, and prepared dishes. Each new entry links to its source. Carbohydrates follow the dataset's carbohydrate-by-difference value (including fiber); salt is calculated as sodium × 2.5, converted from mg to g.
- The [Bakkerij Van Hecke rice pie](https://bakkersonline.be/be-nl/vanhecke-ferrerlaan/product/92214/rijsttaart) uses the bakery's per-100-g product label. Values are specific to that product, not a universal estimate for homemade rice pie.
- The source-backed data is bundled with the app and is separate from the original catalog and its estimated preparation variants. To regenerate the USDA selection, download the [official SR Legacy CSV zip](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip) and run `python3 scripts/generate-usda-foods.py <path-to-zip>`.

## Project structure

| File or directory | Role |
| --- | --- |
| `index.html`, `src/main.tsx` | Document shell, bundled typography, and React entry point. |
| `src/App.tsx` | Tab routing, global dialogs, page-specific docks, and gesture/Back handling. |
| `src/index.css` | Theme tokens, keyboard-aware dialog sizing, safe areas, reduced-motion styles, and accordion transitions. |
| `src/context/AppContext.tsx` | Local state, persistence, legacy migrations, logging actions, tag catalog changes, and JSON backup. |
| `src/types/index.ts`, `src/i18n/translations.ts` | TypeScript data contracts and English/Italian strings. |
| `src/data/verifiedFoods.ts`, `extraFoods.ts` | Curated products and the additional multilingual food catalog. |
| `src/data/referenceFoods.ts`, `usdaFoodRows.ts`, `foodCategories.ts` | Source-linked additions, generated USDA nutrient rows, and shared food categories. |
| `scripts/generate-usda-foods.py` | Extract the selected foods from the official USDA data archive. |
| `public/licenses/Plus-Jakarta-Sans-OFL.txt` | License for the bundled Plus Jakarta Sans font. |
| `src/data/samplePreBuiltMeals.ts` | Initial saved-meal list. |
| `src/utils/calculations.ts`, `waterTarget.ts` | Nutrition, activity, BMR, thermogenesis, and water-goal calculations. |
| `src/utils/customTrackers.ts` | Quantity entry helpers, legacy migration, and per-day tracker totals. |
| `src/utils/period.ts`, `usePeriodDayDraft.ts` | Cycle calculations, tag catalogs, and drafts shared by the cycle log forms. |
| `src/utils/formatters.ts`, `fuzzy.ts`, `amountMemory.ts`, `usePersistentState.ts`, `cn.ts` | Dates and formatting, fuzzy search, remembered portions, persisted UI state, and class-name helpers. |
| `src/components/common/Modal.tsx`, `ActionDock.tsx` | Shared keyboard-aware dialogs and accessible icon-only floating dock. |
| `src/components/common/Header.tsx`, `Tabs.tsx` | App header and tab navigation. |
| `src/components/common/AmountSelector.tsx`, `AmountStepper.tsx`, `NumericInput.tsx` | Shared portion presets, steppers, and decimal fields. |
| `src/components/common/PoopIcon.tsx`, `BristolIcon.tsx`, `TrackerIcon.tsx` | Bowel and tracker icon sets. |
| `src/components/dashboard/TodayView.tsx`, `QuickAddBar.tsx` | Today layout and standard logging shortcuts. |
| `src/components/dashboard/DayNavigator.tsx`, `EnergyBalanceCards.tsx`, `MacroNutrientsOverview.tsx` | Date navigation and daily energy/nutrient summaries. |
| `src/components/dashboard/MealSlotCard.tsx`, `ActivityCardSummary.tsx`, `WaterCard.tsx`, `PoopCard.tsx`, `CustomButtonsCard.tsx` | Editable entries and tracker totals for a selected date. |
| `src/components/prebuilt/PreBuiltMealsView.tsx` | Custom page: saved meals, recipe builder, full-width toggleable searches, icon Foods buttons, and icon-only creation dock. |
| `src/components/database/FoodDatabaseView.tsx` | Browse, filter, and log catalog items. |
| `src/components/history/HistoryView.tsx` | Statistics with centered range selector, weight plot, Day Inspector, and backup tools. |
| `src/components/period/PeriodView.tsx`, `PeriodCalendar.tsx`, `PeriodTagEditor.tsx` | Cycle overview and quick-action dock (droplet, pill, heart), non-shifting calendar markers, double-tap day inspection, Daily Log, and tag management. |
| `src/components/period/PeriodDayInfoModal.tsx` | Day overview dialog opened by double-clicking/double-tapping a date on the Period calendar (intake, burned, macros, movement, weight, water, poop, custom trackers). |
| `src/components/period/CycleHistory.tsx`, `CycleNutrition.tsx`, `PeriodSettingsAccordion.tsx` | Cycle history, opt-in nutrition statistics, and cycle/pill settings. |
| `src/components/modals/AddFoodModal.tsx`, `CustomFoodModal.tsx`, `BarcodeLookupModal.tsx` | Food logging, custom food creation, and barcode lookup. |
| `src/components/modals/LogActivityModal.tsx`, `WaterModal.tsx`, `WeightModal.tsx`, `PoopModal.tsx` | Activity, hydration, weight, and bowel logging. |
| `src/components/modals/CustomButtonModal.tsx`, `CustomPickerModal.tsx` | Individual quantity/toggle tracker dialog, entry history, and tracker selection. |
| `src/components/modals/PeriodSheet.tsx`, `UserProfileModal.tsx`, `SettingsModal.tsx` | Period Quick Log, Profile/BMR fields, and app Settings. |
| `capacitor.config.json`, `android/` | Capacitor and Android Studio project configuration. |

### Local storage keys

- Journal and setup: `kcalsync_profile`, `kcalsync_day_logs`, `kcalsync_custom_foods`, `kcalsync_prebuilt_meals`, `kcalsync_lang`, `kcalsync_settings`, `kcalsync_custom_activities`, `kcalsync_last_amounts`.
- Cycle history and tag catalogs: `kf_period_data`.
- UI preferences: `kcak_today_meals_open`, `kcak_day_meals_open`, `kcak_my_meals_open`, `kcak_my_recipes_open`, `kcalsync_stats_daily_open`, `kcalsync_stats_weight_open`.

## Android

The Android package loads the web bundle, fonts, and catalog from APK assets, not a development server. Once installed, the journal, local food search, meals, cycle tracker, and statistics do not require Wi-Fi or mobile data. New barcode lookups and opening external nutrition references require an internet connection.

```bash
npm run build
npx cap sync android
npx cap open android
```

Open the Android project in Android Studio to build a debug APK or generate a signed release. See [android/BUILD_APK.md](android/BUILD_APK.md) for native setup, signing, and an airplane-mode checklist. Camera scanning needs camera permission and a compatible Android WebView. Horizontal swipes navigate the main tabs; Back dismisses the topmost dialog first.
