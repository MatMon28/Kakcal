import { getActivityById } from '../data/activities';
import { ActivityLog, DayLog, UserProfile } from '../types';
import { addDaysToDateString, getTodayDateString } from './formatters';
import { calculateActivityCalories, calculateMetCalories } from './calculations';
import type {
  HealthConnectDailyMovement,
  HealthConnectReadResult,
  HealthConnectWorkout,
} from './android';

export const HEALTH_CONNECT_WINDOW_DAYS = 7;
export const HEALTH_CONNECT_DISMISSED_LIMIT = 200;

/**
 * Maps Android Health Connect `ExerciseSessionRecord.EXERCISE_TYPE_*` integer constants
 * to Kakcal's activity types or `src/data/activities.ts` IDs.
 */
const EXERCISE_TYPE_MAP: Record<number, { type: 'walking' | 'running' | 'other'; activityId?: string }> = {
  79: { type: 'walking' }, // WALKING
  37: { type: 'other', activityId: 'hike' }, // HIKING
  56: { type: 'running' }, // RUNNING
  57: { type: 'running' }, // RUNNING_TREADMILL
  8: { type: 'other', activityId: 'bike-general' }, // BIKING
  9: { type: 'other', activityId: 'stationary-bike' }, // BIKING_STATIONARY
  83: { type: 'other', activityId: 'yoga-hatha' }, // YOGA
  48: { type: 'other', activityId: 'pilates' }, // PILATES
  71: { type: 'other', activityId: 'stretching' }, // STRETCHING
  70: { type: 'other', activityId: 'weights' }, // STRENGTH_TRAINING
  81: { type: 'other', activityId: 'weights-hard' }, // WEIGHTLIFTING
  13: { type: 'other', activityId: 'calisthenics' }, // CALISTHENICS
  36: { type: 'other', activityId: 'hiit' }, // HIGH_INTENSITY_INTERVAL_TRAINING
  10: { type: 'other', activityId: 'circuit' }, // BOOT_CAMP
  25: { type: 'other', activityId: 'elliptical' }, // ELLIPTICAL
  26: { type: 'other', activityId: 'aerobics' }, // EXERCISE_CLASS
  68: { type: 'other', activityId: 'stairs' }, // STAIR_CLIMBING
  69: { type: 'other', activityId: 'stair-machine' }, // STAIR_CLIMBING_MACHINE
  54: { type: 'other', activityId: 'rowing-machine' }, // ROWING_MACHINE
  53: { type: 'other', activityId: 'canoe' }, // ROWING
  46: { type: 'other', activityId: 'kayak' }, // PADDLING
  74: { type: 'other', activityId: 'swim-leisure' }, // SWIMMING_POOL
  73: { type: 'other', activityId: 'swim-open-water' }, // SWIMMING_OPEN_WATER
  80: { type: 'other', activityId: 'water-polo' }, // WATER_POLO
  72: { type: 'other', activityId: 'surf' }, // SURFING
  58: { type: 'other', activityId: 'sailing' }, // SAILING
  59: { type: 'other', activityId: 'scuba' }, // SCUBA_DIVING
  64: { type: 'other', activityId: 'soccer' }, // SOCCER
  5: { type: 'other', activityId: 'basketball' }, // BASKETBALL
  28: { type: 'other', activityId: 'american-football' }, // FOOTBALL_AMERICAN
  55: { type: 'other', activityId: 'rugby' }, // RUGBY
  78: { type: 'other', activityId: 'volleyball' }, // VOLLEYBALL
  35: { type: 'other', activityId: 'handball' }, // HANDBALL
  38: { type: 'other', activityId: 'ice-hockey' }, // ICE_HOCKEY
  4: { type: 'other', activityId: 'baseball' }, // BASEBALL
  65: { type: 'other', activityId: 'baseball' }, // SOFTBALL
  14: { type: 'other', activityId: 'cricket' }, // CRICKET
  31: { type: 'other', activityId: 'frisbee' }, // FRISBEE_DISC
  32: { type: 'other', activityId: 'golf-walking' }, // GOLF
  34: { type: 'other', activityId: 'gymnastics' }, // GYMNASTICS
  76: { type: 'other', activityId: 'tennis' }, // TENNIS
  2: { type: 'other', activityId: 'badminton' }, // BADMINTON
  75: { type: 'other', activityId: 'table-tennis' }, // TABLE_TENNIS
  66: { type: 'other', activityId: 'squash' }, // SQUASH
  50: { type: 'other', activityId: 'racquetball' }, // RACQUETBALL
  11: { type: 'other', activityId: 'boxing-bag' }, // BOXING
  44: { type: 'other', activityId: 'martial-arts' }, // MARTIAL_ARTS
  27: { type: 'other', activityId: 'fencing' }, // FENCING
  16: { type: 'other', activityId: 'dance-club' }, // DANCING
  51: { type: 'other', activityId: 'climbing' }, // ROCK_CLIMBING
  39: { type: 'other', activityId: 'ice-skating' }, // ICE_SKATING
  60: { type: 'other', activityId: 'roller-skating' }, // SKATING
  61: { type: 'other', activityId: 'skiing' }, // SKIING
  62: { type: 'other', activityId: 'snowboard' }, // SNOWBOARDING
};

