import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { App as AndroidApp } from '@capacitor/app';
import { AppProvider, useApp, useNav, useNavActions, useShell } from './context/AppContext';
import { Header } from './components/common/Header';
import { closeTopModal, getOpenModalCount, PageUndoRemoval } from './components/common/Modal';
import { TodayView } from './components/dashboard/TodayView';
import { PreBuiltMealsView } from './components/prebuilt/PreBuiltMealsView';
import { FoodDatabaseView } from './components/database/FoodDatabaseView';
import { AddFoodModal } from './components/modals/AddFoodModal';
import { WaterModal } from './components/modals/WaterModal';
import { WeightModal } from './components/modals/WeightModal';
import { PoopModal } from './components/modals/PoopModal';
import { CustomFoodModal } from './components/modals/CustomFoodModal';
import { CustomButtonModal } from './components/modals/CustomButtonModal';
import { CustomPickerModal } from './components/modals/CustomPickerModal';
import { QuickAddBar } from './components/dashboard/QuickAddBar';
import { StorageNotice } from './components/common/StorageNotice';
import { LazyInstallGuideHost } from './components/common/LazyInstallGuideHost';
import { PageSwiper } from './components/common/PageSwiper';
import { IntroSplash } from './components/intro/IntroSplash';
import { isStandaloneApp } from './utils/pwaInstall';
import { shouldShowIntro } from './components/intro/introAnimations';
import { dismissBootSplash } from './components/intro/bootSplash';
import {
  isWidgetAction,
  isWidgetRequest,
  makeWidgetSnapshot,
  nutritionValues,
  WIDGET_CHANNEL,
  type NutritionValues,
  type TourScreen,
  type WidgetAction,
} from './components/widgets/widgetContract';
import { getTodayDateString } from './utils/formatters';
import { useToday } from './utils/useToday';
import { widgetDates } from './utils/widgetDates';
import { isAndroidApp, JournalDevice } from './utils/android';
import { isPeriodShown } from './utils/tourPreview';
import { isPageHiddenBySettings } from './utils/pageVisibility';
import { useNotificationScheduler } from './utils/useNotificationScheduler';
import { requestOpenNotificationSettings } from './utils/notifications';
import { calculateBMR } from './utils/calculations';
import { useAdvanced } from './utils/advancedStore';
import { whenIdle } from './utils/idle';
import { useAutoMealSlot } from './utils/mealSlots';
import { useAppReady } from './components/intro/useAppReady';
import type { ActiveTab } from './types';
import { DEMO_MODE } from './config/demo';
import { startedWithPlanLink } from './utils/incomingPlan';

// Optional screens load on demand (item 2) and are preloaded once the app is idle, so opening one is still instant.
const PeriodView = lazy(() => import('./components/period/PeriodView').then((m) => ({ default: m.PeriodView })));
const HistoryView = lazy(() => import('./components/history/HistoryView').then((m) => ({ default: m.HistoryView })));
const BodyView = lazy(() => import('./components/body/BodyView').then((m) => ({ default: m.BodyView })));
const LogActivityModal = lazy(() => import('./components/modals/LogActivityModal').then((m) => ({ default: m.LogActivityModal })));
const BarcodeLookupModal = lazy(() => import('./components/modals/BarcodeLookupModal').then((m) => ({ default: m.BarcodeLookupModal })));
const UserProfileModal = lazy(() => import('./components/modals/UserProfileModal').then((m) => ({ default: m.UserProfileModal })));
const SettingsModal = lazy(() => import('./components/modals/SettingsModal').then((m) => ({ default: m.SettingsModal })));
const PeriodSheet = lazy(() => import('./components/modals/PeriodSheet').then((m) => ({ default: m.PeriodSheet })));
const AppTour = lazy(() => import('./components/tour/AppTour').then((m) => ({ default: m.AppTour })));

function preloadOptionalScreens() {
  void import('./components/period/PeriodView');
  void import('./components/history/HistoryView');
  void import('./components/body/BodyView');
  void import('./components/modals/LogActivityModal');
  void import('./components/modals/SettingsModal');
  void import('./components/modals/UserProfileModal');
  void import('./components/modals/PeriodSheet');
}

