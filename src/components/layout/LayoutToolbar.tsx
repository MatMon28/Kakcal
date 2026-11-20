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
 * The pencil button of an editable page (nothing when Advanced layout is off). It is drawn like the round day arrows so it
 * can sit in the calendar row of Today; while the page is being edited it is filled and pressing it ends the editing.
 */
export const LayoutPencil: React.FC<{ page: LayoutPageId }> = ({ page }) => {
  const { enabled } = useLayout();
  const editing = useEditingPage() === page;
  const text = useLayoutText().toolbar;
  if (!enabled) return null;
  return (
    <button
      type="button"
      onClick={() => setEditingPage(editing ? null : page)}
      aria-label={editing ? text.done : text.edit}
      aria-pressed={editing}
      title={editing ? text.done : text.edit}
      data-layout-pencil={page}
      className={`pressable size-9 rounded-full border flex items-center justify-center ${
        editing
          ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
          : 'bg-[var(--surface)] hover:bg-[var(--hover)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
      }`}
    >
      <Pencil size={15} />
    </button>
  );
};

/**
 * Puts the pencil next to a control it belongs with (the time-period selector of Statistics and Body). The control stays
 * centred: an empty twin of the same width sits on its left. While the page is being edited the pencil is not drawn here
 * (fields are inert while editing; the toolbar below has Done) but its place stays reserved, so nothing jumps.
 * Nothing changes when Advanced layout is off.
 */
export const PencilRow: React.FC<{ page: LayoutPageId; children: React.ReactNode }> = ({ page, children }) => {
  const { enabled } = useLayout();
  const editing = useEditingPage() === page;
  if (!enabled) return <div className="flex justify-center">{children}</div>;
  return (
    <div className="flex items-center justify-center gap-1.5" data-layout-pencil-row={page}>
      <span className="size-9 shrink max-[360px]:hidden" aria-hidden="true" />
      <div className="min-w-0 flex justify-center">{children}</div>
      <span className="size-9 shrink-0 flex items-center justify-center">{!editing && <LayoutPencil page={page} />}</span>
    </div>
  );
};

/**
 * The top of an editable page. With Settings > Advanced > Advanced layout on it shows a small pencil icon;
 * while editing it shows Add / Reset page / Done. "Add" lists the removed fields and, on Today, creates a new meal
 * type (on Body, a new measure).
 */
export const LayoutToolbar: React.FC<{
  page: LayoutPageId;
  items: LayoutItem[];
  extra?: LayoutExtra;
  /** Draw the pencil here (default). Today puts it in the calendar row instead (`<LayoutPencil>`), so it passes `false`. */
  pencil?: boolean;
  /**
   * Id of the field that carries the pencil itself (`range` on Statistics and Body, through `<PencilRow>`). The pencil is
   * drawn at the top of the page only while that field is removed, so it can never be lost.
   */
  pencilItem?: string;
}> = ({ page, items, extra, pencil = true, pencilItem }) => {
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
    if (!pencil) return null;
    if (pencilItem && !hidden.some((item) => item.id === pencilItem)) return null;
    return (
      <div className="flex justify-end -mb-1">
        <LayoutPencil page={page} />
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
