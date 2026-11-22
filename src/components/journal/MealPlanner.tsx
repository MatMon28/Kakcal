import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useMealSlots } from '../../utils/mealSlots';
import { addDaysToDateString } from '../../utils/formatters';
import {
  journalId,
  plannedLogItems,
  removeMealPlan,
  saveMealPlans,
  updateMealPlan,
  useMealJournal,
} from '../../utils/journalStore';
import type { MealSlotId } from '../../types';
import type { MealPlan, PlannedFood } from '../../types/journal';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { JournalEmpty, JournalSearch, JournalSection, journalDate } from './JournalUI';

export function MealPlanner() {
  const { selectedDate, language } = useApp();
  const { label } = useMealSlots();
  const { plans } = useMealJournal();
  const j = useJournalText();
  const [date, setDate] = useState(selectedDate);
  const [weekStart, setWeekStart] = useState(selectedDate);
  const [editing, setEditing] = useState<MealPlan | 'new' | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDaysToDateString(weekStart, i));
  const dayPlans = plans.filter((p) => p.date === date);
  const weekCount = plans.filter((p) => p.date >= weekStart && p.date <= days[6]).length;
  return (
    <>
      <JournalSection
        tone="blue"
        className="journal-planner"
        title={j('Meal planner', 'Pianifica pasti')}
        subtitle={j('A little planning, a little more balance.', "Un po' di organizzazione, piu equilibrio.")}
        icon={<CalendarDays size={21} />}
        actions={
          <button
            type="button"
            className="journal-icon-button"
            aria-label={j('Plan a meal', 'Pianifica un pasto')}
            title={j('Plan a meal', 'Pianifica un pasto')}
            onClick={() => setEditing('new')}
          >
            <Plus size={19} />
          </button>
        }
      >
        <div className="journal-week-heading">
          <span>
            {journalDate(weekStart, language)} - {journalDate(days[6], language)}
          </span>
          <div>
            <button
              className="journal-icon-button"
              aria-label={j('Previous week', 'Settimana precedente')}
              onClick={() => {
                const d = addDaysToDateString(weekStart, -7);
                setWeekStart(d);
                setDate(d);
              }}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              className="journal-icon-button"
              aria-label={j('Next week', 'Settimana successiva')}
              onClick={() => {
                const d = addDaysToDateString(weekStart, 7);
                setWeekStart(d);
                setDate(d);
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
        <div className="journal-week">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              className={date === day ? 'is-selected' : ''}
              aria-label={journalDate(day, language, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              aria-pressed={date === day}
              onClick={() => setDate(day)}
            >
              <span>{journalDate(day, language, { weekday: 'short' }).slice(0, 1)}</span>
              <strong>{new Date(`${day}T12:00:00`).getDate()}</strong>
              <i data-planned={plans.some((p) => p.date === day)} />
            </button>
          ))}
        </div>
        <div className="journal-plan-list">
          {dayPlans.length === 0 ? (
            <JournalEmpty>
              {j(
                'Your day, your way. Plan just the meals you want.',
                'Pianifica soltanto i pasti che desideri.',
              )}
            </JournalEmpty>
          ) : (
            dayPlans.map((plan) => (
              <button
                type="button"
                className="journal-plan-row"
                key={plan.id}
                onClick={() => setEditing(plan)}
              >
                <span className="journal-plan-row-icon">
                  {plan.kind === 'note' ? <FileText size={16} /> : <Utensils size={16} />}
                </span>
                <span>
                  <small>{label(plan.slot)}</small>
                  <strong>{plan.title}</strong>
                </span>
                {plan.loggedAt ? <Check size={16} /> : <ChevronRight size={16} />}
              </button>
            ))
          )}
        </div>
        <div className="journal-section-footer">
          <span>
            {weekCount} {j('planned this week', 'pasti in programma')}
          </span>
          <button type="button" onClick={() => setEditing('new')}>
            <Plus size={14} />
            {j('Plan a meal', 'Pianifica un pasto')}
          </button>
        </div>
      </JournalSection>
      {editing && (
        <PlanEditor
          initialDate={date}
          plan={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function PlanEditor({
  initialDate,
  plan,
  onClose,
}: {
  initialDate: string;
  plan?: MealPlan;
  onClose: () => void;
}) {
  const { allFoods, preBuiltMeals, language } = useApp();
  const { options: slots } = useMealSlots();
  const j = useJournalText();
  const [date, setDate] = useState(plan?.date ?? initialDate);
  const [days, setDays] = useState(1);
  const [selectedSlots, setSelectedSlots] = useState<MealSlotId[]>([plan?.slot ?? 'lunch']);
  const [kind, setKind] = useState<'food' | 'note'>(plan?.kind ?? 'food');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PlannedFood[]>(plan?.items ?? []);
  const [title, setTitle] = useState(plan?.title ?? '');
  const [note, setNote] = useState(plan?.note ?? '');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const name = (f: PlannedFood['food']) => (language === 'it' ? f.name_it : f.name_en) || f.name_de;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const foods = allFoods
      .filter((f) => (!q ? f.isRecipe : `${f.name_en} ${f.name_it} ${f.name_de}`.toLowerCase().includes(q)))
      .slice(0, 10)
      .map((food) => ({
        id: food.id,
        title: name(food),
        type: food.isRecipe ? j('Recipe', 'Ricetta') : j('Food', 'Alimento'),
        items: [{ food, amount: food.portion || 100 }],
      }));
    const meals = preBuiltMeals
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((meal) => ({
        id: meal.id,
        title: meal.name,
        type: j('Saved meal', 'Pasto salvato'),
        items: meal.ingredients.flatMap((i) => {
          const food = allFoods.find((f) => f.id === i.foodId);
          return food ? [{ food, amount: i.amount }] : [];
        }),
      }));
    return [...meals, ...foods];
  }, [allFoods, preBuiltMeals, query, language]);
  const valid =
    Boolean(date) &&
    days >= 1 &&
    days <= 90 &&
    Number.isInteger(days) &&
    selectedSlots.length > 0 &&
    (kind === 'note'
      ? note.trim().length > 0
      : items.length > 0 && items.every((i) => i.amount > 0 && Number.isFinite(i.amount)));
  const save = () => {
    if (!valid) return;
    const next: MealPlan[] = [];
    for (let i = 0; i < days; i++)
      for (const slot of selectedSlots)
        next.push({
          id: plan && next.length === 0 ? plan.id : journalId(),
          date: addDaysToDateString(date, i),
          slot,
          kind,
          title:
            title.trim() ||
            (kind === 'note'
              ? note.trim().split('\n')[0]
              : items
                  .map((item) => name(item.food))
                  .slice(0, 2)
                  .join(' + ')),
          note: note.trim(),
          items: kind === 'food' ? items : [],
          read: false,
        });
    try {
      saveMealPlans(next, plan?.id);
      onClose();
    } catch {
      setError(
        j(
          'Not enough device storage. Export a backup and free some space.',
          'Spazio insufficiente. Esporta un backup e libera spazio.',
        ),
      );
    }
  };
  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={
          plan
            ? j('Edit meal plan', 'Modifica programma')
            : j('Make room for a good meal', 'Fai spazio a un buon pasto')
        }
        subtitle={j(
          'Plan a day or a few. Leave the rest open.',
          'Pianifica uno o piu giorni. Il resto e libero.',
        )}
        maxWidth="max-w-xl"
      >
        <form
          className="journal-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="journal-form-columns">
            <label>
              {j('Starting on', 'A partire da')}
              <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>
              {j('Number of days', 'Numero di giorni')}
              <input
                required
                type="number"
                min={1}
                max={90}
                step={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </label>
          </div>
          <fieldset>
            <legend>{j('Which meals?', 'Quali pasti?')}</legend>
            <div className="journal-slot-options">
              {slots.map((slot) => (
                <button
                  type="button"
                  aria-pressed={selectedSlots.includes(slot.id)}
                  className={selectedSlots.includes(slot.id) ? 'is-active' : ''}
                  key={slot.id}
                  onClick={() =>
                    setSelectedSlots((prev) =>
                      prev.includes(slot.id) ? prev.filter((s) => s !== slot.id) : [...prev, slot.id],
                    )
                  }
                >
                  {selectedSlots.includes(slot.id) && <Check size={13} />}
                  {slot.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="journal-segmented">
            <button
              type="button"
              aria-pressed={kind === 'food'}
              className={kind === 'food' ? 'is-active' : ''}
              onClick={() => setKind('food')}
            >
              <Utensils size={16} />
              {j('Choose food', 'Scegli alimenti')}
            </button>
            <button
              type="button"
              aria-pressed={kind === 'note'}
              className={kind === 'note' ? 'is-active' : ''}
              onClick={() => setKind('note')}
            >
              <FileText size={16} />
              {j('Write a note', 'Scrivi una nota')}
            </button>
          </div>
          <label>
            {j('Plan name (optional)', 'Nome (facoltativo)')}
            <input
              value={title}
              maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={j('Something to look forward to', 'Qualcosa di buono in programma')}
            />
          </label>
          {kind === 'food' ? (
            <>
              <JournalSearch
                value={query}
                onChange={setQuery}
                placeholder={j('Search foods, saved meals or recipes', 'Cerca alimenti, pasti o ricette')}
              />
              <div className="journal-picker-results">
                {results.length ? (
                  results.map((r) => (
                    <button
                      disabled={!r.items.length}
                      type="button"
                      key={r.id}
                      onClick={() => {
                        setItems((prev) => [...prev, ...r.items]);
                        if (!title) setTitle(r.title);
                        setQuery('');
                      }}
                    >
                      <span>
                        <strong>{r.title}</strong>
                        <small>{r.type}</small>
                      </span>
                      <Plus size={17} />
                    </button>
                  ))
                ) : (
                  <JournalEmpty>
                    {j(
                      'No foods found. Try another ingredient.',
                      'Nessun risultato. Prova un altro ingrediente.',
                    )}
                  </JournalEmpty>
                )}
              </div>
              {items.length > 0 && (
                <div className="journal-chosen-items">
                  {items.map((item, index) => (
                    <div key={`${item.food.id}-${index}`}>
                      <span>{name(item.food)}</span>
                      <input
                        aria-label={`${j('Amount for', 'Quantita per')} ${name(item.food)}`}
                        type="number"
                        min={1}
                        max={10000}
                        value={item.amount || ''}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((v, i) => (i === index ? { ...v, amount: Number(e.target.value) } : v)),
                          )
                        }
                      />
                      <small>{item.food.unit}</small>
                      <button
                        aria-label={`${j('Remove', 'Rimuovi')} ${name(item.food)}`}
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <label>
              {j('Your food plan', 'Il tuo programma')}
              <textarea
                required
                rows={4}
                maxLength={4000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={j(
                  'Lunch out with friends. Pick something with veggies, and enjoy it.',
                  'Pranzo con amici. Scegli qualcosa con verdure e goditelo.',
                )}
              />
              <small>
                {j(
                  'This note appears first when you open the meal in Today.',
                  'La nota appare per prima quando apri il pasto in Oggi.',
                )}
              </small>
            </label>
          )}
          {error && (
            <p role="alert" className="journal-error">
              {error}
            </p>
          )}
          <div className="journal-form-actions">
            {plan && (
              <button type="button" className="journal-danger-button" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} />
                {j('Delete plan', 'Elimina programma')}
              </button>
            )}
            <button className="journal-primary-button" type="submit" disabled={!valid}>
              <Check size={17} />
              {j('Save plan', 'Salva programma')}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        message={j(
          'Delete this meal plan? Your logged food will not be changed.',
          'Eliminare il programma? Gli alimenti registrati non cambieranno.',
        )}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (plan) removeMealPlan(plan.id);
          onClose();
        }}
      />
    </>
  );
}

export function PlannedMeals({
  date,
  slot,
  onQueue,
  queuedIds = [],
}: {
  date: string;
  slot: MealSlotId;
  onQueue?: (plan: MealPlan) => void;
  queuedIds?: string[];
}) {
  const { language, logItemsToSlot } = useApp();
  const { plans } = useMealJournal();
  const j = useJournalText();
  const [error, setError] = useState('');
  const matching = plans
    .filter((p) => p.date === date && p.slot === slot && !p.loggedAt)
    .sort((a, b) => Number(b.kind === 'note') - Number(a.kind === 'note'));
  if (!matching.length) return null;
  return (
    <div className="journal-inline-plans">
      {matching.map((plan) => (
        <div className="journal-inline-plan" key={plan.id}>
          {plan.kind === 'note' ? (
            <>
              <FileText size={16} />
              <div>
                <small>{j('Your plan', 'Il tuo programma')}</small>
                <p>{plan.read ? j('Note read', 'Nota letta') : plan.note}</p>
              </div>
              <button
                type="button"
                aria-label={
                  plan.read ? j('Read note again', 'Rileggi nota') : j('Mark as read', 'Segna come letta')
                }
                onClick={() => updateMealPlan(plan.id, { read: !plan.read })}
              >
                {plan.read ? <Check size={17} /> : j('Mark as read', 'Letto')}
              </button>
            </>
          ) : (
            <>
              <CalendarDays size={16} />
              <div>
                <small>{j('Planned for this meal', 'In programma per questo pasto')}</small>
                <strong>{plan.title}</strong>
              </div>
              <button
                type="button"
                disabled={queuedIds.includes(plan.id)}
                onClick={() => {
                  if (onQueue) {
                    onQueue(plan);
                    return;
                  }
                  try {
                    logItemsToSlot(slot, plannedLogItems(plan, language), date);
                    updateMealPlan(plan.id, { loggedAt: new Date().toISOString() });
                  } catch {
                    setError(
                      j(
                        'Could not save. Please free some device storage.',
                        'Salvataggio non riuscito. Libera spazio sul dispositivo.',
                      ),
                    );
                  }
                }}
              >
                {queuedIds.includes(plan.id) ? (
                  <Check size={16} />
                ) : (
                  <>
                    <Plus size={14} />
                    {j('Add', 'Aggiungi')}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      ))}
      {error && (
        <p className="journal-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
