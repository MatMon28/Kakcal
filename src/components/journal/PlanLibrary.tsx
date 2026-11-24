import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { useSettings } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useMealSlots } from '../../utils/mealSlots';
import { useToday } from '../../utils/useToday';
import { removePlanGroup, useMealJournal } from '../../utils/journalStore';
import { planGroupViews, splitPlans, type PlanGroupView } from '../../utils/planGroups';
import type { MealPlan } from '../../types/journal';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { JournalEmpty, journalDate } from './JournalUI';

/** "12 Nov - 18 Nov" (with the year for plans that are over). */
export function planRange(g: Pick<PlanGroupView, 'start' | 'end'>, language: string, withYear: boolean) {
  const options: Intl.DateTimeFormatOptions = withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' };
  return g.start === g.end ? journalDate(g.start, language, options) : `${journalDate(g.start, language, options)} - ${journalDate(g.end, language, options)}`;
}

/**
 * "See all plans": every named plan, current ones (still running or coming up) first and past ones below.
 * Pressing a plan opens it for editing; the copy button reuses it as the starting point of a new plan (the planner's
 * first page, already filled in); the bin deletes it. Meals planned one by one before plans had names are listed at the
 * bottom and open as single meals.
 */
export function PlanLibrary({
  onClose,
  onEdit,
  onReuse,
  onOpenMeal,
}: {
  onClose: () => void;
  onEdit: (group: PlanGroupView) => void;
  onReuse: (group: PlanGroupView) => void;
  onOpenMeal: (plan: MealPlan) => void;
}) {
  const { language } = useSettings();
  const { label } = useMealSlots();
  const { plans, planGroups } = useMealJournal();
  const j = useJournalText();
  const today = useToday();
  const [pendingDelete, setPendingDelete] = useState<PlanGroupView | null>(null);
  const [showUngrouped, setShowUngrouped] = useState(false);
  const { current, past, ungrouped } = useMemo(() => splitPlans(planGroupViews(plans, planGroups), today), [plans, planGroups, today]);

  const card = (g: PlanGroupView, isPast: boolean) => (
    <li key={g.id} className={`journal-plan-card ${isPast ? 'is-past' : ''}`} data-plan-card={g.id}>
      <button type="button" className="journal-plan-card-main" onClick={() => onEdit(g)}>
        <span className="journal-plan-row-icon">
          <CalendarDays size={20} />
        </span>
        <span>
          <strong>{g.name}</strong>
          <small>{planRange(g, language, isPast)}</small>
          <small>
            {j(`${g.days} ${g.days === 1 ? 'day' : 'days'} · ${g.plans.length} meals`, `${g.days} ${g.days === 1 ? 'giorno' : 'giorni'} · ${g.plans.length} pasti`)}
          </small>
        </span>
        <ChevronRight size={16} />
      </button>
      <div className="journal-plan-card-actions">
        <button type="button" data-plan-reuse className="journal-secondary-button" onClick={() => onReuse(g)}>
          <Copy size={14} />
          {j('Reuse', 'Riusa')}
        </button>
        <button
          type="button"
          className="journal-secondary-button journal-danger-button"
          aria-label={`${j('Delete plan', 'Elimina programma')} ${g.name}`}
          title={j('Delete plan', 'Elimina programma')}
          onClick={() => setPendingDelete(g)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );

  return (
    <>
      <Modal isOpen onClose={onClose} title={j('All plans', 'Tutti i programmi')} subtitle={j('Press a plan to change it, or reuse it for a new one', 'Tocca un programma per modificarlo, oppure riusalo per uno nuovo')} maxWidth="max-w-xl">
        <div className="journal-form" data-plan-library>
          <section>
            <h3 className="journal-plan-day">{j(`Current plans · ${current.length}`, `Programmi in corso · ${current.length}`)}</h3>
            {current.length === 0 ? (
              <JournalEmpty>{j('No current plan. Press + in the planner to make one.', 'Nessun programma in corso. Premi + nel pianificatore per crearne uno.')}</JournalEmpty>
            ) : (
              <ul className="journal-plan-cards">{current.map((g) => card(g, false))}</ul>
            )}
          </section>
          <section>
            <h3 className="journal-plan-day">{j(`Past plans · ${past.length}`, `Programmi passati · ${past.length}`)}</h3>
            {past.length === 0 ? (
              <JournalEmpty>{j('Plans whose last day has passed show up here.', 'I programmi il cui ultimo giorno e passato compaiono qui.')}</JournalEmpty>
            ) : (
              <ul className="journal-plan-cards">{past.map((g) => card(g, true))}</ul>
            )}
          </section>
          {ungrouped && (
            <section>
              <button type="button" className="journal-secondary-button" aria-expanded={showUngrouped} onClick={() => setShowUngrouped((v) => !v)}>
                {j(`Single meals planned without a plan · ${ungrouped.plans.length}`, `Pasti singoli senza programma · ${ungrouped.plans.length}`)}
              </button>
              {showUngrouped && (
                <ul className="journal-plan-cards">
                  {ungrouped.plans.map((p) => (
                    <li key={p.id} className="journal-plan-card">
                      <button type="button" className="journal-plan-card-main" onClick={() => onOpenMeal(p)}>
                        <span>
                          <strong>{label(p.slot)}</strong>
                          <small>{journalDate(p.date, language, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        open={pendingDelete !== null}
        message={
          pendingDelete
            ? j(`Delete the plan "${pendingDelete.name}" with all its meals and its shopping list? Your logged food will not be changed.`, `Eliminare il programma "${pendingDelete.name}" con tutti i pasti e la lista della spesa? Gli alimenti registrati non cambieranno.`)
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removePlanGroup(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