const MAIN_TABS: ActiveTab[] = ['today', 'prebuilt', 'period', 'body', 'history'];

/** Each widget button opens the same dialog the tour and Today's dock open. */
const ACTION_SCREEN: Record<WidgetAction, TourScreen> = {
  custom: 'tracker',
  food: 'food',
  movement: 'activity',
  water: 'water',
  poop: 'poop',
  weight: 'weight',
};

const targetOrigin = () => (window.location.origin === 'null' ? '*' : window.location.origin);

function WidgetAppBridge() {
  // The bridge only changes tabs (through the stable functions), so it does not re-render on a tab change.
  const app = { ...useApp(), ...useNavActions() };
  const autoMealSlot = useAutoMealSlot();
  const today = useToday();
  const snapshot = useMemo(
    () => makeWidgetSnapshot(today, app.language, app.allDayLogs[today], app.userProfile),
    [today, app.language, app.allDayLogs, app.userProfile],
  );
  const lastPublished = useRef('');
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  // Closes every overlay so the next screen opens on its own.
  const dismissOverlays = () => {
    document.dispatchEvent(new Event('kc:dismiss-popover'));
    for (let i = 0; i < 5 && getOpenModalCount(); i++) {
      if (!closeTopModal()) break;
    }
    app.setIsAddFoodOpen(false);
    app.setIsLogActivityOpen(false);
    app.setIsWaterOpen(false);
    app.setIsPoopOpen(false);
    app.setIsWeightOpen(false);
    app.setIsBarcodeOpen(false);
    app.setIsProfileOpen(false);
    app.setIsSettingsOpen(false);
    app.setIsCustomFoodOpen(false);
    app.setCustomButtonOpenId(null);
    app.setIsCustomPickerOpen(false);
    app.setIsPeriodSheetOpen(false);
  };

  // Used by the guided tour (web) and by widget buttons (web and native).
  const showScreenRef = useRef<(screen: TourScreen) => void>(() => {});
  showScreenRef.current = (screen) => {
    const todayKey = getTodayDateString();
    dismissOverlays();
    app.setSelectedDate(todayKey);
    if (screen !== 'meals') window.scrollTo({ top: 0, behavior: 'instant' });
    switch (screen) {
      case 'today':
        app.setActiveTab('today');
        break;
      case 'meals':
        app.setActiveTab('today');
        window.setTimeout(
          () => document.getElementById('today-meals')?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
          160,
        );
        break;
      case 'food':
        app.setActiveTab('today');
        app.setTargetMealSlot(autoMealSlot());
        app.setIsAddFoodOpen(true);
        break;
      case 'activity':
        app.setActiveTab('today');
        app.setIsLogActivityOpen(true);
        break;
      case 'water':
        app.setActiveTab('today');
        app.setIsWaterOpen(true);
        break;
      case 'poop':
        app.setActiveTab('today');
        app.setIsPoopOpen(true);
        break;
      case 'weight':
        app.setActiveTab('today');
        app.setIsWeightOpen(true);
        break;
      case 'overview':
        app.setActiveTab('today');
        window.setTimeout(
          () => window.dispatchEvent(new CustomEvent('kc:inspect-day', { detail: todayKey })),
          160,
        );
        break;
      case 'custom':
        app.setActiveTab('prebuilt');
        break;
      case 'tracker': {
        // The widget's custom button does what the Today dock's custom button does.
        app.setActiveTab('today');
        const buttons = app.settings.customButtons;
        if (buttons.length === 1) app.setCustomButtonOpenId(buttons[0].id);
        else app.setIsCustomPickerOpen(true);
        break;
      }
      case 'notifications':
        // The tour's Notifications step: Settings with its Notifications group expanded.
        app.setActiveTab('today');
        app.setIsSettingsOpen(true);
        requestOpenNotificationSettings();
        break;
      case 'period':
        app.setActiveTab('period');
        break;
      case 'statistics':
        app.setActiveTab('history');
        break;
      case 'profile':
        app.setActiveTab('today');
        app.setIsProfileOpen(true);
        break;
      case 'settings':
        app.setActiveTab('today');
        app.setIsSettingsOpen(true);
        break;
    }
  };

  // Reminder notifications (Settings > Notifications): schedule them, and open the matching screen on a tap.
  useNotificationScheduler((screen) => showScreenRef.current(screen));

  const actionRef = useRef<(action: WidgetAction) => void>(() => {});
  actionRef.current = (action) => showScreenRef.current(ACTION_SCREEN[action]);

  useEffect(() => {
    if (!isAndroidApp() || window.parent !== window) return;
    let active = true;
    const take = async () => {
      if (!active) return;
      const { action } = await JournalDevice.takeWidgetAction();
      if (active && isWidgetAction(action)) actionRef.current(action);
    };
    // Subscribe before taking the cold-start action so a warm launch cannot be missed.
    const listener = JournalDevice.addListener('widgetActionAvailable', () => { void take(); });
    void listener.then(take).catch(() => console.warn('Widget action bridge unavailable'));
    return () => { active = false; void listener.then((handle) => handle.remove()); };
  }, []);

  useEffect(() => {
    if (!isAndroidApp() || window.parent !== window) return;
    const days: Record<string, NutritionValues> = {};
    for (const date of widgetDates(today, app.allDayLogs)) {
      days[date] = nutritionValues(makeWidgetSnapshot(date, app.language, app.allDayLogs[date], app.userProfile));
    }
    const payload = {
      language: app.language,
      bmr: calculateBMR(app.userProfile),
      widgetStyle: app.settings.widgetStyle,
      themeStyle: app.settings.themeStyle,
      monoHue: app.settings.monoHue,
      widgetCustomButton: app.settings.widgetCustomButton && app.settings.customButtons.length > 0,
      days,
    };
    // Edits to older days produce the same payload: nothing to publish then.
    const key = JSON.stringify(payload);
    if (key === lastPublished.current) return;
    // The widgets are not part of the first screen: publish once the app is idle (and only the latest change).
    return whenIdle(() => {
      lastPublished.current = key;
      void JournalDevice.publishNutrition(payload).catch(() => console.warn('Native widget refresh unavailable'));
    });
  }, [today, app.allDayLogs, app.language, app.userProfile, app.settings.widgetStyle, app.settings.themeStyle, app.settings.monoHue, app.settings.widgetCustomButton, app.settings.customButtons]);

  useEffect(() => {
    if (window.parent === window) return;
    const post = (message: object) => window.parent.postMessage(message, targetOrigin());
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent ||
          (window.location.origin !== 'null' && event.origin !== window.location.origin) ||
          !isWidgetRequest(event.data)) return;
      if (event.data.type === 'request-snapshot') {
        post({ channel: WIDGET_CHANNEL, type: 'snapshot', snapshot: snapshotRef.current });
      } else if (event.data.type === 'show-screen') {
        showScreenRef.current(event.data.screen);
      } else {
        actionRef.current(event.data.action);
      }
    };
    window.addEventListener('message', receive);
    // Announce readiness only after listening, so the parent never sends a command too early.
    post({ channel: WIDGET_CHANNEL, type: 'ready' });
    post({ channel: WIDGET_CHANNEL, type: 'snapshot', snapshot: snapshotRef.current });
    return () => window.removeEventListener('message', receive);
  }, []);

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage({ channel: WIDGET_CHANNEL, type: 'snapshot', snapshot }, targetOrigin());
  }, [snapshot, app.settings.theme, app.settings.themeStyle, app.settings.monoHue, app.settings.widgetStyle, app.settings.widgetCustomButton, app.settings.customButtons]);

  return null;
}

