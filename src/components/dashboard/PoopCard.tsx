import React from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PoopIcon } from '../common/PoopIcon';
import { BristolIcon } from '../common/BristolIcon';
import { PoopSize } from '../../types';
import { TrackerCard } from './TrackerCard';

interface Props {
  compact?: boolean;
  open: boolean;
  onToggle: () => void;
}

export const PoopCard: React.FC<Props> = ({ compact = false, open, onToggle }) => {
  const { currentDayLog, settings, setIsPoopOpen, removePoop, t } = useApp();

  if (settings.hidePoop) return null;

  const entries = currentDayLog.poops || [];
  const latest = entries[entries.length - 1];

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

  const headline = (
    <>
      {entries.length}
      {!compact && <span className="text-[11px] font-semibold text-[var(--muted)] ml-1">{t.water.totalToday.toLowerCase()}</span>}
    </>
  );

  const sizeBarCount = (size: PoopSize) => {
    switch (size) {
      case 'very_little': return 1;
      case 'little': return 2;
      case 'normal': return 3;
      case 'a_lot': return 4;
      case 'huge': return 4;
      default: return 3;
    }
  };

  // Collapsed: latest entry as a peach pill, or "none today" (in ultra minimal: signal bars + poop + bristol).
  const summary = settings.ultraMinimal ? (
    latest ? (
      <span className="kc-custom-pill inline-flex items-center gap-1.5 rounded-lg px-2 py-1 bg-[#FDF3E0] text-[#7D4E14] text-[11px] font-extrabold leading-none">
        <span className="inline-flex items-end gap-[1.5px] h-3 mr-0.5" aria-hidden="true">
          <span className={`w-0.5 h-1 rounded-full ${sizeBarCount(latest.size) >= 1 ? 'bg-current' : 'bg-current/25'}`} />
          <span className={`w-0.5 h-1.5 rounded-full ${sizeBarCount(latest.size) >= 2 ? 'bg-current' : 'bg-current/25'}`} />
          <span className={`w-0.5 h-2 rounded-full ${sizeBarCount(latest.size) >= 3 ? 'bg-current' : 'bg-current/25'}`} />
          <span className={`w-0.5 h-2.5 rounded-full ${sizeBarCount(latest.size) >= 4 ? 'bg-current' : 'bg-current/25'}`} />
        </span>
        <PoopIcon size={12} className="text-current shrink-0" />
        {latest.bristol ? <span className="tabular-nums">{latest.bristol}</span> : null}
      </span>
    ) : null
  ) : latest ? (
    <span className="kc-custom-pill inline-flex items-center gap-1 rounded-lg px-2 py-1 bg-[#FDF3E0] text-[#7D4E14] text-[11px] font-extrabold leading-none max-w-full">
      <span className="truncate">{sizeLabel(latest.size)}</span>
      {latest.bristol && <span className="shrink-0">· B{latest.bristol}</span>}
      {entries.length > 1 && <span className="shrink-0">+{entries.length - 1}</span>}
    </span>
  ) : compact ? null : (
    <span className="text-xs font-medium text-[var(--muted)] truncate">{t.poop.noneToday}</span>
  );

  return (
    <TrackerCard
      title={t.quickAdd.poop}
      tone="poop"
      icon={<PoopIcon size={compact ? 15 : 17} />}
      headline={headline}
      summary={summary}
      onAdd={() => setIsPoopOpen(true)}
      addLabel={t.poop.addPoop}
      open={open}
      onToggle={onToggle}
      compact={compact}
    >
      {entries.length === 0 && compact ? (
        <div className="min-h-7" aria-hidden="true" />
      ) : entries.length === 0 ? (
        <button
          type="button"
          onClick={() => setIsPoopOpen(true)}
          className="w-full py-1.5 flex items-center justify-between text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors text-left"
        >
          <span>{t.poop.noneToday}</span>
          <span className="font-bold">{t.poop.addPoop}</span>
        </button>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {entries.map((p) => (
            <div key={p.id} className="py-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs sm:text-sm min-w-0 flex-wrap">
                <PoopIcon size={15} className="text-[var(--muted)] shrink-0" />
                <span className={`font-bold text-[var(--text)] ${settings.ultraMinimal ? 'sr-only' : ''}`}>{sizeLabel(p.size)}</span>
                {p.bristol && (
                  <span className="kc-custom-pill inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FAE0B4] text-[#7D4E14] text-[10px] font-extrabold">
                    <BristolIcon type={p.bristol} size={13} className="text-current" />
                    B{p.bristol}
                  </span>
                )}
                {p.description && !settings.ultraMinimal && <span className="text-[var(--muted)] font-medium truncate max-w-[120px]">{p.description}</span>}
                <span className="text-[var(--muted)] font-medium tabular-nums">
                  {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removePoop(p.id)}
                className="pressable size-8 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center shrink-0"
                title={t.common.delete}
                aria-label={t.common.delete}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </TrackerCard>
  );
};
