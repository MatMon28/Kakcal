import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { useJournalData, useSettings, useUiState } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useMealSlots } from '../../utils/mealSlots';
import { addDaysToDateString } from '../../utils/formatters';
import {
  plannedLogItems,
  removeMealPlan,
  updateMealPlan,
  useMealJournal,
  usePlansForSlot,
} from '../../utils/journalStore';
import type { MealSlotId } from '../../types';
import type { MealPlan } from '../../types/journal';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MealSlotIcon } from '../common/mealSlotIcon';
import { MealSummaryCard } from './MealSummaryCard';
import { PlanTransfer } from './PlanTransfer';
import { PlanWizard } from './PlannerWizard';
import { PlanLibrary } from './PlanLibrary';
import type { PlanGroupView } from '../../utils/planGroups';
import { OPEN_PLANNER_EVENT } from './CustomShortcuts';
import { JournalEmpty, JournalSection, journalDate } from './JournalUI';

export function MealPlanner() {
  const { selectedDate } = useUiState();
  const { language } = useSettings();
  const { label } = useMealSlots();
  const { plans } = useMealJournal();
  const j = useJournalText();
  const [date, setDate] = useState(selectedDate);
  const [weekStart, setWeekStart] = useState(selectedDate);
  const [editing, setEditing] = useState<MealPlan | 'new' | null>(null);
  // A plan that is open for reading (the Today-style meal view); Edit opens the editor.
  const [viewing, setViewing] = useState<MealPlan | null>(null);
  const [query, setQuery] = useState('');
  // "See all plans", and the two ways of opening a saved plan in the planner: edit it as a whole, or reuse it.
  const [library, setLibrary] = useState(false);
  const [wizard, setWizard] = useState<{ mode: 'edit' | 'reuse'; group: PlanGroupView } | null>(null);
  // The Custom page shortcut button opens the planner.
  useEffect(() => {
    const open = () => setEditing('new');
    window.addEventListener(OPEN_PLANNER_EVENT, open);
    return () => window.removeEventListener(OPEN_PLANNER_EVENT, open);
  }, []);
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
        icon={<CalendarDays size={16} strokeWidth={2.2} />}
        count={plans.length}
        searchLabel={j('Search planned meals', 'Cerca nei pasti pianificati')}
        query={query}
        setQuery={setQuery}
        createLabel={j('Plan a meal', 'Pianifica un pasto')}
        onCreate={() => setEditing('new')}
        extraActions={<PlanTransfer plans={plans} weekStart={weekStart} />}
      >
        {searching ? (
          <div className="journal-plan-list">
            {found.length === 0 ? (
              <JournalEmpty>{j('No planned meals match.', 'Nessun pasto pianificato corrisponde.')}</JournalEmpty>
            ) : (
              found.map((plan) => <PlanRow key={plan.id} plan={plan} onOpen={() => setViewing(plan)} />)
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
                dayPlans.map((plan) => <PlanRow key={plan.id} plan={plan} onOpen={() => setViewing(plan)} />)
              )}
            </div>
            <button type="button" className="journal-secondary-button journal-see-all" data-see-all-plans onClick={() => setLibrary(true)}>
              {j('See all plans', 'Vedi tutti i programmi')}
              <ArrowUpRight size={14} />
            </button>
          </>
        )}
      </JournalSection>
      {viewing && (
        <PlanDetails
          plan={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      )}
      {editing && (
        <PlanWizard
          initialDate={date}
          plan={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {library && (
        <PlanLibrary
          onClose={() => setLibrary(false)}
          onEdit={(group) => {
            setLibrary(false);
            setWizard({ mode: 'edit', group });
          }}
          onReuse={(group) => {
            setLibrary(false);
            setWizard({ mode: 'reuse', group });
          }}
          onOpenMeal={(plan) => {
            setLibrary(false);
            setViewing(plan);
          }}
        />
      )}
      {wizard && (
        <PlanWizard
          initialDate={date}
          group={wizard.mode === 'edit' ? wizard.group : undefined}
          reuse={wizard.mode === 'reuse' ? wizard.group : undefined}
          onClose={() => setWizard(null)}
        />
      )}
    </>
  );
}

/**
 * One planned meal, laid out like a Meal diary preview: the colourless meal icon Today uses, the date, the meal name and
 * (only when the plan has a note) the note underneath.
 */
function PlanRow({ plan, onOpen }: { plan: MealPlan; onOpen: () => void }) {
  const { language } = useSettings();
  const { label } = useMealSlots();
  const note = plan.note.trim();
  return (
    <button type="button" className="journal-plan-row" onClick={onOpen}>
      <span className="journal-plan-row-icon">
        <MealSlotIcon slot={plan.slot} size={20} />
      </span>
      <span>
        <small>{journalDate(plan.date, language, { weekday: 'short', day: 'numeric', month: 'short' })}</small>
        <strong>{label(plan.slot)}</strong>
        {note && <span className="journal-plan-row-note">{note}</span>}
      </span>
      {plan.loggedAt ? <Check size={16} /> : <ChevronRight size={16} />}
    </button>
  );
}

/** Opens a plan the way Today opens a meal: the same meal card (icon, kcal, macros, foods), with the plan note inside. */
function PlanDetails({ plan, onClose, onEdit }: { plan: MealPlan; onClose: () => void; onEdit: () => void }) {
  const { language } = useSettings();
  const { logItemsToSlot } = useJournalData();
  const { label } = useMealSlots();
  const j = useJournalText();
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const note = plan.note.trim();
  const firstLine = note.split('\n')[0];
  // The plan name is only worth a second line when it adds something beyond the note itself.
  const subtitle = plan.title && plan.title !== firstLine ? plan.title : undefined;
  const items = plannedLogItems(plan, language);
  const logPlan = () => {
    try {
      logItemsToSlot(plan.slot, items, plan.date);
      updateMealPlan(plan.id, { loggedAt: new Date().toISOString() });
      onClose();
    } catch {
      setError(
        j(
          'Could not save. Please free some device storage.',
          'Salvataggio non riuscito. Libera spazio sul dispositivo.',
        ),
      );
    }
  };
  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={journalDate(plan.date, language, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        maxWidth="max-w-lg"
      >
        <div className="journal-form">
          <MealSummaryCard
            slot={plan.slot}
            title={label(plan.slot)}
            subtitle={subtitle}
            items={items}
            trailing={plan.loggedAt ? <Check size={18} aria-label={j('Logged', 'Registrato')} /> : undefined}
          >
            {note && (
              <div className="journal-inline-memory">
                <NotebookPen size={15} />
                <p>{note}</p>
              </div>
            )}
          </MealSummaryCard>
          {error && (
            <p role="alert" className="journal-error">
              {error}
            </p>
          )}
          <div className="journal-form-actions">
            <button
              type="button"
              className="journal-secondary-button journal-danger-button"
              onClick={() => setConfirmDelete(true)}
              aria-label={j('Delete plan', 'Elimina programma')}
              title={j('Delete plan', 'Elimina programma')}
            >
              <Trash2 size={16} />
            </button>
            <button type="button" className="journal-secondary-button" onClick={onEdit}>
              <Pencil size={15} />
              {j('Edit', 'Modifica')}
            </button>
            {items.length > 0 && !plan.loggedAt && (
              <button type="button" className="journal-primary-button" onClick={logPlan}>
                <Plus size={16} />
                {j('Add to this meal', 'Aggiungi al pasto')}
              </button>
            )}
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        message={j(
          'Delete this meal plan? Your logged food will not be changed.',
          'Eliminare il programma? Gli alimenti registrati non cambieranno.',
        )}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          removeMealPlan(plan.id);
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
  const { language } = useSettings();
  const { logItemsToSlot } = useJournalData();
  const j = useJournalText();
  const [error, setError] = useState('');
  // Indexed (C5): the planned, not yet logged meals of this day and slot, in the same order as the old filter + sort.
  const matching = usePlansForSlot(date, slot);
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
