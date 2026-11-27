import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { PoopIcon } from '../common/PoopIcon';
import { BristolIcon } from '../common/BristolIcon';
import { BristolType, PoopSize } from '../../types';
import { Check } from 'lucide-react';

export const PoopModal: React.FC = () => {
  const { isPoopOpen, setIsPoopOpen, logPoop, currentDayLog, t } = useApp();

  const [size, setSize] = useState<PoopSize>('normal');
  const [bristol, setBristol] = useState<BristolType | null>(null);
  const [description, setDescription] = useState('');

  const options: { size: PoopSize; label: string; iconSize: number }[] = [
    { size: 'very_little', label: t.poop.veryLittle, iconSize: 16 },
    { size: 'little', label: t.poop.little, iconSize: 20 },
    { size: 'normal', label: t.poop.normal, iconSize: 24 },
    { size: 'a_lot', label: t.poop.aLot, iconSize: 28 },
    { size: 'huge', label: t.poop.huge, iconSize: 32 },
  ];

  const bristolLabels: Record<BristolType, string> = {
    1: t.poop.bristol1,
    2: t.poop.bristol2,
    3: t.poop.bristol3,
    4: t.poop.bristol4,
    5: t.poop.bristol5,
    6: t.poop.bristol6,
    7: t.poop.bristol7,
  };

  const todayCount = (currentDayLog.poops || []).length;

  const handleSave = () => {
    logPoop(size, undefined, description, bristol ?? undefined);
    setIsPoopOpen(false);
    setDescription('');
    setBristol(null);
    setSize('normal');
  };

  return (
    <Modal
      dockId="poop"
      isOpen={isPoopOpen}
      onClose={() => setIsPoopOpen(false)}
      title={t.poop.title}
      subtitle={todayCount > 0 ? `${todayCount} · ${t.water.totalToday}` : undefined}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Size */}
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-2">
            {t.settings.size}
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {options.map((o) => (
              <button
                key={o.size}
                type="button"
                aria-pressed={size === o.size}
                onClick={() => setSize(o.size)}
                className={`pressable py-2.5 min-h-[72px] rounded-2xl flex flex-col items-center justify-between gap-1 border ${
                  size === o.size
                    ? 'kc-chip-active bg-[#FAE0B4] text-[#7D4E14] border-[#E8C68E]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                <span className="flex-1 flex items-center justify-center">
                  <PoopIcon size={o.iconSize} />
                </span>
                <span className="text-[9px] font-bold leading-tight text-center px-0.5">
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bristol type (optional) */}
        <div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
              {t.poop.bristolTitle}
            </span>
            <span className="text-[10px] font-bold text-[var(--muted)]">({t.poop.bristolOptional})</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {([1, 2, 3, 4, 5, 6, 7] as BristolType[]).map((bt) => (
              <button
                key={bt}
                type="button"
                aria-pressed={bristol === bt}
                onClick={() => setBristol((prev) => (prev === bt ? null : bt))}
                title={bristolLabels[bt]}
                className={`pressable py-2 rounded-xl flex flex-col items-center gap-0.5 border ${
                  bristol === bt
                    ? 'kc-chip-active bg-[#FAE0B4] text-[#7D4E14] border-[#E8C68E]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                <BristolIcon type={bt} size={22} />
                <span className="text-[9px] font-extrabold">{bt}</span>
              </button>
            ))}
          </div>
          {bristol && (
            <p className="kc-modal-banner text-xs font-bold text-[#7D4E14] bg-[#FAE0B4] rounded-xl px-3 py-1.5 mt-2">
              {bristolLabels[bristol]}
            </p>
          )}
        </div>

        {/* Description (optional) */}
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
            {t.poop.descriptionLabel}{' '}
            <span className="font-bold normal-case">({t.poop.bristolOptional})</span>
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t.poop.descriptionPlaceholder}
            className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors resize-none"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="kc-primary-btn pressable w-full py-3 bg-[#FAE0B4] hover:bg-[#F7D69E] text-[#7D4E14] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>{t.poop.save}</span>
        </button>
      </div>
    </Modal>
  );
};
