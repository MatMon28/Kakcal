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
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const found = searching
    ? plans
        .filter((p) =>
          `${p.title} ${p.note} ${label(p.slot)} ${p.items.map((i) => `${i.food.name_en} ${i.food.name_it}`).join(' ')}`
            .toLowerCase()
            .includes(q),
        )
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const days = Array.from({ length: 7 }, (_, i) => addDaysToDateString(weekStart, i));
  const dayPlans = plans.filter((p) => p.date === date);
  return (
    <>
      <JournalSection
        tone="blue"
        className="journal-planner"
        title={j('Meal planner', 'Pianifica pasti')}
        subtitle={j('A little planning, a little more balance.', "Un po' di organizzazione, piu equilibrio.")}
        icon={<CalendarDays size={16} strokeWidth={2.2} />}
        count={plans.length}
        searchLabel={j('Search planned meals', 'Cerca nei pasti pianificati')}
        query={query}
        setQuery={setQuery}
        createLabel={j('Plan a meal', 'Pianifica un pasto')}
        onCreate={() => setEditing('new')}
      >
        {searching ? (
          <div className="journal-plan-list">
            {found.length === 0 ? (
              <JournalEmpty>{j('No planned meals match.', 'Nessun pasto pianificato corrisponde.')}</JournalEmpty>
            ) : (
              found.map((plan) => <PlanRow key={plan.id} plan={plan} withDate onOpen={() => setEditing(plan)} />)
            )}
          </div>
        ) : (
          <>
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
                dayPlans.map((plan) => <PlanRow key={plan.id} plan={plan} onOpen={() => setEditing(plan)} />)
              )}
            </div>
          </>
        )}
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

function PlanRow({ plan, withDate, onOpen }: { plan: MealPlan; withDate?: boolean; onOpen: () => void }) {
  const { language } = useApp();
  const { label } = useMealSlots();
  return (
    <button type="button" className="journal-plan-row" onClick={onOpen}>
      <span className="journal-plan-row-icon">
        {plan.kind === 'note' ? <FileText size={16} /> : <Utensils size={16} />}
      </span>
      <span>
        <small>
          {withDate ? `${journalDate(plan.date, language, { weekday: 'short', day: 'numeric', month: 'short' })} · ` : ''}
          {label(plan.slot)}
        </small>
        <strong>{plan.title}</strong>
      </span>
      {plan.loggedAt ? <Check size={16} /> : <ChevronRight size={16} />}
    </button>
  );
}

interface PlanEntry {
  kind: 'food' | 'note';
  items: PlannedFood[];
  title: string;
  note: string;
}

interface PlanTarget {
  key: string;
  date: string;
  slot: MealSlotId;
}

const emptyEntry = (): PlanEntry => ({ kind: 'food', items: [], title: '', note: '' });

const entryValid = (e: PlanEntry) =>
  e.kind === 'note'
    ? e.note.trim().length > 0
    : e.items.length > 0 && e.items.every((i) => i.amount > 0 && Number.isFinite(i.amount));

const entryHasContent = (e: PlanEntry) => e.items.length > 0 || e.note.trim().length > 0;

