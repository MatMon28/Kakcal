import { Apple, Coffee, Moon, Soup, SunMedium, Utensils, UtensilsCrossed } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MealSlotId } from '../../types';
import { useLayout } from '../../utils/layoutStore';
import { TrackerIcon } from './TrackerIcon';

/**
 * The icon of a meal slot. One source of truth for Today (`MealSlotCard`), the Meal diary and the Meal planner, so a
 * meal looks the same everywhere. A meal type added with the advanced layout gets the soup icon.
 */
export function mealSlotIcon(slot: MealSlotId): LucideIcon {
  switch (slot) {
    case 'breakfast':
      return Coffee;
    case 'mid_morning':
      return Apple;
    case 'lunch':
      return Utensils;
    case 'midday_snack':
      return SunMedium;
    case 'dinner':
      return UtensilsCrossed;
    case 'extra':
      return Moon;
    default:
      return Soup;
  }
}

/** Colourless slot icon (same ink as the text around it), as drawn in the Today meal fields. */
export function MealSlotIcon({ slot, size = 18 }: { slot: MealSlotId; size?: number }) {
  const custom = useLayout().mealTypes.find((meal) => meal.id === slot);
  if (custom?.icon) return <TrackerIcon icon={custom.icon} size={size} />;
  const Icon = mealSlotIcon(slot);
  return <Icon size={size} strokeWidth={2.2} aria-hidden="true" />;
}
