import React, { useEffect, useState } from 'react';
import { EnergyBalanceCards } from './EnergyBalanceCards';
import { DayNavigator } from './DayNavigator';
import { MacroNutrientsOverview } from './MacroNutrientsOverview';
import { MealSlotCard } from './MealSlotCard';
import { ActivityCardSummary } from './ActivityCardSummary';
import { WaterCard } from './WaterCard';
import { PoopCard } from './PoopCard';
import { CustomButtonsCard } from './CustomButtonsCard';
import { PeriodDayInfoModal } from '../period/PeriodDayInfoModal';
import { useApp } from '../../context/AppContext';
import { usePersistentState } from '../../utils/usePersistentState';
import { MealSlotId } from '../../types';
import { Columns2, LayoutList, ListTree } from 'lucide-react';

const MEAL_SLOTS: MealSlotId[] = [
  'breakfast',
  'mid_morning',
  'lunch',
  'midday_snack',
  'dinner',
  'extra',
];

type MealLayout = 'compact' | 'normal' | 'expanded';
type TrackerId = 'activity' | 'water' | 'poop' | 'custom';
const TRACKERS: TrackerId[] = ['activity', 'water', 'poop', 'custom'];

export const TodayView: React.FC = () => {
  const { settings, t } = useApp();
  const ultraMinimal = settings.ultraMinimal;
  const [inspectedDay, setInspectedDay] = useState<string | null>(null);

  // The guided tour opens the day overview for today through this event.
  useEffect(() => {
    const onInspect = (event: Event) => {
      const date = (event as CustomEvent<unknown>).detail;
      if (typeof date === 'string') setInspectedDay(date);
    };
    window.addEventListener('kc:inspect-day', onInspect);
    return () => window.removeEventListener('kc:inspect-day', onInspect);
  }, []);

  // Meal expansion and the chosen layout are remembered independently.
  const [openSlots, setOpenSlots] = usePersistentState<MealSlotId[]>('kcak_today_meals_open', []);
  const [layout, setLayout] = usePersistentState<MealLayout>('kcak_today_meal_layout', 'normal');
  const [openTrackers, setOpenTrackers] = usePersistentState<TrackerId[]>('kcak_today_trackers_open', []);
  const displayLayout: MealLayout = ultraMinimal ? 'compact' : layout;
  const toggleTracker = (id: TrackerId) => {
    // In Expanded everything is open; closing one card switches to Normal and keeps the others open.
    if (displayLayout === 'expanded') {
      setLayout('normal');
      setOpenSlots([...MEAL_SLOTS]);
      setOpenTrackers(TRACKERS.filter((x) => x !== id));
      return;
    }
    setOpenTrackers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSlot = (slot: MealSlotId) => {
    if (displayLayout === 'expanded') {
      setLayout('normal');
      setOpenSlots(MEAL_SLOTS.filter((id) => id !== slot));
      setOpenTrackers([...TRACKERS]);
      return;
    }
    setOpenSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const chooseLayout = (next: MealLayout) => {
    // Compact starts as a genuinely compact two-per-row overview. Individual
    // cards can still be opened afterwards for amount editing.
    if (next === 'compact') {
      setOpenSlots([]);
      setOpenTrackers([]);
    }
    setLayout(next);
  };

  const layouts: { id: MealLayout; label: string; icon: React.ReactNode }[] = [
    { id: 'compact', label: t.mealSlots.compact, icon: <Columns2 size={13} /> },
    { id: 'normal', label: t.mealSlots.normal, icon: <LayoutList size={13} /> },
    { id: 'expanded', label: t.mealSlots.expanded, icon: <ListTree size={13} /> },
  ];

  return (
    <>
      <div className={ultraMinimal ? 'space-y-2.5' : 'space-y-3.5'}>
        <DayNavigator onInspectDay={setInspectedDay} />
        <EnergyBalanceCards compact={displayLayout === 'compact'} />
        <MacroNutrientsOverview />

        {/* Anchor for the guided tour's Meals page. */}
        <div id="today-meals" className="scroll-mt-24" aria-hidden="true" />
        {/* The three layout options replace the redundant Expand all / Collapse all action. */}
        {!ultraMinimal && <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div
            role="group"
            aria-label={t.mealSlots.layout}
            className="inline-flex items-center gap-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] p-1"
          >
            {layouts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseLayout(item.id)}
                aria-label={item.label}
                aria-pressed={layout === item.id}
                title={item.label}
                className={`pressable inline-flex min-h-7 items-center justify-center gap-1 rounded-full px-2.5 text-[11px] font-extrabold ${
                  layout === item.id
                    ? 'bg-[var(--text)] text-[var(--surface)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

        </div>}

        <div
          className={`grid items-start ${
            displayLayout === 'compact'
              ? 'grid-cols-2 gap-2.5 md:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2 gap-3.5'
          }`}
        >
          {MEAL_SLOTS.map((slotId) => {
            const open = displayLayout === 'expanded' || openSlots.includes(slotId);
            return (
              <div
                key={slotId}
                className={displayLayout === 'compact' && open ? 'col-span-2 md:col-span-1' : undefined}
              >
                <MealSlotCard
                  slotId={slotId}
                  compact={displayLayout === 'compact'}
                  ultraMinimal={ultraMinimal}
                  open={open}
                  onToggle={() => toggleSlot(slotId)}
                />
              </div>
            );
          })}
        </div>

        {/* Tracker cards share the meal-card expand/collapse behaviour: collapsed = one summary line, expanded = full list.
            Compact puts them in the same two-column grid (an open card spans both columns). */}
        <div
          className={`grid items-start ${
            displayLayout === 'compact' ? 'grid-cols-2 gap-2.5 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 gap-3.5'
          }`}
        >
          {TRACKERS.map((id) => {
            const open = displayLayout === 'expanded' || openTrackers.includes(id);
            const props = { compact: displayLayout === 'compact', open, onToggle: () => toggleTracker(id) };
            const Card =
              id === 'activity' ? ActivityCardSummary : id === 'water' ? WaterCard : id === 'poop' ? PoopCard : CustomButtonsCard;
            return (
              <div key={id} className={displayLayout === 'compact' && open ? 'col-span-2 md:col-span-1' : undefined}>
                <Card {...props} />
              </div>
            );
          })}
        </div>
      </div>

      <PeriodDayInfoModal date={inspectedDay} onClose={() => setInspectedDay(null)} />
    </>
  );
};
