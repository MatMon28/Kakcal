import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BurnedCard, EnergyBalanceCards, IntakeCard } from './EnergyBalanceCards';
import { DayNavigator } from './DayNavigator';
import { MacroCard, MacroNutrientsOverview, NutrientCard } from './MacroNutrientsOverview';
import { MealSlotCard } from './MealSlotCard';
import { ActivityCardSummary } from './ActivityCardSummary';
import { WaterCard } from './WaterCard';
import { PoopCard } from './PoopCard';
import { CustomButtonsCard } from './CustomButtonsCard';
import { PeriodDayInfoModal } from '../period/PeriodDayInfoModal';
import { EditableGrid, type LayoutItem } from '../layout/EditableGrid';
import { LayoutToolbar } from '../layout/LayoutToolbar';
import { useApp } from '../../context/AppContext';
import { useLayoutText } from '../../i18n/layout';
import { usePersistentState } from '../../utils/usePersistentState';
import { slideIn } from '../../utils/motion';
import { mealItemId, setItemSize, useLayout } from '../../utils/layoutStore';
import { BUILT_IN_MEAL_SLOTS } from '../../utils/mealItems';
import { useMealSlots } from '../../utils/mealSlots';
import { MealSlotId } from '../../types';
import { Columns2, LayoutList, ListTree } from 'lucide-react';

type MealLayout = 'compact' | 'normal' | 'expanded';
type TrackerId = 'activity' | 'water' | 'poop' | 'custom';
const TRACKERS: TrackerId[] = ['activity', 'water', 'poop', 'custom'];

