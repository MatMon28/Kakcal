import { useEffect, useRef, type TouchEvent } from 'react';
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
import type { ActiveTab } from './types';

const MAIN_TABS: ActiveTab[] = ['today', 'prebuilt', 'period', 'history'];

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    touch.current = null;
    if (anyModal || getOpenModalCount() || e.touches.length !== 1) return;
    if ((e.target as Element).closest('.no-scrollbar, input, textarea, select, [data-no-swipe]')) return;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    const end = e.changedTouches[0];
    if (!start || !end || anyModal || getOpenModalCount()) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.45) return;
    if (activeTab === 'database') {
      if (dx > 0) returnFromDatabase();
      return;
    }
    const visibleTabs = MAIN_TABS.filter((tab) => tab !== 'period' || !settings.hidePeriod);
    const index = visibleTabs.indexOf(activeTab);
    const nextTab = visibleTabs[index + (dx < 0 ? 1 : -1)];
    if (index >= 0 && nextTab) setActiveTab(nextTab);
  };

  // A single history guard lets browser/Android Back dismiss the actual top dialog,
  // including dialogs opened locally in Meals or the food catalog.
  const navigation = useRef({ activeTab, setActiveTab, returnFromDatabase });
  navigation.current = { activeTab, setActiveTab, returnFromDatabase };
  const hasGuard = useRef(Boolean(window.history.state?.kcGuard));
  const armGuard = () => {
    if (hasGuard.current) return;
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
    const onPop = () => {
      hasGuard.current = Boolean(window.history.state?.kcGuard);
      const nav = navigation.current;
      const openCount = getOpenModalCount();
      if (openCount && closeTopModal()) {
        if (openCount > 1 || nav.activeTab !== 'today') armGuard();
      } else if (nav.activeTab === 'database') {
        nav.returnFromDatabase();
        armGuard();
      } else if (nav.activeTab !== 'today') {
        nav.setActiveTab('today');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans">
      <Header />
      <main
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => { touch.current = null; }}
        className={`flex-1 w-full max-w-4xl mx-auto px-3.5 sm:px-6 pt-3 sm:pt-4 ${hasDock ? 'pb-[calc(7rem+env(safe-area-inset-bottom))]' : 'pb-8'}`}
      >
        <div key={activeTab} className="anim-page">
          {activeTab === 'today' && <TodayView />}
          {activeTab === 'prebuilt' && <PreBuiltMealsView hideDock={anyModal} />}
          {activeTab === 'period' && !settings.hidePeriod && <PeriodView hideDock={anyModal} />}
          {activeTab === 'database' && <FoodDatabaseView />}
          {activeTab === 'history' && <HistoryView />}
        </div>
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
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
