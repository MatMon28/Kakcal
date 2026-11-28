import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'exports', 'agent-context');
const MAX_BYTES = 250_000; // Strictly <= 250 KB (decimal & binary)

/**
 * Curated groups of files useful for deeply understanding Kakcal's code and docs.
 * When adding a new code or doc file to the repo, add it to the appropriate group
 * (or to EXCLUDED_FILES / EXCLUDED_PREFIXES if it is raw data or generated noise).
 */
export const EXPORT_GROUPS = [
  {
    name: '01-app-shell-and-config',
    title: 'App Shell, Entry Points & Configuration',
    description: 'Root router (AGENTS.md), build/tooling configs, HTML shell, App.tsx, main.tsx, and PWA/service-worker setup.',
    files: [
      'AGENTS.md',
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'capacitor.config.json',
      'eslint.config.mjs',
      'index.html',
      'src/main.tsx',
      'src/App.tsx',
      'src/index.css',
      'src/vite-env.d.ts',
      'src/config/demo.ts',
      'public/manifest.webmanifest',
      'public/offline-worker.js',
      'public/_headers',
    ],
  },
  {
    name: '02-types-context-and-storage',
    title: 'Types, State Contexts, IndexedDB Storage & Workers',
    description: 'TypeScript domain types, AppContext/nav/settings state management, IndexedDB storage layer, and Web Workers.',
    files: [
      'src/types/index.ts',
      'src/types/advanced.ts',
      'src/types/fasting.ts',
      'src/types/journal.ts',
      'src/types/layout.ts',
      'src/context/AppContext.tsx',
      'src/context/appContextType.ts',
      'src/context/appStorage.ts',
      'src/context/contexts.ts',
      'src/storage/boot.ts',
      'src/storage/dayStore.ts',
      'src/storage/idb.ts',
      'src/storage/photoStore.ts',
      'src/storage/status.ts',
      'src/storage/usePersist.ts',
      'src/storage/writeQueue.ts',
      'src/workers/offCatalogSearch.worker.ts',
    ],
  },
  {
    name: '03-styles-and-themes',
    title: 'Styles, Design Tokens & 9-Style Theme System',
    description: 'CSS tokens, 9 theme stylesheets, themed component overrides, motion/performance CSS, and theme definitions.',
    files: [
      'src/utils/themes.ts',
      'src/styles/theme-tokens.css',
      'src/styles/fonts.css',
      'src/styles/motion.css',
      'src/styles/performance.css',
      'src/styles/theme-angular.css',
      'src/styles/theme-aurora.css',
      'src/styles/theme-glass.css',
      'src/styles/theme-material.css',
      'src/styles/theme-minimal-mono.css',
      'src/styles/theme-playful.css',
      'src/styles/theme-pop.css',
      'src/styles/themed-cards.css',
      'src/styles/themed-chrome.css',
      'src/styles/themed-glass.css',
      'src/styles/themed-material.css',
      'src/styles/themed-overrides.css',
      'src/styles/themed-tones.css',
    ],
  },
  {
    name: '04-i18n',
    title: 'Internationalization (EN / IT)',
    description: 'Translation dictionaries and domain-split i18n modules.',
    files: [
      'src/i18n/translations.ts',
      'src/i18n/advanced.ts',
      'src/i18n/fasting.ts',
      'src/i18n/journal.ts',
      'src/i18n/layout.ts',
      'src/i18n/portions.ts',
      'src/i18n/parts/library.ts',
      'src/i18n/parts/modals.ts',
      'src/i18n/parts/period.ts',
      'src/i18n/parts/settings.ts',
      'src/i18n/parts/shell.ts',
      'src/i18n/parts/today.ts',
    ],
  },
  {
    name: '05-utils-and-data-logic',
    title: 'Utilities, Business Logic, Exports & Data Readers',
    description: 'Calorie/macro math, search indexes, backup/export (JSON/Excel/PDF), native Android bridge, notifications, stores, and data catalogue readers.',
    files: [
      'src/data/offCatalog.ts',
      'src/data/foodCategories.ts',
      'src/data/referenceFoods.ts',
      'src/utils/activityLabel.ts',
      'src/utils/advancedStore.ts',
      'src/utils/amountMemory.ts',
      'src/utils/android.ts',
      'src/utils/backupFormat.ts',
      'src/utils/calculations.ts',
      'src/utils/catalogueSearch.ts',
      'src/utils/cn.ts',
      'src/utils/customPortions.ts',
      'src/utils/customTrackers.ts',
      'src/utils/dayMetricsCache.ts',
      'src/utils/deleteAllData.ts',
      'src/utils/deleteData.ts',
      'src/utils/excelExport.ts',
      'src/utils/fastingStore.ts',
      'src/utils/favorites.ts',
      'src/utils/foodPortions.ts',
      'src/utils/foodSearchIndex.ts',
      'src/utils/formatters.ts',
      'src/utils/fuzzy.ts',
      'src/utils/healthConnectSync.ts',
      'src/utils/idle.ts',
      'src/utils/incomingPlan.ts',
      'src/utils/ingredientMatch.ts',
      'src/utils/ingredientParse.ts',
      'src/utils/journalNavigation.ts',
      'src/utils/journalStore.ts',
      'src/utils/knownFoods.ts',
      'src/utils/layoutGrid.ts',
      'src/utils/layoutStore.ts',
      'src/utils/lazyScreens.ts',
      'src/utils/mealByTime.ts',
      'src/utils/mealItems.ts',
      'src/utils/mealSlots.ts',
      'src/utils/motion.ts',
      'src/utils/nativeExport.ts',
      'src/utils/notifications.ts',
      'src/utils/pagePosition.ts',
      'src/utils/pageTransition.ts',
      'src/utils/pageVisibility.ts',
      'src/utils/pdfExport.ts',
      'src/utils/period.ts',
      'src/utils/photoExport.ts',
      'src/utils/planGroups.ts',
      'src/utils/planMealName.ts',
      'src/utils/planSharing.ts',
      'src/utils/plannerDraft.ts',
      'src/utils/portionFractions.ts',
      'src/utils/preloadableLazy.tsx',
      'src/utils/pwaInstall.ts',
      'src/utils/recipeImport.ts',
      'src/utils/scrollFade.ts',
      'src/utils/shoppingList.ts',
      'src/utils/spring.ts',
      'src/utils/tourPreview.ts',
      'src/utils/undoRemoval.ts',
      'src/utils/useCatalogueSearch.ts',
      'src/utils/useNotificationScheduler.ts',
      'src/utils/useOffCatalog.ts',
      'src/utils/usePeriodDayDraft.ts',
      'src/utils/usePersistentState.ts',
      'src/utils/useToday.ts',
      'src/utils/waterTarget.ts',
      'src/utils/widgetDates.ts',
    ],
  },
  {
    name: '06-components-common-and-layout',
    title: 'Shared UI Components & Editable Layout Grid',
    description: 'Reusable shell/navigation/dialog/input/icon components and the advanced layout editor.',
    files: [
      'src/components/common/ActionDock.tsx',
      'src/components/common/AmountSelector.tsx',
      'src/components/common/AmountStepper.tsx',
      'src/components/common/BodyPartIcon.tsx',
      'src/components/common/BorderProgressRing.tsx',
      'src/components/common/Brand.tsx',
      'src/components/common/BristolIcon.tsx',
      'src/components/common/Collapsible.tsx',
      'src/components/common/ConfirmDialog.tsx',
      'src/components/common/DataBackup.tsx',
      'src/components/common/DeferredBody.tsx',
      'src/components/common/DeleteAllData.tsx',
      'src/components/common/FavoriteButton.tsx',
      'src/components/common/FoodMacroGrid.tsx',
      'src/components/common/FoodResultRow.tsx',
      'src/components/common/GoalBadge.tsx',
      'src/components/common/Header.tsx',
      'src/components/common/IconPicker.tsx',
      'src/components/common/IngredientPicker.tsx',
      'src/components/common/IngredientRow.tsx',
      'src/components/common/InlineCollapse.tsx',
      'src/components/common/InstallApp.tsx',
      'src/components/common/InstallGuide.tsx',
      'src/components/common/LazyBody.tsx',
      'src/components/common/LazyInstallGuideHost.tsx',
      'src/components/common/LibrarySectionHeader.tsx',
      'src/components/common/MacroPills.tsx',
      'src/components/common/MealSlotPicker.tsx',
      'src/components/common/Modal.tsx',
      'src/components/common/NumericInput.tsx',
      'src/components/common/PageSwiper.tsx',
      'src/components/common/PoopIcon.tsx',
      'src/components/common/QuickFoodButtons.tsx',
      'src/components/common/QuickLogFoodModal.tsx',
      'src/components/common/RecentChips.tsx',
      'src/components/common/SaltCrystalIcon.tsx',
      'src/components/common/SaveBeforeCloseDialog.tsx',
      'src/components/common/SearchInput.tsx',
      'src/components/common/SegmentedControl.tsx',
      'src/components/common/StorageInfo.tsx',
      'src/components/common/StorageNotice.tsx',
      'src/components/common/Switch.tsx',
      'src/components/common/Tabs.tsx',
      'src/components/common/TrackerIcon.tsx',
      'src/components/common/UndoRemovalNotice.tsx',
      'src/components/common/WorkflowFooter.tsx',
      'src/components/common/bodyIconPaths.ts',
      'src/components/common/dialogExit.ts',
      'src/components/common/installGuideEvents.ts',
      'src/components/common/mealSlotIcon.tsx',
      'src/components/common/poop-anim.css',
      'src/components/common/poopAnimations.ts',
      'src/components/layout/EditableGrid.tsx',
      'src/components/layout/LayoutToolbar.tsx',
    ],
  },
  {
    name: '07-components-pages-and-dashboard',
    title: 'Main Pages & Today Dashboard',
    description: 'Today dashboard cards and Food Database, History/Statistics, Body Measurements, Fasting, and Period pages.',
    files: [
      'src/components/dashboard/TodayView.tsx',
      'src/components/dashboard/ActivityCardSummary.tsx',
      'src/components/dashboard/BalanceTargetCard.tsx',
      'src/components/dashboard/CustomButtonsCard.tsx',
      'src/components/dashboard/DayNavigator.tsx',
      'src/components/dashboard/EnergyBalanceCards.tsx',
      'src/components/dashboard/MacroNutrientsOverview.tsx',
      'src/components/dashboard/MealNutrientTotals.tsx',
      'src/components/dashboard/MealSlotBody.tsx',
      'src/components/dashboard/MealSlotCard.tsx',
      'src/components/dashboard/PoopCard.tsx',
      'src/components/dashboard/QuickAddBar.tsx',
      'src/components/dashboard/TrackerCard.tsx',
      'src/components/dashboard/WaterCard.tsx',
      'src/components/database/FoodDatabaseView.tsx',
      'src/components/history/HistoryView.tsx',
      'src/components/history/WaterStatsCard.tsx',
      'src/components/body/BodyView.tsx',
      'src/components/body/BodyChart.tsx',
      'src/components/body/BodyMeasureModal.tsx',
      'src/components/fasting/FastingView.tsx',
      'src/components/fasting/FastingCharts.tsx',
      'src/components/fasting/FastingInterruptModal.tsx',
      'src/components/fasting/FastingNoteModal.tsx',
      'src/components/fasting/FastingSessionModal.tsx',
      'src/components/fasting/TodayFastingBar.tsx',
      'src/components/period/PeriodView.tsx',
      'src/components/period/CycleHistory.tsx',
      'src/components/period/CycleNutrition.tsx',
      'src/components/period/PeriodCalendar.tsx',
      'src/components/period/PeriodDayInfoModal.tsx',
      'src/components/period/PeriodSettingsAccordion.tsx',
      'src/components/period/PeriodTagEditor.tsx',
    ],
  },
  {
    name: '08-components-journal-and-prebuilt',
    title: 'Custom Page: Meal Diary, Photo Diary, Planner, Shopping & Pre-Built Meals/Recipes',
    description: 'Journal components, planner wizard, shopping lists, photo diary, journal CSS, and pre-built meals/recipes.',
    files: [
      'src/components/journal/CustomShortcuts.tsx',
      'src/components/journal/JournalPickers.tsx',
      'src/components/journal/JournalUI.tsx',
      'src/components/journal/MealDiary.tsx',
      'src/components/journal/MealPlanner.tsx',
      'src/components/journal/MealSummaryCard.tsx',
      'src/components/journal/PhotoDiary.tsx',
      'src/components/journal/PlanLibrary.tsx',
      'src/components/journal/PlanTransfer.tsx',
      'src/components/journal/PlannerWizard.tsx',
      'src/components/journal/SaveAsMeal.tsx',
      'src/components/journal/ShoppingLists.tsx',
      'src/components/journal/journal.css',
      'src/components/journal/css/journal-base.css',
      'src/components/journal/css/journal-diary.css',
      'src/components/journal/css/journal-forms.css',
      'src/components/journal/css/journal-photo-controls.css',
      'src/components/journal/css/journal-planner-dock.css',
      'src/components/journal/css/journal-planner-tones.css',
      'src/components/journal/css/journal-planner-wizard.css',
      'src/components/journal/css/journal-plans-shopping.css',
      'src/components/journal/css/journal-responsive.css',
      'src/components/journal/css/journal-shared-ui.css',
      'src/components/prebuilt/PreBuiltMealsView.tsx',
      'src/components/prebuilt/usePreBuiltMealsState.tsx',
      'src/components/prebuilt/MealsSection.tsx',
      'src/components/prebuilt/RecipesSection.tsx',
      'src/components/prebuilt/CustomFoodsQuick.tsx',
      'src/components/prebuilt/CreateMealModal.tsx',
      'src/components/prebuilt/RecipeBuilderModal.tsx',
      'src/components/prebuilt/RecipeImportModal.tsx',
      'src/components/prebuilt/RecipePortionPicker.tsx',
      'src/components/prebuilt/LogToSlotModals.tsx',
    ],
  },
  {
    name: '09-components-modals-and-settings',
    title: 'Modals & Settings Panels',
    description: 'Logging modals (food, activity, water, weight, poop, barcode), export/share modals, and Settings sub-panels.',
    files: [
      'src/components/modals/ActivitySearch.tsx',
      'src/components/modals/AddFoodModal.tsx',
      'src/components/modals/AdvancedSettings.tsx',
      'src/components/modals/BarcodeLookupModal.tsx',
      'src/components/modals/BodyMeasuresProfile.tsx',
      'src/components/modals/CustomButtonModal.tsx',
      'src/components/modals/CustomFoodModal.tsx',
      'src/components/modals/CustomPickerModal.tsx',
      'src/components/modals/ExcelExportModal.tsx',
      'src/components/modals/LogActivityModal.tsx',
      'src/components/modals/NotificationSettings.tsx',
      'src/components/modals/PdfExportModal.tsx',
      'src/components/modals/PeriodSheet.tsx',
      'src/components/modals/PoopModal.tsx',
      'src/components/modals/SaveOrShareModal.tsx',
      'src/components/modals/SettingsModal.tsx',
      'src/components/modals/UserProfileModal.tsx',
      'src/components/modals/WaterModal.tsx',
      'src/components/modals/WeightModal.tsx',
      'src/components/modals/settings/CustomButtonsSettings.tsx',
      'src/components/modals/settings/CustomPageSettings.tsx',
      'src/components/modals/settings/DeleteDataSettings.tsx',
      'src/components/modals/settings/GoalsSettings.tsx',
      'src/components/modals/settings/HealthConnectSettings.tsx',
      'src/components/modals/settings/PagesSettings.tsx',
      'src/components/modals/settings/SettingsParts.tsx',
      'src/components/modals/settings/TodaySettings.tsx',
    ],
  },
  {
    name: '10-components-intro-tour-widgets',
    title: 'Launch Intro, Guided Tour & Widget Gallery',
    description: 'Boot splash, launch intro animations, guided app tour, notification showcase, and widget preview gallery.',
    files: [
      'src/components/intro/IntroSplash.tsx',
      'src/components/intro/bootSplash.ts',
      'src/components/intro/earlyStart.ts',
      'src/components/intro/intro.css',
      'src/components/intro/introAnimations.ts',
      'src/components/intro/launchIntro.ts',
      'src/components/intro/useAppReady.ts',
      'src/components/tour/AppTour.tsx',
      'src/components/tour/NotificationShowcase.tsx',
      'src/components/tour/tourContent.ts',
      'src/components/widgets/WidgetGallery.tsx',
      'src/components/widgets/widgetContract.ts',
      'src/components/widgets/widget-preview.css',
    ],
  },
  {
    name: '11-android-native',
    title: 'Android Native Shell, Widgets, Export & Health Connect',
    description: 'Android Capacitor Java/Kotlin classes, manifest, Gradle build config, and APK build guide.',
    files: [
      'android/BUILD_APK.md',
      'android/app/build.gradle',
      'android/app/src/main/AndroidManifest.xml',
      'android/app/src/main/java/com/kcalsync/app/ExportStore.java',
      'android/app/src/main/java/com/kcalsync/app/HealthConnectReader.kt',
      'android/app/src/main/java/com/kcalsync/app/JournalDevicePlugin.java',
      'android/app/src/main/java/com/kcalsync/app/JournalWidgetProvider.java',
      'android/app/src/main/java/com/kcalsync/app/LaunchBackground.java',
      'android/app/src/main/java/com/kcalsync/app/MainActivity.java',
    ],
  },
  {
    name: '12-build-and-verification-scripts',
    title: 'Build, Check & Playwright Verification Scripts',
    description: 'Android release prep, catalogue builder, widget/theme invariant checks, and browser verification scripts.',
    files: [
      'scripts/prepare-android.mjs',
      'scripts/build-off-catalog.mjs',
      'scripts/build-off-catalog.d.mts',
      'scripts/check-widget-layouts.mjs',
      'scripts/check-classic-coherence.mjs',
      'scripts/smoke.mjs',
      'scripts/check-journal.mjs',
      'scripts/check-page-transition.mjs',
      'scripts/check-search-and-dialog.mjs',
      'scripts/check-food-workflows.mjs',
      'scripts/bench-page-change.mjs',
      'scripts/measure-meal-card.mjs',
      'scripts/verify-interaction-update.mjs',
    ],
  },
  {
    name: '13-docs-architecture-and-guides',
    title: 'Architecture, Feature, Style & Performance Documentation',
    description: 'All active technical docs in docs/ explaining features, themes, storage, performance, Android/PWA, and verification.',
    files: [
      'docs/setup-build.md',
      'docs/web-preview.md',
      'docs/pwa.md',
      'docs/pwa-setup.md',
      'docs/android-apk.md',
      'docs/apk-download.md',
      'docs/android-gradle-guard.md',
      'docs/widgets.md',
      'docs/notifications.md',
      'docs/journal-shell.md',
      'docs/journal-pages.md',
      'docs/meal-journal.md',
      'docs/food-workflows-update.md',
      'docs/ingredient-quantity-update.md',
      'docs/new-features-update.md',
      'docs/custom-photo-share-update.md',
      'docs/planner-dock-update.md',
      'docs/plans-shopping-update.md',
      'docs/desktop-and-fields-update.md',
      'docs/settings-update.md',
      'docs/interaction-update.md',
      'docs/styles-guide.md',
      'docs/glass-material-update.md',
      'docs/style-audit.md',
      'docs/motion.md',
      'docs/gestures.md',
      'docs/launch-intro.md',
      'docs/startup-performance.md',
      'docs/performance.md',
      'docs/performance-review.md',
      'docs/search-and-animation-performance.md',
      'docs/storage-and-privacy.md',
      'docs/backup-update.md',
      'docs/calculations-colors.md',
      'docs/advanced-personalisation.md',
      'docs/advanced-layout.md',
      'docs/brand.md',
      'docs/data-activities.md',
      'docs/data-nutrition.md',
      'docs/data-off-catalogue.md',
      'docs/verification.md',
      'docs/file-organisation.md',
      'docs/known-gaps.md',
      'docs/provenance.md',
    ],
  },
  {
    name: '14-docs-file-maps',
    title: 'Documentation Index & Area File Maps',
    description: 'Task router and per-area file maps in docs/file-map/.',
    files: [
      'docs/README.md',
      'docs/file-map/README.md',
      'docs/file-map/app-shell.md',
      'docs/file-map/utils.md',
      'docs/file-map/data.md',
      'docs/file-map/components-common.md',
      'docs/file-map/components-dashboard.md',
      'docs/file-map/components-modals.md',
      'docs/file-map/components-pages.md',
      'docs/file-map/tour-widgets-intro.md',
      'docs/file-map/android-native.md',
      'docs/file-map/scripts-public.md',
    ],
  },
];

