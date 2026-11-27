export interface MealSlotOption<T extends string = string> {
  id: T;
  label: string;
}

const TONE_CLASSES = {
  intake: 'bg-intake text-intake-ink border-intake-border',
  protein: 'bg-protein text-protein-ink border-protein-border',
  fat: 'bg-fat text-fat-ink border-fat-border',
  carbs: 'bg-carbs text-carbs-ink border-carbs-border',
} as const;

interface MealSlotPickerProps<T extends string = string> {
  slots: ReadonlyArray<MealSlotOption<T>>;
  value: T;
  onChange: (slot: T) => void;
  layout?: 'grid' | 'scroll';
  tone?: keyof typeof TONE_CLASSES;
  className?: string;
}

/** Shared meal-slot selector with consistent `data-slot-chip` hooks and `.pressable` spring feedback. */
export function MealSlotPicker<T extends string = string>({
  slots,
  value,
  onChange,
  layout = 'grid',
  tone = 'intake',
  className = '',
}: MealSlotPickerProps<T>) {
  const activeTone = TONE_CLASSES[tone];
  const inactiveTone = 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]';

  if (layout === 'scroll') {
    return (
      <div className={`flex gap-1.5 overflow-x-auto no-scrollbar pb-1 ${className}`}>
        {slots.map((slot) => {
          const active = slot.id === value;
          return (
            <button
              key={slot.id}
              type="button"
              data-slot-chip={active ? 'active' : 'idle'}
              aria-pressed={active}
              onClick={() => onChange(slot.id)}
              className={`pressable px-3.5 py-2 rounded-full text-xs font-bold shrink-0 border transition-colors ${
                active ? activeTone : inactiveTone
              }`}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-3 gap-1.5 ${className}`}>
      {slots.map((slot) => {
        const active = slot.id === value;
        return (
          <button
            key={slot.id}
            type="button"
            data-slot-chip={active ? 'active' : 'idle'}
            aria-pressed={active}
            onClick={() => onChange(slot.id)}
            className={`pressable py-2 px-1.5 text-center text-xs font-bold rounded-xl border truncate transition-colors ${
              active ? activeTone : inactiveTone
            }`}
          >
            {slot.label}
          </button>
        );
      })}
    </div>
  );
}
