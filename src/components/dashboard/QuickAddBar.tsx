import React from 'react';
import { useApp } from '../../context/AppContext';
import { UtensilsCrossed, Footprints, Droplets, Scale, Sparkles, Droplet, Pill, Check } from 'lucide-react';
import { PoopIcon } from '../common/PoopIcon';
import { isInactivePackDay } from '../../utils/period';

/**
 * Floating quick-action dock. Same position/height on every tab;
 * content depends on the active tab (Period tab → Period/Pill buttons).
 */
export const QuickAddBar: React.FC = () => {
  const {
    settings,
    activeTab,
    setCustomButtonOpenId,
    setIsCustomPickerOpen,
    setIsAddFoodOpen,
    setIsLogActivityOpen,
    setIsWaterOpen,
    setIsPoopOpen,
    setIsWeightOpen,
    isAddFoodOpen,
    isLogActivityOpen,
    isBarcodeOpen,
    isProfileOpen,
    isSettingsOpen,
    isWaterOpen,
    isPoopOpen,
    isWeightOpen,
    isCustomFoodOpen,
    isCustomPickerOpen,
    customButtonOpenId,
    isPeriodSheetOpen,
    setIsPeriodSheetOpen,
    periodData,
    periodSelectedDate,
    togglePill,
    updatePeriodDay,
    showToast,
    t,
  } = useApp();

  const anyModalOpen =
    isAddFoodOpen || isLogActivityOpen || isBarcodeOpen || isProfileOpen || isSettingsOpen ||
    isWaterOpen || isPoopOpen || isWeightOpen || isCustomFoodOpen || isCustomPickerOpen ||
    customButtonOpenId !== null || isPeriodSheetOpen;
  if (anyModalOpen) return null;

  type Btn = { key: string; icon: React.ReactNode; cls: string; onClick: () => void; label: string };
  let all: Btn[] = [];

  if (activeTab === 'period' && !settings.hidePeriod) {
    const ps = periodData.settings;
    const date = periodSelectedDate;
    const taken = Boolean(periodData.logs[date]?.pillTaken);
    all.push({
      key: 'period',
      icon: <Droplet size={21} />,
      cls: 'bg-[#F4C6D8] text-[#6E2440]',
      onClick: () => setIsPeriodSheetOpen(true),
      label: t.period.dockPeriod,
    });
    if (ps.trackPill) {
      all.push({
        key: 'pill',
        icon: (
          <span className="relative">
            <Pill size={21} />
            {taken && (
              <span className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 rounded-full bg-[#1E5E3A] text-white flex items-center justify-center">
                <Check size={9} strokeWidth={3} />
              </span>
            )}
          </span>
        ),
        cls: taken ? 'bg-[#C9EFD3] text-[#174A2B]' : 'bg-[#E2D6FF] text-[#4D3582]',
        onClick: () => {
          if (isInactivePackDay(ps, date)) {
            showToast(t.period.toastBreak);
            return;
          }
          const prev = togglePill(date);
          showToast(prev ? t.period.toastPillUnmarked : t.period.toastPillTaken, () =>
            updatePeriodDay(date, { pillTaken: prev })
          );
        },
        label: t.period.dockPill,
      });
    }
  } else {
    const std = [
      { key: 'food', icon: <UtensilsCrossed size={21} />, cls: 'bg-[#C9EFD3] text-[#174A2B]', onClick: () => setIsAddFoodOpen(true), label: t.quickAdd.food, on: settings.quickAdd.food },
      { key: 'movement', icon: <Footprints size={21} />, cls: 'bg-[#E2D6FF] text-[#4D3582]', onClick: () => setIsLogActivityOpen(true), label: t.quickAdd.movement, on: settings.quickAdd.movement },
      { key: 'water', icon: <Droplets size={21} />, cls: 'bg-[#CFE7FE] text-[#183F66]', onClick: () => setIsWaterOpen(true), label: t.quickAdd.water, on: settings.quickAdd.water },
      { key: 'poop', icon: <PoopIcon size={21} />, cls: 'bg-[#FAE0B4] text-[#7D4E14]', onClick: () => setIsPoopOpen(true), label: t.quickAdd.poop, on: settings.quickAdd.poop && !settings.hidePoop },
      { key: 'weight', icon: <Scale size={21} />, cls: 'bg-[#F6D0D0] text-[#7A2727]', onClick: () => setIsWeightOpen(true), label: t.quickAdd.weight, on: settings.quickAdd.weight },
    ];
    all = std.filter((b) => b.on).map(({ on: _on, ...b }) => b);
    if (settings.quickAdd.custom && settings.customButtons.length > 0) {
      all.push({
        key: 'custom',
        icon: <Sparkles size={21} />,
        cls: 'bg-[#E2D6FF] text-[#4D3582]',
        onClick: () =>
          settings.customButtons.length === 1
            ? setCustomButtonOpenId(settings.customButtons[0].id)
            : setIsCustomPickerOpen(true),
        label: settings.customButtons.length === 1 ? settings.customButtons[0].name : t.quickAdd.custom,
      });
    }
  }

  if (all.length === 0) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-30 pointer-events-none flex justify-center px-4">
      <div
        key={activeTab === 'period' ? 'period' : 'std'}
        className="pointer-events-auto bg-[var(--surface)] border border-[var(--border)] rounded-full p-1.5 h-[60px] flex items-center gap-1.5 max-w-full overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-bottom-1 duration-200"
      >
        {all.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={b.onClick}
            title={b.label}
            aria-label={b.label}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 ${b.cls}`}
          >
            {b.icon}
          </button>
        ))}
      </div>
    </div>
  );
};