/**
 * Files intentionally excluded from the export (raw data tables, generated assets,
 * historical changelogs/patches, and test/asset-gen scripts).
 */
export const EXCLUDED_FILES = new Set([
  'README.md',
  'package-lock.json',
  'docs/audit-log.md',
  'docs/changes-patch.md',
  'docs/changes-patch-history.md',
  'docs/branding-render.png',
  'src/context/demoSeeds.ts',
  'src/data/activities.ts',
  'src/data/demoData.ts',
  'src/data/extraFoods.ts',
  'src/data/journalDemo.ts',
  'src/data/samplePreBuiltMeals.ts',
  'src/data/standardPortions.ts',
  'src/data/usdaFoodRows.ts',
  'src/data/verifiedFoods.ts',
  'src/assets/themes_insp.txt',
  'src/assets/kakcalculator_intro/logos-and-animations-overview.html',
]);

export const EXCLUDED_PREFIXES = [
  'docs/changelog/',
  'src/assets/',
];

function findUncategorizedFiles() {
  const included = new Set();
  for (const group of EXPORT_GROUPS) {
    for (const file of group.files) included.add(file);
  }

  const scanRoots = ['src', 'docs', 'android/app/src/main/java'];
  const uncategorized = [];

  function walk(relDir) {
    const absDir = path.join(ROOT, relDir);
    if (!fs.existsSync(absDir)) return;
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const relPath = `${relDir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(relPath);
      } else {
        if (/\.(png|jpg|jpeg|webp|svg|ico|bin|woff2?|ttf|jar|apk|aab|patch)$/i.test(relPath)) {
          continue;
        }
        if (EXCLUDED_FILES.has(relPath)) continue;
        if (EXCLUDED_PREFIXES.some((prefix) => relPath.startsWith(prefix))) continue;
        if (!included.has(relPath)) {
          uncategorized.push(relPath);
        }
      }
    }
  }

  for (const root of scanRoots) walk(root);
  return uncategorized;
}

function formatFileBlock(relPath) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Listed export file does not exist: ${relPath}`);
  }
  const raw = fs.readFileSync(absPath, 'utf8').replace(/\r\n/g, '\n');
  const lineCount = raw.length === 0 ? 0 : raw.split('\n').length;
  const header =
    `${'='.repeat(80)}\n` +
    `FILE: ${relPath} (lines 1-${lineCount})\n` +
    `${'='.repeat(80)}\n`;
  const body = raw.endsWith('\n') ? raw : `${raw}\n`;
  return {
    relPath,
    lineCount,
    text: `${header}${body}\n`,
  };
}

