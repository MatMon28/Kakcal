import React from 'react';
import { EnergyBalanceCards } from './EnergyBalanceCards';
import { DayNavigator } from './DayNavigator';
import { MacroNutrientsOverview } from './MacroNutrientsOverview';
import { MealSlotCard } from './MealSlotCard';
import { ActivityCardSummary } from './ActivityCardSummary';
import { WaterCard } from './WaterCard';
import { PoopCard } from './PoopCard';
import { CustomButtonsCard } from './CustomButtonsCard';
import { useApp } from '../../context/AppContext';
import { usePersistentState } from '../../utils/usePersistentState';
import { MealSlotId } from '../../types';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

const MEAL_SLOTS: MealSlotId[] = [
  'breakfast',
  'mid_morning',
  'lunch',
  'midday_snack',
  'dinner',
  'extra',
];

export const TodayView: React.FC = () => {
  const { t } = useApp();

  // All meal slots collapsed by default, persisted across tab navigation
  const [openSlots, setOpenSlots] = usePersistentState<MealSlotId[]>('kcak_today_meals_open', []);
  const allOpen = openSlots.length === MEAL_SLOTS.length;

  const toggleSlot = (slot: MealSlotId) => {
    setOpenSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const toggleAll = () => {
    setOpenSlots(allOpen ? [] : [...MEAL_SLOTS]);
  };

  return (
    <div className="space-y-3.5">
      <DayNavigator />
      <EnergyBalanceCards />
      <MacroNutrientsOverview />

      {/* Meal slots header with collapse/expand-all control */}
      <div className="flex items-center justify-end px-1">
        <button
          type="button"
          onClick={toggleAll}
          className="pressable inline-flex items-center gap-1.5 px-2.5 py-1 -my-1 rounded-full text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
        >
          {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
          <span>{allOpen ? t.mealSlots.collapseAll : t.mealSlots.expandAll}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
        {MEAL_SLOTS.map((slotId) => (
          <MealSlotCard
            key={slotId}
            slotId={slotId}
            open={openSlots.includes(slotId)}
            onToggle={() => toggleSlot(slotId)}
          />
        ))}
      </div>

      <ActivityCardSummary />
      <WaterCard />
      <PoopCard />
      <CustomButtonsCard />
    </div>
  );
};
