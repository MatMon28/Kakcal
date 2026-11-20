import React, { useState } from 'react';
import { Check, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useLayoutText } from '../../i18n/layout';
import type { LayoutPageId } from '../../types/layout';
import { addCustomMeasure } from '../../utils/advancedStore';
import {
  addMealType,
  removeMealType,
  resetPageLayout,
  setEditingPage,
  showItem,
  useEditingPage,
  useLayout,
} from '../../utils/layoutStore';
import { useResolvedItems, type LayoutItem } from './EditableGrid';

const input =
  'w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text)] placeholder-[var(--muted)]/60 focus:outline-none focus:border-[var(--muted)]';

/** What can be created from the "Add" list of a page, besides bringing back removed fields. */
export type LayoutExtra = 'meal' | 'measure';

/**
 * The top of a personalisable page. With Settings > Advanced > Advanced layout on it shows a small pencil icon;
 * while editing it shows Add / Reset / Done. "Add" lists the removed fields and, on Today, creates a new meal
 * type (on Body, a new measure).
 */
export const LayoutToolbar: React.FC<{
  page: LayoutPageId;
  items: LayoutItem[];
  extra?: LayoutExtra;
}> = ({ page, items, extra }) => {
  const { enabled } = useLayout();
  const editing = useEditingPage() === page;
  const text = useLayoutText().toolbar;
  const { hidden } = useResolvedItems(page, items);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('cm');
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingMeal, setPendingMeal] = useState<{ id: string; name: string } | null>(null);

  if (!enabled) return null;

  if (!editing) {
    return (
      <div className="flex justify-end -mb-1">
        <button
          type="button"
          onClick={() => setEditingPage(page)}
          aria-label={text.edit}
          title={text.edit}
          data-layout-pencil={page}
          className="pressable size-7 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]"
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  const done = () => { setAdding(false); setEditingPage(null); };
  const submit = () => {
    if (!name.trim()) return;
    if (extra === 'meal') addMealType(name);
    if (extra === 'measure') addCustomMeasure(name, unit);
    setName('');
  };

  const action = 'pressable inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold';

  return (
    <div data-layout-toolbar={page} className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--text)]">
          <Pencil size={13} aria-hidden="true" />
          {text.editing}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-pressed={adding}
            onClick={() => setAdding((v) => !v)}
            className={`${action} ${adding ? 'bg-[var(--text)] text-[var(--on-text)]' : 'bg-[var(--inset)] text-[var(--text)] hover:bg-[var(--hover)]'}`}
          >
            <Plus size={13} />
            {text.add}
            {hidden.length > 0 && <span className="rounded-full bg-[#F6D0D0] text-[#7A2727] px-1.5 text-[10px]">{hidden.length}</span>}
          </button>
          <button type="button" onClick={() => setConfirmReset(true)} className={`${action} bg-[var(--inset)] text-[var(--text)] hover:bg-[var(--hover)]`}>
            <RotateCcw size={13} />
            {text.reset}
          </button>
          <button type="button" onClick={done} className={`${action} bg-[#C9EFD3] text-[#174A2B]`}>
            <Check size={13} />
            {text.done}
          </button>
        </div>
      </div>

      {!adding && <p className="text-[11px] font-medium text-[var(--muted)]">{text.hint}</p>}

      {adding && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{text.removedTitle}</span>
            {hidden.length === 0 ? (
              <p className="text-[11px] font-medium text-[var(--muted)]">{text.nothingRemoved}</p>
            ) : (
              <ul className="space-y-1.5">
                {hidden.map((item) => {
                  const isMeal = item.id.startsWith('meal:custom_');
                  return (
                    <li key={item.id} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => showItem(page, item.id)}
                        className="pressable flex-1 min-w-0 flex items-center gap-2 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] px-3 py-2 text-left text-xs font-extrabold text-[var(--text)]"
                      >
                        <Plus size={14} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </button>
                      {isMeal && (
                        <button
                          type="button"
                          onClick={() => setPendingMeal({ id: item.id.slice(5), name: item.label })}
                          aria-label={`${text.deleteMeal}: ${item.label}`}
                          title={text.deleteMeal}
                          className="pressable size-9 shrink-0 rounded-full bg-[var(--inset)] hover:bg-[#F6D0D0] hover:text-[#7A2727] text-[var(--muted)] flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {extra && (
            <div className="space-y-1.5">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                {extra === 'meal' ? text.newMealTitle : text.newMeasureTitle}
              </span>
              <div className="flex items-end gap-1.5">
                <input
                  type="text"
                  value={name}
                  maxLength={extra === 'meal' ? 30 : 40}
                  placeholder={extra === 'meal' ? text.newMealPlaceholder : text.newMeasurePlaceholder}
                  aria-label={extra === 'meal' ? text.newMealTitle : text.newMeasureTitle}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                  className={`${input} flex-1 min-w-0`}
                />
                {extra === 'measure' && (
                  <input
                    type="text"
                    value={unit}
                    maxLength={8}
                    aria-label={text.unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className={`${input} !w-16 shrink-0 !px-2 text-center`}
                  />
                )}
                <button
                  type="button"
                  onClick={submit}
                  disabled={!name.trim()}
                  aria-label={extra === 'meal' ? text.addMeal : text.addMeasure}
                  title={extra === 'meal' ? text.addMeal : text.addMeasure}
                  className="pressable size-[2.65rem] shrink-0 rounded-xl bg-[#C9EFD3] text-[#174A2B] disabled:opacity-40 flex items-center justify-center"
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              </div>
              {extra === 'meal' && <p className="text-[11px] font-medium text-[var(--muted)]">{text.newMealHint}</p>}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        title={text.resetTitle}
        message={text.resetText}
        confirmLabel={text.resetConfirm}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => { resetPageLayout(page); setConfirmReset(false); }}
      />
      <ConfirmDialog
        open={pendingMeal !== null}
        title={text.deleteMealTitle}
        message={text.deleteMealText.replace('{name}', pendingMeal?.name ?? '')}
        confirmLabel={text.deleteMeal}
        onCancel={() => setPendingMeal(null)}
        onConfirm={() => { if (pendingMeal) removeMealType(pendingMeal.id); setPendingMeal(null); }}
      />
    </div>
  );
};
