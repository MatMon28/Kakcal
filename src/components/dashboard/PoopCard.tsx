import React from 'react';
import { useApp } from '../../context/AppContext';
import { PoopIcon } from '../common/PoopIcon';
import { Plus, Trash2 } from 'lucide-react';
import { PoopSize } from '../../types';
import { BristolIcon } from '../common/BristolIcon';

interface Props {
  compact?: boolean;
}

export const PoopCard: React.FC<Props> = ({ compact = false }) => {
  const { currentDayLog, settings, setIsPoopOpen, removePoop, t } = useApp();

  if (settings.hidePoop) return null;

  const entries = currentDayLog.poops || [];

  const sizeLabel = (size: PoopSize) => {
    switch (size) {
      case 'very_little':
        return t.poop.veryLittle;
      case 'little':
        return t.poop.little;
      case 'normal':
        return t.poop.normal;
      case 'a_lot':
        return t.poop.aLot;
      case 'huge':
        return t.poop.huge;
    }
  };

  const addBtn = (
    <button
      type="button"
      onClick={() => setIsPoopOpen(true)}
      className="pressable size-7 shrink-0 rounded-full bg-[#FBF8F2] hover:bg-white text-[#7D4E14] flex items-center justify-center"
      title={t.poop.addPoop}
      aria-label={t.poop.addPoop}
    >
      <Plus size={14} strokeWidth={2.5} />
    </button>
  );

  if (compact) {
    return (
      <div className="bg-[#FAE0B4] rounded-2xl p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 min-w-0 text-[13px] font-extrabold text-[#7D4E14]">
            <PoopIcon size={14} className="shrink-0" />
            <span className="truncate">{t.quickAdd.poop}</span>
          </span>
          {addBtn}
        </div>
        <p className="text-lg sm:text-xl font-extrabold leading-none tabular-nums text-[#7D4E14]">
          {entries.length}
          <span className="text-[11px] font-bold ml-1.5">
            {entries.length === 0 ? t.poop.noneToday : t.water.totalToday}
          </span>
        </p>
        {entries.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-[#FDF3E0] px-2 py-1.5">
            <PoopIcon size={13} className="text-[#8A5A2B] shrink-0" />
            <span className="min-w-0 flex-1 text-[11px] font-bold text-[#7D4E14] truncate">
              {sizeLabel(entries[0].size)}
              {entries.length > 1 && ` +${entries.length - 1}`}
            </span>
            <button
              type="button"
              onClick={() => removePoop(entries[0].id)}
              className="pressable size-6 shrink-0 rounded-full text-[#9B6E32] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
              title={t.common.delete}
              aria-label={t.common.delete}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#FAE0B4] rounded-3xl p-4 sm:p-5 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-full bg-[#FDF3E0] text-[#8A5A2B] flex items-center justify-center">
            <PoopIcon size={19} />
          </div>
          <div>
            <span className="text-sm sm:text-base font-extrabold text-[#7D4E14] block">
              {t.quickAdd.poop}
            </span>
            <span className="text-xs font-medium tabular-nums text-[#9B6E32]">
              {entries.length > 0
                ? `${entries.length} · ${t.water.totalToday}`
                : t.poop.noneToday}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPoopOpen(true)}
          className="pressable w-9 h-9 shrink-0 rounded-full bg-[#FBF8F2] hover:bg-white text-[#7D4E14] flex items-center justify-center"
          title={t.poop.addPoop}
          aria-label={t.poop.addPoop}
        >
          <Plus size={17} strokeWidth={2.5} />
        </button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map((p) => (
            <div
              key={p.id}
              className="px-3.5 py-2 rounded-2xl bg-[#FDF3E0] flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm">
                <PoopIcon size={15} className="text-[#8A5A2B]" />
                <span className="font-bold text-[#7D4E14]">{sizeLabel(p.size)}</span>
                {p.bristol && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FAE0B4] text-[#7D4E14] text-[10px] font-extrabold">
                    <BristolIcon type={p.bristol} size={13} className="text-[#7D4E14]" />
                    B{p.bristol}
                  </span>
                )}
                {p.description && (
                  <span className="text-[#9B6E32] font-medium truncate max-w-[90px]">{p.description}</span>
                )}
                <span className="text-[#9B6E32] font-medium">
                  {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removePoop(p.id)}
                className="pressable w-8 h-8 rounded-full text-[#9B6E32] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
                title={t.common.delete}
                aria-label={t.common.delete}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
