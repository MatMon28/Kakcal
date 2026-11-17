import React, { useState } from 'react';
import { EnergyBalanceCards } from './EnergyBalanceCards';
import { DayNavigator } from './DayNavigator';
import { MacroNutrientsOverview } from './MacroNutrientsOverview';
import { MealSlotCard } from './MealSlotCard';
import { ActivityCardSummary } from './ActivityCardSummary';
import { WaterCard } from './WaterCard';
import { PoopCard } from './PoopCard';
import { CustomButtonsCard } from './CustomButtonsCard';
import { useApp } from '../../context/AppContext';
import { MealSlotId } from '../../types';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

export const TodayView: React.FC = () => {
  const { t } = useApp();
  const mealSlots: MealSlotId[] = [
    'breakfast',
    'mid_morning',
    'lunch',
    'midday_snack',
    'dinner',
    'extra',
  ];

  // All meal slots collapsed by default
  const [openSlots, setOpenSlots] = useState<Set<MealSlotId>>(new Set());
  const allOpen = openSlots.size === mealSlots.length;

  const toggleSlot = (slot: MealSlotId) => {
    setOpenSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  };

  const toggleAll = () => {
    setOpenSlots(allOpen ? new Set() : new Set(mealSlots));
  };

  return (
    <div className="space-y-3.5 pb-28">
      <DayNavigator />
      <EnergyBalanceCards />
      <MacroNutrientsOverview />

      {/* Meal slots header with collapse-all control */}
      <div className="flex items-center justify-end px-1">
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
          <span>{allOpen ? t.mealSlots.collapseAll : t.mealSlots.expandAll}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {mealSlots.map((slotId) => (
          <MealSlotCard
            key={slotId}
            slotId={slotId}
            open={openSlots.has(slotId)}
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
