import { useMemo, useState } from 'react';
import { Check, ChevronRight, Pencil, Plus, RefreshCw, ShoppingCart, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useToday } from '../../utils/useToday';
import { journalId, removeShoppingList, saveShoppingList, useMealJournal } from '../../utils/journalStore';
import { planGroupViews, splitPlans, type PlanGroupView } from '../../utils/planGroups';
import {
  addCustomShoppingItem,
  boughtCount,
  buildShoppingItems,
  createShoppingList,
  formatQuantity,
  isShoppingListOutdated,
  removeShoppingItem,
  syncShoppingList,
  toggleShoppingItem,
} from '../../utils/shoppingList';
import type { FoodItem } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { JournalEmpty, JournalSection } from './JournalUI';
import { planRange } from './PlanLibrary';

/** Looks a food up by id (all foods, recipes and the offline index the app already keeps in memory). */
function useFoodLookup() {
  const { allFoods } = useApp();
  return useMemo(() => {
    const byId = new Map<string, FoodItem>(allFoods.map((f) => [f.id, f]));
    return (id: string) => byId.get(id);
  }, [allFoods]);
}

/**
 * Custom > Shopping list (below the planner). One list per plan: **+** asks which plan, then adds up every food the
 * plan needs (recipes are broken down into their ingredients) with the total quantity. Open a list to tick what was
 * bought; the pencil switches to editing, where lines can be removed and new ones added.
 */
