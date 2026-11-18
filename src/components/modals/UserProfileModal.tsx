import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { calculateBMR } from '../../utils/calculations';
import { formatKcal } from '../../utils/formatters';
import { Check } from 'lucide-react';

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

  useEffect(() => {
    if (isProfileOpen) {
      setWeightKg(userProfile.weightKg);
      setHeightCm(userProfile.heightCm);
      setAge(userProfile.age);
      setSex(userProfile.sex);
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

  const previewBmr = useMemo(() => calculateBMR(safeProfile), [safeProfile]);

  const handleSave = () => {
    updateUserProfile({ ...userProfile, ...safeProfile });
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

        <div className="bg-activity rounded-2xl px-4 py-3.5 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-activity-accent">{t.profile.calculatedBmr}</span>
          <span className="text-xl font-extrabold tabular-nums text-activity-ink">
            {formatKcal(previewBmr)} kcal
          </span>
        </div>

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