function splitLargeFileBlock(block, maxChunkBytes) {
  const lines = block.text.split('\n');
  // Strip the original header (3 lines) and re-chunk the raw file lines
  const absPath = path.join(ROOT, block.relPath);
  const rawLines = fs.readFileSync(absPath, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const chunks = [];
  let start = 0;

  while (start < rawLines.length) {
    let end = start;
    const partHeaderPrefix = `${'='.repeat(80)}\nFILE: ${block.relPath} (part lines `;
    let chunkLines = [];
    let currentBytes = Buffer.byteLength(partHeaderPrefix + '99999-99999)\n' + '='.repeat(80) + '\n\n', 'utf8');

    while (end < rawLines.length) {
      const lineWithNl = rawLines[end] + '\n';
      const lineBytes = Buffer.byteLength(lineWithNl, 'utf8');
      if (chunkLines.length > 0 && currentBytes + lineBytes > maxChunkBytes) {
        break;
      }
      chunkLines.push(lineWithNl);
      currentBytes += lineBytes;
      end += 1;
    }

    const header =
      `${'='.repeat(80)}\n` +
      `FILE: ${block.relPath} (lines ${start + 1}-${end} of ${rawLines.length})\n` +
      `${'='.repeat(80)}\n`;
    chunks.push({
      relPath: `${block.relPath} (lines ${start + 1}-${end})`,
      lineCount: end - start,
      text: `${header}${chunkLines.join('')}\n`,
    });
    start = end;
  }

  return chunks;
}

function buildPreamble(group, chunkBlocks, partLabel) {
  const toc = chunkBlocks.map((b) => `- ${b.relPath} (${b.lineCount} lines)`).join('\n');
  return (
    `KAKCAL AGENT CONTEXT EXPORT\n` +
    `Category: ${group.title}${partLabel}\n` +
    `Description: ${group.description}\n` +
    `Included files (${chunkBlocks.length}):\n${toc}\n\n`
  );
}

function buildGroupChunks(group) {
  const blocks = group.files.map(formatFileBlock);
  const chunks = [];
  const headerReserve = 2048; // Reserve space for single-file chunk title & TOC
  const maxBodyBytes = MAX_BYTES - headerReserve;

  let currentBlocks = [];
  let currentBytes = 0;

  const flush = () => {
    if (currentBlocks.length === 0) return;
    chunks.push(currentBlocks);
    currentBlocks = [];
    currentBytes = 0;
  };

  for (const block of blocks) {
    const blockBytes = Buffer.byteLength(block.text, 'utf8');
    if (blockBytes > maxBodyBytes) {
      flush();
      const subBlocks = splitLargeFileBlock(block, maxBodyBytes);
      for (const sub of subBlocks) {
        chunks.push([sub]);
      }
      continue;
    }
    const candidateBlocks = [...currentBlocks, block];
    const estimatedPreambleBytes = Buffer.byteLength(
      buildPreamble(group, candidateBlocks, ' (Part 99/99)'),
      'utf8',
    );
    if (currentBlocks.length > 0 && estimatedPreambleBytes + currentBytes + blockBytes > MAX_BYTES) {
      flush();
    }
    currentBlocks.push(block);
    currentBytes += blockBytes;
  }
  flush();

  return chunks.map((chunkBlocks, idx) => {
    const partSuffix = chunks.length > 1 ? `-part${idx + 1}` : '';
    const fileName = `${group.name}${partSuffix}.txt`;
    const partLabel = chunks.length > 1 ? ` (Part ${idx + 1}/${chunks.length})` : '';
    const content = buildPreamble(group, chunkBlocks, partLabel) + chunkBlocks.map((b) => b.text).join('');
    const bytes = Buffer.byteLength(content, 'utf8');
    if (bytes > MAX_BYTES) {
      throw new Error(`Generated chunk ${fileName} is ${bytes} bytes, exceeding ${MAX_BYTES} bytes.`);
    }
    return {
      fileName,
      partLabel,
      bytes,
      files: chunkBlocks.map((b) => b.relPath),
      content,
    };
  });
}

function generateReadme(outputs, uncategorized) {
  const totalBytes = outputs.reduce((sum, o) => sum + o.bytes, 0);
  const rows = outputs
    .map((o) => {
      const kb = (o.bytes / 1000).toFixed(1);
      const fileList = o.files.map((f) => `\`${f}\``).join(', ');
      return `| [\`${o.fileName}\`](${o.fileName}) | ${o.groupTitle}${o.partLabel} | ${kb} KB | ${fileList} |`;
    })
    .join('\n');

  const uncategorizedNote =
    uncategorized.length > 0
      ? `\n## Uncategorized files detected (${uncategorized.length})\n\n` +
        `These files were found in \`src/\`, \`docs/\`, or \`android/app/src/main/java/\` and are not yet listed in \`scripts/export-agent-context.mjs\`:\n\n` +
        uncategorized.map((f) => `- \`${f}\``).join('\n') +
        '\n'
      : '';

  return `# Kakcal Agent Context Export

Generated: ${new Date().toISOString()}
Total size: ${(totalBytes / 1000).toFixed(1)} KB across ${outputs.length} files (each strictly <= 250.0 KB).

## How to use this folder

Start here to locate the exact \`.txt\` bundle containing the area of Kakcal you want to understand:
- **App entry, routing & config:** \`01-app-shell-and-config.txt\`
- **State, types, IndexedDB & Web Workers:** \`02-types-context-and-storage*.txt\`
- **CSS tokens & 9 theme styles:** \`03-styles-and-themes*.txt\`
- **EN/IT translations:** \`04-i18n*.txt\`
- **Business logic, search, exports & stores:** \`05-utils-and-data-logic*.txt\`
- **UI components:** \`06-*\` (shared/layout), \`07-*\` (pages/Today), \`08-*\` (Custom/journal/prebuilt), \`09-*\` (modals/settings), \`10-*\` (intro/tour/widgets)
- **Android native (Java/Kotlin/Gradle/Manifest):** \`11-android-native*.txt\`
- **Build & Playwright verification scripts:** \`12-build-and-verification-scripts*.txt\`
- **Technical docs & file maps:** \`13-docs-architecture-and-guides*.txt\`, \`14-docs-file-maps*.txt\`

## Intentionally excluded

To keep the context focused and compact, raw food/activity data tables (\`src/data/verifiedFoods.ts\`, \`usdaFoodRows.ts\`, \`activities.ts\`, etc.), demo seed payloads, binary/SVG assets, historical changelogs (\`docs/changelog/\`, \`docs/changes-patch-history.md\`, \`docs/audit-log.md\`), and \`package-lock.json\` are excluded.

## File index

| Export file | Category | Size | Included source files |
| --- | --- | --- | --- |
${rows}
${uncategorizedNote}`;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const uncategorized = findUncategorizedFiles();

  if (checkOnly) {
    if (uncategorized.length > 0) {
      console.error('Uncategorized files found (add to scripts/export-agent-context.mjs):');
      for (const f of uncategorized) console.error(`  - ${f}`);
      process.exit(1);
    }
    console.log('All tracked code and doc files are categorized in scripts/export-agent-context.mjs.');
    return;
  }

  // Delete old export files completely and recreate directory
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const outputs = [];
  for (const group of EXPORT_GROUPS) {
    const chunks = buildGroupChunks(group);
    for (const chunk of chunks) {
      fs.writeFileSync(path.join(OUT_DIR, chunk.fileName), chunk.content, 'utf8');
      outputs.push({
        ...chunk,
        groupTitle: group.title,
      });
    }
  }

  const readme = generateReadme(outputs, uncategorized);
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), readme, 'utf8');

  console.log(`Exported ${outputs.length} files + README.md to exports/agent-context/`);
  for (const o of outputs) {
    console.log(`  ${o.fileName.padEnd(44)} ${(o.bytes / 1000).toFixed(1).padStart(6)} KB  (${o.files.length} files)`);
  }
  if (uncategorized.length > 0) {
    console.warn(`\nWARNING: ${uncategorized.length} uncategorized file(s) not in EXPORT_GROUPS:`);
    for (const f of uncategorized) console.warn(`  - ${f}`);
  }
}

main();