export function ShoppingLists() {
  const { language } = useApp();
  const { plans, planGroups, shoppingLists } = useMealJournal();
  const j = useJournalText();
  const today = useToday();
  const foodById = useFoodLookup();
  const [picking, setPicking] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { current, past } = useMemo(() => splitPlans(planGroupViews(plans, planGroups), today), [plans, planGroups, today]);
  const named = useMemo(() => new Map([...current, ...past].map((g) => [g.id, g])), [current, past]);
  const lists = shoppingLists.filter((l) => named.has(l.planId));

  const choose = (g: PlanGroupView) => {
    if (!shoppingLists.some((l) => l.planId === g.id)) saveShoppingList(createShoppingList(g.plans, g.id, foodById, language));
    setPicking(false);
    setOpenId(g.id);
  };

  const pickRow = (g: PlanGroupView, isPast: boolean) => {
    const has = shoppingLists.some((l) => l.planId === g.id);
    return (
      <li key={g.id}>
        <button type="button" className="journal-plan-card-main" data-shopping-pick={g.id} onClick={() => choose(g)}>
          <span className="journal-plan-row-icon">
            <ShoppingCart size={18} />
          </span>
          <span>
            <strong>{g.name}</strong>
            <small>{planRange(g, language, isPast)}</small>
            <small>{has ? j('Already has a list · open it', 'Ha gia una lista · aprila') : j(`${g.plans.length} meals`, `${g.plans.length} pasti`)}</small>
          </span>
          {has ? <Check size={16} /> : <Plus size={16} />}
        </button>
      </li>
    );
  };

  return (
    <>
      <JournalSection
        tone="teal"
        className="journal-shopping"
        title={j('Shopping list', 'Lista della spesa')}
        icon={<ShoppingCart size={16} strokeWidth={2.2} />}
        count={lists.length}
        createLabel={j('Create a shopping list', 'Crea una lista della spesa')}
        onCreate={() => setPicking(true)}
      >
        {lists.length === 0 ? (
          <JournalEmpty>
            {named.size === 0
              ? j('Plan some meals first. Then press + to turn a plan into a shopping list.', 'Pianifica prima dei pasti. Poi premi + per trasformare un programma in lista della spesa.')
              : j('Press + to choose a plan and list everything you need to buy for it.', 'Premi + per scegliere un programma ed elencare tutto quello da comprare.')}
          </JournalEmpty>
        ) : (
          <ul className="journal-plan-cards" data-shopping-lists>
            {lists.map((list) => {
              const g = named.get(list.planId);
              const bought = boughtCount(list);
              const percent = list.items.length ? Math.round((bought / list.items.length) * 100) : 0;
              return (
                <li key={list.planId} className="journal-plan-card">
                  <button type="button" className="journal-plan-card-main" onClick={() => setOpenId(list.planId)}>
                    <span className="journal-plan-row-icon">
                      <ShoppingCart size={18} />
                    </span>
                    <span>
                      <strong>{g?.name}</strong>
                      <small>{j(`${bought} of ${list.items.length} bought`, `${bought} di ${list.items.length} comprati`)}</small>
                      <span className="journal-shopping-progress" aria-hidden="true">
                        <i style={{ width: `${percent}%` }} />
                      </span>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </JournalSection>

      {picking && (
        <Modal isOpen onClose={() => setPicking(false)} title={j('Which plan?', 'Quale programma?')} subtitle={j('The list is made from the foods of the plan you choose', 'La lista nasce dagli alimenti del programma scelto')} maxWidth="max-w-lg">
          <div className="journal-form" data-shopping-picker>
            {named.size === 0 ? (
              <JournalEmpty>{j('There is no plan yet. Plan some meals first.', 'Non c\'e ancora nessun programma. Pianifica prima dei pasti.')}</JournalEmpty>
            ) : (
              <>
                {current.length > 0 && (
                  <section>
                    <h3 className="journal-plan-day">{j('Current plans', 'Programmi in corso')}</h3>
                    <ul className="journal-plan-cards">{current.map((g) => pickRow(g, false))}</ul>
                  </section>
                )}
                {past.length > 0 && (
                  <section>
                    <h3 className="journal-plan-day">{j('Past plans', 'Programmi passati')}</h3>
                    <ul className="journal-plan-cards">{past.map((g) => pickRow(g, true))}</ul>
                  </section>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
      {openId && named.get(openId) && <ShoppingListModal group={named.get(openId)!} onClose={() => setOpenId(null)} />}
    </>
  );
}

function ShoppingListModal({ group, onClose }: { group: PlanGroupView; onClose: () => void }) {
  const { language } = useApp();
  const { shoppingLists } = useMealJournal();
  const j = useJournalText();
  const foodById = useFoodLookup();
  const list = shoppingLists.find((l) => l.planId === group.id);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');
  const fresh = useMemo(() => buildShoppingItems(group.plans, foodById, language), [group.plans, foodById, language]);
  if (!list) return null;
  const outdated = isShoppingListOutdated(list, fresh);
  const bought = boughtCount(list);
  const addItem = () => {
    if (!name.trim()) return;
    const quantity = Number(amount.replace(',', '.'));
    saveShoppingList(addCustomShoppingItem(list, journalId(), name, amount.trim() && quantity > 0 ? quantity : null, unit));
    setName('');
    setAmount('');
  };
  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={group.name}
        subtitle={j(`Shopping list · ${bought} of ${list.items.length} bought`, `Lista della spesa · ${bought} di ${list.items.length} comprati`)}
        maxWidth="max-w-lg"
      >
        <div className="journal-form" data-shopping-list={group.id} data-editing={editing}>
          {outdated && (
            <div className="journal-shopping-notice" role="status">
              <span>{j('The plan changed since this list was made.', 'Il programma e cambiato da quando hai creato la lista.')}</span>
              <button type="button" data-shopping-update onClick={() => saveShoppingList(syncShoppingList(list, fresh))}>
                <RefreshCw size={14} />
                {j('Update', 'Aggiorna')}
              </button>
            </div>
          )}
          {list.items.length === 0 ? (
            <JournalEmpty>
              {j('Nothing to buy yet: the plan has no foods. Press the pencil to add items.', 'Niente da comprare: il programma non ha alimenti. Premi la matita per aggiungere articoli.')}
            </JournalEmpty>
          ) : (
            <ul className="journal-shopping-items">
              {list.items.map((item) => (
                <li key={item.id} className={item.checked ? 'is-checked' : ''} data-shopping-item={item.id}>
                  {editing ? (
                    <>
                      <span className="journal-shopping-name">{item.name}</span>
                      <span className="journal-shopping-qty">{formatQuantity(item.amount, item.unit)}</span>
                      <button
                        type="button"
                        className="journal-shopping-remove"
                        aria-label={`${j('Remove', 'Rimuovi')} ${item.name}`}
                        onClick={() => saveShoppingList(removeShoppingItem(list, item.id))}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  ) : (
                    <label>
                      <input type="checkbox" checked={item.checked} onChange={() => saveShoppingList(toggleShoppingItem(list, item.id))} />
                      <span className="journal-shopping-name">{item.name}</span>
                      <span className="journal-shopping-qty">{formatQuantity(item.amount, item.unit)}</span>
                    </label>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editing && (
            <form
              className="journal-shopping-add"
              onSubmit={(e) => {
                e.preventDefault();
                addItem();
              }}
            >
              <input aria-label={j('Item to add', 'Articolo da aggiungere')} data-shopping-name placeholder={j('Add an item', 'Aggiungi un articolo')} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
              <input aria-label={j('Quantity', 'Quantita')} data-shopping-amount inputMode="decimal" placeholder={j('Qty', 'Qta')} value={amount} onChange={(e) => setAmount(e.target.value)} />
              <select aria-label={j('Unit', 'Unita')} value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="g">g</option>
                <option value="ml">ml</option>
              </select>
              <button type="submit" className="journal-primary-button" disabled={!name.trim()}>
                <Plus size={16} />
                {j('Add', 'Aggiungi')}
              </button>
            </form>
          )}
          <div className="journal-form-actions">
            {editing && (
              <button type="button" className="journal-secondary-button journal-danger-button" onClick={() => setConfirmDelete(true)} aria-label={j('Delete list', 'Elimina lista')} title={j('Delete list', 'Elimina lista')}>
                <Trash2 size={16} />
              </button>
            )}
            {!editing && (
              <button type="button" className="journal-secondary-button" onClick={() => saveShoppingList(syncShoppingList(list, fresh))}>
                <RefreshCw size={15} />
                {j('Update from plan', 'Aggiorna dal programma')}
              </button>
            )}
            <button type="button" data-shopping-edit className={editing ? 'journal-primary-button' : 'journal-secondary-button'} aria-pressed={editing} onClick={() => setEditing((v) => !v)}>
              {editing ? <Check size={16} /> : <Pencil size={15} />}
              {editing ? j('Done', 'Fatto') : j('Edit', 'Modifica')}
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        message={j('Delete this shopping list? The plan is not changed.', 'Eliminare questa lista della spesa? Il programma non cambia.')}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          removeShoppingList(group.id);
          setConfirmDelete(false);
          onClose();
        }}
      />
    </>
  );
}
