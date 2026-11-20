import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useLayoutText } from '../../i18n/layout';
import type { LayoutItemPrefs, LayoutPageId } from '../../types/layout';
import {
  GRID_COLS,
  resolveFree,
  resolvePlacements,
  snapTop,
  spanCols,
  type FreeCell,
  type FreeInput,
} from '../../utils/layoutGrid';
import {
  HEIGHT_STEP,
  MIN_COLS,
  applyItemChanges,
  clampCols,
  clampHeight,
  hideItem,
  mergeOrder,
  setItemSize,
  useEditingPage,
  useLayout,
} from '../../utils/layoutStore';

/** One editable field of a page. */
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
  /**
   * The field is expanded right now (an open meal). While expanded and not being edited it is shown in its classic
   * form (original width, natural height) at its place; the shape chosen by the user is kept and comes back as soon as
   * the field is collapsed again.
   */
  expanded?: boolean;
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
// Outline: dashed (this field can be edited) or solid and uniform (this field is selected)
// ---------------------------------------------------------------------------------------------

/** Corner radius used when the field's own card has none to copy. */
const OUTLINE_FALLBACK_RADIUS = 12;

/** The corner radius (px) of the card inside a field: the first element down the first-child chain that has one. */
function cardRadius(box: HTMLElement | null): number {
  let el = box?.firstElementChild?.firstElementChild ?? null;
  for (let depth = 0; el && depth < 3; depth += 1) {
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius);
    if (Number.isFinite(radius) && radius > 0) return radius;
    el = el.firstElementChild;
  }
  return OUTLINE_FALLBACK_RADIUS;
}

/**
 * One SVG rectangle that follows the field's box exactly, so the line has the same thickness on all four sides and
 * the same dash pattern all the way round (dashed = editable, solid = selected / lifted). Its corners copy the card's own
 * corner radius (it changes with the style: round, square, chamfered...), so a small field is never outlined as a pill.
 */
