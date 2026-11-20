/**
 * Advanced personalisation (Settings > Advanced): daily goals / limits and body measurements.
 * Everything here is opt-in and lives in its own storage keys (see `utils/advancedStore.ts`).
 */

/** An *objective* is reached when intake is at least the value; a *limit* is reached when intake gets to it. */
export type GoalMode = 'objective' | 'limit';

export type GoalKey = 'calories' | 'burned' | 'fiber' | 'carbs' | 'protein' | 'fat' | 'salt' | 'sugar' | 'water';

export interface GoalSetting {
  /** Each goal is switched on independently. */
  enabled: boolean;
  mode: GoalMode;
  /** kcal for `calories`, grams for everything else. */
  value: number;
}

export type GoalsConfig = Record<GoalKey, GoalSetting>;

/** Built-in body measures. Labels and icons are looked up by these ids. */
export type DefaultMeasureId =
  | 'waist'
  | 'neck'
  | 'hips'
  | 'chest'
  | 'forearms'
  | 'biceps'
  | 'thighs'
  | 'calves';

/** The three buttons at the bottom of the Body page. */
export type BodyGroup = 'upper' | 'lower' | 'custom';

export interface CustomMeasure {
  id: string;
  name: string;
  unit: string;
}

export interface BodyConfig {
  /** Master switch: shows the Body page (left of Statistics) and the Profile section. */
  enabled: boolean;
  /** Ids of the tracked measures (default ids and custom ids). */
  tracked: string[];
  custom: CustomMeasure[];
}

export interface AdvancedSettings {
  /** Master switch for goals and limits. */
  goalsEnabled: boolean;
  goals: GoalsConfig;
  body: BodyConfig;
}

export interface BodyEntry {
  date: string; // YYYY-MM-DD
  value: number;
}

/** Measure id -> entries sorted by date (one entry per day). */
export type BodyEntries = Record<string, BodyEntry[]>;
