# Kakcalculator

A local-first nutrition, activity and wellness journal built with React 19, TypeScript, Vite and Tailwind CSS v4. The browser opens a guided tour of every page, with the widgets last; Android has a bundled Capacitor app and three native home-screen widgets. There is no account or application backend.

## Build an APK

**Prepared download:** choose **Android project** in the web preview, extract the whole ZIP, and open **`Kakcalculator/android/`** in Android Studio. It includes the Gradle wrapper, Java/XML widget sources, local native modules and pre-synced production assets. No web server or npm install is needed for this prepared download. Use JDK 21, Android SDK 36 and Build Tools 35.0.0. Studio needs internet for the first dependency download, not for running the installed app.

**From the editable source:**

```sh
# Node.js 22 or newer, from the project root
npm ci
npx tsc --noEmit
node scripts/prepare-android.mjs
npx cap open android
```

See **[android/BUILD_APK.md](android/BUILD_APK.md)** for prerequisites, debug and signed APK builds, output locations, updates, and the device checklist. `com.kcalsync.app` is preserved from the upstream project. The native project uses version code 3 / version 1.1.0. Production signing keys are not included.

## Run the webview

```sh
npm ci
npm run dev -- --host 0.0.0.0
npm run build
npm run preview
```

- `/` (or `?view=tour`): the guided tour. It explains each page beside a live copy of the journal and ends with the widgets. `?view=app`: the standalone browser journal. Inside the tour the journal is loaded with `?tour=1`, which shows the Period page for the tour only; the stored Settings switch is not changed. The prepared Android bundle always opens the journal, not the tour or a remote URL.
- Browser review builds seed demo data only for missing storage. Use `VITE_DEMO_DATA=false npm run build` for an empty production website (PowerShell: `$env:VITE_DEMO_DATA='false'; npm run build`). The Android preparation script sets this flag itself. No build deletes an existing journal.
- `npm run build` produces an inlined `dist/index.html` and copies public assets. On HTTPS or localhost, a production browser install caches the app shell after its first successful online load, so it can reopen offline. A first-ever hosted visit or source download still needs a connection. The development server is not an offline installation.
- To refresh the distributable source download, run `node scripts/prepare-android.mjs`, then `python3 scripts/package-android.py`, then `npm run build`. Python is needed only to recreate the ZIP. Do not run `cap sync` with the browser preview in `dist/` in place of the Android preparation step.

## Widgets

| Size | Actions and information |
| --- | --- |
| Small (primary) | Five circular shortcuts: Food, Movement, Water, Poop and Weight. |
| Extra-small | Three circular shortcuts: Food, Water and Poop. |
| Large | Intake and burned cards (kcal, with the balance badge and a progress bar), carbs, protein and fat (grams and share of calories), and the five shortcuts. Same arrangement as Ultra minimal Today. |

All action buttons are **icon-only** and retain accessible names. The two smaller widgets have a translucent background and no branding or headings. The Large widget has no logo, name or "today" label. Its intake and burned cards use the app's Today colours, icons and badge rules, and the macro cards show grams with their share of calories. The full wordmark appears only in page headers. Labels outside the widget bodies identify sizes in the tour or the launcher picker.

The guided tour opens real dialogs in its same-origin app frame, and each page step sets the journal to that page. The native widgets are `AppWidgetProvider`/`RemoteViews` implementations with offline vector drawables and immutable intents. Both target **today** even if the journal was browsing a historical date. Tapping opens a form; only Save writes an entry. Native nutrition is a derived private cache updated on edits/import, not a second journal. Missing days render zero. The system can defer periodic and midnight refreshes. Widget launcher behavior must be checked on the target device.

## Journal workflows

- **Header:** every page starts with the profile button (left), the Kakcalculator wordmark (centre, which returns to Today) and the settings button (right), followed by the page tabs.

