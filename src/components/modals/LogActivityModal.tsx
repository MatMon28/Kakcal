import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { FavoriteButton } from '../common/FavoriteButton';
import { ActivitySearch } from './ActivitySearch';
import { ActivityType, ActivityLogMethod } from '../../types';
import { ActivityInfo, activityName, categoryLabel } from '../../data/activities';
import { calculateActivityCalories, calculateMetCalories, restingKcalPerHour } from '../../utils/calculations';
import { getLastAmount, setLastAmount } from '../../utils/amountMemory';
import { Footprints, Flame, Dumbbell, Search, Check, Minus, Plus, ArrowLeft } from 'lucide-react';

const lastDurationKey = (activityId: string) => `activity:${activityId}`;

export const LogActivityModal: React.FC = () => {
  const {
    isLogActivityOpen,
    setIsLogActivityOpen,
    logActivity,
    customActivities,
    addCustomActivity,
    userProfile,
    language,
    t,
  } = useApp();

  const [activityType, setActivityType] = useState<ActivityType>('walking');
  const [method, setMethod] = useState<ActivityLogMethod>('distance'); // distance selected by default
  const [distanceKm, setDistanceKm] = useState<number>(3.5);
  const [durationMin, setDurationMin] = useState<number>(30);
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'vigorous'>('moderate');
  const [customName, setCustomName] = useState('');
  const [customDur, setCustomDur] = useState<number>(0); // minutes, optional
  const [customKcal, setCustomKcal] = useState<number>(0); // kcal, optional (0 = auto-estimate)

  // "Other": search page first, then the chosen activity's duration step.
  const [pickedActivity, setPickedActivity] = useState<ActivityInfo | null>(null);
  const [otherDuration, setOtherDuration] = useState<number>(30);

  const inputValue = method === 'distance' ? distanceKm : durationMin;
  const setInputValue = (val: number) => {
    if (method === 'distance') setDistanceKm(val);
    else setDurationMin(val);
  };

  // Custom activity estimate: ~5 MET over the duration (30 min default)
  const customEstimate = useMemo(
    () => Math.round(5 * userProfile.weightKg * ((customDur > 0 ? customDur : 30) / 60)),
    [customDur, userProfile.weightKg]
  );

  // Database activities: MET × the user's resting rate (weight, height, age, sex) × time
  const restingRate = useMemo(() => restingKcalPerHour(userProfile), [userProfile]);
  const otherCalories = useMemo(
    () => (pickedActivity ? calculateMetCalories(pickedActivity.met, otherDuration, userProfile) : 0),
    [pickedActivity, otherDuration, userProfile]
  );
  const profileIncomplete = !userProfile.weightKg || !userProfile.heightCm || !userProfile.age;

  const calculatedCalories = useMemo(() => {
    if (activityType === 'other') return otherCalories;
    if (activityType === 'custom') {
      return customKcal > 0 ? customKcal : customEstimate;
    }
    return calculateActivityCalories(activityType, method, inputValue, userProfile.weightKg, intensity);
  }, [activityType, method, inputValue, userProfile.weightKg, intensity, customKcal, customEstimate, otherCalories]);

  const pickActivity = (activity: ActivityInfo) => {
    setPickedActivity(activity);
    setOtherDuration(getLastAmount(lastDurationKey(activity.id), 30));
  };

  const handleSave = () => {
    if (activityType === 'other') {
      if (!pickedActivity || otherDuration <= 0) return;
      setLastAmount(lastDurationKey(pickedActivity.id), otherDuration);
      logActivity({
        type: 'other',
        method: 'duration',
        durationMin: otherDuration,
        caloriesBurned: otherCalories,
        activityId: pickedActivity.id,
        met: pickedActivity.met,
        customName: pickedActivity.name_en,
      });
    } else if (activityType === 'custom') {
      if (!customName.trim()) return;
      // Remember the activity with a MET so it can be picked again under Other:
      // derived from the calories and minutes entered (30 min assumed if only kcal), else 5 MET.
      const minutes = customDur > 0 ? customDur : 30;
      const met = customKcal > 0 ? customKcal / (restingRate * (minutes / 60)) : 5;
      addCustomActivity(customName, met);
      logActivity({
        type: 'custom',
        method: 'duration',
        durationMin: customDur > 0 ? customDur : undefined,
        caloriesBurned: calculatedCalories,
        customName: customName.trim(),
      });
    } else {
      const val = inputValue > 0 ? inputValue : 0;
      if (val <= 0) return;
      logActivity({
        type: activityType,
        method,
        distanceKm: method === 'distance' ? val : undefined,
        durationMin: method === 'duration' ? val : undefined,
        intensity,
        caloriesBurned: calculatedCalories,
      });
    }

    setIsLogActivityOpen(false);
    setCustomName('');
    setCustomDur(0);
    setCustomKcal(0);
    setPickedActivity(null);
  };

  const typeBtn = (type: ActivityType, label: string, Icon: typeof Footprints) => (
    <button
      type="button"
      onClick={() => setActivityType(type)}
      aria-pressed={activityType === type}
      className={`pressable px-1 py-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 font-extrabold text-[11px] sm:text-xs ${
        activityType === type
          ? 'kc-chip-active bg-activity text-activity-ink border-activity-border'
          : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] border-[var(--border)]'
      }`}
    >
      <Icon size={17} />
      <span className="truncate max-w-full">{label}</span>
    </button>
  );

  const stepperBtn =
    'pressable w-11 h-11 shrink-0 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center disabled:opacity-35';

  const showOtherSearch = activityType === 'other' && !pickedActivity;
  const canSave =
    activityType === 'other'
      ? Boolean(pickedActivity) && otherDuration > 0
      : activityType === 'custom'
      ? customName.trim().length > 0
      : inputValue > 0;

  return (
    <Modal
      dockId="activity"
      isOpen={isLogActivityOpen}
      onClose={() => setIsLogActivityOpen(false)}
      title={t.activityModal.title}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Walk / Run / Other / Custom */}
        <div className="grid grid-cols-4 gap-2">
          {typeBtn('walking', t.activities.optWalk, Footprints)}
          {typeBtn('running', t.activities.optRun, Flame)}
          {typeBtn('other', t.activities.other, Search)}
          {typeBtn('custom', t.activities.custom, Dumbbell)}
        </div>

        {activityType === 'other' ? (
          pickedActivity ? (
            /* ---------- OTHER: duration for the chosen activity ---------- */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPickedActivity(null)}
                  className="pressable inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <ArrowLeft size={14} />
                  <span>{t.common.back}</span>
                </button>
                <FavoriteButton foodId={pickedActivity.id} kind="activity" />
              </div>

              <div className="rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-4 py-3 space-y-1">
                <p className="text-sm font-extrabold text-[var(--text)] leading-snug">
                  {activityName(pickedActivity, language)}
                </p>
                <p className="text-[11px] font-semibold text-[var(--muted)] tabular-nums">
                  {categoryLabel(pickedActivity.category, language)} · {pickedActivity.met.toFixed(1)} {t.activities.met}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--muted)] mb-1.5">{t.activities.durationLabel}</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={otherDuration <= 0}
                    onClick={() => setOtherDuration((v) => Math.max(0, Math.round(v - 5)))}
                    className={stepperBtn}
                    aria-label="-5 min"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="flex-1">
                    <NumericInput
                      value={otherDuration}
                      onChange={setOtherDuration}
                      unit="min"
                      min={0}
                      placeholder="30"
                      className="text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtherDuration((v) => Math.round(v + 5))}
                    className={stepperBtn}
                    aria-label="+5 min"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5">
                {[15, 30, 45, 60, 90, 120].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setOtherDuration(quick)}
                    className={`pressable flex-1 py-1.5 text-xs font-bold tabular-nums rounded-xl border ${
                      otherDuration === quick
                        ? 'kc-chip-active bg-activity text-activity-ink border-activity-border'
                        : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                    }`}
                  >
                    {quick}m
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ---------- OTHER: search page (like the food search) ---------- */
            <ActivitySearch
              onPick={pickActivity}
              onUseCustom={(name) => {
                setCustomName(name);
                setActivityType('custom');
              }}
            />
          )
        ) : activityType === 'custom' ? (
          /* ---------- CUSTOM ACTIVITY: name + optional duration + optional calories ---------- */
          <div className="space-y-3">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customName.trim()) handleSave();
              }}
              placeholder={t.activities.customNamePlaceholder}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors"
            />

            {customActivities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)] self-center mr-1">
                  {t.activities.customSuggested}:
                </span>
                {customActivities.slice(0, 12).map(({ name: a }) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setCustomName(a)}
                    className={`pressable px-2.5 py-1 rounded-full text-xs font-bold border ${
                      customName === a
                        ? 'kc-chip-active bg-activity text-activity-ink border-activity-border'
                        : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)] hover:bg-activity hover:text-activity-ink'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                  {t.activities.durationMin}{' '}
                  <span className="font-medium">({t.activities.optional})</span>
                </label>
                <NumericInput value={customDur} onChange={setCustomDur} unit="min" min={0} placeholder="30" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                  {t.activities.calories}{' '}
                  <span className="font-medium">({t.activities.optional})</span>
                </label>
                <NumericInput value={customKcal} onChange={setCustomKcal} unit="kcal" min={0} placeholder={String(customEstimate)} />
              </div>
            </div>

            <p className="text-[11px] font-medium text-[var(--muted)]">
              {t.activities.autoIfEmpty} · {t.activities.customSavedHint}
            </p>
          </div>
        ) : (
          /* ---------- WALKING / RUNNING ---------- */
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('distance')}
                className={`pressable py-2 px-3 rounded-xl text-xs font-extrabold ${
                  method === 'distance'
                    ? 'bg-[var(--text)] text-[var(--on-text)]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)]'
                }`}
              >
                {t.activityModal.distanceLabel}
              </button>
              <button
                type="button"
                onClick={() => setMethod('duration')}
                className={`pressable py-2 px-3 rounded-xl text-xs font-extrabold ${
                  method === 'duration'
                    ? 'bg-[var(--text)] text-[var(--on-text)]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)]'
                }`}
              >
                {t.activityModal.durationLabel}
              </button>
            </div>

            {method === 'distance' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={distanceKm <= 0}
                  onClick={() => setDistanceKm((v) => Math.max(0, Math.round((v - 0.5) * 10) / 10))}
                  className={stepperBtn}
                  aria-label="-0.5 km"
                >
                  <Minus size={18} />
                </button>
                <div className="flex-1">
                  <NumericInput value={distanceKm} onChange={setDistanceKm} unit="km" min={0} placeholder="3.5" className="text-center" />
                </div>
                <button
                  type="button"
                  onClick={() => setDistanceKm((v) => Math.round((v + 0.5) * 10) / 10)}
                  className={stepperBtn}
                  aria-label="+0.5 km"
                >
                  <Plus size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={durationMin <= 0}
                  onClick={() => setDurationMin((v) => Math.max(0, Math.round(v - 5)))}
                  className={stepperBtn}
                  aria-label="-5 min"
                >
                  <Minus size={18} />
                </button>
                <div className="flex-1">
                  <NumericInput value={durationMin} onChange={setDurationMin} unit="min" min={0} placeholder="30" className="text-center" />
                </div>
                <button
                  type="button"
                  onClick={() => setDurationMin((v) => Math.round(v + 5))}
                  className={stepperBtn}
                  aria-label="+5 min"
                >
                  <Plus size={18} />
                </button>
              </div>
            )}

            <div className="flex gap-1.5">
              {(method === 'distance' ? [1, 2, 3.5, 5, 8, 10] : [15, 30, 45, 60, 90]).map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setInputValue(quick)}
                  className={`pressable flex-1 py-1.5 text-xs font-bold tabular-nums rounded-xl border ${
                    inputValue === quick
                      ? 'kc-chip-active bg-activity text-activity-ink border-activity-border'
                      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {quick}
                  {method === 'distance' ? 'km' : 'm'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {(['light', 'moderate', 'vigorous'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setIntensity(lvl)}
                  className={`pressable py-2 px-1 rounded-xl border font-bold text-center ${
                    intensity === lvl
                      ? 'kc-chip-active bg-activity text-activity-ink border-activity-border'
                      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {t.activities[lvl]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Burn preview + save (hidden while browsing the Other search page) */}
        {!showOtherSearch && (
          <>
            <div className="kc-modal-banner bg-activity rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-activity-accent">{t.activityModal.calculatedCalories}</span>
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="text-2xl font-extrabold text-activity-ink">{calculatedCalories}</span>
                  <span className="text-xs font-bold text-activity-accent">kcal</span>
                </div>
              </div>
              {activityType === 'other' && pickedActivity && (
                <div className="text-[11px] font-medium text-activity-accent space-y-0.5 tabular-nums">
                  <p>
                    {t.activities.burnFormula
                      .replace('{met}', pickedActivity.met.toFixed(1))
                      .replace('{rate}', String(Math.round(restingRate * 10) / 10))
                      .replace('{min}', String(otherDuration))}
                  </p>
                  <p>{profileIncomplete ? t.activities.profileHint : t.activities.personalised}</p>
                  {pickedActivity.category !== 'custom' && <p className="opacity-80">{t.activities.sourceNote}</p>}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="kc-primary-btn pressable w-full py-3 bg-activity hover:bg-activity-hover text-activity-ink font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              <Check size={18} strokeWidth={2.5} />
              <span>{t.activityModal.saveBtn}</span>
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};
