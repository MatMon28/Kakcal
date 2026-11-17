import { UserProfile } from '../types';

/**
 * Daily drinking-water goal (beverages only, food water excluded).
 *
 * Based on EFSA (2010) adequate intake for total water (food + beverages):
 *   men 2.5 L/day, women 2.0 L/day  (~20% comes from food)
 * => beverage guideline ≈ 2.0 L (men) / 1.6 L (women).
 * Italian LARN (2014) guidelines align with the same figures.
 *
 * Adjustments:
 *  - weight: scale around 70 kg (±10% per 7 kg, capped ±25%)
 *  - age: +5% from 65 years up (elderly feel thirst less)
 *  - activity: +250 ml per 300 kcal burned through movement, max +750 ml
 */
export function dailyWaterTargetMl(profile: UserProfile, activityKcal: number): number {
  const base = profile.sex === 'male' ? 2000 : 1600;

  const weightFactor = Math.min(1.25, Math.max(0.75, profile.weightKg / 70));
  const ageFactor = profile.age >= 65 ? 1.05 : 1;
  const activityBonus = Math.min(750, Math.floor(Math.max(0, activityKcal) / 300) * 250);

  return Math.round((base * weightFactor * ageFactor + activityBonus) / 10) * 10;
}
