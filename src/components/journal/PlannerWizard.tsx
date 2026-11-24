import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  FileText,
  Minus,
  Plus,
  Star,
  Trash2,
  Utensils,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useMealSlots } from '../../utils/mealSlots';
import { addDaysToDateString } from '../../utils/formatters';
import { getDefaultAmount, setLastAmount } from '../../utils/amountMemory';
import { allMealItems } from '../../utils/mealItems';
import { fuzzyMatch, fuzzyScore } from '../../utils/fuzzy';
import { pinCoherentFavorites } from '../../utils/favorites';
import { useOffCatalog } from '../../utils/useOffCatalog';
import { catalogueScore } from '../../data/offCatalog';
import { journalId, removeMealPlan, saveMealPlans, useMealJournal } from '../../utils/journalStore';
import type { FoodItem, MealSlotId } from '../../types';
import type { MealPlan, PlannedFood } from '../../types/journal';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MealSlotIcon } from '../common/mealSlotIcon';
import { AmountSelector } from '../common/AmountSelector';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { FoodResultRow } from '../common/FoodResultRow';
import { JournalEmpty, JournalSearch, journalDate } from './JournalUI';
import { JournalDateField } from './JournalPickers';

/** What is planned for one day + meal. */
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

const emptyEntry = (kind: PlanEntry['kind'] = 'food'): PlanEntry => ({ kind, items: [], title: '', note: '' });
const entryValid = (e: PlanEntry) =>
  e.kind === 'note'
    ? e.note.trim().length > 0
    : e.items.length > 0 && e.items.every((i) => i.amount > 0 && Number.isFinite(i.amount));

const MAX_DAYS = 90;
// Monday first.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const weekdayOf = (date: string) => new Date(`${date}T12:00:00`).getDay();

/**
 * Meal planner, in two pages.
 * 1. Setup: starting date, number of days (+ / - buttons), weekdays to skip, single days to add back or remove, meals.
 * 2. Planning: one scrolling list of every day + meal. Meals that are planned or still to plan are compressed; only
 *    the one being planned is open (the same search / amount / macros flow as logging food). Arrows at the bottom
 *    move to the previous / next meal, and pressing any meal closes the open one and opens that one.
 * Opening an existing plan skips the setup and edits that single meal.
 */
