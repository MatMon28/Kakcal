import { useRef, useState } from 'react';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import type { MealSlotId } from '../../types';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useMealSlots } from '../../utils/mealSlots';
import { MealSlotIcon } from '../common/mealSlotIcon';
import { journalDate } from './JournalUI';

/**
 * Calendar date control of the photo diary pop-ups.
 * - `stack`: a clickable calendar icon with the date below it (photo composer, planner first / last day).
 * - `bar`: a full-width field like the search bar, calendar icon + date + clear button (gallery filter).
 * The real `<input type="date">` is stretched invisibly over the control, so a tap opens the native calendar on
 * phones and `showPicker()` opens it on desktop browsers.
 */
export function JournalDateField({ value, onChange, label, variant = 'stack', emptyLabel = '', onClear, caption, min, max }: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  variant?: 'stack' | 'bar';
  emptyLabel?: string;
  onClear?: () => void;
  /** Small caption above the date (planner: First day / Last day). */
  caption?: string;
  /** Earliest / latest date the calendar accepts (yyyy-mm-dd). */
  min?: string;
  max?: string;
}) {
  const { language } = useApp();
  const j = useJournalText();
  const input = useRef<HTMLInputElement>(null);
  const text = value ? journalDate(value, language, { day: 'numeric', month: 'short', year: 'numeric' }) : emptyLabel;
  return (
    <div className={`journal-date-field is-${variant}`} data-empty={!value || undefined}>
      {caption && <span className="journal-date-caption">{caption}</span>}
      <CalendarDays size={variant === 'stack' ? 24 : 18} aria-hidden="true" />
      <span className="journal-date-text">{text}</span>
      <input
        ref={input}
        type="date"
        required={variant === 'stack'}
        value={value}
        min={min}
        max={max}
        aria-label={label}
        title={label}
        onChange={(event) => onChange(event.target.value)}
        onClick={() => { try { input.current?.showPicker?.(); } catch { /* the native tap already opens it */ } }}
      />
      {onClear && value && (
        <button type="button" className="journal-date-clear" aria-label={j('Clear date', 'Cancella data')} onClick={onClear}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Meal selection of the photo composer: only the chosen meal is shown (no "Meal" caption). Pressing it lists the
 * other meals; picking one closes the list again.
 */
export function JournalMealSelect({ value, onChange }: { value: MealSlotId; onChange: (slot: MealSlotId) => void }) {
  const { options, label } = useMealSlots();
  const j = useJournalText();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="journal-meal-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${j('Meal', 'Pasto')}: ${label(value)}`}
        onClick={() => setOpen((v) => !v)}
      >
        <MealSlotIcon slot={value} size={20} />
        <span>{label(value)}</span>
        <ChevronDown size={15} className={`journal-meal-select-chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="journal-slot-picker journal-meal-options" role="listbox" aria-label={j('Choose a meal', 'Scegli un pasto')}>
          {options.map((meal) => (
            <button
              type="button"
              role="option"
              key={meal.id}
              aria-selected={value === meal.id}
              className={value === meal.id ? 'is-selected' : ''}
              onClick={() => { onChange(meal.id); setOpen(false); }}
            >
              <MealSlotIcon slot={meal.id} size={17} />
              {meal.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