- **Today:** day arrows/calendar, Intake/Burned and net balance, macros, six meal slots, and collapsible activity, water, bowel and custom trackers. Compact/Normal/Expanded and open states are remembered. Settings controls the Today dock, not the fixed lists of widget shortcuts.
- **Food:** multilingual fuzzy search, favorites, remembered portions, multi-item queues, saved meals and previous-day copying. The bundled catalog contains 1,146 foods; custom records can extend it. New unknown barcode searches are the only automatic HTTP fetch made by a logging workflow, and only after the user requests a lookup.
- **Movement:** Walk/Run by distance or duration, Other with 181 local Compendium activities, or a saved custom activity. Records retain the estimated burn at logging time. Water, weight, bowel entries and custom quantities are independent daily measurements.
- **Custom:** saved meals, recipes, ingredient quantities, catalog, barcode lookup and manual creation. Meals/recipes support logging, editing, fuzzy search and confirmed deletion. In Ultra Minimal, section and action labels are reduced while item names and values remain.
- **Statistics:** 7-day, 30-day or custom ranges, energy/nutrient averages, custom tracker charts, weight trend, and a collapsible 7-day breakdown. Ultra Minimal nutrient averages put `/day` beside the number; custom quantity charts use a bottom-right per-day label.
- **Period:** optional calendar, daily flow/mood/symptom/notes, pill schedule, intercourse log, cycle history and opt-in nutrition charts. Profile sex controls default visibility unless overridden. Existing data is not deleted when hiding the page. Estimates are not contraception or fertility guidance.
- **Day overview:** single-tap a date in Today's calendar, double-tap a date in Period, or inspect a day from Statistics. The order is energy, macros (if present), Poop (unless hidden), Activity, Weight/Water, then logged custom trackers. Icon backplates blend with their sections. The Open in Today footer stays available while scrolling.
- **Settings and Profile:** English/Italian, Light/Lite Dark/Dark, Ultra minimal mode, pinned foods, tracker visibility, custom trackers, profile and JSON backup. In Ultra Minimal, salt is the supplied nested diamond with four spokes in Today, Statistics and Custom. Its accessible name still identifies salt.

## Gestures and storage

Horizontal swipes on main content switch visible tabs. Forms, open dialogs, horizontal scrollers and marked controls keep their gestures. The outer 24 CSS pixels are reserved for system-edge navigation; multi-touch, canceled gestures and predominantly vertical movement do not navigate. On Android, Back dismisses the top dialog or Today calendar, returns from the catalog, then returns to Today. At the root, it backgrounds the app. The keyboard and launcher-level long-press/resize are handled by Android.

The source of truth is the journal in WebView `localStorage`. `kcalsync_day_logs`, `kcalsync_profile`, `kcalsync_custom_foods`, `kcalsync_prebuilt_meals`, `kcalsync_custom_activities`, `kcalsync_settings` and `kf_period_data` hold the main records. Language, recent portions and UI expansion preferences have separate local keys. The Settings JSON backup includes profile, day logs, custom foods/meals/activities, settings and cycle data; it does **not** include every UI preference. Android export uses the system document picker. Backups are unencrypted. Clearing storage or uninstalling can remove the journal.

Camera scanning is optional and depends on `BarcodeDetector` and permission. Known barcodes and manual food entry work offline. New Open Food Facts searches and opening external nutrition references need internet. Native widgets use no network. The browser service worker is not used by the APK.

## Calculations and colors

Food values are per 100 g/ml. Logged portions retain a nutrient snapshot. The journal and widget use the same calorie and macro functions. BMR uses Mifflin-St Jeor; total burned is BMR + activity + estimated thermogenesis. Net is intake minus expenditure. The water estimate uses the profile and activity. Estimates are not direct measurements.

Shared accents: intake/food green `#C9EFD3`, activity/burned red `#F6D0D0`, weight violet `#E2D6FF`, water/carbs blue `#CFE7FE`, protein/poop peach `#FAE0B4`, fat lavender `#E2D6FF`, and custom tracker lemon `#F7E9AA`. Meal and tracker header icon circles are transparent; dock and widget actions keep their filled circles.

### Brand marks