export function PlanWizard({ initialDate, plan, onClose }: { initialDate: string; plan?: MealPlan; onClose: () => void }) {
  const { language } = useApp();
  const { options: slots, label } = useMealSlots();
  const { plans } = useMealJournal();
  const j = useJournalText();

  const [step, setStep] = useState<'setup' | 'plan'>(plan ? 'plan' : 'setup');
  const [startDate, setStartDate] = useState(plan?.date ?? initialDate);
  const [days, setDays] = useState(7);
  const [skippedWeekdays, setSkippedWeekdays] = useState<number[]>([]);
  // Single days switched on / off by hand, on top of the skipped weekdays.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [selectedSlots, setSelectedSlots] = useState<MealSlotId[]>([plan?.slot ?? 'lunch']);

  const [entries, setEntries] = useState<Record<string, PlanEntry>>(() =>
    plan ? { [`${plan.date}|${plan.slot}`]: { kind: plan.kind, items: plan.items, title: plan.title, note: plan.note } } : {},
  );
  const [preferredKind, setPreferredKind] = useState<PlanEntry['kind']>(plan?.kind ?? 'food');
  const [activeKey, setActiveKey] = useState<string | null>(plan ? `${plan.date}|${plan.slot}` : null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const name = (f: PlannedFood['food']) => (language === 'it' ? f.name_it : f.name_en) || f.name_de;

  // ----- Setup -----
  const span = useMemo(
    () => (startDate && days >= 1 ? Array.from({ length: Math.min(days, MAX_DAYS) }, (_, i) => addDaysToDateString(startDate, i)) : []),
    [startDate, days],
  );
  const dayOn = (date: string) => overrides[date] ?? !skippedWeekdays.includes(weekdayOf(date));
  const plannedDays = plan ? [plan.date] : span.filter(dayOn);
  const targets = useMemo<PlanTarget[]>(() => {
    if (plan) return [{ key: `${plan.date}|${plan.slot}`, date: plan.date, slot: plan.slot }];
    const out: PlanTarget[] = [];
    for (const d of span.filter(dayOn))
      for (const slot of slots)
        if (selectedSlots.includes(slot.id)) out.push({ key: `${d}|${slot.id}`, date: d, slot: slot.id });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, span, overrides, skippedWeekdays, slots, selectedSlots]);

  const setDayCount = (next: number) => setDays(Math.max(1, Math.min(MAX_DAYS, Math.round(next) || 1)));
  const toggleWeekday = (weekday: number) => {
    setSkippedWeekdays((prev) => (prev.includes(weekday) ? prev.filter((w) => w !== weekday) : [...prev, weekday]));
    // A weekday choice wins over single-day changes made before it.
    setOverrides((prev) => Object.fromEntries(Object.entries(prev).filter(([date]) => weekdayOf(date) !== weekday)));
  };
  const toggleDay = (date: string) => setOverrides((prev) => ({ ...prev, [date]: !dayOn(date) }));
  const weekdayName = (weekday: number) =>
    journalDate(addDaysToDateString('2024-01-07', weekday), language, { weekday: 'short' });

  // ----- Planning -----
  const entryFor = (key: string): PlanEntry => entries[key] ?? emptyEntry(preferredKind);
  const planned = targets.filter((t) => entryValid(entryFor(t.key))).length;
  const activeIndex = targets.findIndex((t) => t.key === activeKey);
  const active = activeIndex >= 0 ? targets[activeIndex] : undefined;
  const summary = (entry: PlanEntry) =>
    entry.title.trim() ||
    (entry.kind === 'note'
      ? entry.note.trim().split('\n')[0]
      : entry.items.map((item) => name(item.food)).slice(0, 2).join(' + '));
  const targetLabel = (t: PlanTarget) =>
    `${journalDate(t.date, language, { weekday: 'short', day: 'numeric', month: 'short' })} · ${label(t.slot)}`;

  const listRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (step !== 'plan') return;
    if (first.current) {
      first.current = false;
      if (plan) return;
    }
    const id = window.requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLElement>('[data-plan-active="true"]')?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
    );
    return () => window.cancelAnimationFrame(id);
  }, [activeKey, step, plan]);

  const goTo = (delta: number) => {
    const from = activeIndex < 0 ? (delta > 0 ? -1 : targets.length) : activeIndex;
    const next = targets[Math.max(0, Math.min(targets.length - 1, from + delta))];
    if (next) setActiveKey(next.key);
  };
  const startPlanning = () => {
    setActiveKey(targets[0]?.key ?? null);
    setStep('plan');
  };
  const copyToEmpty = () => {
    if (!active) return;
    const source = entryFor(active.key);
    if (!entryValid(source)) return;
    setEntries((prev) => {
      const copy = { ...prev };
      for (const t of targets)
        if (!entryValid(copy[t.key] ?? emptyEntry()))
          copy[t.key] = { ...source, items: source.items.map((i) => ({ ...i })) };
      return copy;
    });
  };

  const save = () => {
    const next: MealPlan[] = targets
      .filter((t) => entryValid(entryFor(t.key)))
      .map((t) => {
        const entry = entryFor(t.key);
        return {
          id: plan && t.key === `${plan.date}|${plan.slot}` ? plan.id : journalId(),
          date: t.date,
          slot: t.slot,
          kind: entry.kind,
          title: summary(entry),
          note: entry.note.trim(),
          items: entry.kind === 'food' ? entry.items : [],
          read: false,
        };
      });
    if (next.length === 0) return;
    try {
      saveMealPlans(next, plan?.id);
      onClose();
    } catch {
      setError(j('Not enough device storage. Export a backup and free some space.', 'Spazio insufficiente. Esporta un backup e libera spazio.'));
    }
  };

  const nextButton = (
    <button type="button" className="journal-primary-button" disabled={targets.length === 0} onClick={startPlanning}>
      {targets.length === 0
        ? j('Choose at least one day and meal', 'Scegli almeno un giorno e un pasto')
        : j(`Next · ${targets.length} meals`, `Avanti · ${targets.length} pasti`)}
      <ArrowRight size={16} />
    </button>
  );

  const planFooter = (
    <div className="journal-plan-footer">
      {error && (
        <p role="alert" className="journal-error">
          {error}
        </p>
      )}
      {targets.length > 1 && (
        <div className="journal-plan-nav" role="group" aria-label={j('Move between meals', 'Passa da un pasto all\'altro')}>
          <button type="button" aria-label={j('Previous meal', 'Pasto precedente')} disabled={activeIndex === 0} onClick={() => goTo(-1)}>
            <ArrowLeft size={18} />
          </button>
          <span aria-live="polite">
            <strong>{active ? targetLabel(active) : j('Tap a meal to plan it', 'Tocca un pasto per pianificarlo')}</strong>
            <small>{active ? `${activeIndex + 1} / ${targets.length}` : `${targets.length} ${j('meals', 'pasti')}`}</small>
          </span>
          <button type="button" aria-label={j('Next meal', 'Pasto successivo')} disabled={activeIndex === targets.length - 1} onClick={() => goTo(1)}>
            <ArrowRight size={18} />
          </button>
        </div>
      )}
      <div className="journal-form-actions">
        {plan && (
          <button type="button" className="journal-secondary-button journal-danger-button" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} />
            {j('Delete plan', 'Elimina programma')}
          </button>
        )}
        <button type="button" className="journal-primary-button" disabled={planned === 0} onClick={save}>
          <Check size={17} />
          {planned > 1 ? j(`Save ${planned} plans`, `Salva ${planned} programmi`) : j('Save plan', 'Salva programma')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={plan ? j('Edit meal plan', 'Modifica programma') : j('Plan meals', 'Pianifica i pasti')}
        subtitle={
          plan
            ? undefined
            : step === 'setup'
              ? j('Step 1 of 2 · Choose the days and meals', 'Passo 1 di 2 · Scegli giorni e pasti')
              : j('Step 2 of 2 · Plan each meal', 'Passo 2 di 2 · Pianifica ogni pasto')
        }
        maxWidth="max-w-xl"
        footer={step === 'plan' ? planFooter : <div className="journal-plan-footer">{nextButton}</div>}
      >
        {step === 'setup' ? (
          <div className="journal-form" data-planner-step="setup">
            <JournalDateField
              variant="bar"
              value={startDate}
              onChange={(value) => { setStartDate(value); setOverrides({}); }}
              label={j('Starting on', 'A partire da')}
              emptyLabel={j('Choose a start date', 'Scegli la data di inizio')}
            />

            <fieldset>
              <legend>{j('How many days?', 'Quanti giorni?')}</legend>
              <div className="journal-stepper" role="group" aria-label={j('Number of days', 'Numero di giorni')}>
                <button type="button" aria-label={j('One day less', 'Un giorno in meno')} disabled={days <= 1} onClick={() => setDayCount(days - 1)}>
                  <Minus size={18} />
                </button>
                <label className="journal-stepper-value">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_DAYS}
                    value={days}
                    aria-label={j('Number of days', 'Numero di giorni')}
                    onChange={(e) => setDayCount(Number(e.target.value))}
                  />
                  <span>{days === 1 ? j('day', 'giorno') : j('days', 'giorni')}</span>
                </label>
                <button type="button" aria-label={j('One day more', 'Un giorno in piu')} disabled={days >= MAX_DAYS} onClick={() => setDayCount(days + 1)}>
                  <Plus size={18} />
                </button>
              </div>
              <div className="journal-slot-options journal-quick-days">
                {[3, 7, 14, 30].map((n) => (
                  <button key={n} type="button" aria-pressed={days === n} className={days === n ? 'is-active' : ''} onClick={() => setDayCount(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>{j('Skip these days of the week', 'Escludi questi giorni della settimana')}</legend>
              <div className="journal-weekdays" role="group">
                {WEEK_ORDER.map((weekday) => (
                  <button
                    key={weekday}
                    type="button"
                    aria-pressed={skippedWeekdays.includes(weekday)}
                    className={skippedWeekdays.includes(weekday) ? 'is-skipped' : ''}
                    onClick={() => toggleWeekday(weekday)}
                  >
                    {weekdayName(weekday)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>
                {j(`${plannedDays.length} of ${span.length} days will be planned`, `${plannedDays.length} giorni su ${span.length} saranno pianificati`)}
              </legend>
              <div className="journal-day-grid" role="group" aria-label={j('Choose specific days', 'Scegli giorni specifici')}>
                {span.map((date) => {
                  const on = dayOn(date);
                  return (
                    <button
                      key={date}
                      type="button"
                      aria-pressed={on}
                      className={on ? 'is-on' : ''}
                      aria-label={journalDate(date, language, { weekday: 'long', day: 'numeric', month: 'long' })}
                      onClick={() => toggleDay(date)}
                    >
                      <span>{journalDate(date, language, { weekday: 'short' })}</span>
                      <strong>{new Date(`${date}T12:00:00`).getDate()}</strong>
                      <small>{journalDate(date, language, { month: 'short' })}</small>
                    </button>
                  );
                })}
              </div>
              <p className="journal-result-count">{j('Tap a day to add it or take it out.', 'Tocca un giorno per aggiungerlo o toglierlo.')}</p>
            </fieldset>

            <fieldset>
              <legend>{j('Which meals?', 'Quali pasti?')}</legend>
              <div className="journal-slot-options">
                {slots.map((slot) => (
                  <button
                    type="button"
                    aria-pressed={selectedSlots.includes(slot.id)}
                    className={selectedSlots.includes(slot.id) ? 'is-active' : ''}
                    key={slot.id}
                    onClick={() => setSelectedSlots((prev) => (prev.includes(slot.id) ? prev.filter((s) => s !== slot.id) : [...prev, slot.id]))}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
          <div className="journal-form" data-planner-step="plan">
            {!plan && (
              <div className="journal-plan-top">
                <button type="button" className="journal-secondary-button" onClick={() => setStep('setup')}>
                  <ChevronLeft size={15} />
                  {j('Days and meals', 'Giorni e pasti')}
                </button>
                <span className="journal-result-count" aria-live="polite">
                  {j(`${planned} of ${targets.length} planned`, `${planned} di ${targets.length} pianificati`)}
                </span>
              </div>
            )}
            <div className="journal-plan-timeline" ref={listRef}>
              {targets.map((t, index) => {
                const entry = entryFor(t.key);
                const done = entryValid(entry);
                const open = activeKey === t.key;
                const newDay = index === 0 || targets[index - 1].date !== t.date;
                const already = plans.filter((p) => p.date === t.date && p.slot === t.slot && p.id !== plan?.id).length;
                return (
                  <div key={t.key} className="journal-plan-item">
                    {newDay && !plan && (
                      <h3 className="journal-plan-day">
                        {journalDate(t.date, language, { weekday: 'long', day: 'numeric', month: 'long' })}
                      </h3>
                    )}
                    <div className={`journal-meal-card ${open ? 'is-open' : ''} ${done ? 'is-done' : ''}`} data-plan-active={open}>
                      <button
                        type="button"
                        className="journal-meal-card-head"
                        aria-expanded={open}
                        onClick={() => setActiveKey(open ? null : t.key)}
                      >
                        <span className="journal-plan-row-icon">
                          <MealSlotIcon slot={t.slot} size={20} />
                        </span>
                        <span className="journal-meal-card-title">
                          <strong>{label(t.slot)}</strong>
                          <small>
                            {done ? summary(entry) : j('Still to plan', 'Ancora da pianificare')}
                            {already > 0 && ` · ${j(`${already} already planned`, `${already} gia pianificati`)}`}
                          </small>
                        </span>
                        {done ? <Check size={16} /> : <ChevronDown size={16} className={open ? 'rotate-180' : ''} />}
                      </button>
                      {open && (
                        <div className="journal-meal-card-body">
                          <MealEntryEditor
                            key={t.key}
                            entry={entry}
                            onChange={(next) => {
                              setPreferredKind(next.kind);
                              setEntries((prev) => ({ ...prev, [t.key]: next }));
                            }}
                            name={name}
                          />
                          {targets.length > 1 && done && targets.some((o) => !entryValid(entryFor(o.key))) && (
                            <button type="button" className="journal-secondary-button" onClick={copyToEmpty}>
                              <Copy size={15} />
                              {j('Copy to the meals still to plan', 'Copia sui pasti ancora da pianificare')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        message={j('Delete this meal plan? Your logged food will not be changed.', 'Eliminare il programma? Gli alimenti registrati non cambieranno.')}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (plan) removeMealPlan(plan.id);
          onClose();
        }}
      />
    </>
  );
}

/**
 * Food / note editor of one meal. Same flow as logging food: search (favourites first, offline catalogue included),
 * favourites and recent foods one tap away, then the amount with its macros before adding.
 */
function MealEntryEditor({ entry, onChange, name }: { entry: PlanEntry; onChange: (entry: PlanEntry) => void; name: (f: PlannedFood['food']) => string }) {
  const { allFoods, preBuiltMeals, favoriteFoods, allDayLogs, rememberFood, language } = useApp();
  const j = useJournalText();
  const offCatalog = useOffCatalog(true);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState(100);
  const { kind, items, title, note } = entry;
  const patch = (next: Partial<PlanEntry>) => onChange({ ...entry, ...next });
  const q = query.trim();

  const results = useMemo(() => {
    if (q.length < 2) return { foods: [] as FoodItem[], meals: [] as typeof preBuiltMeals };
    const local = allFoods
      .map((f) => ({ f, score: Math.min(fuzzyScore(q, f.name_de), fuzzyScore(q, f.name_it), fuzzyScore(q, f.name_en), fuzzyScore(q, f.brand || '')) }))
      .filter((x) => fuzzyMatch(q, [x.f.name_de, x.f.name_it, x.f.name_en, x.f.brand || '']))
      .sort((a, b) => a.score - b.score);
    const seen = new Set(local.map((x) => x.f.id));
    const catalogue = (offCatalog ? offCatalog.search(q, 30) : [])
      .filter((f) => !seen.has(f.id))
      .map((f) => ({ f, score: catalogueScore(q) }));
    const ranked = [...local, ...catalogue].sort((a, b) => a.score - b.score);
    return {
      foods: pinCoherentFavorites(ranked, favoriteFoods, (x) => x.f.id, (x) => x.score, q).slice(0, 30).map((x) => x.f),
      meals: preBuiltMeals.filter((m) => fuzzyMatch(q, [m.name])).slice(0, 6),
    };
  }, [q, allFoods, offCatalog, favoriteFoods, preBuiltMeals]);

  const favorites = useMemo(() => {
    const byId = new Map(allFoods.map((f) => [f.id, f]));
    return favoriteFoods.map((id) => byId.get(id)).filter((f): f is FoodItem => Boolean(f)).slice(0, 8);
  }, [allFoods, favoriteFoods]);
  const recent = useMemo(() => {
    const byId = new Map(allFoods.map((f) => [f.id, f]));
    const seen = new Set<string>();
    const out: FoodItem[] = [];
    for (const date of Object.keys(allDayLogs).sort().reverse()) {
      for (const item of allMealItems(allDayLogs[date].meals).slice().reverse()) {
        if (seen.has(item.foodId)) continue;
        seen.add(item.foodId);
        const found = byId.get(item.foodId);
        if (found) out.push(found);
      }
      if (out.length >= 8) break;
    }
    return out.slice(0, 8);
  }, [allDayLogs, allFoods]);

  const pick = (food: FoodItem) => {
    rememberFood(food);
    setPending(food);
    setAmount(getDefaultAmount(food));
  };
  const addMeal = (meal: (typeof preBuiltMeals)[number]) => {
    const added = meal.ingredients.flatMap((i) => {
      const food = allFoods.find((f) => f.id === i.foodId);
      return food ? [{ food, amount: i.amount }] : [];
    });
    if (!added.length) return;
    patch({ items: [...items, ...added], title: title || meal.name });
    setQuery('');
  };
  const kcal = Math.round(items.reduce((sum, i) => sum + (i.food.calories * i.amount) / 100, 0));
  const chip = (food: FoodItem) => (
    <button key={food.id} type="button" className="journal-food-chip" onClick={() => pick(food)}>
      {name(food)}
    </button>
  );

  return (
    <div className="journal-entry-editor">
      <div className="journal-segmented">
        <button type="button" aria-pressed={kind === 'food'} className={kind === 'food' ? 'is-active' : ''} onClick={() => patch({ kind: 'food' })}>
          <Utensils size={16} />
          {j('Choose food', 'Scegli alimenti')}
        </button>
        <button type="button" aria-pressed={kind === 'note'} className={kind === 'note' ? 'is-active' : ''} onClick={() => patch({ kind: 'note' })}>
          <FileText size={16} />
          {j('Write a note', 'Scrivi una nota')}
        </button>
      </div>

      {kind === 'food' ? (
        <>
          {pending ? (
            <div className="journal-pending-food">
              <button type="button" className="journal-secondary-button" onClick={() => setPending(null)}>
                <ArrowLeft size={15} />
                {j('Back', 'Indietro')}
              </button>
              <div className="journal-pending-banner">
                <strong>{name(pending)}</strong>
                <span>
                  {pending.calories} kcal / 100{pending.unit} · {Math.round((pending.calories * amount) / 100)} kcal
                </span>
              </div>
              <AmountSelector value={amount} onChange={setAmount} unit={pending.unit} />
              <FoodMacroGrid food={pending} amount={amount} />
              <button
                type="button"
                className="journal-primary-button"
                disabled={amount <= 0}
                onClick={() => {
                  setLastAmount(pending.id, amount);
                  patch({ items: [...items, { food: pending, amount }], title: title || name(pending) });
                  setPending(null);
                  setQuery('');
                }}
              >
                <Plus size={16} />
                {j('Add to this meal', 'Aggiungi al pasto')}
              </button>
            </div>
          ) : (
            <>
              <JournalSearch value={query} onChange={setQuery} placeholder={j('Search foods, saved meals or recipes', 'Cerca alimenti, pasti o ricette')} />
              {q.length >= 2 ? (
                <div className="journal-picker-results" data-planner-results>
                  {results.meals.map((meal) => (
                    <button type="button" key={meal.id} onClick={() => addMeal(meal)}>
                      <span>
                        <strong>{meal.name}</strong>
                        <small>{j('Saved meal', 'Pasto salvato')}</small>
                      </span>
                      <UtensilsCrossed size={16} />
                    </button>
                  ))}
                  {results.foods.map((food) => (
                    <FoodResultRow key={food.id} food={food} favorite onClick={() => pick(food)} />
                  ))}
                  {results.foods.length === 0 && results.meals.length === 0 && (
                    <JournalEmpty>{j('No foods found. Try another ingredient.', 'Nessun risultato. Prova un altro ingrediente.')}</JournalEmpty>
                  )}
                </div>
              ) : (
                <div className="journal-quick-foods">
                  {q.length === 1 && <p className="journal-result-count">{j('Type at least 2 letters.', 'Scrivi almeno 2 lettere.')}</p>}
                  {favorites.length > 0 && (
                    <div>
                      <span className="journal-quick-label"><Star size={12} /> {j('Favourites', 'Preferiti')}</span>
                      <div className="journal-food-chips">{favorites.map(chip)}</div>
                    </div>
                  )}
                  {recent.length > 0 && (
                    <div>
                      <span className="journal-quick-label"><Clock size={12} /> {j('Recent', 'Recenti')}</span>
                      <div className="journal-food-chips">{recent.map(chip)}</div>
                    </div>
                  )}
                  {preBuiltMeals.length > 0 && (
                    <div>
                      <span className="journal-quick-label"><UtensilsCrossed size={12} /> {j('Saved meals', 'Pasti salvati')}</span>
                      <div className="journal-food-chips">
                        {preBuiltMeals.slice(0, 8).map((meal) => (
                          <button key={meal.id} type="button" className="journal-food-chip" onClick={() => addMeal(meal)}>
                            {meal.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
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
                    onChange={(e) => patch({ items: items.map((v, i) => (i === index ? { ...v, amount: Number(e.target.value) } : v)) })}
                  />
                  <small>{item.food.unit}</small>
                  <button aria-label={`${j('Remove', 'Rimuovi')} ${name(item.food)}`} type="button" onClick={() => patch({ items: items.filter((_, i) => i !== index) })}>
                    <X size={15} />
                  </button>
                </div>
              ))}
              <p className="journal-result-count" data-language={language}>{kcal} kcal</p>
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
            placeholder={j('Lunch out with friends. Pick something with veggies, and enjoy it.', 'Pranzo con amici. Scegli qualcosa con verdure e goditelo.')}
          />
          <small>{j('This note appears first when you open the meal in Today.', 'La nota appare per prima quando apri il pasto in Oggi.')}</small>
        </label>
      )}

      <label>
        {j('Plan name (optional)', 'Nome (facoltativo)')}
        <input value={title} maxLength={160} onChange={(e) => patch({ title: e.target.value })} placeholder={j('Something to look forward to', 'Qualcosa di buono in programma')} />
      </label>
    </div>
  );
}
