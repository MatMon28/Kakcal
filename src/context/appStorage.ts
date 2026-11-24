import { DayLog, PeriodData, PeriodSettings, PeriodTag, Theme, UserProfile, CustomActivityDef } from '../types';
import { migrateCustomEntries } from '../utils/customTrackers';
import { getDefaultPeriodTags, periodTagListKey, type PeriodTagGroup } from '../utils/period';

/** Storage keys, defaults and the normalisers that clean stored data. Used by `AppContext.tsx`. */

/** Accepts the legacy `string[]` format as well as `CustomActivityDef[]`. */
export function normalizeCustomActivities(raw: unknown): CustomActivityDef[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomActivityDef[] = [];
  raw.forEach((item, index) => {
    if (typeof item === 'string' && item.trim()) {
      out.push({ id: `ca-legacy-${index}-${item.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name: item.trim(), met: 5, createdAt: '' });
    } else if (item && typeof item === 'object' && typeof (item as CustomActivityDef).name === 'string') {
      const d = item as Partial<CustomActivityDef>;
      out.push({
        id: typeof d.id === 'string' && d.id ? d.id : `ca-legacy-${index}`,
        name: d.name!.trim(),
        met: typeof d.met === 'number' && d.met > 0 ? d.met : 5,
        createdAt: typeof d.createdAt === 'string' ? d.createdAt : '',
      });
    }
  });
  return out;
}

export const STORAGE_KEYS = {
  LANG: 'kcalsync_lang',
  PROFILE: 'kcalsync_profile',
  CUSTOM_FOODS: 'kcalsync_custom_foods',
  USED_FOODS: 'kcalsync_used_foods',
  DAY_LOGS: 'kcalsync_day_logs',
  PREBUILT_MEALS: 'kcalsync_prebuilt_meals',
  SETTINGS: 'kcalsync_settings',
  CUSTOM_ACTIVITIES: 'kcalsync_custom_activities',
  PERIOD: 'kf_period_data',
};

export const DEFAULT_PERIOD_SETTINGS: PeriodSettings = {
  cycleLength: 28,
  periodDuration: 5,
  trackPill: false,
  packLength: 28,
  inactiveDays: 7,
  packStart: null,
  pillTrackingSince: null,
  showNutrition: false,
  showPhaseBandsInStats: false,
  moodTags: getDefaultPeriodTags('mood'),
  symptomTags: getDefaultPeriodTags('symptom'),
};

export const clampInt = (v: unknown, min: number, max: number, dflt: number) => {
  const n = typeof v === 'number' ? Math.round(v) : NaN;
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
};

export const isDateStr = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const normalizeTheme = (value: unknown): Theme => value === 'dark' || value === 'lite-dark' ? value : 'light';

export function normalizeDayLogs(logs: Record<string, DayLog>): Record<string, DayLog> {
  return Object.fromEntries(Object.entries(logs).map(([date, raw]) => {
    const log = migrateCustomEntries(raw.date === date ? raw : { ...raw, date });
    const legacyWater = log.waterMl;
    const noon = new Date(`${date}T12:00:00`);
    if (typeof legacyWater === 'number' && legacyWater > 0 && !log.waterEntries?.length && Number.isFinite(noon.getTime())) {
      const { waterMl: _legacy, ...day } = log;
      return [date, { ...day, waterEntries: [{ id: `water-legacy-${date}`, ml: legacyWater, timestamp: noon.toISOString() }] }];
    }
    return [date, log];
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePeriodSettings(p: any): PeriodSettings {
  const src = p || {};
  const legacyPack = src.pillPack === 21 || src.pillPack === 28;
  const packLength = legacyPack ? 28 : clampInt(src.packLength, 1, 365, 28);
  const inactiveDays = legacyPack ? 7 : clampInt(src.inactiveDays, 0, Math.max(0, packLength - 1), Math.min(7, packLength - 1));
  const tags = (arr: unknown): PeriodTag[] => Array.isArray(arr)
    ? arr.filter((tag) => tag && typeof tag.id === 'string' && typeof tag.label === 'string' && tag.label.trim())
        .map(({ id, label }) => ({ id, label: label.trim().slice(0, 24) }))
    : [];
  const catalogue = (group: PeriodTagGroup) => {
    const defaults = getDefaultPeriodTags(group);
    const stored = src[periodTagListKey(group)];
    const hidden = Array.isArray(src.hiddenBuiltins) ? src.hiddenBuiltins : [];
    const legacy = group === 'mood' ? src.customMoods : src.customSymptoms;
    const list = Array.isArray(stored)
      ? tags(stored)
      : [...defaults.filter((tag) => !hidden.includes(tag.id)), ...tags(legacy)];
    return [...new Map(list.map((tag) => [tag.id, tag])).values()].slice(0, defaults.length + 30);
  };
  return {
    cycleLength: clampInt(src.cycleLength, 15, 60, 28),
    periodDuration: clampInt(src.periodDuration, 1, 15, 5),
    trackPill: Boolean(src.trackPill),
    packLength,
    inactiveDays,
    packStart: isDateStr(src.packStart) ? src.packStart : null,
    pillTrackingSince: isDateStr(src.pillTrackingSince) ? src.pillTrackingSince : null,
    showNutrition: Boolean(src.showNutrition),
    showPhaseBandsInStats: Boolean(src.showPhaseBandsInStats),
    moodTags: catalogue('mood'),
    symptomTags: catalogue('symptom'),
  };
}

const LEGACY_MOODS = ['happy', 'calm', 'tired', 'irritable', 'anxious'];
const LEGACY_SYMS = ['cramps', 'bloating', 'headache', 'fatigue', 'cravings'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePeriodLogs(raw: any): PeriodData['logs'] {
  if (!raw || typeof raw !== 'object') return {};
  const out: PeriodData['logs'] = {};
  for (const d of Object.keys(raw)) {
    if (!isDateStr(d)) continue;
    const l = raw[d] || {};
    const tagIds = (arr: unknown, legacy: string[], prefix: string) => Array.isArray(arr)
      ? arr.filter((id): id is string => typeof id === 'string').map((id) => legacy.includes(id) ? `${prefix}.${id}` : id)
      : [];
    const moods = tagIds(l.moods, LEGACY_MOODS, 'mood');
    const symptoms = tagIds(l.symptoms, LEGACY_SYMS, 'sym');
    const flow = ['none', 'light', 'medium', 'heavy'].includes(l.flow) ? l.flow : 'none';
    out[d] = {
      isPeriod: Boolean(l.isPeriod) || flow !== 'none',
      flow,
      moods,
      symptoms,
      pillTaken: l.pillTaken === undefined ? undefined : Boolean(l.pillTaken),
      intercourse: l.intercourse === true ? true : undefined,
      notes: typeof l.notes === 'string' ? l.notes : undefined,
      updatedAt: typeof l.updatedAt === 'string' ? l.updatedAt : new Date().toISOString(),
    };
  }
  return out;
}

export function normalizePeriodData(p: unknown): PeriodData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const src = (p || {}) as any;
  return { settings: normalizePeriodSettings(src.settings), logs: normalizePeriodLogs(src.logs) };
}

export const DEFAULT_QUICK_FOODS = ['gen-53', 'gen-30', 'gen-16']; // salt, bread, olive oil

// Demo favourites so the starred-first search is visible on a fresh install (see DEMO_MODE).
export const DEMO_FAVORITE_FOODS = ['lidl-01', 'gen-21', 'gen-03', ...DEFAULT_QUICK_FOODS];

export const DEFAULT_PROFILE: UserProfile = {
  weightKg: 73,
  heightCm: 178,
  age: 29,
  sex: 'male',
  targetIntakeKcal: 2200,
};