- **App icon** (`src/assets/brand/kakcalculator-icon.svg`): the supplied cream tile (`#FBF3E3`) with the `#232325` K and poop. It is the browser favicon (embedded in the single-file build) and the source of the Android launcher artwork.
- **Wordmark** (`src/assets/brand/kakcalculator-wordmark.svg`): the full name at the top of every app page (`src/components/common/Brand.tsx`). Tapping it returns to Today. Its text is set in Nunito 800, bundled with `@fontsource/nunito` (OFL licence in `public/licenses/`), so it looks the same offline. The cream plate is removed when the wordmark is rendered, so its ink follows the theme's text colour and the page behind it: dark on light, light on dark.
- **Launcher artwork** comes from `node scripts/render-brand.mjs`: legacy, round and adaptive PNGs in `android/app/src/main/res/mipmap-*` and the 512 px Play Store icon in `android/store/`. The adaptive background is `#FBF3E3`; the foreground is scaled so the visible artwork stays inside the 66 dp safe circle. The launcher label stays as the text name, because launchers cannot show the wordmark.

## Data sources

### Activity sources

- [`src/data/activities.ts`](src/data/activities.ts) holds **181 activities** with MET values copied from the [2024 Adult Compendium of Physical Activities](https://pacompendium.com/) (Herrmann SD, Willis EA, Ainsworth BE, et al., *J Sport Health Sci* 2024;13(1):6-12, [doi:10.1016/j.jshs.2023.10.010](https://doi.org/10.1016/j.jshs.2023.10.010)). Each row keeps its Compendium **specific-activity code** (e.g. `17200` = walking 3.5–3.9 mph, 4.8 MET), English and Italian names and a category. Every code and MET value was cross-checked against the official category tables.
- The 2024 edition changed many values compared with the 2011 edition used by most calculators (e.g. running 6.0–6.3 mph is now **9.3** MET instead of 9.8, 7 mph is 11.0, brisk walking 3.5–3.9 mph is 4.8). Values here follow 2024.
- **Adding an activity:** append a row `[code, id, category, met, name_en, name_it]` to `ACTIVITY_ROWS`. The `id` is saved in logs and favourites, so never rename an existing one.
- MET values are population averages for adults and a good estimate, not a measurement; individual cost varies with fitness, terrain, technique and conditions.

### Nutrition sources

- **84 new reference entries** come from the [USDA FoodData Central SR Legacy release (April 2018)](https://fdc.nal.usda.gov/download-datasets/), including whole-milk and part-skim ricotta, legumes, grains, snacks, and prepared dishes. Each new entry links to its source. Carbohydrates follow the dataset's carbohydrate-by-difference value (including fiber); salt is calculated as sodium × 2.5, converted from mg to g.
- The [Bakkerij Van Hecke rice pie](https://bakkersonline.be/be-nl/vanhecke-ferrerlaan/product/92214/rijsttaart) uses the bakery's per-100-g product label. Values are specific to that product, not a universal estimate for homemade rice pie.
- The source-backed data is bundled with the app and is separate from the original catalog and its estimated preparation variants. To regenerate the USDA selection, download the [official SR Legacy CSV zip](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip) and run `python3 scripts/generate-usda-foods.py <path-to-zip>`.

## Project structure

| File or directory | Role |
| --- | --- |
| `index.html`, `src/main.tsx` | Document shell, bundled typography, and React entry point. |
| `src/App.tsx` | Guided tour or journal selection, the bridge that drives the journal for the tour and widgets (native and web), tab routing, global dialogs, page-specific docks, swipe and Back handling. |
| `src/utils/tourPreview.ts` | The `?tour=1` flag that shows the Period page inside the tour only. |
| `src/utils/android.ts` | Typed local Capacitor plugin for launcher actions, nutrition updates and native JSON export. |
| `android/app/src/main/java/com/kcalsync/app/` | MainActivity, JournalDevicePlugin, and three JournalWidgetProvider variants: cold/warm launches, private nutrition cache and native launcher updates. |
| `android/app/src/main/res/layout/widget_*.xml`, `res/xml/widget_*_info.xml`, `res/drawable/widget_*.xml`, `res/values*/widget_*.xml` | RemoteViews layouts, launcher metadata, offline icon vectors, and English/Italian labels. |
| `src/components/tour/AppTour.tsx`, `tourContent.ts` | Guided webview: a step for every page (English and Italian copy), the live journal beside each step, the widgets last, language and theme that follow the app, and the Open full app link. |
| `src/components/widgets/WidgetGallery.tsx`, `widget-preview.css` | The three widget designs: translucent Small and Extra-small trays, and the Large widget in Ultra minimal Today's arrangement. |
| `src/components/widgets/widgetContract.ts` | Serializable widget actions/snapshot, message validation, and today's nutrition mapping using the app's existing calculations. |
| `src/index.css` | Theme tokens and shared Intake/Activity/Weight accents, keyboard-aware dialog sizing, safe areas, reduced-motion styles, and accordion transitions. |
| `src/context/AppContext.tsx` | Local state, persistence, legacy migrations, logging actions, tag catalog changes, and JSON backup. |
| `src/types/index.ts`, `src/i18n/translations.ts` | TypeScript data contracts and English/Italian strings. |
| `src/data/verifiedFoods.ts`, `extraFoods.ts` | Curated products and the additional multilingual food catalog. |
| `src/data/referenceFoods.ts`, `usdaFoodRows.ts`, `foodCategories.ts` | Source-linked additions (recipes also keep `recipeIngredients`), generated USDA nutrient rows, and shared food categories. |
| `scripts/generate-usda-foods.py` | Extract the selected foods from the official USDA data archive. |
| `public/licenses/` | Bundled notices for Plus Jakarta Sans, Nunito, Lucide, React, Capacitor and runtime utilities; copied into the APK. |
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
| `src/components/dashboard/TrackerCard.tsx` | Shared collapsible tracker shell with red/blue/peach/lemon palettes, transparent icon and + circles (Circle rule), readable theme-independent text, equal compact heights and a full-width summary option for water blocks. |
| `src/components/dashboard/ActivityCardSummary.tsx`, `WaterCard.tsx`, `PoopCard.tsx`, `CustomButtonsCard.tsx` | Activity, water, poop and custom-tracker cards with compact Ultra Minimal summaries and the Poop compact label exception. |
| `src/components/prebuilt/PreBuiltMealsView.tsx` | Custom page: pastel collapsible sections, transparent section-header/search/+ circles, Ultra Minimal labels and units, neutral meal/recipe cards, and search/edit/log actions. |
| `src/components/database/FoodDatabaseView.tsx` | Browse, filter, and log catalog items; transparent header icon and back circles (Circle rule). |
| `src/components/history/HistoryView.tsx` | Statistics with compact icon/number summaries in Ultra Minimal, bottom-right `/ day` labels, weight plot, tracker summaries, and shared day overview. |
| `src/components/period/PeriodView.tsx`, `PeriodCalendar.tsx`, `PeriodTagEditor.tsx` | Cycle overview with a transparent droplet header icon circle, and quick-action dock (droplet, pill, heart), non-shifting calendar markers, double-tap day inspection, Daily Log, and tag management. |
| `src/components/period/PeriodDayInfoModal.tsx` | Shared day overview for Today, Period, and Statistics: intake, burned, macros, poop, activity, weight, water, all logged custom trackers, and fixed Open in Today footer. |
| `src/components/period/CycleHistory.tsx`, `CycleNutrition.tsx`, `PeriodSettingsAccordion.tsx` | Cycle history, opt-in nutrition statistics, and cycle/pill settings. |
| `src/components/modals/AddFoodModal.tsx`, `CustomFoodModal.tsx`, `BarcodeLookupModal.tsx` | Food logging, custom food creation, and barcode lookup. |
| `src/components/modals/LogActivityModal.tsx` | Activity dialog: Walk / Run / Other / Custom, duration step and live energy estimate for database activities. |
| `src/components/modals/ActivitySearch.tsx` | Activity → Other search page: saved custom activities first, fuzzy search, category chips (incl. My activities), favourites pinned first. |
| `src/components/modals/WaterModal.tsx`, `WeightModal.tsx`, `PoopModal.tsx` | Hydration, weight, and bowel logging. |
| `src/components/modals/CustomButtonModal.tsx`, `CustomPickerModal.tsx` | Individual quantity/toggle tracker dialog, entry history, and tracker selection. |
| `src/components/modals/PeriodSheet.tsx`, `UserProfileModal.tsx`, `SettingsModal.tsx` | Period Quick Log, Profile/BMR fields, and app Settings including the Ultra Minimal toggle. |
| `src/assets/brand/kakcalculator-icon.svg`, `kakcalculator-wordmark.svg` | Supplied app icon and full wordmark: the source for the header, favicon and launcher artwork. |
| `src/components/common/Brand.tsx` | Inline `Wordmark` (transparent, header on every page, using the bundled Nunito font) and `AppIcon` (the icon artwork). |
| `scripts/render-brand.mjs` | Renders the launcher, round, adaptive-foreground and Play Store PNGs from the icon SVG with Chromium, then checks their sizes and the safe zone. |
| `android/store/kakcalculator-play-icon-512.png` | Full-bleed 512 px icon for the Play Console listing. |
| `capacitor.config.json`, `android/` | Local HTTPS asset origin, Android identity, native project, Gradle wrapper and [APK instructions](android/BUILD_APK.md). |
| `scripts/prepare-android.mjs` | Clean, no-demo Android build, asset copy, Capacitor sync and integrity checks. |
| `scripts/package-android.py` | Creates the Android Studio source ZIP (standard-library Python 3); not required to build the app. |
| `scripts/smoke.mjs` | Browser checks for the actual production web assets and offline shell. |
| `android/app/src/androidTest/java/com/kcalsync/app/WidgetIntegrationTest.java` | On-device provider registration and intent validation tests. |
| `public/offline-worker.js` | Caches only the production browser app shell, never a journal, backup, barcode response or source archive. |
| `public/downloads/Kakcalculator-Android-Studio.zip` | Prepared Android Studio handoff, with bundled journal, native code, resources, Gradle modules and editable web source. |

## Project provenance

The Android shell, launcher assets, package ID and Gradle configuration were restored from [`MatMon28/Kakcalculator`, commit `81368cc`](https://github.com/MatMon28/Kakcalculator/tree/81368cc). The current web source was retained, not replaced with the older upstream UI. The missing wrapper JAR was restored from the pinned Capacitor template and checked against Gradle's published SHA-256. No Next.js wrapper, Postgres/Drizzle database, Firebase setup or remote server is part of this build.

## Verification

The guided tour is covered by `scripts/smoke.mjs`: all 15 pages in order, the journal's response on each page (Statistics, Settings, Day overview, Period), the widget-only step with its 13 shortcuts, the Large widget's content, the language switch, offline reloads, the supplied salt drawing, gestures, and the native payload (intake, burned, macros, percentages and BMR).

For repeatable web checks, prepare Android assets, run `npm run build`, install Chromium with `npx playwright install chromium` (on minimal Linux systems use `--with-deps`), then run `node scripts/smoke.mjs`. The script checks all 13 icon-only shortcuts, the header wordmark with its bundled font, the favicon, the launcher PNG sizes, the exact three salt paths, responsive touch targets, offline persistence, clean native assets, swipes and a simulated native action/snapshot/Back protocol. The simulation is not a device test.

The prepared source ZIP was extracted separately and built with JDK 21 and SDK 36, without installing npm packages in the extraction. Debug, unsigned release, and the Android instrumentation-test APK compiled; the release vital-lint check passed. The packaged manifest contains all three widget providers. No signed production APK or keystore is distributed. Physical launcher behavior, real system gestures, camera, document picker and background scheduling remain device checks in [the Android guide](android/BUILD_APK.md).
