import React, { useState, useMemo } from 'react';
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

  const previewBmr = useMemo(() => {
    return calculateBMR({
      weightKg,
      heightCm,
      age,
      sex,
    });
  }, [weightKg, heightCm, age, sex]);

  const handleSave = () => {
    updateUserProfile({
      weightKg: weightKg > 0 ? weightKg : 70,
      heightCm: heightCm > 0 ? heightCm : 175,
      age: age > 0 ? age : 28,
      sex,
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
            onClick={() => setSex('male')}
            className={`py-2.5 px-3 rounded-2xl border text-xs font-extrabold text-center transition-colors ${
              sex === 'male'
                ? 'bg-[#CFE7FE] text-[#183B5E] border-[#9EC8F5]'
                : 'bg-[var(--inset)] text-[#6E665E] border-[var(--border)]'
            }`}
          >
            {t.profile.male}
          </button>
          <button
            type="button"
            onClick={() => setSex('female')}
            className={`py-2.5 px-3 rounded-2xl border text-xs font-extrabold text-center transition-colors ${
              sex === 'female'
                ? 'bg-[#F6D0D0] text-[#7A2727] border-[#E8AEAE]'
                : 'bg-[var(--inset)] text-[#6E665E] border-[var(--border)]'
            }`}
          >
            {t.profile.female}
          </button>
        </div>

        {/* Weight, Height, Age */}
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-[#6E665E] mb-1">
              {t.profile.weight}
            </label>
            <NumericInput
              value={weightKg}
              onChange={setWeightKg}
              unit="kg"
              min={20}
              placeholder="70"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6E665E] mb-1">
              {t.profile.height}
            </label>
            <NumericInput
              value={heightCm}
              onChange={setHeightCm}
              unit="cm"
              min={100}
              placeholder="175"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6E665E] mb-1">
              {t.profile.age}
            </label>
            <NumericInput
              value={age}
              onChange={setAge}
              unit="y"
              min={10}
              placeholder="28"
            />
          </div>
        </div>

        {/* Calculated BMR */}
        <div className="bg-[#C9EFD3] rounded-2xl p-4 flex items-center justify-between">
          <span className="text-xs font-bold text-[#1D5C38]">
            {t.profile.calculatedBmr}
          </span>
          <span className="text-xl font-extrabold text-[#142E1F]">
            {formatKcal(previewBmr)} kcal
          </span>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>{t.profile.saveBtn}</span>
        </button>
      </div>
    </Modal>
  );
};
