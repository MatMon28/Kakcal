import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Move, RotateCcw, X } from 'lucide-react';
import { useLayoutText } from '../../i18n/layout';
import type { LayoutPageId } from '../../types/layout';
import {
  HEIGHT_STEP,
  MAX_COLS,
  clampCols,
  clampHeight,
  hideItem,
  mergeOrder,
  moveItem,
  reorderItems,
  setItemSize,
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
  /** Size cannot be changed (only the position and removal). */
  fixed?: boolean;
}

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

// ---------------------------------------------------------------------------------------------
// Resize handles: the four sides and the four corners of a field
// ---------------------------------------------------------------------------------------------

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

// Literal class names so that Tailwind finds them. Hit areas are 24 px wide, the visible knob is smaller.
const HANDLES: { edge: Edge; box: string; knob: string }[] = [
  { edge: 'n', box: 'left-7 right-7 -top-2 h-6 cursor-ns-resize', knob: 'h-1.5 w-9' },
  { edge: 's', box: 'left-7 right-7 -bottom-2 h-6 cursor-ns-resize', knob: 'h-1.5 w-9' },
  { edge: 'w', box: 'top-7 bottom-7 -left-2 w-6 cursor-ew-resize', knob: 'w-1.5 h-9' },
  { edge: 'e', box: 'top-7 bottom-7 -right-2 w-6 cursor-ew-resize', knob: 'w-1.5 h-9' },
  { edge: 'nw', box: '-top-2 -left-2 size-7 cursor-nwse-resize', knob: 'size-3' },
  { edge: 'ne', box: '-top-2 -right-2 size-7 cursor-nesw-resize', knob: 'size-3' },
  { edge: 'sw', box: '-bottom-2 -left-2 size-7 cursor-nesw-resize', knob: 'size-3' },
  { edge: 'se', box: '-bottom-2 -right-2 size-7 cursor-nwse-resize', knob: 'size-3' },
];

const ctl =
  'pressable size-7 rounded-full flex items-center justify-center text-[var(--text)] bg-[var(--inset)] hover:bg-[var(--hover)] disabled:opacity-35 disabled:pointer-events-none';

interface ControlsProps {
  page: LayoutPageId;
  item: LayoutItem;
  ids: string[];
  index: number;
  count: number;
  customSize: boolean;
  onMoveStart: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent, edge: Edge) => void;
  onNudge: (dCols: number, dHeight: number) => void;
}

