import React, { useState } from 'react';
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
import { ChevronsDownUp, ChevronsUpDown, Columns2, LayoutList, ListTree } from 'lucide-react';

const MEAL_SLOTS: MealSlotId[] = [
  'breakfast',
  'mid_morning',
  'lunch',
  'midday_snack',
  'dinner',
  'extra',
];

type MealLayout = 'compact' | 'normal' | 'expanded';

export const TodayView: React.FC = () => {
  const { t } = useApp();
  const [inspectedDay, setInspectedDay] = useState<string | null>(null);

  // Meal expansion and the chosen layout are remembered independently.
  const [openSlots, setOpenSlots] = usePersistentState<MealSlotId[]>('kcak_today_meals_open', []);
  const [layout, setLayout] = usePersistentState<MealLayout>('kcak_today_meal_layout', 'normal');
  const allOpen = layout === 'expanded' || openSlots.length === MEAL_SLOTS.length;

  const toggleSlot = (slot: MealSlotId) => {
    if (layout === 'expanded') {
      setLayout('normal');
      setOpenSlots(MEAL_SLOTS.filter((id) => id !== slot));
      return;
    }
    setOpenSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const toggleAll = () => {
    if (allOpen) {
      setLayout('normal');
      setOpenSlots([]);
    } else {
      setLayout('normal');
      setOpenSlots([...MEAL_SLOTS]);
    }
  };

  const chooseLayout = (next: MealLayout) => {
    // Compact starts as a genuinely compact two-per-row overview. Individual
    // cards can still be opened afterwards for amount editing.
    if (next === 'compact') setOpenSlots([]);
    setLayout(next);
  };

  const layouts: { id: MealLayout; label: string; icon: React.ReactNode }[] = [
    { id: 'compact', label: t.mealSlots.compact, icon: <Columns2 size={13} /> },
    { id: 'normal', label: t.mealSlots.normal, icon: <LayoutList size={13} /> },
    { id: 'expanded', label: t.mealSlots.expanded, icon: <ListTree size={13} /> },
  ];

  return (
    <>
      <div className="space-y-3.5">
        <DayNavigator onInspectDay={setInspectedDay} />
        <EnergyBalanceCards />
        <MacroNutrientsOverview />

        {/* Persistent three-way meal layout + existing collapse control */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
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

          {layout !== 'expanded' && (
            <button
              type="button"
              onClick={toggleAll}
              className="pressable inline-flex min-h-8 items-center gap-1.5 px-2.5 rounded-full text-[11px] font-extrabold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
            >
              {allOpen ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
              <span>{allOpen ? t.mealSlots.collapseAll : t.mealSlots.expandAll}</span>
            </button>
          )}
        </div>

        <div
          className={`grid items-start ${
            layout === 'compact'
              ? 'grid-cols-2 gap-2.5 md:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2 gap-3.5'
          }`}
        >
          {MEAL_SLOTS.map((slotId) => {
            const open = layout === 'expanded' || openSlots.includes(slotId);
            return (
              <div
                key={slotId}
                className={layout === 'compact' && open ? 'col-span-2 md:col-span-1' : undefined}
              >
                <MealSlotCard
                  slotId={slotId}
                  compact={layout === 'compact'}
                  open={open}
                  onToggle={() => toggleSlot(slotId)}
                />
              </div>
            );
          })}
        </div>

        {/* Compact layout also compacts the tracker cards into a two-column grid */}
        {layout === 'compact' ? (
          <div className="grid grid-cols-2 gap-2.5 items-start">
            <ActivityCardSummary compact />
            <WaterCard compact />
            <PoopCard compact />
            <CustomButtonsCard compact />
          </div>
        ) : (
          <>
            <ActivityCardSummary />
            <WaterCard />
            <PoopCard />
            <CustomButtonsCard />
          </>
        )}
      </div>

      <PeriodDayInfoModal date={inspectedDay} onClose={() => setInspectedDay(null)} />
    </>
  );
};
