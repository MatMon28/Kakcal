/**
 * Advanced layout (Settings > Advanced > Advanced layout): the user can personalise the Today, Statistics
 * and Body pages. Everything lives in its own storage key (see `utils/layoutStore.ts`).
 */

/** The pages that can be personalised. */
export type LayoutPageId = 'today' | 'stats' | 'body';

/** Width of a field on the 6-column page grid: 1/3, 1/2, 2/3 or the full row. */
export type LayoutWidth = 'third' | 'half' | 'twothirds' | 'full';

/** What the user changed for one field. A missing value means "the original one". */
export interface LayoutItemPrefs {
  width?: LayoutWidth;
  /** Size step from -2 (smallest) to 2 (biggest); 0 / missing = original size. */
  scale?: number;
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
