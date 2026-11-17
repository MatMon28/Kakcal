import { ActivityLog, LoggedFoodItem, MacroSummary, UserProfile } from '../types';

/**
 * Mifflin-St Jeor Formula for BMR (Basal Metabolic Rate):
 * Men: 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) + 5
 * Women: 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) - 161
 */
export function calculateBMR(profile: UserProfile): number {
  const { weightKg, heightCm, age, sex } = profile;
  if (!weightKg || !heightCm || !age) return 1600;

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? Math.round(base + 5) : Math.round(base - 161);
}

/**
 * Calculate Activity Energy Burned (Walking / Running) based on user body weight
 */
export function calculateActivityCalories(
  type: 'walking' | 'running' | 'custom',
  method: 'distance' | 'duration',
  value: number,
  weightKg: number,
  intensity: 'light' | 'moderate' | 'vigorous' = 'moderate'
): number {
  if (value <= 0 || weightKg <= 0) return 0;

  if (type === 'walking') {
    if (method === 'distance') {
      // ACSM Walking: ~0.75 kcal / kg / km
      // Intensity multiplier: light (0.68), moderate (0.75), vigorous/brisk (0.83)
      const multiplier = intensity === 'light' ? 0.68 : intensity === 'vigorous' ? 0.83 : 0.75;
      return Math.round(weightKg * value * multiplier);
    } else {
      // By Duration in minutes:
      // Light walk: ~2.8 MET, Moderate: ~3.5 MET, Vigorous/Power: ~4.5 MET
      const met = intensity === 'light' ? 2.8 : intensity === 'vigorous' ? 4.5 : 3.5;
      // kcal = MET * weight_kg * (duration_minutes / 60)
      return Math.round(met * weightKg * (value / 60));
    }
  } else {
    // Running
    if (method === 'distance') {
      // ACSM Running standard: ~1.036 kcal / kg / km
      const multiplier = intensity === 'light' ? 0.95 : intensity === 'vigorous' ? 1.12 : 1.036;
      return Math.round(weightKg * value * multiplier);
    } else {
      // By Duration in minutes:
      // Light jog: ~7.0 MET, Moderate run: ~9.0 MET, Fast run: ~11.5 MET
      const met = intensity === 'light' ? 7.0 : intensity === 'vigorous' ? 11.5 : 9.0;
      return Math.round(met * weightKg * (value / 60));
    }
  }
}

/**
 * Calculate Food Thermogenesis (TEF):
 * Macro-weighted:
 * 25% of protein kcal + 7% of carb kcal + 2% of fat kcal
 */
export function calculateTEF(carbsGrams: number, proteinGrams: number, fatGrams: number): {
  tefCarbs: number;
  tefProtein: number;
  tefFat: number;
  totalTEF: number;
} {
  const carbKcal = Math.max(0, carbsGrams) * 4;
  const proteinKcal = Math.max(0, proteinGrams) * 4;
  const fatKcal = Math.max(0, fatGrams) * 9;

  const tefProtein = proteinKcal * 0.25;
  const tefCarbs = carbKcal * 0.07;
  const tefFat = fatKcal * 0.02;

  const totalTEF = Math.round(tefProtein + tefCarbs + tefFat);

  return {
    tefCarbs: Math.round(tefCarbs * 10) / 10,
    tefProtein: Math.round(tefProtein * 10) / 10,
    tefFat: Math.round(tefFat * 10) / 10,
    totalTEF,
  };
}

/**
 * Sum macros and compute percentage split
 */
export function calculateMacros(items: LoggedFoodItem[]): MacroSummary {
  let carbsGrams = 0;
  let proteinGrams = 0;
  let fatGrams = 0;
  let fiberGrams = 0;
  let saltGrams = 0;

  for (const item of items) {
    if (item.carbs !== null && item.carbs !== undefined) {
      carbsGrams += (item.carbs * item.amount) / 100;
    }
    if (item.protein !== null && item.protein !== undefined) {
      proteinGrams += (item.protein * item.amount) / 100;
    }
    if (item.fat !== null && item.fat !== undefined) {
      fatGrams += (item.fat * item.amount) / 100;
    }
    if (item.fiber !== null && item.fiber !== undefined) {
      fiberGrams += (item.fiber * item.amount) / 100;
    }
    if (item.salt !== null && item.salt !== undefined) {
      saltGrams += (item.salt * item.amount) / 100;
    }
  }

  const carbsKcal = carbsGrams * 4;
  const proteinKcal = proteinGrams * 4;
  const fatKcal = fatGrams * 9;
  const totalMacroKcal = carbsKcal + proteinKcal + fatKcal;

  const carbsPercent = totalMacroKcal > 0 ? Math.round((carbsKcal / totalMacroKcal) * 100) : 0;
  const proteinPercent = totalMacroKcal > 0 ? Math.round((proteinKcal / totalMacroKcal) * 100) : 0;
  const fatPercent = totalMacroKcal > 0 ? Math.round((fatKcal / totalMacroKcal) * 100) : 0;

  return {
    carbsGrams: Math.round(carbsGrams * 10) / 10,
    proteinGrams: Math.round(proteinGrams * 10) / 10,
    fatGrams: Math.round(fatGrams * 10) / 10,
    fiberGrams: Math.round(fiberGrams * 10) / 10,
    saltGrams: Math.round(saltGrams * 100) / 100,
    carbsKcal: Math.round(carbsKcal),
    proteinKcal: Math.round(proteinKcal),
    fatKcal: Math.round(fatKcal),
    carbsPercent,
    proteinPercent,
    fatPercent,
  };
}

/**
 * Calculate total calories of a food list
 */
export function calculateTotalCalories(items: LoggedFoodItem[]): number {
  return Math.round(
    items.reduce((sum, item) => sum + (item.calories * item.amount) / 100, 0)
  );
}

/**
 * Calculate total activity calories
 */
export function calculateTotalActivityCalories(activities: ActivityLog[]): number {
  return activities.reduce((sum, act) => sum + act.caloriesBurned, 0);
}
