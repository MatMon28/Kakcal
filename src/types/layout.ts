/**
 * Advanced layout (Settings > Advanced > Advanced layout): the user can edit the Today, Statistics
 * and Body pages. Everything lives in its own storage key (see `utils/layoutStore.ts`).
 */

/** The pages that can be edited. */
export type LayoutPageId = 'today' | 'stats' | 'body';

/** What the user changed for one field. A missing value means "the original one". */
export interface LayoutItemPrefs {
  /**
   * Free placement: first column (0 ... 5) and distance from the top of the page in pixels (`top`). Fields can sit at
   * any height, so they can be staggered, stacked beside a taller field, etc. Both are set together once the page has
   * been edited; missing = the field flows after the placed ones (or the page has never been edited and every field
   * flows in its original order).
   */
  col?: number;
  top?: number;
  /**
   * Legacy (previous version of the editor): row index on the old row grid. Only read to migrate an existing layout
   * to `top` the first time the page is shown; it is never written any more.
   */
  row?: number;
  /** Width in columns of the 6-column page grid (2 ... 6), set by pulling the left / right side of the field. */
  cols?: number;
  /**
   * Height in pixels, set by pulling the top / bottom side of the field. Longer content scrolls inside the field.
   * Together with `cols` this is the "shape" chosen by the user; collapsible fields (meals) go back to their classic
   * form while they are expanded and return to this shape when they are collapsed again.
   */
  height?: number;
}

export interface PageLayout {
  /** Field ids in the order chosen by the user. Fields that are not listed keep their original place at the end. */
  order: string[];
  /** Removed fields (they can be added again from the edit toolbar). */
  hidden: string[];
  items: Record<string, LayoutItemPrefs>;
}

/** A meal type added by the user. `id` always starts with `custom_`. */
export interface CustomMealType {
  id: `custom_${string}`;
  name: string;
  icon?: string;
}

export interface LayoutState {
  /** Master switch (Settings > Advanced). Off = the original layout, no pencil icons. */
  enabled: boolean;
  pages: Record<LayoutPageId, PageLayout>;
  mealTypes: CustomMealType[];
}
