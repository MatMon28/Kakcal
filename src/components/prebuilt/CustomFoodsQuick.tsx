import React, { useMemo, useState } from 'react';
import { Clock, Star } from 'lucide-react';
import { useJournalData, useSettings } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useAutoMealSlot, useMealSlots } from '../../utils/mealSlots';
import { getDefaultAmount, setLastAmount } from '../../utils/amountMemory';
import { allMealItems } from '../../utils/mealItems';
import { usePersistentState } from '../../utils/usePersistentState';
import type { FoodItem, MealSlotId } from '../../types';
import { QuickLogFoodModal } from '../common/QuickLogFoodModal';
import { FoodResultRow } from '../common/FoodResultRow';
import { JournalChip } from '../journal/JournalUI';

const SHOWN = 5;
const MAX = 20;

/**
 * Custom > Foods: the foods logged most recently and the starred ones, one tap away. Pressing a food opens the same
 * quick-log pop-up as Foods > Add (meal chips, amount, macros). Recipes with a standard portion start from it.
 */
export const CustomFoodsQuick: React.FC = () => {
  const { allFoods, allDayLogs, logFoodItem, rememberFood } = useJournalData();
  const { favoriteFoods, language, settings, t } = useSettings();
  const { options: mealSlots, label: slotLabel } = useMealSlots();
  const autoMealSlot = useAutoMealSlot();
  const j = useJournalText();
  const [tab, setTab] = usePersistentState<'recent' | 'favorites'>('kcak_custom_foods_tab', 'recent');
  const [all, setAll] = useState(false);
  const [food, setFood] = useState<FoodItem | null>(null);
  const [slot, setSlot] = useState<MealSlotId>('lunch');
  const [amount, setAmount] = useState(100);

  const recent = useMemo(() => {
    const byId = new Map(allFoods.map((f) => [f.id, f]));
    const seen = new Set<string>();
    const out: FoodItem[] = [];
    const dates = Object.keys(allDayLogs).sort().reverse();
    for (const date of dates) {
      const items = allMealItems(allDayLogs[date].meals).slice().reverse();
      for (const item of items) {
        if (seen.has(item.foodId)) continue;
        seen.add(item.foodId);
        const found = byId.get(item.foodId);
        if (found) out.push(found);
        if (out.length >= MAX) return out;
      }
    }
    return out;
  }, [allDayLogs, allFoods]);

  const favorites = useMemo(() => {
    const byId = new Map(allFoods.map((f) => [f.id, f]));
    return favoriteFoods.map((id) => byId.get(id)).filter((f): f is FoodItem => Boolean(f)).slice(0, MAX);
  }, [allFoods, favoriteFoods]);

  const list = tab === 'recent' ? recent : favorites;
  const visible = all ? list : list.slice(0, SHOWN);
  const nameOf = (f: FoodItem) => (language === 'it' ? f.name_it : f.name_en || f.name_de);

  return (
    <div data-custom-foods-quick className="space-y-2">
      {/* Same pill selection as the Meal diary's All / Favorites chips (journal.css: .journal-chip). */}
      <div className="journal-chip-row" role="group" aria-label={j('Recent and favourite foods', 'Alimenti recenti e preferiti')} data-no-swipe>
        <JournalChip active={tab === 'recent'} onClick={() => { setTab('recent'); setAll(false); }} title={j('Recent', 'Recenti')} aria-label={j('Recent', 'Recenti')}>
          <Clock size={13} />
          <span className={settings.ultraMinimal ? 'sr-only' : ''}>{j('Recent', 'Recenti')}</span>
        </JournalChip>
        <JournalChip active={tab === 'favorites'} onClick={() => { setTab('favorites'); setAll(false); }} title={j('Favourites', 'Preferiti')} aria-label={j('Favourites', 'Preferiti')}>
          <Star size={13} fill={tab === 'favorites' ? 'currentColor' : 'none'} />
          <span className={settings.ultraMinimal ? 'sr-only' : ''}>{j('Favourites', 'Preferiti')}</span>
        </JournalChip>
      </div>

      {list.length === 0 ? (
        <p className="kc-foods-hint px-1 text-[11px] font-medium">
          {tab === 'recent'
            ? j('Foods you log will show up here.', 'Gli alimenti che registri appariranno qui.')
            : t.favorites.empty}
        </p>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
          {visible.map((f) => (
            <FoodResultRow
              key={f.id}
              food={f}
              favorite
              compact={settings.ultraMinimal}
              onClick={() => {
                setFood(f);
                setSlot(autoMealSlot());
                setAmount(getDefaultAmount(f));
              }}
            />
          ))}
        </div>
      )}
      {list.length > SHOWN && (
        <button type="button" onClick={() => setAll((v) => !v)} className="pressable journal-see-all kc-foods-more w-full py-2 rounded-full text-xs font-extrabold">
          {all ? j('Show fewer', 'Mostra meno') : j(`Show all ${list.length}`, `Mostra tutti (${list.length})`)}
        </button>
      )}

      <QuickLogFoodModal
        food={food}
        title={food ? nameOf(food) : ''}
        onClose={() => setFood(null)}
        mealSlots={mealSlots}
        slot={slot}
        onSlotChange={setSlot}
        amount={amount}
        onAmountChange={setAmount}
        primaryLabel={`${t.foodModal.addBtn} (${slotLabel(slot)})`}
        onConfirm={() => {
          if (!food) return;
          setLastAmount(food.id, amount);
          rememberFood(food);
          logFoodItem(slot, food, amount);
          setFood(null);
        }}
      />
    </div>
  );
};