const Outline: React.FC<{ solid: boolean }> = ({ solid }) => {
  const ref = useRef<SVGSVGElement>(null);
  const [radius, setRadius] = useState(OUTLINE_FALLBACK_RADIUS);
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement ?? null;
    // An SVG corner is elliptical when the radius is larger than half of a side, so it is clamped to a circle.
    const limit = parent ? Math.min(parent.offsetWidth, parent.offsetHeight) / 2 : OUTLINE_FALLBACK_RADIUS;
    const next = Math.max(0, Math.min(cardRadius(parent), limit));
    setRadius((current) => (current === next ? current : next));
  });
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      data-layout-outline={solid ? 'solid' : 'dashed'}
      className={`pointer-events-none absolute inset-0 z-[5] size-full overflow-visible ${
        solid ? 'text-[color:var(--text)]' : 'text-[color:var(--muted)] opacity-80'
      }`}
    >
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        rx={radius}
        ry={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={solid ? 3 : 2}
        strokeDasharray={solid ? undefined : '10 7'}
        strokeLinecap="round"
      />
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------
// Resize handles: the four sides and the two bottom corners of the selected field
// ---------------------------------------------------------------------------------------------

type Edge = 'n' | 's' | 'e' | 'w' | 'sw' | 'se';

// Literal class names so that Tailwind finds them. Hit areas are 24 px wide, the visible knob is one small round dot, the same on every side. The top
// corners are left free for the reset and remove buttons. Everything sits inside the field's left / right edge: the page
// viewport clips horizontally (PageSwiper), so a control hanging out of a full-width field would be cut in half.
const HANDLES: { edge: Edge; box: string; knob: string }[] = [
  { edge: 'n', box: 'left-9 right-9 -top-2 h-6 cursor-ns-resize', knob: 'size-3.5' },
  { edge: 's', box: 'left-9 right-9 -bottom-2 h-6 cursor-ns-resize', knob: 'size-3.5' },
  { edge: 'w', box: 'top-4 bottom-4 left-0 w-5 cursor-ew-resize', knob: 'size-3.5' },
  { edge: 'e', box: 'top-4 bottom-4 right-0 w-5 cursor-ew-resize', knob: 'size-3.5' },
  { edge: 'sw', box: '-bottom-2 left-0 size-6 cursor-nesw-resize', knob: 'size-3.5' },
  { edge: 'se', box: '-bottom-2 right-0 size-6 cursor-nwse-resize', knob: 'size-3.5' },
];

const ctl =
  'pressable pointer-events-auto absolute size-7 rounded-full flex items-center justify-center text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] shadow-md hover:bg-[var(--hover)]';

interface ControlsProps {
  item: LayoutItem;
  customSize: boolean;
  onResizeStart: (e: React.PointerEvent, edge: Edge) => void;
  onNudge: (dCols: number, dHeight: number) => void;
  onReset: () => void;
  onRemove: () => void;
}

/**
 * What is drawn over the selected field: the resize knobs, the remove button in the top-right corner and "original
 * size" in the top-left corner (only once the field was resized).
 */
const Controls: React.FC<ControlsProps> = ({ item, customSize, onResizeStart, onNudge, onReset, onRemove }) => {
  const text = useLayoutText().item;
  return (
    <div className="absolute inset-0 z-10 pointer-events-none" data-layout-controls>
      {customSize && !item.fixed && (
        <button
          type="button"
          data-ctl
          className={`${ctl} -top-3 left-1`}
          onClick={onReset}
          aria-label={`${text.resetSize}: ${item.label}`}
          title={text.resetSize}
        >
          <RotateCcw size={14} />
        </button>
      )}
      <button
        type="button"
        data-ctl
        data-layout-remove
        className={`${ctl} -top-3 right-1 !bg-[#F6D0D0] !text-[#7A2727] !border-[#E4AAAA]`}
        onClick={onRemove}
        aria-label={`${text.remove}: ${item.label}`}
        title={text.remove}
      >
        <X size={15} strokeWidth={2.5} />
      </button>

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
  /** Where inside the field it was grabbed (px from its top-left corner). */
  grabX: number;
  grabY: number;
  /** Size (px) and place of the field when the gesture started. */
  width: number;
  height: number;
  from: FreeCell;
  /** Every field's place when the gesture started (for the magnetic snapping). */
  base: Record<string, FreeCell>;
  minCols: number;
  minHeight: number;
  active: boolean;
  timer: number;
}

interface Preview {
  /** The lifted field follows the pointer by `dx` / `dy`; `to` is the place where it lands if dropped now. */
  move?: { id: string; dx: number; dy: number; from: FreeCell; to: { col: number; top: number } };
  /** Place / size of the field that is being resized (`height` undefined = unchanged). */
  size?: { id: string; col: number; cols: number; top: number; height?: number };
}

/** A field that is being dragged or resized is held at this place / size; the other fields make room around it. */
interface Override {
  id: string;
  col?: number;
  top?: number;
  cols?: number;
  height?: number;
}

/** Press time before a field can be moved (touch), movement that cancels it, and mouse drag threshold. */
const LONG_PRESS_MS = 380;
const PRESS_SLOP = 8;
const DRAG_THRESHOLD = 4;
/** Height guessed for a field before it has been measured (replaced before the first paint). */
const GUESS_HEIGHT = 80;
/** Free room kept below the last field while editing, so a field can be dropped lower than all the others. */
const EDIT_TAIL = 160;
/** Keyboard move: px per arrow key press. */
const KEY_STEP = 16;

const clampN = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * A page body laid out on a 6-column canvas with free placement. With Settings > Advanced > Advanced layout on, the
 * place (column + distance from the top), width and height of each field and the removed fields come from the layout
 * store. While the pencil is active every field gets a dashed outline; touching a field selects it (uniform solid
 * border, resize knobs, remove button in the corner); holding it for a moment lifts it so it can be dropped at any
 * height, beside or between other fields (a field that would overlap another one pushes it down). A page that was
 * never edited is plain flow in the original order and looks exactly like the original page.
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
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [gap, setGap] = useState(12);
  const [animate, setAnimate] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const dropRef = useRef<{ id: string; col: number; top: number } | null>(null);
  const sizeRef = useRef<Preview['size']>(undefined);
  const raf = useRef(0);
  /** A second finger that scrolls the page while a field is held / resized by the first one. */
  const scroller = useRef<{ id: number; y: number } | null>(null);
  const liftRef = useRef<() => void>(() => {});
  const holdRef = useRef<(on: boolean) => void>(() => {});

  // ---- Which way the page is drawn ----
  // flow   = the original page (never edited)
  // legacy = saved by the previous (row based) editor: drawn once on the old row grid, measured and converted
  // free   = every field has a column and a distance from the top (px)
  const minColsOf = (item: LayoutItem) => Math.max(MIN_COLS, item.minCols ?? MIN_COLS);
  const anyPlaced = enabled && shown.some((item) => prefs.items[item.id]?.top !== undefined);
  const anyLegacy = enabled && shown.some((item) => prefs.items[item.id]?.row !== undefined && prefs.items[item.id]?.top === undefined);
  const mode: 'flow' | 'legacy' | 'free' = !enabled ? 'flow' : anyLegacy ? 'legacy' : anyPlaced ? 'free' : 'flow';
  const needsMigration = enabled && shown.length > 0 && (anyLegacy || (isEditing && !anyPlaced));

  // ---- Where every field is (free mode) ----
  const inputs = (): FreeInput[] =>
    shown.map((item) => {
      const own = enabled ? prefs.items[item.id] : undefined;
      // An expanded field (open meal) is shown in its classic form; its chosen shape is kept for when it is collapsed.
      const natural = !isEditing && item.expanded === true;
      const cols = natural
        ? Math.min(GRID_COLS, Math.max(minColsOf(item), spanCols(item.span, wide)))
        : Math.min(GRID_COLS, Math.max(minColsOf(item), own?.cols ?? spanCols(item.span, wide)));
      const stored = natural ? undefined : own?.height;
      const height = stored ? Math.max(stored, item.minHeight ?? 0) : heights[item.id] ?? GUESS_HEIGHT;
      return { id: item.id, cols, height, col: own?.top !== undefined ? own.col : undefined, top: own?.top };
    });

  const compute = (override?: Override) =>
    resolveFree(
      inputs().map((input) => {
        if (!override || override.id !== input.id) return input;
        const next = { ...input };
        if (override.col !== undefined) next.col = override.col;
        if (override.top !== undefined) next.top = override.top;
        if (override.cols !== undefined) next.cols = override.cols;
        if (override.height !== undefined) next.height = override.height;
        return next;
      }),
      gap,
      override?.id,
    );

  const override: Override | undefined = !isEditing
    ? undefined
    : preview.move
      ? { id: preview.move.id, col: preview.move.to.col, top: preview.move.to.top }
      : preview.size
        ? { ...preview.size }
        : undefined;
  const free = mode === 'free' ? compute(override) : null;
  const legacyCells =
    mode === 'legacy'
      ? resolvePlacements(
          shown.map((item) => {
            const own = prefs.items[item.id];
            const cols = Math.min(GRID_COLS, Math.max(minColsOf(item), own?.cols ?? spanCols(item.span, wide)));
            return { id: item.id, cols, col: own?.col, row: own?.row };
          }),
        )
      : null;

  const latest = useRef({ page, ids, shown, prefs, free, compute, mode });
  latest.current = { page, ids, shown, prefs, free, compute, mode };

  const find = (id: string) => gridRef.current?.querySelector<HTMLElement>(`[data-layout-item="${id.replace(/"/g, '\\"')}"]`) ?? null;

  const columnMetrics = () => {
    const grid = gridRef.current!;
    const g = parseFloat(getComputedStyle(grid).columnGap) || 0;
    return { gap: g, unit: (grid.clientWidth + g) / GRID_COLS };
  };

  /** Writes every field's resolved place (and the given size changes) to the store in one go. */
  const commitCells = (cells: Record<string, FreeCell>, extra: Record<string, Partial<LayoutItemPrefs>>) => {
    const { page: p, shown: list, prefs: stored } = latest.current;
    const changes: Record<string, Partial<LayoutItemPrefs>> = {};
    for (const item of list) {
      const cell = cells[item.id];
      if (!cell) continue;
      const own = stored.items[item.id];
      if (own?.col !== cell.col || own?.top !== cell.top || extra[item.id]) {
        changes[item.id] = { ...extra[item.id], col: cell.col, top: cell.top };
      }
    }
    if (Object.keys(changes).length) applyItemChanges(p, changes);
  };

  // ---- Heights of the fields (free mode): measured before every paint and whenever a field changes size ----
  const measure = () => {
    const grid = gridRef.current;
    if (!grid || grid.clientWidth === 0 || latest.current.mode !== 'free') return;
    const g = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const next: Record<string, number> = {};
    for (const item of latest.current.shown) {
      const el = find(item.id);
      if (el) next[item.id] = el.offsetHeight;
    }
    setHeights((prev) => {
      const keys = Object.keys(next);
      return keys.length === Object.keys(prev).length && keys.every((k) => prev[k] !== undefined && Math.abs(prev[k] - next[k]) < 0.5) ? prev : next;
    });
    setGap((prev) => (Math.abs(prev - g) < 0.01 ? prev : g));
  };
  useLayoutEffect(measure);

  const idsKey = shown.map((item) => item.id).join('|');
  useEffect(() => {
    const grid = gridRef.current;
    if (mode !== 'free' || !grid) return;
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(run);
    observer.observe(grid);
    grid.querySelectorAll('[data-layout-item]').forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [mode, idsKey]);

  // Moves animate (a field that grows pushes the ones below it down smoothly), but not the very first layout.
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setAnimate(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // ---- The first time a page is edited (or an old row layout is opened) every field gets a place measured from the screen ----
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!needsMigration || !grid) return;
    const migrate = () => {
      const { shown: list, prefs: stored } = latest.current;
      const box = grid.getBoundingClientRect();
      const { gap: g, unit } = columnMetrics();
      const rows = list.flatMap((item) => {
        const el = find(item.id);
        return el ? [{ item, el, r: el.getBoundingClientRect() }] : [];
      });
      // Natural heights: a field that only stretched to the field next to it keeps that height.
      const saved = rows.map(({ el }) => [el.style.alignSelf, el.style.height] as const);
      rows.forEach(({ el, item }) => {
        el.style.alignSelf = 'start';
        if (!stored.items[item.id]?.height) el.style.height = 'auto';
      });
      const natural = rows.map(({ el }) => el.offsetHeight);
      rows.forEach(({ el }, i) => {
        el.style.alignSelf = saved[i][0];
        el.style.height = saved[i][1];
      });
      const changes: Record<string, Partial<LayoutItemPrefs>> = {};
      rows.forEach(({ item, r }, i) => {
        const own = stored.items[item.id];
        const cols = clampN(Math.round((r.width + g) / unit), 1, GRID_COLS);
        const patch: Partial<LayoutItemPrefs> = {
          col: clampN(Math.round((r.left - box.left) / unit), 0, GRID_COLS - cols),
          top: Math.max(0, Math.round(r.top - box.top)),
          row: undefined,
        };
        if (!own?.cols && cols !== spanCols(item.span, wide)) patch.cols = clampCols(cols);
        if (!own?.height && !item.fixed && !item.selfStart && r.height - natural[i] > 3) patch.height = clampHeight(r.height);
        changes[item.id] = patch;
      });
      if (Object.keys(changes).length) applyItemChanges(latest.current.page, changes);
    };
    if (grid.clientWidth > 0) {
      migrate();
      return;
    }
    // The page is not visible yet (zero width): convert it as soon as it gets a size.
    const observer = new ResizeObserver(() => {
      if (grid.clientWidth > 0) {
        observer.disconnect();
        migrate();
      }
    });
    observer.observe(grid);
    return () => observer.disconnect();
  }, [needsMigration, idsKey]);

  // ---- Gesture engine (one set of window listeners) ----
  useEffect(() => {
    const grid = () => gridRef.current;

    /** While a field is held no new finger may start a native scroll (the second finger scrolls through `scroller`). */
    const holdTouch = (on: boolean) => {
      document.documentElement.style.touchAction = on ? 'none' : '';
    };
    holdRef.current = holdTouch;

    const update = () => {
      const g = gesture.current;
      const el = grid();
      if (!g || !g.active || !el) return;
      const { x, y } = pointer.current;
      const rect = el.getBoundingClientRect();
      const { gap: gapNow, unit } = columnMetrics();

      if (g.kind === 'move') {
        const col = clampN(Math.round((x - g.grabX - rect.left) / unit), 0, GRID_COLS - g.from.cols);
        const raw = Math.max(0, y - g.grabY - rect.top);
        const others = Object.entries(g.base)
          .filter(([id]) => id !== g.id)
          .map(([, cell]) => cell);
        const top = snapTop(raw, col, g.from.cols, g.height, others, gapNow);
        dropRef.current = { id: g.id, col, top };
        setPreview({
          move: { id: g.id, dx: x - g.startX, dy: y - g.startY + (window.scrollY - g.startScroll), from: g.from, to: { col, top } },
        });
        return;
      }

      // resize
      const edge = g.edge!;
      const dx = x - g.startX;
      const dy = y - g.startY;
      let col = g.from.col;
      let cols = g.from.cols;
      let top = g.from.top;
      let height: number | undefined;
      if (edge.includes('e')) {
        cols = Math.max(g.minCols, Math.min(GRID_COLS - g.from.col, Math.round((g.width + dx + gapNow) / unit)));
      } else if (edge.includes('w')) {
        cols = Math.max(g.minCols, Math.min(g.from.col + g.from.cols, Math.round((g.width - dx + gapNow) / unit)));
        col = g.from.col + g.from.cols - cols;
      }
      if (edge.includes('s')) {
        const next = Math.max(g.minHeight, clampHeight(g.height + dy));
        height = Math.abs(next - g.height) < HEIGHT_STEP ? undefined : next;
      } else if (edge === 'n') {
        let next = Math.max(g.minHeight, clampHeight(g.height - dy));
        top = g.from.top + g.height - next;
        if (top < 0) {
          next = Math.max(g.minHeight, clampHeight(g.from.top + g.height));
          top = Math.max(0, g.from.top + g.height - next);
        }
        if (Math.abs(next - g.height) < HEIGHT_STEP) top = g.from.top;
        else height = next;
      }
      sizeRef.current = { id: g.id, col, cols, top, height };
      setPreview({ size: sizeRef.current });
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
      holdTouch(true);
      setSelected(g.id);
      try { navigator.vibrate?.(12); } catch { /* not supported */ }
      if (!raf.current) raf.current = requestAnimationFrame(autoScroll);
      update();
    };
    liftRef.current = lift;

    const finish = (commit: boolean) => {
      const g = gesture.current;
      gesture.current = null;
      scroller.current = null;
      holdTouch(false);
      if (g) window.clearTimeout(g.timer);
      if (g?.active && commit) {
        const { compute: resolve } = latest.current;
        const drop = dropRef.current;
        if (g.kind === 'move' && drop && (drop.col !== g.from.col || drop.top !== g.from.top)) {
          commitCells(resolve({ id: drop.id, col: drop.col, top: drop.top }).cells, {});
        }
        const size = sizeRef.current;
        if (g.kind === 'resize' && size) {
          const patch: Partial<LayoutItemPrefs> = {};
          if (size.cols !== g.from.cols) patch.cols = size.cols;
          if (size.height !== undefined) patch.height = size.height;
          const changed = size.cols !== g.from.cols || size.height !== undefined || size.col !== g.from.col || size.top !== g.from.top;
          if (changed) commitCells(resolve({ ...size }).cells, { [g.id]: patch });
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
      // Another finger moves while a field is lifted / resized: it scrolls the page (the native scroll is blocked then).
      if (g && g.kind !== 'press' && e.pointerType === 'touch' && e.pointerId !== g.pointerId) {
        const last = scroller.current;
        if (last && last.id === e.pointerId) window.scrollBy(0, last.y - e.clientY);
        scroller.current = { id: e.pointerId, y: e.clientY };
        return;
      }
      if (!g || e.pointerId !== g.pointerId) return;
      pointer.current = { x: e.clientX, y: e.clientY };
      const dist = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
      if (g.kind === 'press') {
        if (dist < PRESS_SLOP) return;
        // A finger that moves before the long press is done is scrolling the page; a mouse drags right away.
        if (g.pointerType === 'touch') { window.clearTimeout(g.timer); gesture.current = null; return; }
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
      if (scroller.current?.id === e.pointerId) scroller.current = null;
      const g = gesture.current;
      if (!g || e.pointerId !== g.pointerId) return;
      finish(g.kind !== 'press');
    };
    const onCancel = (e: PointerEvent) => {
      if (scroller.current?.id === e.pointerId) scroller.current = null;
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
      const g = gesture.current;
      if (g && g.kind !== 'press' && e.pointerType === 'touch' && e.pointerId !== g.pointerId) {
        // The second finger only scrolls: it neither selects nor clears anything.
        scroller.current = { id: e.pointerId, y: e.clientY };
        return;
      }
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
      holdTouch(false);
    };
  }, []);

  // Leaving the edit mode (Done, page change) always ends a gesture that is still running and clears the selection.
  useEffect(() => {
    if (!isEditing) {
      if (gesture.current) window.clearTimeout(gesture.current.timer);
      gesture.current = null;
      scroller.current = null;
      holdRef.current(false);
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
    // A second finger never starts a gesture of its own while the first one holds a field (it scrolls the page).
    const running = gesture.current;
    if (running && e.pointerType === 'touch' && running.pointerType === 'touch' && running.pointerId !== e.pointerId) return;
    const el = find(item.id);
    const cell = latest.current.free?.cells[item.id];
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
      grabY: e.clientY - r.top,
      width: el.offsetWidth,
      height: el.offsetHeight,
      from: { ...cell, height: el.offsetHeight },
      base: latest.current.free!.cells,
      minCols: minColsOf(item),
      minHeight: Math.max(item.minHeight ?? 0, 0),
      active: false,
      timer: 0,
    };
    if (kind === 'press') g.timer = window.setTimeout(() => liftRef.current(), LONG_PRESS_MS);
    else holdRef.current(true);
    gesture.current = g;
    setSelected(item.id);
  };

  /** Keyboard resize (arrow keys on a side knob). */
  const nudge = (item: LayoutItem, dCols: number, dHeight: number) => {
    const cell = latest.current.free?.cells[item.id];
    const el = find(item.id);
    if (!cell || !el) return;
    const own = prefs.items[item.id];
    const cols = dCols ? clampN(cell.cols + dCols, minColsOf(item), GRID_COLS - cell.col) : cell.cols;
    const height = dHeight ? Math.max(item.minHeight ?? 0, clampHeight((own?.height ?? el.offsetHeight) + dHeight)) : undefined;
    const patch: Partial<LayoutItemPrefs> = {};
    if (dCols) patch.cols = cols;
    if (height !== undefined) patch.height = height;
    commitCells(latest.current.compute({ id: item.id, col: cell.col, top: cell.top, cols, height }).cells, { [item.id]: patch });
  };

  /** Keyboard move of the selected field (arrow keys on the field): one column or 16 px at a time. */
  const stepMove = (item: LayoutItem, dCol: number, dTop: number) => {
    const cell = latest.current.free?.cells[item.id];
    if (!cell) return;
    const col = clampN(cell.col + dCol, 0, GRID_COLS - cell.cols);
    const top = Math.max(0, cell.top + dTop);
    commitCells(latest.current.compute({ id: item.id, col, top }).cells, {});
  };

  const remove = (item: LayoutItem) => {
    hideItem(page, item.id);
    setSelected(null);
  };

  // ---- Render ----
  const lifted = isEditing && preview.move ? preview.move : undefined;
  const unitStyle = (n: number) => `calc((100% + ${gap}px) * ${n} / ${GRID_COLS})`;
  const rowCount = legacyCells ? Math.max(-1, ...Object.values(legacyCells).map((c) => c.row)) + 1 : 0;
  const usedRows = new Set(legacyCells ? Object.values(legacyCells).map((c) => c.row) : []);
  const legacyRows = legacyCells ? Array.from({ length: rowCount }, (_, r) => (usedRows.has(r) ? 'auto' : '40px')).join(' ') : undefined;
  const gridStyle: React.CSSProperties | undefined = free
    ? { height: free.bottom + (isEditing ? EDIT_TAIL : 0) }
    : legacyRows
      ? { gridTemplateRows: legacyRows }
      : undefined;
  const landing = lifted && free ? free.cells[lifted.id] : undefined;

  return (
    <div
      ref={gridRef}
      className={`relative grid grid-cols-6 ${className} ${isEditing ? 'select-none [-webkit-touch-callout:none]' : ''}`}
      style={gridStyle}
      {...(isEditing ? { 'data-no-swipe': '' } : {})}
    >
      {shown.map((item) => {
        const own = enabled ? prefs.items[item.id] : undefined;
        const natural = !isEditing && item.expanded === true;
        const cell = free?.cells[item.id];
        const legacy = legacyCells?.[item.id];
        const live = isEditing && preview.size?.id === item.id ? preview.size : undefined;
        const stored = natural ? undefined : live ? live.height ?? own?.height : own?.height;
        const height = stored ? Math.max(stored, item.minHeight ?? 0) : undefined;
        const isSelected = isEditing && selected === item.id;
        const isLifted = lifted?.id === item.id;
        const style: React.CSSProperties = {};
        if (cell) {
          // The lifted field is drawn where it was picked up (plus the pointer offset); the others make room for it.
          const at = isLifted && lifted ? lifted.from : cell;
          style.position = 'absolute';
          style.left = unitStyle(at.col);
          style.width = `calc(${unitStyle(at.cols)} - ${gap}px)`;
          style.top = at.top;
        } else if (legacy) {
          style.gridColumn = `${legacy.col + 1} / span ${legacy.cols}`;
          style.gridRow = legacy.row + 1;
        }
        if (height) style.height = height;
        if (isLifted && lifted) {
          style.transform = `translate(${lifted.dx}px, ${lifted.dy}px)`;
          style.zIndex = 30;
        }
        const flowClass = cell || legacy ? '' : item.span;
        const moving = isLifted || live !== undefined;
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
                const step = e.shiftKey ? 4 : 1;
                stepMove(item, e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0, (e.key === 'ArrowDown' ? KEY_STEP : e.key === 'ArrowUp' ? -KEY_STEP : 0) * step);
              } else if (isSelected && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); remove(item); }
            } : undefined}
            aria-label={isEditing ? item.label : undefined}
            role={isEditing ? 'group' : undefined}
            className={`relative grid min-w-0 ${flowClass} ${item.selfStart ? 'self-start' : ''} ${
              animate && cell && !moving ? 'transition-[top,left,width] duration-200 ease-out' : ''
            } ${
              isEditing
                ? `touch-pan-y rounded-3xl outline-none ${isSelected ? 'z-20' : ''} ${
                    isLifted ? 'cursor-grabbing shadow-2xl will-change-transform scale-[1.02] opacity-95' : 'cursor-pointer'
                  }`
                : ''
            }`}
            style={style}
          >
            <div
              className={`grid min-w-0 min-h-0 ${height ? 'overflow-clip [overflow-clip-margin:12px]' : ''} ${isEditing ? 'pointer-events-none select-none' : ''}`}
              inert={isEditing}
            >
              {item.node}
            </div>
            {isEditing && <Outline solid={isSelected || isLifted} />}
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

      {/* Where the lifted field lands if it is dropped now (the other fields have already made room for it). */}
      {landing && (
        <div
          aria-hidden="true"
          data-layout-drop
          className="pointer-events-none absolute z-[1] rounded-3xl bg-[var(--text)]/10 outline-2 -outline-offset-2 outline-dashed outline-[var(--text)]/60"
          style={{ left: unitStyle(landing.col), width: `calc(${unitStyle(landing.cols)} - ${gap}px)`, top: landing.top, height: landing.height }}
        />
      )}
    </div>
  );
};
