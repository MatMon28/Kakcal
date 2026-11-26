import { offerRemovalUndo, removeWithUndo } from '../../utils/undoRemoval';
import { useRemovalScope } from '../common/UndoRemovalNotice';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  FileText,
  History,
  Plus,
  Trash2,
  Utensils,
  UtensilsCrossed,
  Tag,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useMealSlots } from '../../utils/mealSlots';
import { addDaysToDateString, getTodayDateString } from '../../utils/formatters';
import { getDefaultAmount, setLastAmount } from '../../utils/amountMemory';
import { plannedMealName } from '../../utils/planMealName';
import { searchFoods, searchMeals } from '../../utils/foodSearchIndex';
import { matchesFirstChar, pinCoherentFavorites } from '../../utils/favorites';
import { useCatalogueSearch } from '../../utils/useCatalogueSearch';
import { catalogueScore } from '../../data/offCatalog';
import { journalId, removeMealPlan, removePlanGroup, saveMealPlans, savePlanGroup, useMealJournal } from '../../utils/journalStore';
import { copyName, type PlanGroupView } from '../../utils/planGroups';
import {
  clearPlannerDraft,
  draftPlannedCount,
  loadPlannerDraft,
  savePlannerDraft,
  type PlanEntry,
  type PlannerDraft,
} from '../../utils/plannerDraft';
import type { FoodItem, MealSlotId } from '../../types';
import type { MealPlan, PlannedFood } from '../../types/journal';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { SaveBeforeCloseDialog } from '../common/SaveBeforeCloseDialog';
import { RecentChips, RECENT_MORE, RECENT_SHOWN } from '../common/RecentChips';
import { MealSlotIcon } from '../common/mealSlotIcon';
import { AmountSelector } from '../common/AmountSelector';
import { FoodMacroGrid } from '../common/FoodMacroGrid';
import { FoodResultRow } from '../common/FoodResultRow';
import { JournalEmpty, JournalSearch, journalDate } from './JournalUI';
import { JournalDateField } from './JournalPickers';

/** An earlier plan of the same meal that can be added again with one tap. */
interface PlanSuggestion {
  key: string;
  date: string;
  entry: PlanEntry;
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
const DEFAULT_SPAN = 7;
const dayDiff = (from: string, to: string) =>
  Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000);
// Monday first.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const weekdayOf = (date: string) => new Date(`${date}T12:00:00`).getDay();

/**
 * Meal planner, in two pages.
 * 1. Setup: first and last day (two calendar icons side by side), weekdays to skip, single days to add back or remove, meals.
 *    A saved draft of an earlier, unfinished plan is offered at the top.
 * 2. Planning: one scrolling list of every day + meal. Meals that are planned or still to plan are compressed; only
 *    the one being planned is open (the same search / amount / macros flow as logging food). Arrows at the bottom
 *    move to the previous / next meal, and pressing any meal closes the open one and opens that one.
 * Closing a plan that is half way asks: save as a draft, discard, or keep editing. Opening an existing plan skips the
 * setup and edits that single meal.
 *
 * The plan gets ONE name, asked on page 1 (never per meal; a meal's own title is derived from its foods). Three more
 * ways in, all fed by "See all plans":
 * - `group`: edit a saved plan as a whole (opens on page 2; name, days and meals can still be changed on page 1);
 * - `reuse`: start a new plan from a saved one. Page 1 is already filled in (name, same number of days, skipped days,
 *   meals) and page 2 holds the same foods day by day. Choosing more days than the original leaves the extra days
 *   empty; fewer days drops the last ones.
 */
