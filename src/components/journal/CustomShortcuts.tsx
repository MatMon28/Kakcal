import { Camera, CalendarDays, ShoppingCart } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import type { DockAction } from '../common/ActionDock';

/** Window events that open the planner wizard / shopping list picker / photo gallery. */
export const OPEN_PLANNER_EVENT = 'kc:open-planner';
export const OPEN_SHOPPING_LIST_EVENT = 'kc:open-shopping-list';
export const OPEN_PHOTO_DIARY_EVENT = 'kc:open-photo-diary';

/**
 * Custom page: the *Plan meals*, *Shopping list*, and *Photo diary* buttons of the bottom dock, next to the
 * creation buttons (meal, recipe). Each one can be hidden in Settings > Custom page. `PreBuiltMealsView`
 * appends the returned actions to its `ActionDock`.
 */
export function useCustomDockActions(): DockAction[] {
  const { settings } = useApp();
  const j = useJournalText();
  const actions: DockAction[] = [];
  if (settings.showPlannerButton) {
    actions.push({
      id: 'plan',
      icon: <CalendarDays size={20} />,
      label: j('Plan meals', 'Pianifica i pasti'),
      tone: 'bg-carbs text-carbs-ink',
      onClick: () => window.dispatchEvent(new CustomEvent(OPEN_PLANNER_EVENT)),
    });
  }
  if (settings.showShoppingButton) {
    actions.push({
      id: 'shopping',
      icon: <ShoppingCart size={20} />,
      label: j('Shopping list', 'Lista della spesa'),
      tone: 'bg-teal text-teal-ink',
      onClick: () => window.dispatchEvent(new CustomEvent(OPEN_SHOPPING_LIST_EVENT)),
    });
  }
  if (settings.showPhotoButton) {
    actions.push({
      id: 'photo',
      icon: <Camera size={20} />,
      label: j('Photo diary', 'Diario fotografico'),
      tone: 'bg-activity text-activity-ink',
      onClick: () => window.dispatchEvent(new CustomEvent(OPEN_PHOTO_DIARY_EVENT)),
    });
  }
  return actions;
}
