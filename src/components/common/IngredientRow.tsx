import type { ReactNode } from 'react';
import { ArrowLeftRight, Pencil, Search, Trash2 } from 'lucide-react';
import type { FoodItem } from '../../types';
import { MacroPills } from './MacroPills';

/** Small button with an icon and a text (Swap, Search, Use match). */
export const ingredientTextButton = 'pressable inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] text-xs font-bold text-[var(--text)]';
/** Small square button with an icon only (pencil, bin). */
export const ingredientIconButton = 'pressable grid place-items-center w-8 h-8 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--text)]';

const scaled = (per100: number | null | undefined, amount: number) => (per100 == null ? null : (per100 * amount) / 100);

export interface IngredientRowProps {
  /** The chosen food; absent while a line still needs one. */
  food?: FoodItem;
  /** The food name, or the text shown for a line without a food. */
  name: string;
  /** Quantity in the food's unit. */
  amount?: number;
  /** Muted text in front of the name ("Selected:" on imported lines). */
  prefix?: string;
  /** Pencil, icon only: change the quantity of this food. Its name is `editLabel`. */
  onEdit?: () => void;
  editLabel?: string;
  /** Icon and text: replace the food ("Swap") or find one for a line without a food ("Search"). */
  swap?: { text: string; label: string; icon?: 'swap' | 'search'; onClick: () => void };
  onDelete: () => void;
  deleteLabel: string;
  /** Extra action in front of the pencil (e.g. "Use match"). */
  children?: ReactNode;
}

/**
 * One ingredient of a recipe or a saved meal, the same in both builders: the food, its quantity, the kcal and macros
 * of that quantity, an icon-only pencil that changes the quantity, an optional Swap / Search button (icon and text)
 * and the bin.
 */
export function IngredientRow({ food, name, amount, prefix, onEdit, editLabel, swap, onDelete, deleteLabel, children }: IngredientRowProps) {
  return (
    <div data-ingredient-row className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 basis-32 break-words text-xs font-bold">
          {prefix && <span className="mr-1 text-[var(--muted)]">{prefix}</span>}
          {name}
          {food && amount != null && <span data-ingredient-amount className="tabular-nums text-[var(--muted)]"> · {amount} {food.unit}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {children}
          {onEdit && (
            <button type="button" data-ingredient-edit className={ingredientIconButton} onClick={onEdit} aria-label={editLabel} title={editLabel}>
              <Pencil size={14} />
            </button>
          )}
          {swap && (
            <button type="button" data-ingredient-swap className={ingredientTextButton} onClick={swap.onClick} aria-label={swap.label}>
              {swap.icon === 'search' ? <Search size={13} /> : <ArrowLeftRight size={13} />}{swap.text}
            </button>
          )}
          <button type="button" data-ingredient-delete className={ingredientIconButton} onClick={onDelete} aria-label={deleteLabel} title={deleteLabel}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {food && amount != null && amount > 0 && (
        <div data-nutrition-row className="flex min-w-0 items-center gap-2">
          <strong data-calories className="shrink-0 text-xs tabular-nums">{Math.round((food.calories * amount) / 100)} kcal</strong>
          <MacroPills carbs={scaled(food.carbs, amount)} protein={scaled(food.protein, amount)} fat={scaled(food.fat, amount)} stretch />
        </div>
      )}
    </div>
  );
}