export function PlanWizard({ initialDate, plan, group, reuse, onClose }: { initialDate: string; plan?: MealPlan; group?: PlanGroupView; reuse?: PlanGroupView; onClose: () => void }) {
  const { language } = useApp();
  const { options: slots, label } = useMealSlots();
  const { plans } = useMealJournal();
  const j = useJournalText();
  // A saved plan being edited as a whole, or being reused as the starting point of a new one.
  const source = group ?? reuse;
  // The unfinished plan saved earlier (only offered when planning something new from scratch).
  const [draft, setDraft] = useState<PlannerDraft | null>(() => (plan || source ? null : loadPlannerDraft()));
  const [fromDraft, setFromDraft] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const [step, setStep] = useState<'setup' | 'plan'>(plan || group ? 'plan' : 'setup');
  // The one name of the plan, asked on page 1.
  const [name, setName] = useState(() => (group ? group.name : reuse ? copyName(reuse.name, language) : ''));
  // A reused plan starts today (or on the browsed day when that is still ahead); an edited plan keeps its days.
  const [startDate, setStartDate] = useState(() => (group ? group.start : plan?.date ?? (reuse ? (initialDate < getTodayDateString() ? getTodayDateString() : initialDate) : initialDate)));
  const [endDate, setEndDate] = useState(() => {
    const first = group ? group.start : plan?.date ?? (reuse ? (initialDate < getTodayDateString() ? getTodayDateString() : initialDate) : initialDate);
    return addDaysToDateString(first, source ? dayDiff(source.start, source.end) : DEFAULT_SPAN - 1);
  });
  const [skippedWeekdays, setSkippedWeekdays] = useState<number[]>([]);
  // Single days switched on / off by hand, on top of the skipped weekdays. A saved plan's own day pattern lives here.
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => {
    if (!source) return {};
    const first = group ? group.start : initialDate < getTodayDateString() ? getTodayDateString() : initialDate;
    const planned = new Set(source.plans.map((p) => p.date));
    const out: Record<string, boolean> = {};
    for (let i = 0; i <= dayDiff(source.start, source.end); i += 1) out[addDaysToDateString(first, i)] = planned.has(addDaysToDateString(source.start, i));
    return out;
  });
  const [selectedSlots, setSelectedSlots] = useState<MealSlotId[]>(() => (source ? [...new Set(source.plans.map((p) => p.slot))] : [plan?.slot ?? 'lunch']));

  const undoScope = useRemovalScope();
  const [entries, setEntries] = useState<Record<string, PlanEntry>>(() => {
    if (source) {
      // The same foods, day by day (day 1 of the saved plan = the first day here).
      const first = group ? group.start : initialDate < getTodayDateString() ? getTodayDateString() : initialDate;
      const out: Record<string, PlanEntry> = {};
      for (const p of source.plans)
        out[`${addDaysToDateString(first, dayDiff(source.start, p.date))}|${p.slot}`] = {
          kind: p.kind,
          items: p.items.map((i) => ({ ...i })),
          // Only a name the user chose is a meal name; the automatic summary is rebuilt from the foods.
          title: plannedMealName(p),
          note: p.note,
          ...(group ? { planId: p.id, loggedAt: p.loggedAt, read: p.read } : {}),
        };
      return out;
    }
    return plan ? { [`${plan.date}|${plan.slot}`]: { kind: plan.kind, items: plan.items, title: plannedMealName(plan), note: plan.note } } : {};
  });
  const [preferredKind, setPreferredKind] = useState<PlanEntry['kind']>(plan?.kind ?? 'food');
  const [activeKey, setActiveKey] = useState<string | null>(plan ? `${plan.date}|${plan.slot}` : null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const foodName = (f: PlannedFood['food']) => (language === 'it' ? f.name_it : f.name_en) || f.name_de;

  // ----- Setup -----
  const span = useMemo(() => {
    if (!startDate || !endDate) return [];
    const count = Math.max(1, Math.min(MAX_DAYS, dayDiff(startDate, endDate) + 1));
    return Array.from({ length: count }, (_, i) => addDaysToDateString(startDate, i));
  }, [startDate, endDate]);
  const lastAllowed = addDaysToDateString(startDate, MAX_DAYS - 1);
  const changeStart = (value: string) => {
    if (!value) return;
    if (source) {
      // A saved plan moves as a whole: its end, day pattern and foods keep their place relative to the first day.
      const delta = dayDiff(startDate, value);
      if (delta === 0) return;
      const move = (date: string) => addDaysToDateString(date, delta);
      setStartDate(value);
      setEndDate((prev) => (move(prev) > addDaysToDateString(value, MAX_DAYS - 1) ? addDaysToDateString(value, MAX_DAYS - 1) : move(prev)));
      setOverrides((prev) => Object.fromEntries(Object.entries(prev).map(([date, on]) => [move(date), on])));
      setEntries((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([key, entry]) => {
            const cut = key.indexOf('|');
            return [`${move(key.slice(0, cut))}${key.slice(cut)}`, entry];
          }),
        ),
      );
      return;
    }
    setStartDate(value);
    // The last day never comes before the first day, and a plan covers at most 90 days.
    setEndDate((prev) => (prev < value ? value : prev > addDaysToDateString(value, MAX_DAYS - 1) ? addDaysToDateString(value, MAX_DAYS - 1) : prev));
    setOverrides({});
  };
  const changeEnd = (value: string) => {
    if (!value) return;
    setEndDate(value < startDate ? startDate : value > lastAllowed ? lastAllowed : value);
    // A saved plan keeps its day pattern when it gets longer (the new days are simply empty).
    if (!source) setOverrides({});
  };
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
      : entry.items.map((item) => foodName(item.food)).slice(0, 2).join(' + '));
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
    const from = entryFor(active.key);
    if (!entryValid(from)) return;
    setEntries((prev) => {
      const copy = { ...prev };
      for (const t of targets)
        if (!entryValid(copy[t.key] ?? emptyEntry()))
          copy[t.key] = { kind: from.kind, title: from.title, note: from.note, items: from.items.map((i) => ({ ...i })) };
      return copy;
    });
  };

  // ----- Earlier plans of the same meal, one tap away -----
  const suggestionsFor = (target: PlanTarget): PlanSuggestion[] => {
    const found: PlanSuggestion[] = [];
    const seen = new Set<string>();
    const add = (key: string, date: string, entry: PlanEntry) => {
      if (!entryValid(entry)) return;
      const signature = entry.kind === 'note' ? `note:${entry.note.trim()}` : entry.items.map((i) => `${i.food.id}:${i.amount}`).join('|');
      if (seen.has(signature)) return;
      seen.add(signature);
      found.push({ key, date, entry });
    };
    // Meals of the same kind planned on earlier days, here in this plan first and then in the saved plans; newest first.
    targets
      .filter((o) => o.slot === target.slot && o.date < target.date)
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((o) => add(`draft-${o.key}`, o.date, entryFor(o.key)));
    plans
      .filter((p) => p.slot === target.slot && p.date < target.date && p.id !== plan?.id && (!group || p.groupId !== group.id))
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((p) => add(`saved-${p.id}`, p.date, { kind: p.kind, items: p.items, title: plannedMealName(p), note: p.note }));
    return found.slice(0, 6);
  };

  // ----- Draft and closing -----
  const hasContent = (e: PlanEntry) => e.items.length > 0 || e.note.trim().length > 0 || e.title.trim().length > 0;
  const hasWork = !plan && !group && (step === 'plan' || (!reuse && Object.values(entries).some(hasContent)));
  // Editing a whole saved plan: closing after a change asks before the change is thrown away.
  const snapshot = () => JSON.stringify({ name, startDate, endDate, overrides, selectedSlots, entries });
  const [initialSnapshot] = useState(snapshot);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const requestClose = () => {
    if (hasWork) setConfirmClose(true);
    else if (group && snapshot() !== initialSnapshot) setConfirmDiscard(true);
    else onClose();
  };
  const saveDraft = () => {
    const kept = savePlannerDraft({ step, name, startDate, endDate, skippedWeekdays, overrides, selectedSlots, entries, preferredKind, activeKey });
    setConfirmClose(false);
    if (kept) onClose();
    else setError(j('Not enough device storage to keep the draft. Export a backup and free some space.', 'Spazio insufficiente per la bozza. Esporta un backup e libera spazio.'));
  };
  const discardPlan = () => {
    // A draft that was continued is thrown away with the plan; an older, untouched draft stays.
    if (fromDraft) clearPlannerDraft();
    setConfirmClose(false);
    onClose();
  };
  const continueDraft = (d: PlannerDraft) => {
    setName(d.name ?? '');
    setStartDate(d.startDate);
    setEndDate(d.endDate);
    setSkippedWeekdays(d.skippedWeekdays);
    setOverrides(d.overrides);
    setSelectedSlots(d.selectedSlots.length ? d.selectedSlots : ['lunch']);
    setEntries(d.entries);
    setPreferredKind(d.preferredKind);
    setActiveKey(d.activeKey);
    setStep(d.step);
    setFromDraft(true);
    setDraft(null);
  };
  const deleteDraft = () => {
    const removed = loadPlannerDraft();
    clearPlannerDraft();
    setDraft(null);
    if (removed) offerRemovalUndo(() => {
      if (!loadPlannerDraft()) { savePlannerDraft(removed); setDraft(removed); }
    });
  };

  // The plan's name; a plan saved without one (an old draft) gets its dates as name.
  const planName = (name.trim() || `${journalDate(startDate, language)} - ${journalDate(endDate, language)}`).slice(0, 80);
  const save = () => {
    const next: MealPlan[] = targets
      .filter((t) => entryValid(entryFor(t.key)))
      .map((t) => {
        const entry = entryFor(t.key);
        return {
          id: plan && t.key === `${plan.date}|${plan.slot}` ? plan.id : entry.planId ?? journalId(),
          date: t.date,
          slot: t.slot,
          kind: entry.kind,
          title: summary(entry),
          note: entry.note.trim(),
          items: entry.kind === 'food' ? entry.items : [],
          read: entry.read ?? false,
          ...(entry.loggedAt ? { loggedAt: entry.loggedAt } : {}),
          // Editing a single meal keeps its plan; a new, reused or edited plan is saved as one named group below.
          ...(plan?.groupId ? { groupId: plan.groupId } : {}),
        };
      });
    if (next.length === 0) return;
    try {
      if (plan) saveMealPlans(next, plan.id);
      else savePlanGroup({ id: group?.id ?? journalId(), name: planName, createdAt: group?.createdAt || new Date().toISOString() }, next);
      if (fromDraft) clearPlannerDraft();
      onClose();
    } catch {
      setError(j('Not enough device storage. Export a backup and free some space.', 'Spazio insufficiente. Esporta un backup e libera spazio.'));
    }
  };

  const nextButton = (
    <button type="button" className="journal-primary-button" disabled={targets.length === 0 || !name.trim()} onClick={startPlanning}>
      {!name.trim()
        ? j('Choose a name for the plan', 'Scegli un nome per il programma')
        : targets.length === 0
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
        {(plan || group) && (
          <button type="button" className="journal-secondary-button journal-danger-button" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} />
            {group ? j('Delete whole plan', 'Elimina tutto il programma') : j('Delete plan', 'Elimina programma')}
          </button>
        )}
        <button type="button" className="journal-primary-button" disabled={planned === 0} onClick={save}>
          <Check size={17} />
          {group
            ? j('Save changes', 'Salva modifiche')
            : planned > 1
              ? j(`Save ${planned} meals`, `Salva ${planned} pasti`)
              : j('Save plan', 'Salva programma')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen
        onClose={requestClose}
        title={plan ? j('Edit meal plan', 'Modifica programma') : group ? group.name : reuse ? j('Reuse a plan', 'Riusa un programma') : j('Plan meals', 'Pianifica i pasti')}
        subtitle={
          plan
            ? undefined
            : group && step === 'plan'
              ? j('Edit the plan · meals, days and name', 'Modifica il programma · pasti, giorni e nome')
            : step === 'setup'
              ? j('Step 1 of 2 · Choose the days and meals', 'Passo 1 di 2 · Scegli giorni e pasti')
              : j('Step 2 of 2 · Plan each meal', 'Passo 2 di 2 · Pianifica ogni pasto')
        }
        maxWidth="max-w-xl"
        footer={step === 'plan' ? planFooter : <div className="journal-plan-footer">{error && <p role="alert" className="journal-error">{error}</p>}{nextButton}</div>}
      >
        {step === 'setup' ? (
          <div className="journal-form" data-planner-step="setup">
            {draft && (
              <div className="journal-draft-card" role="group" aria-label={j('Saved draft', 'Bozza salvata')}>
                <span className="journal-draft-icon"><FileText size={18} /></span>
                <span className="journal-draft-text">
                  <strong>{j('Continue your draft', 'Riprendi la bozza')}</strong>
                  <small>
                    {journalDate(draft.startDate, language)} - {journalDate(draft.endDate, language)} · {j(`${draftPlannedCount(draft)} meals planned`, `${draftPlannedCount(draft)} pasti pianificati`)}
                  </small>
                </span>
                <button type="button" className="journal-draft-continue" onClick={() => continueDraft(draft)}>
                  {j('Continue', 'Continua')}
                </button>
                <button type="button" className="journal-draft-delete" aria-label={j('Delete draft', 'Elimina bozza')} title={j('Delete draft', 'Elimina bozza')} onClick={deleteDraft}>
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            <label className="journal-plan-name">
              <span>{j('Name of the plan', 'Nome del programma')}</span>
              <input
                type="text"
                value={name}
                maxLength={60}
                autoComplete="off"
                data-plan-name
                placeholder={j('e.g. Cutting week, Holiday menu', 'es. Settimana light, Menu delle vacanze')}
                onChange={(e) => setName(e.target.value)}
              />
              <small>{j('Asked once for the whole plan, not for every meal.', 'Lo chiediamo una volta per tutto il programma, non per ogni pasto.')}</small>
            </label>

            <div className="journal-date-pair" role="group" aria-label={j('First and last day', 'Primo e ultimo giorno')}>
              <JournalDateField
                caption={j('First day', 'Primo giorno')}
                value={startDate}
                onChange={changeStart}
                label={j('First day of the plan', 'Primo giorno del programma')}
              />
              <JournalDateField
                caption={j('Last day', 'Ultimo giorno')}
                value={endDate}
                min={startDate}
                max={lastAllowed}
                onChange={changeEnd}
                label={j('Last day of the plan', 'Ultimo giorno del programma')}
              />
            </div>

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
                  {group ? j('Name, days and meals', 'Nome, giorni e pasti') : j('Days and meals', 'Giorni e pasti')}
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
                const already = plans.filter((p) => p.date === t.date && p.slot === t.slot && p.id !== plan?.id && (!group || p.groupId !== group.id)).length;
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
                          <strong>
                            {label(t.slot)}
                            <span className="journal-meal-card-date" data-plan-date>
                              {' · '}
                              {journalDate(t.date, language, { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                          </strong>
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
                            slot={t.slot}
                            suggestions={suggestionsFor(t)}
                            onChange={(next) => {
                              setPreferredKind(next.kind);
                              setEntries((prev) => ({ ...prev, [t.key]: next }));
                            }}
                            removeItem={(index) => removeWithUndo(entry.items, index, (change) => setEntries((prev) => {
                              const current = prev[t.key];
                              return current ? { ...prev, [t.key]: { ...current, items: change(current.items) } } : prev;
                            }), undoScope)}
                            name={foodName}
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
      <SaveBeforeCloseDialog
        open={confirmClose}
        title={j('Close the meal planner?', 'Chiudere il pianificatore?')}
        message={j('Your plan is not finished. Keep it as a draft to continue it next time, or discard it.', 'Il programma non e finito. Salvalo come bozza per riprenderlo la prossima volta, oppure eliminalo.')}
        detail={j(`${planned} of ${targets.length} meals planned`, `${planned} di ${targets.length} pasti pianificati`)}
        saveLabel={j('Save as draft', 'Salva come bozza')}
        discardLabel={j('Discard', 'Elimina')}
        keepLabel={j('Keep planning', 'Continua')}
        onSave={saveDraft}
        onDiscard={discardPlan}
        onKeepEditing={() => setConfirmClose(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        message={
          group
            ? j('Delete this whole plan with all its meals and its shopping list? Your logged food will not be changed.', 'Eliminare tutto il programma con i suoi pasti e la lista della spesa? Gli alimenti registrati non cambieranno.')
            : j('Delete this meal plan? Your logged food will not be changed.', 'Eliminare il programma? Gli alimenti registrati non cambieranno.')
        }
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (group) removePlanGroup(group.id);
          else if (plan) removeMealPlan(plan.id);
          onClose();
        }}
      />
      <ConfirmDialog
        open={confirmDiscard}
        message={j('Discard your changes to this plan?', 'Eliminare le modifiche a questo programma?')}
        confirmLabel={j('Discard', 'Elimina')}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
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
function MealEntryEditor({ entry, slot, suggestions, onChange, removeItem, name }: {
  entry: PlanEntry;
  slot: MealSlotId;
  suggestions: PlanSuggestion[];
  onChange: (entry: PlanEntry) => void;
  removeItem: (index: number) => void;
  name: (f: PlannedFood['food']) => string;
}) {
  const { allFoods, preBuiltMeals, favoriteFoods, allDayLogs, rememberFood, language, settings, t } = useApp();
  const j = useJournalText();
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState(100);
  // Favourites only show up once the user starts looking for a food (field focused or one letter typed), like in Add food.
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<number | null>(null);
  useEffect(() => () => { if (blurTimer.current) window.clearTimeout(blurTimer.current); }, []);
  const onFocus = () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    setFocused(true);
  };
  const onBlur = () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    blurTimer.current = window.setTimeout(() => setFocused(false), 140);
  };
  const { kind, items, title, note } = entry;
  const patch = (next: Partial<PlanEntry>) => onChange({ ...entry, ...next });
  // "Meal name" is an option: a button until it is used ('new' = just opened, so the field takes the focus).
  const [naming, setNaming] = useState<'off' | 'new' | 'saved'>(() => (title.trim() ? 'saved' : 'off'));
  const q = query.trim();
  // Results follow the typing a moment later; the catalogue is searched in a worker (utils/catalogueSearch.ts) and
  // only once two characters are typed.
  const resultsQuery = useDeferredValue(q);
  const { foods: catalogueFoods, pending: cataloguePending } = useCatalogueSearch(resultsQuery, true, 30);

  const results = useMemo(() => {
    if (resultsQuery.length < 2) return { foods: [] as FoodItem[], meals: [] as typeof preBuiltMeals };
    const local = searchFoods(allFoods, resultsQuery);
    const seen = new Set(local.map((x) => x.f.id));
    const catalogue = catalogueFoods
      .filter((f) => !seen.has(f.id))
      .map((f) => ({ f, score: catalogueScore(resultsQuery) }));
    const ranked = [...local, ...catalogue].sort((a, b) => a.score - b.score);
    return {
      foods: pinCoherentFavorites(ranked, favoriteFoods, (x) => x.f.id, (x) => x.score, resultsQuery).slice(0, 30).map((x) => x.f),
      meals: searchMeals(preBuiltMeals, resultsQuery).slice(0, 6).map((x) => x.m),
    };
  }, [resultsQuery, allFoods, catalogueFoods, favoriteFoods, preBuiltMeals]);

  const favorites = useMemo(() => {
    const byId = new Map(allFoods.map((f) => [f.id, f]));
    return favoriteFoods.map((id) => byId.get(id)).filter((f): f is FoodItem => Boolean(f));
  }, [allFoods, favoriteFoods]);
  const oneCharMatches = useMemo(() => (q.length === 1 ? favorites.filter((f) => matchesFirstChar(f, q)) : []), [favorites, q]);
  // The three quick food shortcuts of Settings (default salt, bread, olive oil), like in Add food.
  const quickFoods = useMemo(
    () => settings.quickFoods.map((id) => allFoods.find((f) => f.id === id)).filter((f): f is FoodItem => Boolean(f)),
    [settings.quickFoods, allFoods],
  );
  // Foods logged most recently in this meal: 5 are shown, the "..." chip reveals 10 more.
  const recent = useMemo(() => {
    const byId = new Map(allFoods.map((f) => [f.id, f]));
    const seen = new Set<string>();
    const out: FoodItem[] = [];
    for (const date of Object.keys(allDayLogs).sort().reverse()) {
      for (const item of (allDayLogs[date].meals[slot] ?? []).slice().reverse()) {
        if (seen.has(item.foodId)) continue;
        seen.add(item.foodId);
        const found = byId.get(item.foodId);
        if (found) out.push(found);
      }
      if (out.length >= RECENT_SHOWN + RECENT_MORE) break;
    }
    return out.slice(0, RECENT_SHOWN + RECENT_MORE);
  }, [allDayLogs, allFoods, slot]);
  const slotMeals = useMemo(() => preBuiltMeals.filter((m) => !m.slot || m.slot === slot).slice(0, 8), [preBuiltMeals, slot]);
  const sameKind = suggestions.filter((s) => s.entry.kind === kind);
  const entrySummary = (e: PlanEntry) =>
    e.title.trim() || (e.kind === 'note' ? e.note.trim().split('\n')[0] : e.items.map((i) => name(i.food)).slice(0, 2).join(' + '));
  const entryKcal = (e: PlanEntry) => Math.round(e.items.reduce((sum, i) => sum + (i.food.calories * i.amount) / 100, 0));
  const applySuggestion = (s: PlanSuggestion) => {
    if (s.entry.kind === 'food') patch({ items: [...items, ...s.entry.items.map((i) => ({ ...i }))], title: title || s.entry.title });
    else patch({ note: s.entry.note, title: title || s.entry.title });
  };

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
  const favoritesPanel = (list: FoodItem[]) => (
    <div className="rounded-2xl bg-[var(--inset)] border border-[var(--border)] overflow-hidden" data-planner-favorites>
      <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-[var(--border)]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">{t.favorites.title}</span>
        <span className="text-[10px] font-medium text-[var(--muted)]">{t.favorites.hint}</span>
      </div>
      {list.length === 0 ? (
        <p className="p-4 text-center text-xs font-medium text-[var(--muted)]">{t.favorites.empty}</p>
      ) : (
        <div className="max-h-72 overflow-y-auto overscroll-contain divide-y divide-[var(--border)]">
          {list.map((f) => (
            <FoodResultRow key={f.id} food={f} favorite onClick={() => pick(f)} />
          ))}
        </div>
      )}
    </div>
  );
  const earlierPlans = sameKind.length > 0 && (
    <div data-planner-earlier>
      <span className="journal-quick-label"><History size={12} /> {j('Planned on earlier days', 'Pianificati nei giorni scorsi')}</span>
      <div className="journal-plan-suggestions">
        {sameKind.map((s) => (
          <button key={s.key} type="button" className="journal-plan-suggestion is-past" onClick={() => applySuggestion(s)}>
            <History size={14} className="journal-plan-suggestion-icon" />
            <span>
              <strong>{entrySummary(s.entry)}</strong>
              <small>{journalDate(s.date, language, { weekday: 'short', day: 'numeric', month: 'short' })}{s.entry.kind === 'food' ? ` · ${entryKcal(s.entry)} kcal` : ''}</small>
            </span>
            <Plus size={16} />
          </button>
        ))}
      </div>
    </div>
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

      <div className="journal-meal-name" data-meal-name>
        {naming === 'off' ? (
          <button type="button" className="journal-secondary-button" aria-expanded={false} onClick={() => setNaming('new')}>
            <Tag size={15} />
            {j('Meal name', 'Nome del pasto')}
          </button>
        ) : (
          <label>
            {j('Meal name', 'Nome del pasto')}
            <input
              value={title}
              maxLength={160}
              autoFocus={naming === 'new'}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={j('Optional, e.g. Pasta night', 'Facoltativo, es. Serata pasta')}
            />
          </label>
        )}
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
              <AmountSelector value={amount} onChange={setAmount} unit={pending.unit} food={pending} />
              <FoodMacroGrid food={pending} amount={amount} />
              <button
                type="button"
                className="journal-primary-button"
                disabled={amount <= 0}
                onClick={() => {
                  setLastAmount(pending.id, amount);
                  patch({ items: [...items, { food: pending, amount }] });
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
              <JournalSearch
                value={query}
                onChange={setQuery}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder={j('Search foods, saved meals or recipes', 'Cerca alimenti, pasti o ricette')}
              />
              {q.length >= 2 ? (
                <div className="journal-picker-results" data-planner-results>
                  {results.meals.map((meal) => (
                    <button type="button" key={meal.id} onClick={() => addMeal(meal)}>
                      <span>
                        <strong>{meal.name}</strong>
                        <small className="journal-tone-badge is-meal">{j('Saved meal', 'Pasto salvato')}</small>
                      </span>
                      <span className="journal-tone-circle is-meal"><UtensilsCrossed size={13} /></span>
                    </button>
                  ))}
                  {results.foods.map((food) => (
                    <FoodResultRow key={food.id} food={food} favorite onClick={() => pick(food)} />
                  ))}
                  {results.foods.length === 0 && results.meals.length === 0 && !cataloguePending && resultsQuery === q && (
                    <JournalEmpty>{j('No foods found. Try another ingredient.', 'Nessun risultato. Prova un altro ingrediente.')}</JournalEmpty>
                  )}
                </div>
              ) : q.length === 1 && oneCharMatches.length > 0 ? (
                favoritesPanel(oneCharMatches)
              ) : (
                <div className="journal-quick-foods">
                  {q.length === 1 && <p className="journal-result-count">{j('Type at least 2 letters.', 'Scrivi almeno 2 lettere.')}</p>}
                  {q.length === 0 && focused && favoritesPanel(favorites)}
                  {quickFoods.length > 0 && (
                    <div className="journal-quick-food-grid" data-planner-quick-foods>
                      {quickFoods.map((f) => (
                        <button key={f.id} type="button" onClick={() => pick(f)}>
                          <strong>{name(f)}</strong>
                          <small>{f.calories} kcal/100{f.unit}</small>
                        </button>
                      ))}
                    </div>
                  )}
                  {earlierPlans}
                  {slotMeals.length > 0 && (
                    <div>
                      <span className="journal-quick-label"><UtensilsCrossed size={12} /> {j('Saved meals', 'Pasti salvati')}</span>
                      <div className="journal-food-chips">
                        {slotMeals.map((meal) => (
                          <button key={meal.id} type="button" className="journal-food-chip is-meal" onClick={() => addMeal(meal)}>
                            <UtensilsCrossed size={12} />
                            {meal.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {recent.length > 0 && (
                    <div>
                      <span className="journal-quick-label"><Clock size={12} /> {j('Recent', 'Recenti')}</span>
                      <RecentChips
                        items={recent}
                        getKey={(food) => food.id}
                        className="journal-food-chips"
                        toggleClassName="journal-food-chip journal-recent-more"
                        renderChip={(food) => (
                          <button type="button" className={`journal-food-chip${food.isRecipe ? ' is-recipe' : ''}`} onClick={() => pick(food)}>
                            {name(food)}
                          </button>
                        )}
                      />
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
                  <button aria-label={`${j('Remove', 'Rimuovi')} ${name(item.food)}`} type="button" onClick={() => removeItem(index)}>
                    <X size={15} />
                  </button>
                </div>
              ))}
              <p className="journal-result-count" data-language={language}>{kcal} kcal</p>
            </div>
          )}
        </>
      ) : (
        <>
        {earlierPlans}
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
        </>
      )}
    </div>
  );
}