function MainContent() {
  const { activeTab, setActiveTab, returnFromDatabase } = useNav();
  const {
    settings,
    isAddFoodOpen, isLogActivityOpen, isBarcodeOpen, isProfileOpen, isSettingsOpen,
    isWaterOpen, isPoopOpen, isWeightOpen, isCustomFoodOpen, customButtonOpenId,
    isCustomPickerOpen, isPeriodSheetOpen,
  } = useShell();

  const anyModal = isAddFoodOpen || isLogActivityOpen || isBarcodeOpen || isProfileOpen ||
    isSettingsOpen || isWaterOpen || isPoopOpen || isWeightOpen || isCustomFoodOpen ||
    isCustomPickerOpen || isPeriodSheetOpen || customButtonOpenId !== null;
  const hasDock = activeTab === 'today' || activeTab === 'prebuilt' || activeTab === 'period' || activeTab === 'body';
  const periodShown = isPeriodShown(settings.hidePeriod);
  // Settings > Advanced > Body measurements: the Body page exists only while the option is on.
  const bodyShown = useAdvanced().body.enabled;
  useEffect(() => {
    if (!bodyShown && activeTab === 'body') setActiveTab('today');
  }, [bodyShown, activeTab, setActiveTab]);
  // A page that Settings hides while it is open goes back to Today.
  useEffect(() => {
    if (isPageHiddenBySettings(activeTab, settings)) setActiveTab('today');
  }, [activeTab, settings, setActiveTab]);

  // The scroll reset of a page CHANGE lives in PageSwiper (swipe: same commit; tap: after the first frame, so it is
  // no forced layout of the new page). Only the first screen needs it here.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Download the optional screens in the background once the first screen is done (item 2).
  useEffect(() => whenIdle(preloadOptionalScreens), []);

  // Settings > Pages hides Custom and Statistics (Period and Body have their own switches above).
  const visibleTabs = MAIN_TABS.filter(
    (tab) => (tab !== 'period' || periodShown) && (tab !== 'body' || bodyShown) && !isPageHiddenBySettings(tab, settings),
  );
  // The page elements are memoised: `useShell()` changes whenever ANY dialog opens, which re-renders MainContent and
  // PageSwiper; with a fresh element per render React would re-render both whole pages for it. With these stable
  // elements (they depend only on the two optional pages, never on the active tab) it skips them. The dock of a page
  // decides by itself whether it is shown (`ActionDock activeOn`, read from NavContext), so a tab change re-renders
  // only the bar, the header and the page switch, never a page.
  const pageElements = useMemo(() => {
    const page = (tab: ActiveTab) => {
      switch (tab) {
        case 'today': return <TodayView />;
        case 'prebuilt': return <PreBuiltMealsView />;
        case 'period': return periodShown ? <PeriodView /> : null;
        case 'database': return <FoodDatabaseView />;
        case 'body': return bodyShown ? <BodyView /> : null;
        case 'history': return <HistoryView />;
        default: return null;
      }
    };
    const elements = new Map<ActiveTab, ReactElement>();
    for (const tab of ['today', 'prebuilt', 'period', 'database', 'body', 'history'] as ActiveTab[]) {
      elements.set(tab, <Suspense fallback={null}>{page(tab)}</Suspense>);
    }
    return elements;
  }, [periodShown, bodyShown]);
  const renderMainTab = useCallback((tab: ActiveTab) => pageElements.get(tab) ?? null, [pageElements]);

  // A single history guard lets browser/Android Back dismiss the actual top dialog,
  // including dialogs opened locally in Meals or the food catalog.
  const navigation = useRef({ activeTab, setActiveTab, returnFromDatabase });
  navigation.current = { activeTab, setActiveTab, returnFromDatabase };
  const hasGuard = useRef(Boolean(window.history.state?.kcGuard));
  const armGuard = () => {
    if (isAndroidApp() || hasGuard.current) return;
    try {
      window.history.pushState({ kcGuard: true }, '');
      hasGuard.current = true;
    } catch { /* history may be unavailable in a restricted webview */ }
  };
  const needsGuard = anyModal || activeTab !== 'today';
  useEffect(() => {
    if (needsGuard) armGuard();
  }, [needsGuard]);
  useEffect(() => {
    if (isAndroidApp()) {
      let active = true;
      const listener = AndroidApp.addListener('backButton', () => {
        if (!active || closeTopModal()) return;
        if (!document.dispatchEvent(new Event('kc:back-popover', { cancelable: true }))) return;
        const nav = navigation.current;
        if (nav.activeTab === 'database') nav.returnFromDatabase();
        else if (nav.activeTab !== 'today') nav.setActiveTab('today');
        else void AndroidApp.minimizeApp();
      });
      return () => { active = false; void listener.then((handle) => handle.remove()); };
    }
    const onPop = () => {
      hasGuard.current = Boolean(window.history.state?.kcGuard);
      const nav = navigation.current;
      const openCount = getOpenModalCount();
      if (openCount && closeTopModal()) {
        if (openCount > 1 || nav.activeTab !== 'today') armGuard();
      } else if (!document.dispatchEvent(new Event('kc:back-popover', { cancelable: true }))) {
        if (nav.activeTab !== 'today') armGuard();
      } else if (nav.activeTab === 'database') {
        nav.returnFromDatabase();
        armGuard();
      } else if (nav.activeTab !== 'today') {
        nav.setActiveTab('today');
      }
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('kc:overlay-open', armGuard);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('kc:overlay-open', armGuard);
    };
  }, []);

  return (
    <div data-journal-root data-active-tab={activeTab} className="min-h-dvh bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <WidgetAppBridge />
      <StorageNotice />
      <Header />
      <main data-journal-surface className="flex-1 min-w-0">
        <div className={`journal-main-container w-full max-w-4xl mx-auto px-3.5 sm:px-6 pt-3 sm:pt-4 ${hasDock ? 'pb-[calc(7rem+env(safe-area-inset-bottom))]' : 'pb-8'}`}>
          {DEMO_MODE && <p className="journal-mobile-demo">Test mode / sample journal</p>}
          <PageSwiper
            tabs={visibleTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            disabled={anyModal}
            onSwipeBack={returnFromDatabase}
            renderTab={renderMainTab}
          />
        </div>
      </main>
      {activeTab === 'today' && <QuickAddBar />}
      {isAddFoodOpen && <AddFoodModal />}
      <Suspense fallback={null}>
        {isLogActivityOpen && <LogActivityModal />}
        {isBarcodeOpen && <BarcodeLookupModal />}
        {isProfileOpen && <UserProfileModal />}
        {isSettingsOpen && <SettingsModal />}
        {isPeriodSheetOpen && <PeriodSheet />}
      </Suspense>
      {isWaterOpen && <WaterModal />}
      {isPoopOpen && <PoopModal />}
      {isWeightOpen && <WeightModal />}
      {isCustomFoodOpen && <CustomFoodModal />}
      {customButtonOpenId && <CustomButtonModal key={customButtonOpenId} />}
      {isCustomPickerOpen && <CustomPickerModal />}
      <PageUndoRemoval />
    </div>
  );
}

/** Decided once per page load, so a re-render can never replay the intro. */
let introPending: boolean | null = null;

export function App() {
  const view = new URLSearchParams(window.location.search).get('view');
  // Normal (installed) mode: an installed PWA, an iOS Home Screen app and the Android bundle
  // always open the journal itself — never the marketing/guided-tour page, even with ?view=tour.
  // The guided tour is opt-in (?view=tour) and lazy-loaded.
  const installed = isStandaloneApp() || import.meta.env.VITE_ANDROID_RELEASE === 'true' ||
    window.location.protocol === 'capacitor:' || isAndroidApp();
  // Item 8: the journal is the main destination for everyone; the guided tour is opt-in with ?view=tour.
  const showJournal = installed || view !== 'tour' || DEMO_MODE || startedWithPlanLink;
  // Launch intro (one of six random phase-1 animations); the app mounts underneath it.
  introPending ??= shouldShowIntro();
  const [introVisible, setIntroVisible] = useState(introPending);
  const endIntro = useCallback(() => setIntroVisible(false), []);
  // The intro ends the moment the app is ready (first screen committed, fonts loaded, first frames painted).
  const appReady = useAppReady();
  const intro = introVisible && <IntroSplash ready={appReady} onDone={endIntro} />;
  // The logo painted by index.html fades away once the app (and the intro over it) is mounted.
  useEffect(() => { dismissBootSplash(); }, []);

  if (!showJournal) return <><LazyInstallGuideHost /><Suspense fallback={null}><AppTour /></Suspense>{intro}</>;

  return (
    <>
      <AppProvider>
        <MainContent />
      </AppProvider>
      <LazyInstallGuideHost />
      {intro}
    </>
  );
}

export default App;
