import React, { useState, useMemo, useEffect } from 'react';
import { useApp, useSettings } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { calculateMifflinBMR } from '../../utils/calculations';
import { formatKcal } from '../../utils/formatters';
import { Check, Flame, Minus, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { BodyMeasuresProfile } from './BodyMeasuresProfile';

const CUSTOM_BMR_MIN = 500;
const CUSTOM_BMR_MAX = 10000;
const CUSTOM_BMR_STEP = 50;

const clampCustomBmr = (val: number) =>
  Math.min(CUSTOM_BMR_MAX, Math.max(CUSTOM_BMR_MIN, Math.round(val)));

export const UserProfileModal: React.FC = () => {
  const {
    isProfileOpen,
    setIsProfileOpen,
    userProfile,
    updateUserProfile,

    t,
  } = useApp();
  const { settings } = useSettings();
  const ultraMinimal = settings.ultraMinimal;

  const [weightKg, setWeightKg] = useState<number>(userProfile.weightKg);
  const [heightCm, setHeightCm] = useState<number>(userProfile.heightCm);
  const [age, setAge] = useState<number>(userProfile.age);
  const [sex, setSex] = useState<'male' | 'female'>(userProfile.sex);
  const [useCustomBmr, setUseCustomBmr] = useState<boolean>(Boolean(userProfile.useCustomBmr));
  const [customBmrKcal, setCustomBmrKcal] = useState<number>(
    userProfile.customBmrKcal && userProfile.customBmrKcal > 0
      ? userProfile.customBmrKcal
      : calculateMifflinBMR(userProfile)
  );
  const [customInputFocused, setCustomInputFocused] = useState(false);
  const [customInputText, setCustomInputText] = useState('');

  useEffect(() => {
    if (isProfileOpen) {
      const initialCustom =
        userProfile.customBmrKcal && userProfile.customBmrKcal > 0
          ? userProfile.customBmrKcal
          : calculateMifflinBMR(userProfile);
      setWeightKg(userProfile.weightKg);
      setHeightCm(userProfile.heightCm);
      setAge(userProfile.age);
      setSex(userProfile.sex);
      setUseCustomBmr(Boolean(userProfile.useCustomBmr));
      setCustomBmrKcal(initialCustom);
      setCustomInputText(String(initialCustom));
      setCustomInputFocused(false);
    }
  }, [isProfileOpen, userProfile]);

  useEffect(() => {
    if (!customInputFocused) {
      setCustomInputText(String(customBmrKcal));
    }
  }, [customBmrKcal, customInputFocused]);

  const safeProfile = useMemo(
    () => ({
      weightKg: weightKg > 0 ? weightKg : 70,
      heightCm: heightCm > 0 ? heightCm : 175,
      age: age > 0 ? age : 28,
      sex,
    }),
    [weightKg, heightCm, age, sex]
  );

  const previewBmr = useMemo(() => calculateMifflinBMR(safeProfile), [safeProfile]);

  const presets = useMemo(
    () => [
      { key: 'bmr', label: t.profile.presetBmr, value: previewBmr },
      { key: 'sedentary', label: t.profile.presetSedentary, value: Math.round(previewBmr * 1.2) },
      { key: 'light', label: t.profile.presetLight, value: Math.round(previewBmr * 1.375) },
      { key: 'moderate', label: t.profile.presetModerate, value: Math.round(previewBmr * 1.55) },
      { key: 'active', label: t.profile.presetActive, value: Math.round(previewBmr * 1.725) },
    ],
    [previewBmr, t.profile]
  );

  const deltaFromBmr = customBmrKcal - previewBmr;

  const handleSelectMode = (custom: boolean) => {
    setUseCustomBmr(custom);
    if (custom && (!customBmrKcal || customBmrKcal <= 0)) {
      setCustomBmrKcal(previewBmr);
    }
  };

  const handleStepCustom = (delta: number) => {
    setCustomBmrKcal((prev) => clampCustomBmr((prev || previewBmr) + delta));
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCustomInputText(raw);
    const parsed = parseInt(raw.replace(/[^\d]/g, ''), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setCustomBmrKcal(Math.min(CUSTOM_BMR_MAX, parsed));
    }
  };

  const handleCustomInputBlur = () => {
    setCustomInputFocused(false);
    const parsed = parseInt(customInputText.replace(/[^\d]/g, ''), 10);
    const next = Number.isNaN(parsed) || parsed <= 0 ? previewBmr : clampCustomBmr(parsed);
    setCustomBmrKcal(next);
    setCustomInputText(String(next));
  };

  const handleSave = () => {
    const resolvedCustom = customBmrKcal > 0 ? clampCustomBmr(customBmrKcal) : previewBmr;
    updateUserProfile({
      ...userProfile,
      ...safeProfile,
      useCustomBmr,
      customBmrKcal: useCustomBmr ? resolvedCustom : userProfile.customBmrKcal,
    });
    setIsProfileOpen(false);
  };

  return (
    <Modal
      isOpen={isProfileOpen}
      onClose={() => setIsProfileOpen(false)}
      title={t.profile.title}
      maxWidth="max-w-md"
      footer={
        <button
          type="button"
          onClick={handleSave}
          className="kc-primary-btn pressable w-full py-3 bg-intake hover:bg-intake-hover text-intake-ink font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>{t.profile.saveBtn}</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Sex Selection */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-profile-choice
            aria-pressed={sex === 'male'}
            onClick={() => setSex('male')}
            className={`pressable py-2.5 px-3 rounded-2xl border text-xs font-extrabold text-center ${
              sex === 'male'
                ? 'kc-chip-active bg-[#CFE7FE] text-[#183B5E] border-[#9EC8F5]'
                : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
            }`}
          >
            {t.profile.male}
          </button>
          <button
            type="button"
            data-profile-choice
            aria-pressed={sex === 'female'}
            onClick={() => setSex('female')}
            className={`pressable py-2.5 px-3 rounded-2xl border text-xs font-extrabold text-center ${
              sex === 'female'
                ? 'kc-chip-active bg-[#F6D0D0] text-[#7A2727] border-[#E8AEAE]'
                : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
            }`}
          >
            {t.profile.female}
          </button>
        </div>

        {/* Weight, Height, Age */}
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1 truncate">
              {t.profile.weight}
            </label>
            <NumericInput
              value={weightKg}
              onChange={setWeightKg}
              unit="kg"
              min={20}
              max={300}
              placeholder="70"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1 truncate">
              {t.profile.height}
            </label>
            <NumericInput
              value={heightCm}
              onChange={setHeightCm}
              unit="cm"
              min={100}
              max={250}
              placeholder="175"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1 truncate">
              {t.profile.age}
            </label>
            <NumericInput
              value={age}
              onChange={setAge}
              unit="y"
              min={10}
              max={120}
              placeholder="28"
            />
          </div>
        </div>

        <div
          data-kc-tone="photo"
          className={`kc-themed-card bg-activity rounded-3xl ${ultraMinimal ? 'p-3 space-y-2.5' : 'p-3.5 sm:p-4 space-y-3'}`}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                data-kc-tone-ink
                className="size-7 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 text-activity-ink"
                aria-hidden="true"
              >
                <Flame size={15} strokeWidth={2.2} />
              </span>
              <span
                data-kc-tone-ink
                className="text-xs sm:text-sm font-extrabold text-activity-ink truncate"
              >
                {t.profile.dailyBurnTitle}
              </span>
            </div>
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[11px] font-bold tabular-nums text-[var(--text)]">
              {t.energy.bmrShort} {formatKcal(previewBmr)} kcal
            </span>
          </div>

          {/* Mode Switcher */}
          <div
            data-range-switch
            className="bg-[var(--inset)] border border-[var(--border)] p-1 rounded-full grid grid-cols-2 gap-1"
            role="tablist"
            aria-label={t.profile.dailyBurnTitle}
          >
            <button
              type="button"
              role="tab"
              data-range-btn
              data-active={!useCustomBmr ? 'true' : undefined}
              aria-selected={!useCustomBmr}
              onClick={() => handleSelectMode(false)}
              className={`pressable py-1.5 px-2.5 rounded-full text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 ${
                !useCustomBmr
                  ? 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)] border border-transparent'
              }`}
            >
              <span className="truncate">{t.profile.bmrModeCalculated}</span>
            </button>
            <button
              type="button"
              role="tab"
              data-range-btn
              data-active={useCustomBmr ? 'true' : undefined}
              aria-selected={useCustomBmr}
              onClick={() => handleSelectMode(true)}
              className={`pressable py-1.5 px-2.5 rounded-full text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 ${
                useCustomBmr
                  ? 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)] border border-transparent'
              }`}
            >
              <SlidersHorizontal size={13} strokeWidth={2.2} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{t.profile.bmrModeCustom}</span>
            </button>
          </div>

          {/* Inner Body */}
          {!useCustomBmr ? (
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-4 py-3.5 text-center space-y-1.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                {t.profile.restingMetabolicRate}
              </div>
              <div className="flex items-baseline justify-center gap-1.5">
                <span
                  data-kc-tone-ink
                  className="text-3xl font-extrabold tabular-nums text-activity-ink tracking-tight"
                >
                  {formatKcal(previewBmr)}
                </span>
                <span className="text-sm font-bold text-[var(--muted)]">kcal</span>
              </div>
              {!ultraMinimal && (
                <p className="text-[10px] font-medium text-[var(--muted)] leading-snug pt-0.5">
                  {t.profile.bmrFormulaNote}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepCustom(-CUSTOM_BMR_STEP)}
                    disabled={customBmrKcal <= CUSTOM_BMR_MIN}
                    aria-label={t.profile.decreaseCalories}
                    className="pressable size-9 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] disabled:opacity-40 shrink-0"
                  >
                    <Minus size={16} strokeWidth={2.5} />
                  </button>

                  <div className="flex items-baseline justify-center gap-1 min-w-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      data-kc-tone-ink
                      aria-label={t.profile.customBurnLabel}
                      value={customInputFocused ? customInputText : String(customBmrKcal)}
                      onFocus={() => {
                        setCustomInputFocused(true);
                        setCustomInputText(String(customBmrKcal));
                      }}
                      onChange={handleCustomInputChange}
                      onBlur={handleCustomInputBlur}
                      className="w-24 text-center text-3xl font-extrabold tabular-nums text-activity-ink bg-transparent focus:outline-none tracking-tight"
                    />
                    <span className="text-sm font-bold text-[var(--muted)] select-none">kcal</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStepCustom(CUSTOM_BMR_STEP)}
                    disabled={customBmrKcal >= CUSTOM_BMR_MAX}
                    aria-label={t.profile.increaseCalories}
                    className="pressable size-9 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] disabled:opacity-40 shrink-0"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="border-t border-[var(--border)] pt-2.5 flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-[var(--muted)] tabular-nums truncate">
                    {deltaFromBmr === 0
                      ? t.profile.sameAsCalculatedBmr
                      : `${deltaFromBmr > 0 ? '+' : ''}${formatKcal(deltaFromBmr)} kcal ${t.profile.vsCalculatedBmr}`}
                  </span>
                  <button
                    type="button"
                    data-kc-tone-ink
                    onClick={() => setCustomBmrKcal(previewBmr)}
                    className="pressable shrink-0 inline-flex items-center gap-1 font-bold underline underline-offset-2 text-activity-ink hover:opacity-80"
                  >
                    <RotateCcw size={11} strokeWidth={2.3} aria-hidden="true" />
                    <span>{t.profile.resetToBmr}</span>
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                    {t.profile.quickPresets}
                  </span>
                  {!ultraMinimal && (
                    <span className="text-[10px] font-semibold text-[var(--muted)]">
                      {t.profile.tapToFill}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => {
                    const active = customBmrKcal === preset.value;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        data-profile-choice
                        onClick={() => setCustomBmrKcal(preset.value)}
                        className={`pressable px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums border transition-colors ${
                          active
                            ? 'kc-chip-active bg-[var(--text)] text-[var(--on-text)] border-transparent'
                            : 'bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--text)] border-[var(--border)]'
                        }`}
                      >
                        {preset.label} · {preset.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Advanced > Body measurements: choose what to track (renders nothing when the option is off) */}
        <BodyMeasuresProfile />
      </div>
    </Modal>
  );
};
