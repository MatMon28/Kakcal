/**
 * Pure geometry helpers of the advanced layout's free-placement canvas (no React, no DOM, no storage), used by
 * `components/layout/EditableGrid.tsx`.
 *
 * The page is 6 columns wide. A field covers `cols` columns from `col` and sits at ANY height (`top`, in pixels), so a
 * tall field can have two small fields stacked beside it, fields can be staggered like a pyramid, and so on. Fields
 * never overlap: when one would, it is pushed down below the field that is in the way.
 */

export const GRID_COLS = 6;

/** Snap distance (px) to the edges of neighbouring fields, and the step of a free drop (px). */
export const SNAP_PX = 12;
export const TOP_STEP = 4;

/** A field on the canvas (`top` and `height` in px). */
export interface FreeCell {
  col: number;
  cols: number;
  top: number;
  height: number;
}

export interface FreeInput {
  id: string;
  cols: number;
  /** Real height in px (the stored height, or the measured natural height of the content). */
  height: number;
  /** Stored place; both missing = the field has no place yet and flows after the placed ones. */
  col?: number;
  top?: number;
}

const clampCol = (col: number, cols: number) => Math.max(0, Math.min(Math.round(col), GRID_COLS - cols));

/** Do two fields collide (share columns and are closer than `gap` vertically)? */
const hit = (a: FreeCell, b: FreeCell, gap: number) =>
  a.col < b.col + b.cols &&
  b.col < a.col + a.cols &&
  a.top < b.top + b.height + gap - 0.5 &&
  b.top < a.top + a.height + gap - 0.5;

/**
 * Turns the stored places into the real place of every field.
 * - `pinned` (the field being dragged / resized) keeps exactly its place; every other field is pushed down below it if
 *   it is in the way.
 * - Placed fields are handled from top to bottom (then left to right); a field that collides with an earlier one is
 *   pushed down below it, so a field that grows (an expanded meal) moves the fields under it down.
 * - Fields without a place flow below everything else, left to right, wrapping to a new line.
 */
export function resolveFree(inputs: FreeInput[], gap: number, pinned?: string): { cells: Record<string, FreeCell>; bottom: number } {
  const cells: Record<string, FreeCell> = {};
  const done: FreeCell[] = [];

  const placed = inputs
    .map((input, index) => ({ input, index }))
    .filter(({ input }) => input.col !== undefined && input.top !== undefined)
    .sort(
      (a, b) =>
        Number(b.input.id === pinned) - Number(a.input.id === pinned) ||
        (a.input.top as number) - (b.input.top as number) ||
        (a.input.col as number) - (b.input.col as number) ||
        a.index - b.index,
    );

  for (const { input } of placed) {
    const cell: FreeCell = {
      col: clampCol(input.col as number, input.cols),
      cols: input.cols,
      top: Math.max(0, input.top as number),
      height: input.height,
    };
    if (input.id !== pinned) {
      let blocker = done.find((other) => hit(cell, other, gap));
      while (blocker) {
        cell.top = blocker.top + blocker.height + gap;
        blocker = done.find((other) => hit(cell, other, gap));
      }
    }
    cells[input.id] = cell;
    done.push(cell);
  }

  let bottom = done.reduce((max, c) => Math.max(max, c.top + c.height), 0);
  let y = done.length ? bottom + gap : 0;
  let x = 0;
  let lineHeight = 0;
  for (const input of inputs) {
    if (cells[input.id]) continue;
    if (x + input.cols > GRID_COLS) {
      y += lineHeight + gap;
      x = 0;
      lineHeight = 0;
    }
    const cell: FreeCell = { col: x, cols: input.cols, top: y, height: input.height };
    cells[input.id] = cell;
    x += input.cols;
    lineHeight = Math.max(lineHeight, input.height);
    bottom = Math.max(bottom, y + input.height);
  }
  return { cells, bottom };
}

/**
 * Where to put the top of a field being dropped: `raw` px from the top of the page, but "magnetic": it snaps (within
 * `SNAP_PX`) to sit right below / above a field it shares columns with, or to line up with the top or bottom of any
 * other field; otherwise it moves in `TOP_STEP` px steps.
 */
export function snapTop(raw: number, col: number, cols: number, height: number, others: FreeCell[], gap: number): number {
  const candidates = [0];
  for (const o of others) {
    if (col < o.col + o.cols && o.col < col + cols) {
      candidates.push(o.top + o.height + gap, o.top - height - gap);
    }
    candidates.push(o.top, o.top + o.height - height);
  }
  let best: number | null = null;
  for (const c of candidates) {
    if (c < 0) continue;
    if (Math.abs(c - raw) <= SNAP_PX && (best === null || Math.abs(c - raw) < Math.abs(best - raw))) best = c;
  }
  return Math.max(0, best ?? Math.round(raw / TOP_STEP) * TOP_STEP);
}

// ---------------------------------------------------------------------------------------------
// Legacy: the row grid of the previous editor. Only used to show an old layout once so that it can be measured and
// converted to pixel places (`top`).
// ---------------------------------------------------------------------------------------------

export interface Cell {
  col: number;
  row: number;
  cols: number;
}

export interface PlaceInput {
  id: string;
  cols: number;
  /** Stored place; both missing = the field has no place yet. */
  col?: number;
  row?: number;
}

const overlaps = (aCol: number, aCols: number, bCol: number, bCols: number) => aCol < bCol + bCols && bCol < aCol + aCols;

/** Columns covered by Tailwind `col-span-*` classes (`col-span-6 md:col-span-3`); `wide` = the md breakpoint is active. */
export function spanCols(span: string, wide: boolean): number {
  const base = /(?:^|\s)col-span-(\d+)/.exec(span);
  const md = /(?:^|\s)md:col-span-(\d+)/.exec(span);
  const n = wide && md ? Number(md[1]) : base ? Number(base[1]) : GRID_COLS;
  return Math.min(GRID_COLS, Math.max(1, n));
}

/**
 * Legacy row grid: placed fields keep their cell; a field that would overlap another one is pushed to the next free
 * row. Fields without a place flow after the placed ones, left to right.
 */
export function resolvePlacements(inputs: PlaceInput[]): Record<string, Cell> {
  const out: Record<string, Cell> = {};
  const taken = new Map<number, Cell[]>();
  const fits = (row: number, col: number, cols: number) => !(taken.get(row) ?? []).some((c) => overlaps(col, cols, c.col, c.cols));
  const put = (id: string, row: number, col: number, cols: number) => {
    const cell = { col, row, cols };
    out[id] = cell;
    const list = taken.get(row);
    if (list) list.push(cell);
    else taken.set(row, [cell]);
  };

  const placed = inputs
    .filter((i) => i.row !== undefined && i.col !== undefined)
    .map((i) => ({ id: i.id, cols: i.cols, row: i.row as number, col: Math.max(0, Math.min(i.col as number, GRID_COLS - i.cols)) }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
  for (const p of placed) {
    let row = p.row;
    while (!fits(row, p.col, p.cols)) row++;
    put(p.id, row, p.col, p.cols);
  }

  let row = Math.max(-1, ...Object.values(out).map((c) => c.row)) + 1;
  let col = 0;
  for (const i of inputs) {
    if (i.row !== undefined && i.col !== undefined) continue;
    if (col + i.cols > GRID_COLS) { row++; col = 0; }
    put(i.id, row, col, i.cols);
    col += i.cols;
  }
  return out;
}
