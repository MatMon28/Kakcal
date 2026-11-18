import { ActivityLog, Language } from '../types';
import { activityName, getActivityById } from '../data/activities';

interface ActivityLabels {
  walking: string;
  running: string;
  custom: string;
  other: string;
}

/** Display name of a logged activity (Today card, day overview). Database activities are localized. */
export function activityLogLabel(act: ActivityLog, language: Language, labels: ActivityLabels): string {
  switch (act.type) {
    case 'walking':
      return labels.walking;
    case 'running':
      return labels.running;
    case 'other': {
      const info = getActivityById(act.activityId);
      return info ? activityName(info, language) : act.customName || labels.other;
    }
    default:
      return act.customName || labels.custom;
  }
}
