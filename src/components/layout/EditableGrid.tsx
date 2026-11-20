import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useLayoutText } from '../../i18n/layout';
import type { LayoutPageId } from '../../types/layout';
import {
  GRID_COLS,
  freeRange,
  planMove,
  planRemove,
  resolvePlacements,
  rowAt,
  spanCols,
  type Cell,
} from '../../utils/layoutGrid';
import {
  HEIGHT_STEP,
  MIN_COLS,
  applyItemChanges,
  clampHeight,
  hideItem,
  mergeOrder,
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
  /** Smallest width in columns (default 2). Meal cards need room for their icon, the + and the expand arrow. */
  minCols?: number;
  /** Smallest height in px (default 44). Meal cards keep their first row (icon, name, +, arrow) visible. */
  minHeight?: number;
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

const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia('(min-width: 768px)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
/** Tailwind's `md` breakpoint (responsive `col-span-*` classes). */
const useWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia('(min-width: 768px)').matches, () => false);

// ---------------------------------------------------------------------------------------------
// Resize handles: the four sides and the four corners of the selected field
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
  'pressable size-8 rounded-full flex items-center justify-center text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] shadow-md hover:bg-[var(--hover)]';

interface ControlsProps {
  item: LayoutItem;
  customSize: boolean;
  onResizeStart: (e: React.PointerEvent, edge: Edge) => void;
  onNudge: (dCols: number, dHeight: number) => void;
  onReset: () => void;
  onRemove: () => void;
}

/** What is drawn over the selected field: the resize knobs, the remove button (and "original size" when resized). */
const Controls: React.FC<ControlsProps> = ({ item, customSize, onResizeStart, onNudge, onReset, onRemove }) => {
  const text = useLayoutText().item;
  return (
    <div className="absolute inset-0 z-10 pointer-events-none" data-layout-controls>
      <div className="absolute inset-0 flex items-center justify-center p-1">
        <div className="pointer-events-auto flex items-center gap-1.5" data-ctl>
          {customSize && !item.fixed && (
            <button type="button" className={ctl} onClick={onReset} aria-label={`${text.resetSize}: ${item.label}`} title={text.resetSize}>
              <RotateCcw size={14} />
            </button>
          )}
          <button
            type="button"
            className={`${ctl} !bg-[#F6D0D0] !text-[#7A2727] !border-[#E4AAAA]`}
            onClick={onRemove}
            aria-label={`${text.remove}: ${item.label}`}
            title={text.remove}
          >
            <X size={15} />
          </button>
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
              <span className={`block rounded-full bg-[var(--text)] ring-2 ring-[var(--surface)] shadow ${knob}`} aria-hidden="true" />
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
  /** `press` = a finger / button is down on a field, waiting to become a move (long press) or a tap. */
  kind: 'press' | 'move' | 'resize';
  id: string;
  edge?: Edge;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  startScroll: number;
  grabX: number;
  width: number;
  height: number;
  cell: Cell;
  bounds: { min: number; max: number };
  minCols: number;
  minHeight: number;
  active: boolean;
  timer: number;
}

interface Preview {
  /** The lifted field follows the pointer by this offset. */
  move?: { id: string; dx: number; dy: number };
  /** Where the field lands if it is dropped now (px inside the grid); `line` = a row is inserted there. */
  drop?: { left: number; top: number; width: number; height: number; line: boolean };
  /** Size / position of the field that is being resized (`undefined` = unchanged). */
  size?: { id: string; col: number; cols: number; height?: number };
}

/** Press time before a field can be moved (touch), movement that cancels it, and mouse drag threshold. */
const LONG_PRESS_MS = 380;
const PRESS_SLOP = 8;
const DRAG_THRESHOLD = 4;
/** Height of a row that holds no field (blank space) and number of such rows offered below the last field. */
const BLANK_ROW = 40;
const TRAILING_ROWS = 2;

/**
 * A page body laid out on a 6-column grid with free placement. With Settings > Advanced > Advanced layout on, the place
 * (column + row), width and height of each field and the removed fields come from the layout store. While the pencil
 * is active, touching a field selects it (highlighted border, resize knobs, remove button); holding it for a moment
 * lifts it so it can be dropped on any free place, also leaving blank space between fields; touching blank space or
 * another field selects nothing / the other one. A page that was never personalised is plain flow in the original
 * order and looks exactly like the original page.
 */
export const EditableGrid: React.FC<{
  page: LayoutPageId;
  items: LayoutItem[];
  className?: string;
}> = ({ page, items, className = 'gap-3 sm:gap-3.5' }) => {
  const editing = useEditingPage() === page;
  const { enabled, prefs, ids, shown } = useResolvedItems(page, items);
  const isEditing = enabled && editing;
  const wide = useWide();

  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview>({});
  const gridRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const dropRef = useRef<ReturnType<typeof planMove> | null>(null);
  const sizeRef = useRef<Preview['size']>(undefined);
  const raf = useRef(0);
  const liftRef = useRef<() => void>(() => {});

  // ---- Where every field is ----
  const minColsOf = (item: LayoutItem) => Math.max(MIN_COLS, item.minCols ?? MIN_COLS);
  const explicit = enabled && shown.some((item) => prefs.items[item.id]?.row !== undefined);
  const cells = explicit
    ? resolvePlacements(
        shown.map((item) => {
          const own = prefs.items[item.id];
          const cols = Math.min(GRID_COLS, Math.max(minColsOf(item), own?.cols ?? spanCols(item.span, wide)));
          return { id: item.id, cols, col: own?.col, row: own?.row };
        }),
      )
    : null;
  const needsPlaces = enabled && shown.some((item) => prefs.items[item.id]?.row === undefined);

  const latest = useRef({ page, ids, shown, cells, prefs, needsPlaces });
  latest.current = { page, ids, shown, cells, prefs, needsPlaces };

  const find = (id: string) => gridRef.current?.querySelector<HTMLElement>(`[data-layout-item="${id.replace(/"/g, '\\"')}"]`) ?? null;

  const columnMetrics = () => {
    const grid = gridRef.current!;
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    return { gap, unit: (grid.clientWidth + gap) / GRID_COLS };
  };

  /** Row tracks as laid out by the browser (px from the top of the grid). */
  const rowTracks = () => {
    const style = getComputedStyle(gridRef.current!);
    const gap = parseFloat(style.rowGap) || 0;
    let top = 0;
    return style.gridTemplateRows
      .split(' ')
      .map(parseFloat)
      .filter((h) => Number.isFinite(h))
      .map((h) => {
        const track = { top, h };
        top += h + gap;
        return track;
      });
  };

  // ---- The first time a page is personalised every field gets a place (measured from what is on screen) ----
  useEffect(() => {
    if (!isEditing || !needsPlaces || !gridRef.current) return;
    const { page: p, shown: list, cells: resolved, prefs: stored } = latest.current;
    const changes: Record<string, { col: number; row: number }> = {};
    if (resolved) {
      for (const item of list) if (stored.items[item.id]?.row === undefined) changes[item.id] = { col: resolved[item.id].col, row: resolved[item.id].row };
    } else {
      const grid = gridRef.current.getBoundingClientRect();
      const { gap, unit } = columnMetrics();
      const rects = list.flatMap((item) => {
        const el = find(item.id);
        return el ? [{ id: item.id, r: el.getBoundingClientRect() }] : [];
      });
      const tops = [...new Set(rects.map(({ r }) => Math.round(r.top - grid.top)))].sort((a, b) => a - b);
      const rowOf = (top: number) => tops.findIndex((t) => Math.abs(t - top) <= 3);
      for (const { id, r } of rects) {
        const cols = Math.min(GRID_COLS, Math.max(1, Math.round((r.width + gap) / unit)));
        changes[id] = {
          col: Math.min(GRID_COLS - cols, Math.max(0, Math.round((r.left - grid.left) / unit))),
          row: Math.max(0, rowOf(Math.round(r.top - grid.top))),
        };
      }
    }
    if (Object.keys(changes).length) applyItemChanges(p, changes);
  }, [isEditing, needsPlaces, shown.map((item) => item.id).join('|')]);

  // ---- Gesture engine (one set of window listeners) ----
  useEffect(() => {
    const grid = () => gridRef.current;

    const finishPress = (g: Gesture) => {
      window.clearTimeout(g.timer);
    };

    const update = () => {
      const g = gesture.current;
      const el = grid();
      if (!g || !g.active || !el) return;
      const { x, y } = pointer.current;
      const rect = el.getBoundingClientRect();
      const { gap, unit } = columnMetrics();

      if (g.kind === 'move') {
        const cellsNow = latest.current.cells;
        const dx = x - g.startX;
        const dy = y - g.startY + (window.scrollY - g.startScroll);
        let drop: Preview['drop'];
        dropRef.current = null;
        if (cellsNow) {
          const tracks = rowTracks();
          const yRel = y - rect.top;
          const row = rowAt(tracks, yRel);
          const col = Math.round((x - g.grabX - rect.left) / unit);
          const track = tracks[row] ?? { top: 0, h: BLANK_ROW };
          const below = yRel > track.top + track.h / 2;
          const plan = planMove(cellsNow, g.id, col, row, below);
          dropRef.current = plan;
          if (plan.inserted) {
            drop = { left: 0, width: rect.width, height: 4, top: (below ? track.top + track.h + gap / 2 : track.top - gap / 2) - 2, line: true };
          } else {
            drop = { left: plan.col * unit, width: g.cell.cols * unit - gap, top: track.top, height: track.h, line: false };
          }
        }
        setPreview((p) => ({ ...p, move: { id: g.id, dx, dy }, drop }));
        return;
      }

      // resize
      const edge = g.edge!;
      const dx = x - g.startX;
      const dy = y - g.startY;
      let col = g.cell.col;
      let cols = g.cell.cols;
      let height: number | undefined;
      if (edge.includes('e')) {
        const raw = Math.round((g.width + dx + gap) / unit);
        cols = Math.max(g.minCols, Math.min(g.bounds.max - g.cell.col, raw));
      } else if (edge.includes('w')) {
        const raw = Math.round((g.width - dx + gap) / unit);
        cols = Math.max(g.minCols, Math.min(g.cell.col + g.cell.cols - g.bounds.min, raw));
        col = g.cell.col + g.cell.cols - cols;
      }
      if (edge.includes('s') || edge.includes('n')) {
        const next = Math.max(g.minHeight, clampHeight(g.height + (edge.includes('s') ? dy : -dy)));
        height = Math.abs(next - g.height) < HEIGHT_STEP ? undefined : next;
      }
      sizeRef.current = { id: g.id, col, cols, height };
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

    /** A press became a move (long press, or a mouse drag): the field is lifted. */
    const lift = () => {
      const g = gesture.current;
      if (!g || g.kind !== 'press') return;
      window.clearTimeout(g.timer);
      g.kind = 'move';
      g.active = true;
      setSelected(g.id);
      try { navigator.vibrate?.(12); } catch { /* not supported */ }
      if (!raf.current) raf.current = requestAnimationFrame(autoScroll);
      update();
    };
    liftRef.current = lift;

    const finish = (commit: boolean) => {
      const g = gesture.current;
      gesture.current = null;
      if (g) finishPress(g);
      if (g?.active && commit) {
        const { page: p, cells: current } = latest.current;
        if (g.kind === 'move' && dropRef.current && Object.keys(dropRef.current.changes).length) {
          applyItemChanges(p, dropRef.current.changes);
        }
        const size = sizeRef.current;
        if (g.kind === 'resize' && size && current) {
          const patch: { col: number; row: number; cols?: number; height?: number } = { col: size.col, row: g.cell.row };
          if (size.cols !== g.cell.cols) patch.cols = size.cols;
          if (size.height !== undefined) patch.height = size.height;
          if (patch.cols !== undefined || patch.height !== undefined || size.col !== g.cell.col) applyItemChanges(p, { [g.id]: patch });
        }
      }
      dropRef.current = null;
      sizeRef.current = undefined;
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      setPreview({});
    };

    const onMove = (e: PointerEvent) => {
      const g = gesture.current;
      if (!g || e.pointerId !== g.pointerId) return;
      pointer.current = { x: e.clientX, y: e.clientY };
      const dist = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
      if (g.kind === 'press') {
        if (dist < PRESS_SLOP) return;
        // A finger that moves before the long press is done is scrolling the page; a mouse drags right away.
        if (g.pointerType === 'touch') { finishPress(g); gesture.current = null; return; }
        lift();
        return;
      }
      if (!g.active) {
        if (dist < DRAG_THRESHOLD) return;
        g.active = true;
      }
      update();
    };
    const onUp = (e: PointerEvent) => {
      const g = gesture.current;
      if (!g || e.pointerId !== g.pointerId) return;
      finish(g.kind !== 'press');
    };
    const onCancel = (e: PointerEvent) => {
      if (gesture.current && e.pointerId === gesture.current.pointerId) finish(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gesture.current) finish(false);
    };
    // Once a field is lifted or resized the page must not scroll under the finger (before that, scrolling works).
    const onTouchMove = (e: TouchEvent) => {
      const g = gesture.current;
      if (g && g.kind !== 'press' && e.cancelable) e.preventDefault();
    };
    // Touching blank space (anything that is not a field) clears the selection.
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.('[data-layout-item]')) setSelected(null);
    };
    const onScroll = () => update();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf.current);
      if (gesture.current) window.clearTimeout(gesture.current.timer);
      gesture.current = null;
    };
  }, []);

  // Leaving the edit mode (Done, page change) always ends a gesture that is still running and clears the selection.
  useEffect(() => {
    if (!isEditing) {
      if (gesture.current) window.clearTimeout(gesture.current.timer);
      gesture.current = null;
      dropRef.current = null;
      sizeRef.current = undefined;
      setPreview({});
      setSelected(null);
    }
  }, [isEditing]);

  // A selected field that no longer exists (removed, switched off) is not selected any more.
  useEffect(() => {
    if (selected && !shown.some((item) => item.id === selected)) setSelected(null);
  }, [selected, shown]);

  const begin = (e: React.PointerEvent, kind: Gesture['kind'], item: LayoutItem, edge?: Edge) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = find(item.id);
    const cell = latest.current.cells?.[item.id];
    if (!el || !gridRef.current || !cell) return;
    const r = el.getBoundingClientRect();
    pointer.current = { x: e.clientX, y: e.clientY };
    if (gesture.current) window.clearTimeout(gesture.current.timer);
    const g: Gesture = {
      kind,
      id: item.id,
      edge,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      startScroll: window.scrollY,
      grabX: e.clientX - r.left,
      width: r.width,
      height: r.height,
      cell,
      bounds: freeRange(latest.current.cells!, item.id),
      minCols: minColsOf(item),
      minHeight: Math.max(item.minHeight ?? 0, 0),
      active: false,
      timer: 0,
    };
    if (kind === 'press') g.timer = window.setTimeout(() => liftRef.current(), LONG_PRESS_MS);
    gesture.current = g;
    setSelected(item.id);
  };

  /** Keyboard resize (arrow keys on a side knob). */
  const nudge = (item: LayoutItem, dCols: number, dHeight: number) => {
    const cell = latest.current.cells?.[item.id];
    const el = find(item.id);
    if (!cell || !el) return;
    const own = prefs.items[item.id];
    const range = freeRange(latest.current.cells!, item.id);
    const patch: { col: number; row: number; cols?: number; height?: number } = { col: cell.col, row: cell.row };
    if (dCols) patch.cols = Math.max(minColsOf(item), Math.min(range.max - cell.col, cell.cols + dCols));
    if (dHeight) patch.height = Math.max(item.minHeight ?? 0, clampHeight((own?.height ?? el.getBoundingClientRect().height) + dHeight));
    applyItemChanges(page, { [item.id]: patch });
  };

  /** Keyboard move of the selected field (arrow keys on the field): one column or one row at a time. */
  const stepMove = (item: LayoutItem, dCol: number, dRow: number) => {
    const current = latest.current.cells;
    const cell = current?.[item.id];
    if (!current || !cell) return;
    const plan = planMove(current, item.id, cell.col + dCol, Math.max(0, cell.row + dRow), dRow > 0);
    if (Object.keys(plan.changes).length) applyItemChanges(page, plan.changes);
  };

  const remove = (item: LayoutItem) => {
    const current = latest.current.cells;
    hideItem(page, item.id, current ? planRemove(current, item.id) : {});
    setSelected(null);
  };

  // ---- Render ----
  const rowCount = cells ? Math.max(-1, ...Object.values(cells).map((c) => c.row)) + 1 : 0;
  const usedRows = new Set(cells ? Object.values(cells).map((c) => c.row) : []);
  const templateRows = cells
    ? Array.from({ length: rowCount + (isEditing ? TRAILING_ROWS : 0) }, (_, r) => (usedRows.has(r) ? 'auto' : `${BLANK_ROW}px`)).join(' ')
    : undefined;
  const lifted = isEditing && preview.move ? preview.move : undefined;

  return (
    <div
      ref={gridRef}
      className={`relative grid grid-cols-6 ${className} ${isEditing ? 'select-none [-webkit-touch-callout:none]' : ''}`}
      style={templateRows ? { gridTemplateRows: templateRows } : undefined}
      {...(isEditing ? { 'data-no-swipe': '' } : {})}
    >
      {shown.map((item) => {
        const own = enabled ? prefs.items[item.id] : undefined;
        const cell = cells?.[item.id];
        const live = isEditing && preview.size?.id === item.id ? preview.size : undefined;
        const cols = live?.cols ?? cell?.cols;
        const col = live?.col ?? cell?.col;
        const height = live ? live.height ?? own?.height : own?.height;
        const minHeight = item.minHeight ?? 0;
        const isSelected = isEditing && selected === item.id;
        const isLifted = lifted?.id === item.id;
        const style: React.CSSProperties = {
          ...(cell && col !== undefined && cols ? { gridColumn: `${col + 1} / span ${cols}`, gridRow: cell.row + 1 } : {}),
          ...(height ? { height: Math.max(height, minHeight) } : {}),
          ...(isLifted && lifted ? { transform: `translate(${lifted.dx}px, ${lifted.dy}px)`, zIndex: 30 } : {}),
        };
        const flowClass = cell ? '' : item.span;
        return (
          <div
            key={item.id}
            data-layout-item={item.id}
            data-selected={isSelected ? '' : undefined}
            tabIndex={isEditing ? 0 : undefined}
            onPointerDown={isEditing ? (e) => {
              // Touch: a short touch selects, a long press lifts the field, moving the finger scrolls the page.
              if ((e.target as Element).closest('[data-ctl]')) return;
              begin(e, 'press', item);
            } : undefined}
            onContextMenu={isEditing ? (e) => e.preventDefault() : undefined}
            onKeyDown={isEditing ? (e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(item.id); }
              else if (e.key === 'Escape') setSelected(null);
              else if (isSelected && e.key.startsWith('Arrow')) {
                e.preventDefault();
                stepMove(item, e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0, e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0);
              } else if (isSelected && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); remove(item); }
            } : undefined}
            aria-label={isEditing ? item.label : undefined}
            role={isEditing ? 'group' : undefined}
            className={`relative grid min-w-0 ${flowClass} ${item.selfStart ? 'self-start' : ''} ${
              isEditing
                ? `${height || item.selfStart ? '' : 'min-h-[64px]'} touch-pan-y rounded-3xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--muted)] ${
                    isSelected ? 'outline outline-[3px] outline-[color:var(--text)] z-20' : ''
                  } ${isLifted ? 'cursor-grabbing shadow-2xl will-change-transform scale-[1.02] opacity-95 !outline !outline-[3px] !outline-[color:var(--text)]' : 'cursor-pointer'}`
                : ''
            }`}
            style={style}
          >
            <div
              className={`grid min-w-0 min-h-0 ${height ? 'overflow-y-auto' : ''} ${isEditing ? 'pointer-events-none select-none' : ''}`}
              inert={isEditing}
            >
              {item.node}
            </div>
            {isSelected && !isLifted && (
              <Controls
                item={item}
                customSize={Boolean(own?.cols || own?.height)}
                onResizeStart={(e, edge) => {
                  if (e.pointerType === 'mouse' && e.button !== 0) return;
                  e.preventDefault();
                  e.stopPropagation();
                  begin(e, 'resize', item, edge);
                }}
                onNudge={(dc, dh) => nudge(item, dc, dh)}
                onReset={() => setItemSize(page, item.id, { cols: undefined, height: undefined })}
                onRemove={() => remove(item)}
              />
            )}
          </div>
        );
      })}

      {/* Where the lifted field lands (a bar = a new row is inserted there, a frame = that free place). */}
      {isEditing && preview.drop && lifted && (
        <div
          aria-hidden="true"
          data-layout-drop
          className={`pointer-events-none absolute z-20 ${
            preview.drop.line ? 'rounded-full bg-[var(--text)]' : 'rounded-3xl bg-[var(--text)]/10 outline-2 -outline-offset-2 outline-dashed outline-[var(--text)]/60'
          }`}
          style={{ left: preview.drop.left, top: preview.drop.top, width: preview.drop.width, height: preview.drop.height }}
        />
      )}
    </div>
  );
};
