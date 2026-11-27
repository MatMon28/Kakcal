import { useState } from 'react';
import { BookmarkPlus, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useMealSlots } from '../../utils/mealSlots';
import { knownFoodIds } from '../../utils/knownFoods';
import type { LoggedFoodItem, MealSlotId } from '../../types';
import { Modal } from '../common/Modal';
import { journalDate } from './JournalUI';

/**
 * "Add to Meals": turns a meal that was logged (a Today meal or a Meal diary entry) into a saved meal in Custom > Meals.
 * The foods keep the amounts that were eaten. Foods that no longer exist in the database are skipped and counted.
 */
export function SaveAsMeal({
  slot,
  date,
  items,
  variant = 'secondary',
}: {
  slot: MealSlotId;
  date: string;
  items: LoggedFoodItem[];
  variant?: 'secondary' | 'row';
}) {
  const { allFoods, addPreBuiltMeal, language, settings } = useApp();
  const ultraMinimal = variant === 'row' && settings.ultraMinimal;
  const { label } = useMealSlots();
  const j = useJournalText();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [done, setDone] = useState<number | null>(null);
  if (items.length === 0) return null;

  const known = knownFoodIds(allFoods);
  const usable = items.filter((item) => known.has(item.foodId));
  const skipped = items.length - usable.length;
  const defaultName = `${label(slot)} · ${journalDate(date, language, { day: 'numeric', month: 'short' })}`;

  const start = () => {
    setName(defaultName);
    setDone(null);
    setOpen(true);
  };
  const save = () => {
    const merged = new Map<string, number>();
    for (const item of usable) merged.set(item.foodId, (merged.get(item.foodId) ?? 0) + item.amount);
    addPreBuiltMeal({
      name: name.trim() || defaultName,
      ingredients: [...merged].map(([foodId, amount]) => ({ foodId, amount: Math.round(amount * 10) / 10 })),
      slot,
    });
    setDone(merged.size);
  };

  return (
    <>
      <button
        type="button"
        className={variant === 'row' ? 'journal-save-meal-row' : 'journal-secondary-button'}
        onClick={start}
        title={j('Add to Meals', 'Aggiungi ai Pasti')}
        aria-label={j('Add to Meals', 'Aggiungi ai Pasti')}
      >
        <BookmarkPlus size={15} />
        <span className={ultraMinimal ? 'sr-only' : ''}>{j('Add to Meals', 'Aggiungi ai Pasti')}</span>
      </button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={j('Add to Meals', 'Aggiungi ai Pasti')}
        subtitle={j('Save this meal in Custom > Meals to log it again in one tap.', 'Salva questo pasto in Custom > Pasti per registrarlo di nuovo con un tocco.')}
        maxWidth="max-w-md"
      >
        <div className="journal-form">
          {done === null ? (
            <>
              <label>
                {j('Meal name', 'Nome del pasto')}
                <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
              </label>
              <p className="journal-result-count">
                {j(`${usable.length} foods will be saved with their amounts.`, `${usable.length} alimenti saranno salvati con le loro quantità.`)}
                {skipped > 0 && ' ' + j(`${skipped} no longer in the database and skipped.`, `${skipped} non più nel database e ignorati.`)}
              </p>
              <div className="journal-form-actions">
                <button type="button" className="journal-primary-button" disabled={usable.length === 0} onClick={save}>
                  <Check size={16} />
                  {j('Save meal', 'Salva pasto')}
                </button>
              </div>
            </>
          ) : (
            <>
              <p role="status" className="journal-result-count">
                {j(`Saved with ${done} foods. Find it in Custom > Meals.`, `Salvato con ${done} alimenti. Lo trovi in Custom > Pasti.`)}
              </p>
              <div className="journal-form-actions">
                <button type="button" className="journal-primary-button" onClick={() => setOpen(false)}>
                  <Check size={16} />
                  {j('Done', 'Fatto')}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
