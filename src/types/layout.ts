/**
 * Advanced layout (Settings > Advanced > Advanced layout): the user can personalise the Today, Statistics
 * and Body pages. Everything lives in its own storage key (see `utils/layoutStore.ts`).
 */

/** The pages that can be personalised. */
export type LayoutPageId = 'today' | 'stats' | 'body';

/** What the user changed for one field. A missing value means "the original one". */
export interface LayoutItemPrefs {
  /**
   * Free placement: first column (0 ... 5) and row (0, 1, 2 ...) of the field on the page grid. Rows that hold no field
   * are blank space. Both are set together once the page has been personalised; missing = the field flows after the
   * placed ones (or the page has never been personalised and every field flows in its original order).
   */
  col?: number;
  row?: number;
  /** Width in columns of the 6-column page grid (2 ... 6), set by pulling the left / right side of the field. */
  cols?: number;
  /** Height in pixels, set by pulling the top / bottom side of the field. Longer content scrolls inside the field. */
  height?: number;
}

export interface PageLayout {
  /** Field ids in the order chosen by the user. Fields that are not listed keep their original place at the end. */
  order: string[];
  /** Removed fields (they can be added again from the pencil toolbar). */
  hidden: string[];
  items: Record<string, LayoutItemPrefs>;
}

/** A meal type added by the user. `id` always starts with `custom_`. */
export interface CustomMealType {
  id: `custom_${string}`;
  name: string;
}

export interface LayoutState {
  /** Master switch (Settings > Advanced). Off = the original layout, no pencil icons. */
  enabled: boolean;
  pages: Record<LayoutPageId, PageLayout>;
  mealTypes: CustomMealType[];
}