/** What is drawn over a field while the page is being personalised: handle, buttons and resize knobs. */
const Controls: React.FC<ControlsProps> = ({ page, item, ids, index, count, customSize, onMoveStart, onResizeStart, onNudge }) => {
  const text = useLayoutText().item;
  return (
    <div className="absolute inset-0 z-10 pointer-events-none" data-layout-controls>
      <div className="absolute inset-0 flex items-center justify-center p-1">
        <div className="pointer-events-auto flex max-w-full flex-col items-center gap-1" data-ctl>
          <span className="max-w-[9rem] truncate rounded-full bg-[var(--surface)]/90 px-2 py-0.5 text-[10px] font-extrabold text-[var(--muted)]">
            {item.label}
          </span>
          <div
            role="group"
            aria-label={item.label}
            className="flex flex-wrap items-center justify-center gap-1 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-1 shadow-lg"
          >
            <button
              type="button"
              data-layout-grip
              onPointerDown={onMoveStart}
              className={`${ctl} touch-none cursor-grab active:cursor-grabbing !bg-[var(--text)] !text-[var(--on-text)]`}
              aria-label={`${text.drag}: ${item.label}`}
              title={text.drag}
            >
              <Move size={14} />
            </button>
            <button type="button" className={ctl} disabled={index === 0} onClick={() => moveItem(page, item.id, -1, ids)} aria-label={`${text.earlier}: ${item.label}`} title={text.earlier}>
              <ArrowLeft size={14} />
            </button>
            <button type="button" className={ctl} disabled={index === count - 1} onClick={() => moveItem(page, item.id, 1, ids)} aria-label={`${text.later}: ${item.label}`} title={text.later}>
              <ArrowRight size={14} />
            </button>
            {customSize && !item.fixed && (
              <button
                type="button"
                className={ctl}
                onClick={() => setItemSize(page, item.id, { cols: undefined, height: undefined })}
                aria-label={`${text.resetSize}: ${item.label}`}
                title={text.resetSize}
              >
                <RotateCcw size={13} />
              </button>
            )}
            <button
              type="button"
              className={`${ctl} !bg-[#F6D0D0] !text-[#7A2727]`}
              onClick={() => hideItem(page, item.id)}
              aria-label={`${text.remove}: ${item.label}`}
              title={text.remove}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {!item.fixed &&
        HANDLES.map(({ edge, box, knob }) => {
          const horizontal = edge === 'e' || edge === 'w';
          const vertical = edge === 'n' || edge === 's';
          const label = horizontal ? text.resizeWidth : vertical ? text.resizeHeight : text.resizeBoth;
          return (
            <button
              key={edge}
              type="button"
              data-ctl
              data-layout-handle={edge}
              aria-label={`${label}: ${item.label}`}
              title={label}
              onPointerDown={(e) => onResizeStart(e, edge)}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 4 : 1;
                const dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                const dy = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
                if (!dx && !dy) return;
                e.preventDefault();
                onNudge(vertical ? 0 : dx, horizontal ? 0 : dy * step * 4 * HEIGHT_STEP);
              }}
              className={`pointer-events-auto absolute touch-none flex items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-[var(--text)] ${box}`}
            >
              <span className={`block rounded-full bg-[var(--text)] opacity-75 ring-2 ring-[var(--surface)] shadow ${knob}`} aria-hidden="true" />
            </button>
          );
        })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// The grid
// ---------------------------------------------------------------------------------------------

interface Gesture {
  kind: 'move' | 'resize';
  id: string;
  edge?: Edge;
  pointerId: number;
  startX: number;
  startY: number;
  grabX: number;
  grabY: number;
  width: number;
  height: number;
  startCols: number;
  active: boolean;
}

interface Preview {
  /** Position (relative to the grid) and size of the field that is being dragged. */
  move?: { id: string; x: number; y: number; w: number; h: number };
  /** Order of the shown fields while dragging. */
  order?: string[];
  /** Size of the field that is being resized (`undefined` = unchanged). */
  size?: { id: string; cols?: number; height?: number };
}

const DRAG_THRESHOLD = 4;

/**
 * A page body laid out on a 6-column grid. With Settings > Advanced > Advanced layout on, the order, width and
 * height of each field and the removed fields come from the layout store. While the pencil is active every field can be
 * dragged to a new place (the other fields make room as you move), and resized by pulling its sides or corners
 * (the width snaps to the columns, the height is free). Fields that were never changed look exactly like the original page.
 */
export const EditableGrid: React.FC<{
  page: LayoutPageId;
  items: LayoutItem[];
  className?: string;
}> = ({ page, items, className = 'gap-3 sm:gap-3.5' }) => {
  const editing = useEditingPage() === page;
  const { enabled, prefs, ids, shown } = useResolvedItems(page, items);
  const isEditing = enabled && editing;

  const gridRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<Preview>({});
  const gesture = useRef<Gesture | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const orderRef = useRef<string[] | null>(null);
  const sizeRef = useRef<Preview['size']>(undefined);
  const lastSwap = useRef(0);
  const raf = useRef(0);
  const latest = useRef({ page, ids, shownIds: [] as string[] });
  latest.current = { page, ids, shownIds: shown.map((item) => item.id) };

  const find = (id: string) => gridRef.current?.querySelector<HTMLElement>(`[data-layout-item="${id.replace(/"/g, '\\"')}"]`) ?? null;

  const columnMetrics = () => {
    const grid = gridRef.current!;
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    return { gap, unit: (grid.clientWidth + gap) / MAX_COLS };
  };

  useEffect(() => {
    const grid = () => gridRef.current;

    const reorder = (x: number, y: number, g: Gesture) => {
      if (performance.now() - lastSwap.current < 110) return;
      const current = orderRef.current ?? latest.current.shownIds;
      const without = current.filter((id) => id !== g.id);
      let target: string | null = null;
      let top = Infinity;
      let bottom = -Infinity;
      for (const id of without) {
        const el = find(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        top = Math.min(top, r.top);
        bottom = Math.max(bottom, r.bottom);
        if (!target && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) target = id;
      }
      let next: string[] | null = null;
      if (target) {
        // Dragging forward puts the field after the one under the pointer, dragging backward before it.
        const forward = current.indexOf(g.id) < current.indexOf(target);
        const at = without.indexOf(target) + (forward ? 1 : 0);
        next = [...without.slice(0, at), g.id, ...without.slice(at)];
      } else if (without.length && y > bottom) next = [...without, g.id];
      else if (without.length && y < top) next = [g.id, ...without];
      if (next && next.join('\u0000') !== current.join('\u0000')) {
        orderRef.current = next;
        lastSwap.current = performance.now();
        setPreview((p) => ({ ...p, order: next! }));
      }
    };

    const update = () => {
      const g = gesture.current;
      const el = grid();
      if (!g || !g.active || !el) return;
      const { x, y } = pointer.current;
      if (g.kind === 'move') {
        const r = el.getBoundingClientRect();
        setPreview((p) => ({ ...p, move: { id: g.id, x: x - g.grabX - r.left, y: y - g.grabY - r.top, w: g.width, h: g.height } }));
        reorder(x, y, g);
        return;
      }
      const edge = g.edge!;
      const dx = x - g.startX;
      const dy = y - g.startY;
      let cols: number | undefined;
      let height: number | undefined;
      if (edge.includes('e') || edge.includes('w')) {
        const { gap, unit } = columnMetrics();
        const next = clampCols((g.width + (edge.includes('e') ? dx : -dx) + gap) / unit);
        cols = next === g.startCols ? undefined : next;
      }
      if (edge.includes('s') || edge.includes('n')) {
        const next = clampHeight(g.height + (edge.includes('s') ? dy : -dy));
        height = Math.abs(next - g.height) < HEIGHT_STEP ? undefined : next;
      }
      sizeRef.current = { id: g.id, cols, height };
      setPreview((p) => ({ ...p, size: sizeRef.current }));
    };

    const autoScroll = () => {
      const g = gesture.current;
      if (!g || !g.active || g.kind !== 'move') { raf.current = 0; return; }
      const zone = 80;
      const { y } = pointer.current;
      const speed = y < zone ? -((zone - y) / zone) * 18 : y > window.innerHeight - zone ? ((y - (window.innerHeight - zone)) / zone) * 18 : 0;
      if (speed) { window.scrollBy(0, speed); update(); }
      raf.current = requestAnimationFrame(autoScroll);
    };

    const finish = (commit: boolean) => {
      const g = gesture.current;
      gesture.current = null;
      if (g?.active && commit) {
        const { page: p, ids: all } = latest.current;
        if (g.kind === 'move' && orderRef.current) reorderItems(p, orderRef.current, all);
        const size = sizeRef.current;
        if (g.kind === 'resize' && size && (size.cols !== undefined || size.height !== undefined)) {
          setItemSize(p, g.id, {
            ...(size.cols !== undefined ? { cols: size.cols } : {}),
            ...(size.height !== undefined ? { height: size.height } : {}),
          });
        }
      }
      orderRef.current = null;
      sizeRef.current = undefined;
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      setPreview({});
    };

    const onMove = (e: PointerEvent) => {
      const g = gesture.current;
      if (!g || e.pointerId !== g.pointerId) return;
      pointer.current = { x: e.clientX, y: e.clientY };
      if (!g.active) {
        if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < DRAG_THRESHOLD) return;
        g.active = true;
        if (g.kind === 'move' && !raf.current) raf.current = requestAnimationFrame(autoScroll);
      }
      update();
    };
    const onUp = (e: PointerEvent) => {
      if (gesture.current && e.pointerId === gesture.current.pointerId) finish(true);
    };
    const onCancel = (e: PointerEvent) => {
      if (gesture.current && e.pointerId === gesture.current.pointerId) finish(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gesture.current) finish(false);
    };
    const onScroll = () => update();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf.current);
      gesture.current = null;
    };
  }, []);

  // Leaving the edit mode (Done, page change) always ends a gesture that is still running.
  useEffect(() => {
    if (!isEditing) {
      gesture.current = null;
      orderRef.current = null;
      sizeRef.current = undefined;
      setPreview({});
    }
  }, [isEditing]);

  const begin = (e: React.PointerEvent, kind: Gesture['kind'], item: LayoutItem, edge?: Edge) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = find(item.id);
    if (!el || !gridRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const r = el.getBoundingClientRect();
    const { gap, unit } = columnMetrics();
    pointer.current = { x: e.clientX, y: e.clientY };
    gesture.current = {
      kind,
      id: item.id,
      edge,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      grabX: e.clientX - r.left,
      grabY: e.clientY - r.top,
      width: r.width,
      height: r.height,
      startCols: clampCols((r.width + gap) / unit),
      active: false,
    };
  };

  /** Keyboard resize (arrow keys on a side handle). */
  const nudge = (item: LayoutItem, dCols: number, dHeight: number) => {
    const el = find(item.id);
    if (!el || !gridRef.current) return;
    const r = el.getBoundingClientRect();
    const { gap, unit } = columnMetrics();
    const own = prefs.items[item.id];
    const patch: { cols?: number; height?: number } = {};
    if (dCols) patch.cols = clampCols((own?.cols ?? clampCols((r.width + gap) / unit)) + dCols);
    if (dHeight) patch.height = clampHeight((own?.height ?? r.height) + dHeight);
    setItemSize(page, item.id, patch);
  };

  const byId = new Map(shown.map((item) => [item.id, item]));
  const display = preview.order ? preview.order.map((id) => byId.get(id)).filter((item): item is LayoutItem => !!item) : shown;
  const dragging = isEditing && preview.move ? preview.move : undefined;

  return (
    <div
      ref={gridRef}
      className={`relative grid grid-cols-6 ${className} ${isEditing ? 'select-none' : ''}`}
      {...(isEditing ? { 'data-no-swipe': '' } : {})}
    >
      {display.map((item, index) => {
        const own = enabled ? prefs.items[item.id] : undefined;
        const live = isEditing && preview.size?.id === item.id ? preview.size : undefined;
        const cols = live?.cols ?? own?.cols;
        const height = live?.height ?? own?.height;
        const floating = dragging?.id === item.id ? dragging : undefined;
        const sizeStyle: React.CSSProperties = {
          ...(cols ? { gridColumn: `span ${cols} / span ${cols}` } : {}),
          ...(height ? { height } : {}),
        };
        const slotClass = `${item.span} ${item.selfStart ? 'self-start' : ''}`;
        return (
          <React.Fragment key={item.id}>
            {/* Where the field lands when it is dropped */}
            {floating ? (
              <div
                data-layout-slot={item.id}
                aria-hidden="true"
                className={`${slotClass} rounded-3xl bg-[var(--inset)] outline outline-2 outline-dashed outline-[var(--text)]/40 outline-offset-2`}
                style={{ ...sizeStyle, minHeight: floating.h, height: floating.h }}
              />
            ) : null}
            <div
              data-layout-item={item.id}
              onPointerDown={isEditing && !floating ? (e) => {
                // Mouse and pen can also grab the field itself; touch drags with the handle so the page still scrolls.
                if (e.pointerType === 'touch' || (e.target as Element).closest('[data-ctl]')) return;
                begin(e, 'move', item);
              } : undefined}
              className={`relative grid min-w-0 ${slotClass} ${
                isEditing
                  ? `${height ? '' : 'min-h-[92px]'} rounded-3xl outline outline-2 outline-dashed outline-[var(--muted)]/50 outline-offset-2 ${floating ? '' : 'cursor-grab'}`
                  : ''
              } ${floating ? 'z-30 !absolute left-0 top-0 shadow-2xl ring-2 ring-[var(--text)]/30 rounded-3xl cursor-grabbing will-change-transform' : ''}`}
              style={
                floating
                  ? { width: floating.w, height: floating.h, transform: `translate(${floating.x}px, ${floating.y}px)` }
                  : sizeStyle
              }
            >
              <div
                className={`grid min-w-0 min-h-0 ${height ? 'overflow-y-auto' : ''} ${isEditing ? 'pointer-events-none select-none opacity-80' : ''}`}
                inert={isEditing}
              >
                {item.node}
              </div>
              {isEditing && (
                <Controls
                  page={page}
                  item={item}
                  ids={ids}
                  index={index}
                  count={display.length}
                  customSize={Boolean(own?.cols || own?.height)}
                  onMoveStart={(e) => begin(e, 'move', item)}
                  onResizeStart={(e, edge) => begin(e, 'resize', item, edge)}
                  onNudge={(dc, dh) => nudge(item, dc, dh)}
                />
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
