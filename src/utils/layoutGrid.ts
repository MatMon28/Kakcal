/**
 * Pure geometry helpers of the advanced layout's free-placement grid (no React, no DOM, no storage), used by
 * `components/layout/EditableGrid.tsx`.
 *
 * The page is a grid of 6 columns and as many rows as needed. A field sits on one row and covers `cols` columns from
 * `col`. A row that holds no field is blank space. Every function here works on `Cell`s (`col`, `row`, `cols`).
 */

export const GRID_COLS = 6;

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

/** Position change of a field. */
export type Move = { col: number; row: number };

const overlaps = (aCol: number, aCols: number, bCol: number, bCols: number) => aCol < bCol + bCols && bCol < aCol + aCols;

/** Columns covered by Tailwind `col-span-*` classes (`col-span-6 md:col-span-3`); `wide` = the md breakpoint is active. */
export function spanCols(span: string, wide: boolean): number {
  const base = /(?:^|\s)col-span-(\d+)/.exec(span);
  const md = /(?:^|\s)md:col-span-(\d+)/.exec(span);
  const n = wide && md ? Number(md[1]) : base ? Number(base[1]) : GRID_COLS;
  return Math.min(GRID_COLS, Math.max(1, n));
}

/**
 * Turns the stored places into a place for every field. Placed fields keep their cell; a field that would overlap
 * another one is pushed to the next free row. Fields without a place flow after the placed ones, left to right.
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

/** Row whose track contains `y` (pixels from the top of the grid); above = first row, below = last row. */
export function rowAt(tracks: { top: number; h: number }[], y: number): number {
  if (!tracks.length) return 0;
  for (let i = 0; i < tracks.length; i++) {
    const next = tracks[i + 1];
    const end = next ? (tracks[i].top + tracks[i].h + next.top) / 2 : Infinity;
    if (y < end) return i;
  }
  return tracks.length - 1;
}

/** Closes row `v` (every row below moves up) when no field uses it any more. Mutates `rows`. */
function closeIfEmpty(rows: Record<string, number>, v: number) {
  if (Object.values(rows).some((r) => r === v)) return;
  for (const id of Object.keys(rows)) if (rows[id] > v) rows[id] -= 1;
}

/**
 * What happens when field `id` is dropped with its left edge at `col` on `row`.
 * - The cells are free: the field goes exactly there (the cell it leaves stays blank).
 * - Another field is in the way: a new row is inserted above (`after` false) or below (`after` true) that row, the
 *   rows below move down and the field takes the new row; the row it left is closed if it is empty now.
 * Returns the fields whose place changed and whether a row was inserted.
 */
export function planMove(
  cells: Record<string, Cell>,
  id: string,
  col: number,
  row: number,
  after: boolean,
): { changes: Record<string, Move>; inserted: boolean; col: number; row: number } {
  const me = cells[id];
  if (!me) return { changes: {}, inserted: false, col, row };
  const left = Math.max(0, Math.min(col, GRID_COLS - me.cols));
  const others = Object.entries(cells).filter(([other]) => other !== id);
  const blocked = others.some(([, c]) => c.row === row && overlaps(left, me.cols, c.col, c.cols));
  const target = blocked ? (after ? row + 1 : row) : row;

  const rows: Record<string, number> = {};
  for (const [other, c] of others) rows[other] = blocked && c.row >= target ? c.row + 1 : c.row;
  rows[id] = target;
  if (blocked) closeIfEmpty(rows, me.row >= target ? me.row + 1 : me.row);

  const changes: Record<string, Move> = {};
  for (const [other, c] of Object.entries(cells)) {
    const next = other === id ? { col: left, row: rows[other] } : { col: c.col, row: rows[other] };
    if (next.col !== c.col || next.row !== c.row) changes[other] = next;
  }
  return { changes, inserted: blocked, col: left, row: rows[id] };
}

/** Rows to change when field `id` is removed: the row it leaves is closed if nothing else is on it. */
export function planRemove(cells: Record<string, Cell>, id: string): Record<string, Move> {
  const me = cells[id];
  if (!me) return {};
  const rows: Record<string, number> = {};
  for (const [other, c] of Object.entries(cells)) if (other !== id) rows[other] = c.row;
  closeIfEmpty(rows, me.row);
  const changes: Record<string, Move> = {};
  for (const [other, row] of Object.entries(rows)) if (row !== cells[other].row) changes[other] = { col: cells[other].col, row };
  return changes;
}

/** Free columns around field `id` on its row: it can grow from `min` up to (not including) `max`. */
export function freeRange(cells: Record<string, Cell>, id: string): { min: number; max: number } {
  const me = cells[id];
  let min = 0;
  let max = GRID_COLS;
  if (!me) return { min, max };
  for (const [other, c] of Object.entries(cells)) {
    if (other === id || c.row !== me.row) continue;
    if (c.col + c.cols <= me.col) min = Math.max(min, c.col + c.cols);
    else if (c.col >= me.col + me.cols) max = Math.min(max, c.col);
  }
  return { min, max };
}