export const TodayView: React.FC = () => {
  const { settings, t, selectedDate } = useApp();
  const layoutState = useLayout();
  const layoutText = useLayoutText();
  const { label: slotLabel } = useMealSlots();
  // Built-in meals followed by the meal types the user added (Settings > Advanced > Advanced layout).
  const MEAL_SLOTS: MealSlotId[] = [...BUILT_IN_MEAL_SLOTS, ...layoutState.mealTypes.map((m) => m.id)];

  // Changing the day slides the day's content sideways (forward in time = from the right).
  const dayPanel = useRef<HTMLDivElement>(null);
  const shownDate = useRef(selectedDate);
  useLayoutEffect(() => {
    if (shownDate.current === selectedDate) return;
    const forward = selectedDate > shownDate.current;
    shownDate.current = selectedDate;
    slideIn(dayPanel.current, forward ? 1 : -1);
  }, [selectedDate]);
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

  // The three layout options replace the redundant Expand all / Collapse all action.
  const layoutSwitch = !ultraMinimal ? (
    <div className="flex flex-wrap items-center justify-center gap-2 px-1">
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
                ? 'bg-[var(--text)] text-[var(--on-text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const mealCard = (slotId: MealSlotId) => {
    const open = displayLayout === 'expanded' || openSlots.includes(slotId);
    const own = layoutState.enabled ? layoutState.pages.today.items[mealItemId(slotId)] : undefined;
    return (
      <MealSlotCard
        slotId={slotId}
        compact={displayLayout === 'compact'}
        ultraMinimal={ultraMinimal}
        open={open}
        onToggle={() => {
          // A meal field that was made smaller goes back to its classic size when its arrow is pressed (a closed one
          // also opens, an open one stays open).
          if (own?.cols || own?.height) {
            setItemSize('today', mealItemId(slotId), { cols: undefined, height: undefined });
            if (open) return;
          }
          toggleSlot(slotId);
        }}
      />
    );
  };

  const trackerCard = (id: TrackerId) => {
    const open = displayLayout === 'expanded' || openTrackers.includes(id);
    const props = { compact: displayLayout === 'compact', open, onToggle: () => toggleTracker(id) };
    const Card =
      id === 'activity' ? ActivityCardSummary : id === 'water' ? WaterCard : id === 'poop' ? PoopCard : CustomButtonsCard;
    return <Card {...props} />;
  };

  // ---- Advanced layout: every block of Today as a field of the editable grid ----
  // Collapsible cards use the meal grid of the original page: 1 column (2 from the md breakpoint) in Normal and
  // Expanded; 2 per row (3 from md, an open card spans the row on phones) in Compact.
  const cardSpan = (open: boolean) =>
    displayLayout === 'compact'
      ? open ? 'col-span-6 md:col-span-2' : 'col-span-3 md:col-span-2'
      : 'col-span-6 md:col-span-3';
  const compact = displayLayout === 'compact';
  const names = layoutText.names;
  const items: LayoutItem[] = [
    { id: 'intake', label: names.intake, node: <IntakeCard compact={compact} />, span: 'col-span-3' },
    { id: 'burned', label: names.burned, node: <BurnedCard compact={compact} />, span: 'col-span-3' },
    { id: 'carbs', label: t.macros.carbs, node: <MacroCard macro="carbs" />, span: 'col-span-2' },
    { id: 'protein', label: t.macros.protein, node: <MacroCard macro="protein" />, span: 'col-span-2' },
    { id: 'fat', label: t.macros.fat, node: <MacroCard macro="fat" />, span: 'col-span-2' },
    // Fibre, salt and sugar are three fields of their own (3 per row, 2 per row while sugar is not tracked).
    ...(['fiber', 'salt', 'sugar'] as const).map((id): LayoutItem => ({
      id,
      label: t.macros[id],
      node: <NutrientCard nutrient={id} />,
      span: settings.trackSugar ? 'col-span-2' : 'col-span-3',
      show: id !== 'sugar' || settings.trackSugar,
    })),
    { id: 'layoutSwitch', label: names.layoutSwitch, node: layoutSwitch, span: 'col-span-6', fixed: true, show: !ultraMinimal },
    ...MEAL_SLOTS.map((slotId): LayoutItem => ({
      id: mealItemId(slotId),
      label: slotLabel(slotId),
      node: mealCard(slotId),
      span: cardSpan(displayLayout === 'expanded' || openSlots.includes(slotId)),
      selfStart: true,
      // Smallest meal field: icon, expand arrow and + stay visible (meal name and numbers may be cut off).
      minCols: compact ? 2 : 3,
      minHeight: compact ? 52 : 56,
    })),
    ...TRACKERS.map((id): LayoutItem => ({
      id: `tracker:${id}`,
      label: id === 'activity' ? names.activity : id === 'water' ? names.water : id === 'poop' ? names.poop : names.custom,
      node: trackerCard(id),
      span: cardSpan(displayLayout === 'expanded' || openTrackers.includes(id)),
      selfStart: true,
      show: id !== 'poop' || !settings.hidePoop,
    })),
  ];

  return (
    <>
      <div className={ultraMinimal ? 'space-y-2.5' : 'space-y-3.5'}>
        {/* Settings > Advanced > Advanced layout: the pencil icon (and, while editing, the toolbar). */}
        <LayoutToolbar page="today" items={items} extra="meal" />
        <DayNavigator onInspectDay={setInspectedDay} />
        <div ref={dayPanel} className={ultraMinimal ? 'space-y-2.5' : 'space-y-3.5'}>
        {layoutState.enabled ? (
          <>
            {/* Anchor for the guided tour's Meals page. */}
            <div id="today-meals" className="scroll-mt-24" aria-hidden="true" />
            <EditableGrid page="today" items={items} className={ultraMinimal ? 'gap-2.5' : 'gap-3 sm:gap-3.5'} />
          </>
        ) : (
          <>
        <EnergyBalanceCards compact={displayLayout === 'compact'} />
        <MacroNutrientsOverview />

        {/* Anchor for the guided tour's Meals page. */}
        <div id="today-meals" className="scroll-mt-24" aria-hidden="true" />
        {layoutSwitch}

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
                {mealCard(slotId)}
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
            return (
              <div key={id} className={displayLayout === 'compact' && open ? 'col-span-2 md:col-span-1' : undefined}>
                {trackerCard(id)}
              </div>
            );
          })}
        </div>
          </>
        )}
        </div>
      </div>

      <PeriodDayInfoModal date={inspectedDay} onClose={() => setInspectedDay(null)} />
    </>
  );
};
