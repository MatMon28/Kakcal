import { Camera, CalendarDays } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';

/** Window events that open the planner wizard / the photo gallery (listened to by `MealPlanner` and `PhotoDiary`). */
export const OPEN_PLANNER_EVENT = 'kc:open-planner';
export const OPEN_PHOTO_DIARY_EVENT = 'kc:open-photo-diary';

/**
 * Custom page: two buttons that open the meal planner and the photo diary straight away. Each one can be hidden in
 * Settings > Today & pages (the photo button also disappears while the Photo diary itself is off).
 */
export function CustomShortcuts() {
  const { settings } = useApp();
  const j = useJournalText();
  const planner = settings.showPlannerButton;
  const photos = settings.showPhotoButton && settings.photoDiary;
  if (!planner && !photos) return null;
  const minimal = settings.ultraMinimal;
  return (
    <div className="journal-shortcuts" data-shortcut-count={Number(planner) + Number(photos)} role="group" aria-label={j('Shortcuts', 'Scorciatoie')}>
      {planner && (
        <button
          type="button"
          className="journal-shortcut"
          data-tone="blue"
          title={j('Plan meals', 'Pianifica i pasti')}
          aria-label={j('Plan meals', 'Pianifica i pasti')}
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PLANNER_EVENT))}
        >
          <CalendarDays size={17} strokeWidth={2.2} />
          <span className={minimal ? 'sr-only' : undefined}>{j('Plan meals', 'Pianifica pasti')}</span>
        </button>
      )}
      {photos && (
        <button
          type="button"
          className="journal-shortcut"
          data-tone="red"
          title={j('Photo diary', 'Diario fotografico')}
          aria-label={j('Photo diary', 'Diario fotografico')}
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PHOTO_DIARY_EVENT))}
        >
          <Camera size={17} strokeWidth={2.2} />
          <span className={minimal ? 'sr-only' : undefined}>{j('Photo diary', 'Diario foto')}</span>
        </button>
      )}
    </div>
  );
}
