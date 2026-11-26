import { Camera, CalendarDays } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import type { DockAction } from '../common/ActionDock';

/** Window events that open the planner wizard / the photo gallery (listened to by `MealPlanner` and `PhotoDiary`). */
export const OPEN_PLANNER_EVENT = 'kc:open-planner';
export const OPEN_PHOTO_DIARY_EVENT = 'kc:open-photo-diary';

/**
 * Custom page: the *Plan meals* and *Photo diary* buttons of the bottom dock, next to the other quick-add buttons
 * (meal, recipe, food). Each one can be hidden in Settings > Custom page. `PreBuiltMealsView` appends the returned
 * actions to its `ActionDock`.
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
      tone: 'bg-[#CFE7FE] text-[#183F66]',
      onClick: () => window.dispatchEvent(new CustomEvent(OPEN_PLANNER_EVENT)),
    });
  }
  if (settings.showPhotoButton) {
    actions.push({
      id: 'photo',
      icon: <Camera size={20} />,
      label: j('Photo diary', 'Diario fotografico'),
      tone: 'bg-[#F6D0D0] text-[#702D32]',
      onClick: () => window.dispatchEvent(new CustomEvent(OPEN_PHOTO_DIARY_EVENT)),
    });
  }
  return actions;
}
