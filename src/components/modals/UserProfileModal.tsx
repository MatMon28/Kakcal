import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { calculateMifflinBMR } from '../../utils/calculations';
import { formatKcal } from '../../utils/formatters';
import { Check } from 'lucide-react';
import { BodyMeasuresProfile } from './BodyMeasuresProfile';

export const UserProfileModal: React.FC = () => {
  const {
    isProfileOpen,
    setIsProfileOpen,
    userProfile,
    updateUserProfile,

    t,
  } = useApp();

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

  useEffect(() => {
    if (isProfileOpen) {
      setWeightKg(userProfile.weightKg);
      setHeightCm(userProfile.heightCm);
      setAge(userProfile.age);
      setSex(userProfile.sex);
      setUseCustomBmr(Boolean(userProfile.useCustomBmr));
      setCustomBmrKcal(
        userProfile.customBmrKcal && userProfile.customBmrKcal > 0
          ? userProfile.customBmrKcal
          : calculateMifflinBMR(userProfile)
      );
    }
  }, [isProfileOpen, userProfile]);

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

  const handleSelectMode = (custom: boolean) => {
    setUseCustomBmr(custom);
    if (custom && (!customBmrKcal || customBmrKcal <= 0)) {
      setCustomBmrKcal(previewBmr);
    }
  };

  const handleSave = () => {
    const resolvedCustom = customBmrKcal > 0 ? Math.round(customBmrKcal) : previewBmr;
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
    >
      <div className="space-y-4">
        {/* Sex Selection */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={sex === 'male'}
            onClick={() => setSex('male')}
            className={`pressable py-2.5 px-3 rounded-2xl border text-xs font-extrabold text-center ${
              sex === 'male'
                ? 'bg-[#CFE7FE] text-[#183B5E] border-[#9EC8F5]'
                : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
            }`}
          >
            {t.profile.male}
          </button>
          <button
            type="button"
            aria-pressed={sex === 'female'}
            onClick={() => setSex('female')}
            className={`pressable py-2.5 px-3 rounded-2xl border text-xs font-extrabold text-center ${
              sex === 'female'
                ? 'bg-[#F6D0D0] text-[#7A2727] border-[#E8AEAE]'
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

        <div className="bg-activity rounded-2xl p-3.5 space-y-3">
          <div className="bg-[var(--inset)] p-1 rounded-xl grid grid-cols-2 gap-1" role="tablist" aria-label={t.profile.calculatedBmr}>
            <button
              type="button"
              role="tab"
              aria-selected={!useCustomBmr}
              onClick={() => handleSelectMode(false)}
              className={`pressable py-1.5 px-2.5 rounded-lg text-xs font-extrabold transition-colors ${
                !useCustomBmr
                  ? 'bg-[var(--text)] text-[var(--on-text)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {t.profile.bmrModeCalculated}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={useCustomBmr}
              onClick={() => handleSelectMode(true)}
              className={`pressable py-1.5 px-2.5 rounded-lg text-xs font-extrabold transition-colors ${
                useCustomBmr
                  ? 'bg-[var(--text)] text-[var(--on-text)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {t.profile.bmrModeCustom}
            </button>
          </div>

          {!useCustomBmr ? (
            <div className="flex items-center justify-between gap-2 px-0.5">
              <span className="text-xs font-bold text-activity-accent">{t.profile.calculatedBmr}</span>
              <span className="text-xl font-extrabold tabular-nums text-activity-ink">
                {formatKcal(previewBmr)} kcal
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <label className="text-xs font-bold text-activity-accent">
                  {t.profile.customBurnLabel}
                </label>
                <span className="text-[11px] font-semibold text-activity-accent opacity-80 tabular-nums">
                  {t.energy.bmrShort} {formatKcal(previewBmr)} kcal
                </span>
              </div>
              <NumericInput
                value={customBmrKcal}
                onChange={setCustomBmrKcal}
                ariaLabel={t.profile.customBurnLabel}
                unit="kcal"
                min={500}
                max={10000}
                placeholder={String(previewBmr)}
              />
            </div>
          )}
        </div>

        {/* Advanced > Body measurements: choose what to track (renders nothing when the option is off) */}
        <BodyMeasuresProfile />

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          className="pressable w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>{t.profile.saveBtn}</span>
        </button>
      </div>
    </Modal>
  );
};
