import React, { useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
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
import { Toast } from './components/common/Toast';
import { ActiveTab } from './types';

const MainContent: React.FC = () => {
  const ctx = useApp();
  const {
    activeTab,
    setActiveTab,
    settings,
    isAddFoodOpen,
    setIsAddFoodOpen,
    isLogActivityOpen,
    setIsLogActivityOpen,
    isBarcodeOpen,
    setIsBarcodeOpen,
    isProfileOpen,
    setIsProfileOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isWaterOpen,
    setIsWaterOpen,
    isPoopOpen,
    setIsPoopOpen,
    isWeightOpen,
    setIsWeightOpen,
    isCustomFoodOpen,
    setIsCustomFoodOpen,
    customButtonOpenId,
    setCustomButtonOpenId,
    isCustomPickerOpen,
    setIsCustomPickerOpen,
    isPeriodSheetOpen,
    setIsPeriodSheetOpen,
  } = ctx;

  const anyModal =
    isAddFoodOpen || isLogActivityOpen || isBarcodeOpen || isProfileOpen || isSettingsOpen ||
    isWaterOpen || isPoopOpen || isWeightOpen || isCustomFoodOpen || isCustomPickerOpen ||
    isPeriodSheetOpen || customButtonOpenId !== null;

  // ---------------------------------------------------------------
  // Android gestures:
  //  1) horizontal swipe on the page switches tabs
  //  2) hardware/back gesture closes the top layer first
  //     (modal → previous tab → app exit)
  // ---------------------------------------------------------------
  const visibleTabs: ActiveTab[] = (['today', 'prebuilt', 'period', 'history'] as ActiveTab[]).filter(
    (tb) => tb !== 'period' || !settings.hidePeriod
  );

  const touch = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (anyModal || e.touches.length !== 1) return;
    const el = e.target as HTMLElement;
    // don't hijack horizontally scrollable rows (pills, chips, calendars)
    if (el.closest('.no-scrollbar, input, textarea, select, [data-no-swipe]')) return;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const idx = visibleTabs.indexOf(activeTab);
    if (idx < 0) return;
    const next = dx < 0 ? idx + 1 : idx - 1;
    if (next >= 0 && next < visibleTabs.length) setActiveTab(visibleTabs[next]);
  };

  // Android back button / edge-swipe back
  useEffect(() => {
    try {
      window.history.pushState(null, '');
    } catch {
      /* ignore */
    }
    const onPop = () => {
      const stateful =
        isPeriodSheetOpen || isCustomPickerOpen || customButtonOpenId !== null ||
        isCustomFoodOpen || isSettingsOpen || isProfileOpen || isBarcodeOpen ||
        isWeightOpen || isPoopOpen || isWaterOpen || isLogActivityOpen || isAddFoodOpen;
      if (stateful) {
        // close topmost layer (stop at the first match — mirror modal priority)
        if (isPeriodSheetOpen) setIsPeriodSheetOpen(false);
        else if (isCustomPickerOpen) setIsCustomPickerOpen(false);
        else if (customButtonOpenId) setCustomButtonOpenId(null);
        else if (isCustomFoodOpen) setIsCustomFoodOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isProfileOpen) setIsProfileOpen(false);
        else if (isBarcodeOpen) setIsBarcodeOpen(false);
        else if (isWeightOpen) setIsWeightOpen(false);
        else if (isPoopOpen) setIsPoopOpen(false);
        else if (isWaterOpen) setIsWaterOpen(false);
        else if (isLogActivityOpen) setIsLogActivityOpen(false);
        else if (isAddFoodOpen) setIsAddFoodOpen(false);
        window.history.pushState(null, '');
      } else if (activeTab !== 'today') {
        setActiveTab('today');
        window.history.pushState(null, '');
      }
      // else: nothing to unwind — let the next back press leave the app
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPeriodSheetOpen, isCustomPickerOpen, customButtonOpenId, isCustomFoodOpen, isSettingsOpen,
    isProfileOpen, isBarcodeOpen, isWeightOpen, isPoopOpen, isWaterOpen, isLogActivityOpen,
    isAddFoodOpen, activeTab,
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans">
      <Header />

      <main
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex-1 w-full max-w-4xl mx-auto px-3.5 sm:px-6 pt-3 sm:pt-4 pb-16 sm:pb-8"
      >
        {activeTab === 'today' && <TodayView />}
        {activeTab === 'prebuilt' && <PreBuiltMealsView />}
        {activeTab === 'period' && <PeriodView />}
        {activeTab === 'database' && <FoodDatabaseView />}
        {activeTab === 'history' && <HistoryView />}
      </main>

      {isAddFoodOpen && <AddFoodModal />}
      {isLogActivityOpen && <LogActivityModal />}
      {isBarcodeOpen && <BarcodeLookupModal />}
      {isProfileOpen && <UserProfileModal />}
      {isSettingsOpen && <SettingsModal />}
      {isWaterOpen && <WaterModal />}
      {isPoopOpen && <PoopModal />}
      {isWeightOpen && <WeightModal />}
      {isCustomFoodOpen && <CustomFoodModal />}
      {customButtonOpenId && <CustomButtonModal />}
      {isCustomPickerOpen && <CustomPickerModal />}
      {isPeriodSheetOpen && <PeriodSheet />}
      <QuickAddBar />
      <Toast />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