function PlanEditor({
  initialDate,
  plan,
  onClose,
}: {
  initialDate: string;
  plan?: MealPlan;
  onClose: () => void;
}) {
  const { language } = useApp();
  const { options: slots, label } = useMealSlots();
  const j = useJournalText();
  const [date, setDate] = useState(plan?.date ?? initialDate);
  const [days, setDays] = useState(1);
  const [selectedSlots, setSelectedSlots] = useState<MealSlotId[]>([plan?.slot ?? 'lunch']);
  // One meal for every selected day / meal ("same"), or a separate meal for each one ("each").
  const [mode, setMode] = useState<'same' | 'each'>('same');
  const [shared, setShared] = useState<PlanEntry>(
    plan ? { kind: plan.kind, items: plan.items, title: plan.title, note: plan.note } : emptyEntry(),
  );
  const [perTarget, setPerTarget] = useState<Record<string, PlanEntry>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const name = (f: PlannedFood['food']) => (language === 'it' ? f.name_it : f.name_en) || f.name_de;

  const targets = useMemo<PlanTarget[]>(() => {
    if (!date || !Number.isInteger(days) || days < 1 || days > 90) return [];
    const out: PlanTarget[] = [];
    for (let i = 0; i < days; i++) {
      const d = addDaysToDateString(date, i);
      for (const slot of slots)
        if (selectedSlots.includes(slot.id)) out.push({ key: `${d}|${slot.id}`, date: d, slot: slot.id });
    }
    return out;
  }, [date, days, slots, selectedSlots]);
  const eachMode = mode === 'each' && targets.length > 1;
  const entryFor = (key: string) => perTarget[key] ?? emptyEntry();
  const active = eachMode ? (targets.find((t) => t.key === activeKey) ?? targets[0]) : undefined;
  // The next row still to be filled (wrapping around), for the "Next meal" shortcut.
  const activeIndex = active ? targets.findIndex((t) => t.key === active.key) : -1;
  const nextTarget = active
    ? [...targets.slice(activeIndex + 1), ...targets.slice(0, activeIndex)].find(
        (t) => !entryValid(entryFor(t.key)),
      )
    : undefined;
  const filled = targets.filter((t) => entryValid(entryFor(t.key))).length;
  const valid = targets.length > 0 && (eachMode ? filled === targets.length : entryValid(shared));
  const targetLabel = (t: PlanTarget) =>
    `${journalDate(t.date, language, { weekday: 'short', day: 'numeric', month: 'short' })} · ${label(t.slot)}`;

  const chooseMode = (next: 'same' | 'each') => {
    setMode(next);
    if (next === 'each') {
      // Start every row from the meal already chosen for all, so only the exceptions need changing.
      setPerTarget((prev) => {
        const copy = { ...prev };
        for (const t of targets)
          if (!copy[t.key] && entryHasContent(shared))
            copy[t.key] = { ...shared, items: shared.items.map((i) => ({ ...i })) };
        return copy;
      });
      setActiveKey(targets[0]?.key ?? null);
    }
  };

  const save = () => {
    if (!valid) return;
    const next: MealPlan[] = targets.map((t, index) => {
      const entry = eachMode ? entryFor(t.key) : shared;
      return {
        id: plan && index === 0 ? plan.id : journalId(),
        date: t.date,
        slot: t.slot,
        kind: entry.kind,
        title:
          entry.title.trim() ||
          (entry.kind === 'note'
            ? entry.note.trim().split('\n')[0]
            : entry.items
                .map((item) => name(item.food))
                .slice(0, 2)
                .join(' + ')),
        note: entry.note.trim(),
        items: entry.kind === 'food' ? entry.items : [],
        read: false,
      };
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
        title={plan ? j('Edit meal plan', 'Modifica programma') : j('Plan a meal', 'Pianifica un pasto')}
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
                  {slot.label}
                </button>
              ))}
            </div>
          </fieldset>
          {targets.length > 1 && (
            <fieldset>
              <legend>
                {j(`${targets.length} meals selected`, `${targets.length} pasti selezionati`)}
              </legend>
              <div className="journal-segmented">
                <button
                  type="button"
                  aria-pressed={!eachMode}
                  className={!eachMode ? 'is-active' : ''}
                  onClick={() => chooseMode('same')}
                >
                  {j('Same for all', 'Uguale per tutti')}
                </button>
                <button
                  type="button"
                  aria-pressed={eachMode}
                  className={eachMode ? 'is-active' : ''}
                  onClick={() => chooseMode('each')}
                >
                  {j('Different for each', 'Diverso per ognuno')}
                </button>
              </div>
            </fieldset>
          )}
          {eachMode && active ? (
            <>
              <div className="journal-target-list" role="group" aria-label={j('Choose a meal to plan', 'Scegli un pasto')}>
                {targets.map((t) => {
                  const entry = entryFor(t.key);
                  const done = entryValid(entry);
                  return (
                    <button
                      type="button"
                      key={t.key}
                      className={`journal-target ${active.key === t.key ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
                      aria-pressed={active.key === t.key}
                      onClick={() => setActiveKey(t.key)}
                    >
                      <span>
                        <small>{targetLabel(t)}</small>
                        <strong>
                          {done
                            ? entry.title.trim() ||
                              (entry.kind === 'note'
                                ? entry.note.trim().split('\n')[0]
                                : entry.items
                                    .map((item) => name(item.food))
                                    .slice(0, 2)
                                    .join(' + '))
                            : j('Choose a meal', 'Scegli un pasto')}
                        </strong>
                      </span>
                      {done ? <Check size={16} /> : <ChevronRight size={16} />}
                    </button>
                  );
                })}
              </div>
              <p className="journal-result-count" aria-live="polite">
                {j(`${filled} of ${targets.length} meals chosen`, `${filled} di ${targets.length} pasti scelti`)}
              </p>
              <EntryEditor
                key={active.key}
                entry={entryFor(active.key)}
                heading={targetLabel(active)}
                onChange={(entry) => setPerTarget((prev) => ({ ...prev, [active.key]: entry }))}
                name={name}
              />
              {nextTarget && (
                <button
                  type="button"
                  className="journal-secondary-button"
                  onClick={() => setActiveKey(nextTarget.key)}
                >
                  {j('Next meal', 'Pasto successivo')}
                  <ChevronRight size={16} />
                </button>
              )}
            </>
          ) : (
            <EntryEditor key="shared" entry={shared} onChange={setShared} name={name} />
          )}
          {error && (
            <p role="alert" className="journal-error">
              {error}
            </p>
          )}
          <div className="journal-form-actions">
            {plan && (
              <button type="button" className="journal-secondary-button journal-danger-button" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} />
                {j('Delete plan', 'Elimina programma')}
              </button>
            )}
            <button className="journal-primary-button" type="submit" disabled={!valid}>
              <Check size={17} />
              {targets.length > 1
                ? j(`Save ${targets.length} plans`, `Salva ${targets.length} programmi`)
                : j('Save plan', 'Salva programma')}
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

/** Food / note picker for one plan entry: the shared meal, or the meal of the selected row. */
function EntryEditor({
  entry,
  heading,
  onChange,
  name,
}: {
  entry: PlanEntry;
  heading?: string;
  onChange: (entry: PlanEntry) => void;
  name: (f: PlannedFood['food']) => string;
}) {
  const { allFoods, preBuiltMeals, language } = useApp();
  const j = useJournalText();
  const [query, setQuery] = useState('');
  const { kind, items, title, note } = entry;
  const patch = (next: Partial<PlanEntry>) => onChange({ ...entry, ...next });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFoods, preBuiltMeals, query, language]);
  return (
    <div className="journal-entry-editor">
      {heading && <h3 className="journal-entry-heading">{heading}</h3>}
      <div className="journal-segmented">
        <button
          type="button"
          aria-pressed={kind === 'food'}
          className={kind === 'food' ? 'is-active' : ''}
          onClick={() => patch({ kind: 'food' })}
        >
          <Utensils size={16} />
          {j('Choose food', 'Scegli alimenti')}
        </button>
        <button
          type="button"
          aria-pressed={kind === 'note'}
          className={kind === 'note' ? 'is-active' : ''}
          onClick={() => patch({ kind: 'note' })}
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
          onChange={(e) => patch({ title: e.target.value })}
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
                    patch({ items: [...items, ...r.items], title: title || r.title });
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
                {j('No foods found. Try another ingredient.', 'Nessun risultato. Prova un altro ingrediente.')}
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
                      patch({
                        items: items.map((v, i) => (i === index ? { ...v, amount: Number(e.target.value) } : v)),
                      })
                    }
                  />
                  <small>{item.food.unit}</small>
                  <button
                    aria-label={`${j('Remove', 'Rimuovi')} ${name(item.food)}`}
                    type="button"
                    onClick={() => patch({ items: items.filter((_, i) => i !== index) })}
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
            rows={4}
            maxLength={4000}
            value={note}
            onChange={(e) => patch({ note: e.target.value })}
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
    </div>
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