/** Returns the rolling 7-day local date keys `[today - 6 days .. today]`. */
export function getHealthConnectWindowDates(today: Date = new Date()): string[] {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = today ? `${year}-${month}-${day}` : getTodayDateString();
  const dates: string[] = [];
  for (let offset = -(HEALTH_CONNECT_WINDOW_DAYS - 1); offset <= 0; offset++) {
    dates.push(addDaysToDateString(todayStr, offset));
  }
  return dates;
}

export function createEmptyDayLog(date: string): DayLog {
  return {
    date,
    meals: {
      breakfast: [],
      mid_morning: [],
      lunch: [],
      midday_snack: [],
      dinner: [],
      extra: [],
    },
    activities: [],
  };
}

/** Canonical per-day group key so activities of the same type merge into one updatable line per day. */
function activityGroupKey(act: Pick<ActivityLog, 'type' | 'activityId' | 'customName'>): string {
  if (act.type === 'walking') return 'walking';
  if (act.type === 'running') return 'running';
  if (act.activityId) return `other:${act.activityId}`;
  const slug = (act.customName || 'workout').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workout';
  return `other:${slug}`;
}

function groupExternalId(date: string, groupKey: string): string {
  return `hc-type:${date}:${groupKey}`;
}

export function mapHealthConnectWorkout(
  workout: HealthConnectWorkout,
  userProfile: UserProfile,
): ActivityLog {
  const mapped = EXERCISE_TYPE_MAP[workout.exerciseType];
  const durationMin = Math.max(1, Math.round(workout.durationMin || 0));
  const distanceKm = workout.distanceKm && workout.distanceKm > 0
    ? Math.round(workout.distanceKm * 100) / 100
    : undefined;

  let type: ActivityLog['type'] = mapped?.type ?? 'other';
  const activityInfo = mapped?.activityId ? getActivityById(mapped.activityId) : undefined;
  if (mapped?.activityId && !activityInfo) {
    type = 'other';
  }

  const method: ActivityLog['method'] =
    (type === 'walking' || type === 'running') && distanceKm && distanceKm > 0
      ? 'distance'
      : 'duration';

  let caloriesBurned = Math.max(0, Math.round(workout.caloriesBurned || 0));
  if (caloriesBurned === 0) {
    if (type === 'walking' || type === 'running') {
      const value = method === 'distance' ? (distanceKm ?? 0) : durationMin;
      caloriesBurned = calculateActivityCalories(type, method, value, userProfile.weightKg, 'moderate');
    } else if (activityInfo) {
      caloriesBurned = calculateMetCalories(activityInfo.met, durationMin, userProfile);
    } else if (durationMin > 0) {
      caloriesBurned = calculateMetCalories(5.0, durationMin, userProfile);
    }
  }

  const base: ActivityLog = {
    id: `hc-${workout.externalId}`,
    type,
    method,
    ...(distanceKm ? { distanceKm } : {}),
    durationMin,
    caloriesBurned,
    timestamp: workout.timestamp || `${workout.date}T12:00:00.000Z`,
    ...(activityInfo
      ? { activityId: activityInfo.id, met: activityInfo.met, customName: activityInfo.name_en }
      : type === 'other'
        ? { customName: workout.title?.trim() || 'Workout' }
        : {}),
    source: 'health_connect',
    externalId: workout.externalId,
  };
  const gKey = activityGroupKey(base);
  const gExtId = groupExternalId(workout.date, gKey);
  return { ...base, id: gExtId, externalId: gExtId };
}

