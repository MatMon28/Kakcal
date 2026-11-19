import { useEffect, useMemo, useRef, useState } from 'react';
import { App as AndroidApp } from '@capacitor/app';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { closeTopModal, getOpenModalCount } from './components/common/Modal';
import { TodayView } from './components/dashboard/TodayView';
import { PreBuiltMealsView } from './components/prebuilt/PreBuiltMealsView';
import { PeriodView } from './components/period/PeriodView';
import { FoodDatabaseView } from './components/database/FoodDatabaseView';
import { HistoryView } from './components/history/HistoryView';
import { AddFoodModal } from './components/modals/AddFoodModal';
import { LogActivityModal } from './components/modals/LogActivityModal';
import { BarcodeLookupModal } from './components/modals/BarcodeLookupModal';
import { UserProfileModal } from './components/modals/UserProfileModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { WaterModal } from './components/modals/WaterModal';
import { WeightModal } from './components/modals/WeightModal';
import { PoopModal } from './components/modals/PoopModal';
import { CustomFoodModal } from './components/modals/CustomFoodModal';
import { CustomButtonModal } from './components/modals/CustomButtonModal';
import { CustomPickerModal } from './components/modals/CustomPickerModal';
import { PeriodSheet } from './components/modals/PeriodSheet';
import { QuickAddBar } from './components/dashboard/QuickAddBar';
import { AppTour } from './components/tour/AppTour';
import { PageSwiper } from './components/common/PageSwiper';
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
import { addDaysToDateString, getTodayDateString } from './utils/formatters';
import { isAndroidApp, JournalDevice } from './utils/android';
import { isPeriodShown } from './utils/tourPreview';
import { calculateBMR } from './utils/calculations';
import type { ActiveTab } from './types';

const MAIN_TABS: ActiveTab[] = ['today', 'prebuilt', 'period', 'history'];

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
  const app = useApp();
  const [today, setToday] = useState(getTodayDateString);
  const snapshot = useMemo(
    () => makeWidgetSnapshot(today, app.language, app.allDayLogs[today], app.userProfile),
    [today, app.language, app.allDayLogs, app.userProfile],
  );
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
    const earliest = addDaysToDateString(today, -1);
    // Today is always published, even with no entries. Yesterday covers timezone changes,
    // and recorded future dates keep offline rollover correct.
    for (const date of new Set([today, ...Object.keys(app.allDayLogs)])) {
      if (date < earliest) continue;
      days[date] = nutritionValues(makeWidgetSnapshot(date, app.language, app.allDayLogs[date], app.userProfile));
    }
    void JournalDevice.publishNutrition({
      language: app.language,
      bmr: calculateBMR(app.userProfile),
      widgetStyle: app.settings.widgetStyle,
      widgetCustomButton: app.settings.widgetCustomButton && app.settings.customButtons.length > 0,
      days,
    }).catch(() => console.warn('Native widget refresh unavailable'));
  }, [today, app.allDayLogs, app.language, app.userProfile, app.settings.widgetStyle, app.settings.widgetCustomButton, app.settings.customButtons]);

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
  }, [snapshot]);

  useEffect(() => {
    const updateDate = () => setToday(getTodayDateString());
    const interval = window.setInterval(updateDate, 60_000);
    window.addEventListener('focus', updateDate);
    document.addEventListener('visibilitychange', updateDate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', updateDate);
      document.removeEventListener('visibilitychange', updateDate);
    };
  }, []);

  return null;
}

function MainContent() {
  const {
    activeTab, setActiveTab, returnFromDatabase, settings,
    isAddFoodOpen, isLogActivityOpen, isBarcodeOpen, isProfileOpen, isSettingsOpen,
    isWaterOpen, isPoopOpen, isWeightOpen, isCustomFoodOpen, customButtonOpenId,
    isCustomPickerOpen, isPeriodSheetOpen,
  } = useApp();

  const anyModal = isAddFoodOpen || isLogActivityOpen || isBarcodeOpen || isProfileOpen ||
    isSettingsOpen || isWaterOpen || isPoopOpen || isWeightOpen || isCustomFoodOpen ||
    isCustomPickerOpen || isPeriodSheetOpen || customButtonOpenId !== null;
  const hasDock = activeTab === 'today' || activeTab === 'prebuilt' || activeTab === 'period';
  const periodShown = isPeriodShown(settings.hidePeriod);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const visibleTabs = MAIN_TABS.filter((tab) => tab !== 'period' || periodShown);
  const renderMainTab = (tab: ActiveTab) => {
    switch (tab) {
      case 'today': return <TodayView />;
      case 'prebuilt': return <PreBuiltMealsView hideDock={anyModal} />;
      case 'period': return periodShown ? <PeriodView hideDock={anyModal} /> : null;
      case 'database': return <FoodDatabaseView />;
      case 'history': return <HistoryView />;
      default: return null;
    }
  };

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
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <WidgetAppBridge />
      <Header />
      <main
        className={`flex-1 w-full max-w-4xl mx-auto px-3.5 sm:px-6 pt-3 sm:pt-4 ${hasDock ? 'pb-[calc(7rem+env(safe-area-inset-bottom))]' : 'pb-8'}`}
      >
        <PageSwiper
          tabs={visibleTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          disabled={anyModal}
          onSwipeBack={returnFromDatabase}
          renderTab={renderMainTab}
        />
      </main>
      {activeTab === 'today' && !anyModal && <QuickAddBar />}
      {isAddFoodOpen && <AddFoodModal />}
      {isLogActivityOpen && <LogActivityModal />}
      {isBarcodeOpen && <BarcodeLookupModal />}
      {isProfileOpen && <UserProfileModal />}
      {isSettingsOpen && <SettingsModal />}
      {isWaterOpen && <WaterModal />}
      {isPoopOpen && <PoopModal />}
      {isWeightOpen && <WeightModal />}
      {isCustomFoodOpen && <CustomFoodModal />}
      {customButtonOpenId && <CustomButtonModal key={customButtonOpenId} />}
      {isCustomPickerOpen && <CustomPickerModal />}
      {isPeriodSheetOpen && <PeriodSheet />}
    </div>
  );
}

export function App() {
  const view = new URLSearchParams(window.location.search).get('view');
  // The journal is the default inside the Android bundle and when ?view=app is given.
  // Everywhere else the guided tour is shown, and it embeds the journal itself.
  const showJournal = import.meta.env.VITE_ANDROID_RELEASE === 'true' || view === 'app' ||
    (view !== 'tour' && (window.location.protocol === 'capacitor:' || isAndroidApp()));

  if (!showJournal) return <AppTour />;

  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
