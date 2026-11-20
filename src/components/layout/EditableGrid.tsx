import React from 'react';
import { ArrowLeft, ArrowRight, Maximize2, Minus, Plus, X } from 'lucide-react';
import { useLayoutText } from '../../i18n/layout';
import type { LayoutPageId, LayoutWidth } from '../../types/layout';
import {
  MAX_SCALE,
  MIN_SCALE,
  SCALE_ZOOM,
  WIDTHS,
  hideItem,
  mergeOrder,
  moveItem,
  setItemScale,
  setItemWidth,
  useEditingPage,
  useLayout,
} from '../../utils/layoutStore';

/** One personalisable field of a page. */
export interface LayoutItem {
  id: string;
  /** Name shown in the "Add" list once the field has been removed. */
  label: string;
  node: React.ReactNode;
  /** Original width as Tailwind `col-span-*` classes on the 6-column grid (may be responsive). */
  span: string;
  /** `false` = the field does not exist right now (e.g. poop is switched off): it is listed nowhere. */
  show?: boolean;
  /** The card keeps its own height instead of stretching to the field next to it (collapsible cards). */
  selfStart?: boolean;
  /** Width / size cannot be changed (only the position and removal). */
  fixed?: boolean;
}

// Literal class names so that Tailwind finds them.
const WIDTH_SPAN: Record<LayoutWidth, string> = {
  third: 'col-span-2',
  half: 'col-span-3',
  twothirds: 'col-span-4',
  full: 'col-span-6',
};

/** The fields of a page in the user's order, split into shown and removed ones. */
export function useResolvedItems(page: LayoutPageId, items: LayoutItem[]) {
  const layout = useLayout();
  const prefs = layout.pages[page];
  const existing = items.filter((item) => item.show !== false);
  const ids = existing.map((item) => item.id);
  const order = layout.enabled ? mergeOrder(prefs.order, ids) : ids;
  const byId = new Map(existing.map((item) => [item.id, item]));
  const ordered = order.map((id) => byId.get(id)!);
  const hidden = layout.enabled ? ordered.filter((item) => prefs.hidden.includes(item.id)) : [];
  const shown = ordered.filter((item) => !hidden.includes(item));
  return { enabled: layout.enabled, prefs, ids, shown, hidden };
}

const ctl =
  'pressable size-7 rounded-full flex items-center justify-center text-[var(--text)] bg-[var(--inset)] hover:bg-[var(--hover)] disabled:opacity-35 disabled:pointer-events-none';

const Controls: React.FC<{
  page: LayoutPageId;
  item: LayoutItem;
  ids: string[];
  index: number;
  count: number;
  width: LayoutWidth | undefined;
  scale: number;
}> = ({ page, item, ids, index, count, width, scale }) => {
  const text = useLayoutText().item;
  const widthLabel = width ? text[width] : text.auto;
  const nextWidth = () => {
    const at = width ? WIDTHS.indexOf(width) : -1;
    setItemWidth(page, item.id, at + 1 >= WIDTHS.length ? undefined : WIDTHS[at + 1]);
  };
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div
        role="group"
        aria-label={item.label}
        className="pointer-events-auto grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--surface)]/95 border border-[var(--border)] shadow-lg"
      >
        <span className="col-span-3 max-w-[8.5rem] truncate px-1 text-center text-[10px] font-extrabold text-[var(--muted)]">{item.label}</span>
        <button type="button" className={ctl} disabled={index === 0} onClick={() => moveItem(page, item.id, -1, ids)} aria-label={`${text.earlier}: ${item.label}`} title={text.earlier}>
          <ArrowLeft size={14} />
        </button>
        <button type="button" className={ctl} disabled={index === count - 1} onClick={() => moveItem(page, item.id, 1, ids)} aria-label={`${text.later}: ${item.label}`} title={text.later}>
          <ArrowRight size={14} />
        </button>
        <button
          type="button"
          className={`${ctl} !bg-[#F6D0D0] !text-[#7A2727]`}
          onClick={() => hideItem(page, item.id)}
          aria-label={`${text.remove}: ${item.label}`}
          title={text.remove}
        >
          <X size={14} />
        </button>
        {!item.fixed && (
          <>
            <button type="button" className={`${ctl} !w-auto min-w-7 px-1.5 text-[10px] font-extrabold gap-0.5`} onClick={nextWidth} aria-label={`${text.width}: ${item.label} (${widthLabel})`} title={`${text.width}: ${widthLabel}`}>
              <Maximize2 size={10} aria-hidden="true" />
              <span>{widthLabel}</span>
            </button>
            <button type="button" className={ctl} disabled={scale <= MIN_SCALE} onClick={() => setItemScale(page, item.id, scale - 1)} aria-label={`${text.smaller}: ${item.label}`} title={text.smaller}>
              <Minus size={14} />
            </button>
            <button type="button" className={ctl} disabled={scale >= MAX_SCALE} onClick={() => setItemScale(page, item.id, scale + 1)} aria-label={`${text.bigger}: ${item.label}`} title={text.bigger}>
              <Plus size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * A page body laid out on a 6-column grid. With Settings > Advanced > Advanced layout on, the order, width and
 * size of each field and the removed fields come from the layout store; while the pencil is active every field
 * shows its controls. Fields that were never changed look exactly like the original page.
 */
export const EditableGrid: React.FC<{
  page: LayoutPageId;
  items: LayoutItem[];
  className?: string;
}> = ({ page, items, className = 'gap-3 sm:gap-3.5' }) => {
  const editing = useEditingPage() === page;
  const { enabled, prefs, ids, shown } = useResolvedItems(page, items);
  const isEditing = enabled && editing;

  return (
    <div className={`grid grid-cols-6 ${className}`}>
      {shown.map((item, index) => {
        const own = enabled ? prefs.items[item.id] : undefined;
        const scale = own?.scale ?? 0;
        const zoom = SCALE_ZOOM[scale] ?? 1;
        const span = own?.width ? WIDTH_SPAN[own.width] : item.span;
        return (
          <div
            key={item.id}
            data-layout-item={item.id}
            className={`relative grid min-w-0 ${span} ${item.selfStart ? 'self-start' : ''} ${isEditing ? 'min-h-[92px] rounded-3xl outline outline-2 outline-dashed outline-[var(--muted)]/50 outline-offset-2' : ''}`}
          >
            <div
              className={`grid min-w-0 ${isEditing ? 'pointer-events-none select-none opacity-80' : ''}`}
              style={zoom !== 1 ? { zoom } : undefined}
              inert={isEditing}
            >
              {item.node}
            </div>
            {isEditing && (
              <Controls page={page} item={item} ids={ids} index={index} count={shown.length} width={own?.width} scale={scale} />
            )}
          </div>
        );
      })}
    </div>
  );
};