export function mapHealthConnectDaily(
  daily: HealthConnectDailyMovement,
  userProfile: UserProfile,
): ActivityLog {
  const distanceKm = daily.distanceKm && daily.distanceKm > 0
    ? Math.round(daily.distanceKm * 100) / 100
    : undefined;
  const durationMin = daily.durationMin && daily.durationMin > 0
    ? Math.round(daily.durationMin)
    : undefined;
  const method: ActivityLog['method'] = distanceKm && distanceKm > 0 ? 'distance' : 'duration';

  let caloriesBurned = Math.max(0, Math.round(daily.caloriesBurned || 0));
  if (caloriesBurned === 0) {
    if (distanceKm && distanceKm > 0) {
      caloriesBurned = calculateActivityCalories('walking', 'distance', distanceKm, userProfile.weightKg, 'light');
    } else if (durationMin && durationMin > 0) {
      caloriesBurned = calculateActivityCalories('walking', 'duration', durationMin, userProfile.weightKg, 'light');
    }
  }

  const gExtId = groupExternalId(daily.date, 'walking');
  return {
    id: gExtId,
    type: 'walking',
    method,
    ...(distanceKm ? { distanceKm } : {}),
    ...(durationMin ? { durationMin } : {}),
    caloriesBurned,
    timestamp: `${daily.date}T23:59:00.000Z`,
    steps: Math.max(0, Math.round(daily.steps || 0)),
    source: 'health_connect',
    externalId: gExtId,
  };
}

/** Combines two incoming Health Connect activities of the same (date, type) into one aggregated line. */
function combineSameType(a: ActivityLog, b: ActivityLog): ActivityLog {
  const totalDistance = (a.distanceKm ?? 0) + (b.distanceKm ?? 0);
  const totalDuration = (a.durationMin ?? 0) + (b.durationMin ?? 0);
  const totalSteps = (a.steps ?? 0) + (b.steps ?? 0);
  const distanceKm = totalDistance > 0 ? Math.round(totalDistance * 100) / 100 : undefined;
  const durationMin = totalDuration > 0 ? Math.round(totalDuration) : undefined;
  const method: ActivityLog['method'] =
    (a.type === 'walking' || a.type === 'running') && distanceKm && distanceKm > 0
      ? 'distance'
      : 'duration';

  return {
    ...a,
    method,
    ...(distanceKm !== undefined ? { distanceKm } : {}),
    ...(durationMin !== undefined ? { durationMin } : {}),
    ...(totalSteps > 0 ? { steps: totalSteps } : {}),
    caloriesBurned: a.caloriesBurned + b.caloriesBurned,
    timestamp: a.timestamp < b.timestamp ? a.timestamp : b.timestamp,
  };
}

export interface MergeHealthConnectInput {
  dayLogs: Record<string, DayLog>;
  data: HealthConnectReadResult;
  userProfile: UserProfile;
  dismissedIds?: string[];
  windowDates: string[];
}

export interface MergeHealthConnectResult {
  updatedDays: Record<string, DayLog>;
  changedDates: string[];
  addedCount: number;
  updatedCount: number;
}

function hasActivityChanged(existing: ActivityLog, incoming: ActivityLog): boolean {
  return (
    existing.caloriesBurned !== incoming.caloriesBurned
    || (existing.distanceKm ?? undefined) !== (incoming.distanceKm ?? undefined)
    || (existing.durationMin ?? undefined) !== (incoming.durationMin ?? undefined)
    || (existing.steps ?? undefined) !== (incoming.steps ?? undefined)
    || existing.method !== incoming.method
    || existing.type !== incoming.type
    || (existing.customName ?? undefined) !== (incoming.customName ?? undefined)
  );
}

/**
 * Pure 7-day idempotent merge of Health Connect workouts and daily walking movement.
 * - Aggregates all activities of the same type on a day into a single line (`hc-type:<date>:<group>`).
 * - Updates that single line in-place as values change during the day (never creates duplicate lines).
 * - Automatically prunes stale unedited `source: 'health_connect'` entries from earlier syncs.
 * - Preserves any existing entry with `editedLocally: true` and skips entries in `dismissedIds`.
 */
