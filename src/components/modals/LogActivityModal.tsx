import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { ActivityType, ActivityLogMethod } from '../../types';
import { calculateActivityCalories } from '../../utils/calculations';
import { Footprints, Flame, Dumbbell, Check, Minus, Plus } from 'lucide-react';

export const LogActivityModal: React.FC = () => {
  const {
    isLogActivityOpen,
    setIsLogActivityOpen,
    logActivity,
    customActivities,
    addCustomActivity,
    userProfile,
    t,
  } = useApp();

  const [activityType, setActivityType] = useState<ActivityType>('walking');
  const [method, setMethod] = useState<ActivityLogMethod>('distance'); // distance selected by default
  const [inputValue, setInputValue] = useState<number>(3.5);
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'vigorous'>('moderate');
  const [customName, setCustomName] = useState('');
  const [customDur, setCustomDur] = useState<number>(0); // minutes, optional
  const [customKcal, setCustomKcal] = useState<number>(0); // kcal, optional (0 = auto-estimate)

  // Custom activity estimate: ~5 MET over the duration (30 min default)
  const customEstimate = useMemo(
    () => Math.round(5 * userProfile.weightKg * ((customDur > 0 ? customDur : 30) / 60)),
    [customDur, userProfile.weightKg]
  );

  const calculatedCalories = useMemo(() => {
    if (activityType === 'custom') {
      return customKcal > 0 ? customKcal : customEstimate;
    }
    return calculateActivityCalories(activityType, method, inputValue, userProfile.weightKg, intensity);
  }, [activityType, method, inputValue, userProfile.weightKg, intensity, customKcal, customEstimate]);

  const handleSave = () => {
    if (activityType === 'custom') {
      if (!customName.trim()) return;
      addCustomActivity(customName);
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
  };

  const typeBtn = (type: ActivityType, label: string, Icon: typeof Footprints, activeCls: string) => (
    <button
      type="button"
      onClick={() => setActivityType(type)}
      className={`p-2.5 rounded-2xl border flex items-center justify-center gap-1.5 font-extrabold text-xs sm:text-sm transition-colors ${
        activityType === type ? activeCls : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );

  const canSave =
    activityType === 'custom' ? customName.trim().length > 0 : inputValue > 0;

  return (
    <Modal
      isOpen={isLogActivityOpen}
      onClose={() => setIsLogActivityOpen(false)}
      title={t.activityModal.title}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Walking / Running / Custom */}
        <div className="grid grid-cols-3 gap-2">
          {typeBtn('walking', t.activities.walking, Footprints, 'bg-[#E2D6FF] text-[#4D3582] border-[#C9B8F2]')}
          {typeBtn('running', t.activities.running, Flame, 'bg-[#F6D0D0] text-[#7A2727] border-[#E8AEAE]')}
          {typeBtn('custom', t.activities.custom, Dumbbell, 'bg-[#FAE0B4] text-[#7D4E14] border-[#E8C68E]')}
        </div>

        {activityType === 'custom' ? (
          /* ---------- CUSTOM ACTIVITY: name + optional duration + optional calories ---------- */
          <div className="space-y-3">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t.activities.customNamePlaceholder}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-sm font-bold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none"
            />

            {customActivities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)] self-center mr-1">
                  {t.activities.customSuggested}:
                </span>
                {customActivities.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setCustomName(a)}
                    className="px-2.5 py-1 rounded-full bg-[var(--inset)] text-[var(--muted)] text-xs font-bold hover:bg-[#FAE0B4] hover:text-[#7D4E14] transition-colors"
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

            <p className="text-[11px] font-medium text-[var(--muted)]">{t.activities.autoIfEmpty}</p>
          </div>
        ) : (
          /* ---------- WALKING / RUNNING ---------- */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMethod('distance');
                  if (inputValue === 0) setInputValue(3.5);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-colors ${
                  method === 'distance' ? 'bg-[var(--text)] text-[var(--surface)]' : 'bg-[var(--inset)] text-[var(--muted)]'
                }`}
              >
                {t.activityModal.distanceLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod('duration');
                  if (inputValue === 0) setInputValue(30);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-colors ${
                  method === 'duration' ? 'bg-[var(--text)] text-[var(--surface)]' : 'bg-[var(--inset)] text-[var(--muted)]'
                }`}
              >
                {t.activityModal.durationLabel}
              </button>
            </div>

            {method === 'distance' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInputValue((v) => Math.max(0, Math.round((v - 0.5) * 10) / 10))}
                  className="w-11 h-11 shrink-0 rounded-2xl bg-[var(--inset)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center active:scale-95"
                  aria-label="-0.5 km"
                >
                  <Minus size={18} />
                </button>
                <div className="flex-1">
                  <NumericInput value={inputValue} onChange={setInputValue} unit="km" min={0} placeholder="3.5" className="text-center" />
                </div>
                <button
                  type="button"
                  onClick={() => setInputValue((v) => Math.round((v + 0.5) * 10) / 10)}
                  className="w-11 h-11 shrink-0 rounded-2xl bg-[var(--inset)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center active:scale-95"
                  aria-label="+0.5 km"
                >
                  <Plus size={18} />
                </button>
              </div>
            ) : (
              <NumericInput value={inputValue} onChange={setInputValue} unit="min" min={0} placeholder="30" />
            )}

            <div className="flex gap-1.5">
              {(method === 'distance' ? [1, 2, 3.5, 5, 8, 10] : [15, 30, 45, 60, 90]).map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setInputValue(quick)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl border ${
                    inputValue === quick
                      ? 'bg-[#E2D6FF] text-[#4D3582] border-[#C9B8F2]'
                      : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
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
                  className={`py-2 px-1 rounded-xl border font-bold text-center transition-colors ${
                    intensity === lvl
                      ? 'bg-[#E2D6FF] text-[#4D3582] border-[#C9B8F2]'
                      : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {t.activities[lvl]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Burn preview */}
        <div className="bg-[#C9EFD3] rounded-2xl p-3.5 flex items-center justify-between">
          <span className="text-xs font-bold text-[#1D5C38]">{t.activityModal.calculatedCalories}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-[#142E1F]">-{calculatedCalories}</span>
            <span className="text-xs font-bold text-[#1D5C38]">kcal</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3 bg-[#E2D6FF] hover:bg-[#D4C4FF] text-[#4D3582] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>{t.activityModal.saveBtn}</span>
        </button>
      </div>
    </Modal>
  );
};