export function mergeHealthConnectData({
  dayLogs,
  data,
  userProfile,
  dismissedIds = [],
  windowDates,
}: MergeHealthConnectInput): MergeHealthConnectResult {
  const windowSet = new Set(windowDates);
  const dismissedSet = new Set(dismissedIds);

  // Aggregate incoming workouts + daily walking by (date, canonical externalId)
  const groupedByDate = new Map<string, Map<string, ActivityLog>>();

  const addIncoming = (date: string, rawExternalId: string, mapped: ActivityLog) => {
    const extId = mapped.externalId!;
    if (dismissedSet.has(rawExternalId) || dismissedSet.has(extId)) return;
    let byKey = groupedByDate.get(date);
    if (!byKey) {
      byKey = new Map<string, ActivityLog>();
      groupedByDate.set(date, byKey);
    }
    const existing = byKey.get(extId);
    byKey.set(extId, existing ? combineSameType(existing, mapped) : mapped);
  };

  for (const w of data.workouts) {
    if (!w.externalId || !windowSet.has(w.date)) continue;
    addIncoming(w.date, w.externalId, mapHealthConnectWorkout(w, userProfile));
  }
  for (const d of data.daily) {
    if (!d.externalId || !windowSet.has(d.date)) continue;
    if ((d.steps ?? 0) <= 0 && (d.caloriesBurned ?? 0) <= 0 && (d.distanceKm ?? 0) <= 0 && (d.durationMin ?? 0) <= 0) {
      continue;
    }
    addIncoming(d.date, d.externalId, mapHealthConnectDaily(d, userProfile));
  }

  const updatedDays: Record<string, DayLog> = {};
  const changedDates: string[] = [];
  let addedCount = 0;
  let updatedCount = 0;

  for (const date of windowDates) {
    const incomingMap = groupedByDate.get(date);
    const existingDay = dayLogs[date];
    const hasExistingHc = Boolean(existingDay?.activities.some((a) => a.source === 'health_connect' && !a.editedLocally));
    if (!incomingMap?.size && !hasExistingHc) continue;

    const baseDay = existingDay ?? createEmptyDayLog(date);
    const matchedIncoming = new Set<string>();
    const nextActivities: ActivityLog[] = [];
    let dayChanged = false;

    for (const act of baseDay.activities) {
      if (act.source !== 'health_connect') {
        nextActivities.push(act);
        continue;
      }

      // Preserve any locally edited Health Connect entry untouched
      if (act.editedLocally) {
        if (act.externalId) matchedIncoming.add(act.externalId);
        // Also prevent re-inserting the grouped equivalent if user edited a legacy hc-* entry of the same type
        const legacyGroupExtId = groupExternalId(date, activityGroupKey(act));
        matchedIncoming.add(legacyGroupExtId);
        nextActivities.push(act);
        continue;
      }

      const incoming = act.externalId ? incomingMap?.get(act.externalId) : undefined;
      if (incoming && !matchedIncoming.has(incoming.externalId!)) {
        matchedIncoming.add(incoming.externalId!);
        if (hasActivityChanged(act, incoming)) {
          nextActivities.push({
            ...act,
            type: incoming.type,
            method: incoming.method,
            distanceKm: incoming.distanceKm,
            durationMin: incoming.durationMin,
            caloriesBurned: incoming.caloriesBurned,
            steps: incoming.steps,
            customName: incoming.customName,
            activityId: incoming.activityId,
            met: incoming.met,
          });
          updatedCount++;
          dayChanged = true;
        } else {
          nextActivities.push(act);
        }
      } else {
        // Stale unedited Health Connect entry (e.g. old per-session entry before grouping): prune it
        dayChanged = true;
      }
    }

    if (incomingMap) {
      for (const [extId, incoming] of incomingMap.entries()) {
        if (matchedIncoming.has(extId)) continue;
        nextActivities.push(incoming);
        addedCount++;
        dayChanged = true;
      }
    }

    if (dayChanged) {
      updatedDays[date] = { ...baseDay, activities: nextActivities };
      changedDates.push(date);
    }
  }

  return { updatedDays, changedDates, addedCount, updatedCount };
}
