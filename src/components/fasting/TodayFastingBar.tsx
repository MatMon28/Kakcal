import React, { useEffect, useState } from 'react';
import { ArrowRight, Play, Timer } from 'lucide-react';
import { useNavActions, useSettings } from '../../context/AppContext';
import { useFastingText } from '../../i18n/fasting';
import {
  computeEatingWindow,
  computeFastTiming,
  formatDurationCompact,
  getProtocolHours,
  startFast,
  useFasting,
} from '../../utils/fastingStore';

/**
 * Compact fasting / eating-window bar shown on the Today page when Intermittent Fasting is enabled.
 * Uses `data-kc-tone="diary"` (warm yellow/amber) to match the Fasting timer card and all 9 theme styles.
 */
export const TodayFastingBar: React.FC = () => {
  const { settings } = useSettings();
  const { setActiveTab } = useNavActions();
  const ft = useFastingText();
  const fasting = useFasting();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!fasting.config.enabled) return;
    const tick = () => setNowMs(Date.now());
    const id = window.setInterval(tick, 30_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fasting.config.enabled]);

  if (!fasting.config.enabled) return null;

  const ultra = settings.ultraMinimal;
  const active = fasting.activeSession;

  if (active) {
    const timing = computeFastTiming(active, nowMs);
    const pct = Math.round(timing.progress * 100);
    const protocolLabel = ft.protocols[active.protocol];
    return (
      <section
        aria-label={ft.status.fastingActive}
        data-kc-tone="diary"
        className={`rounded-3xl border border-[var(--border)] bg-[#F7E9AA] text-[#5D4911] ${
          ultra ? 'px-3.5 py-2.5' : 'px-4 py-3.5'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Timer size={14} className="shrink-0" data-kc-tone-ink aria-hidden="true" />
            <span data-kc-tone-ink className="text-[11px] font-extrabold uppercase tracking-wider truncate">
              {ultra ? protocolLabel : `${ft.status.fastingActive} · ${protocolLabel}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('fasting')}
            className="kc-fast-pill-cta pressable inline-flex items-center gap-1 rounded-full bg-[#8A6D1B] text-[#FFFDF7] px-3 py-1 text-[11px] font-extrabold shrink-0"
          >
            <span>{ultra ? ft.pageTitle : ft.status.openFasting}</span>
            <ArrowRight size={12} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-1.5 flex items-baseline justify-between gap-2 tabular-nums">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-xl sm:text-2xl font-extrabold leading-none">
              {formatDurationCompact(timing.elapsedMs)}
            </span>
            <span className="text-xs font-bold opacity-75">/ {active.targetFastingHours}h</span>
          </div>
          <span className="text-xs font-extrabold">{pct}%</span>
        </div>

        <div className="kc-fast-track mt-2 h-2 w-full rounded-full bg-[#FFFDF7]/60 overflow-hidden">
          <div
            className="kc-fast-fill h-full rounded-full bg-[#8A6D1B] transition-[width] duration-300"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </section>
    );
  }

  // No active fast: show Eating Window progress bar + quick Start Fast button
  const eating = computeEatingWindow(fasting, nowMs);
  const { eatingHours } = getProtocolHours(fasting.config);
  const protocolLabel = ft.protocols[fasting.config.protocol];
  const pct = eating ? Math.round(eating.progress * 100) : 0;

  return (
    <section
      aria-label={ft.status.eatingWindow}
      data-kc-tone="foods"
      className={`rounded-3xl border border-[var(--border)] bg-[#C9EFD3] text-[#17432A] ${
        ultra ? 'px-3.5 py-2.5' : 'px-4 py-3.5'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Timer size={14} className="shrink-0" data-kc-tone-ink aria-hidden="true" />
          <span data-kc-tone-ink className="text-[11px] font-extrabold uppercase tracking-wider truncate">
            {eating
              ? ultra
                ? protocolLabel
                : `${ft.status.eatingWindow} · ${protocolLabel}`
              : `${ft.status.ready} · ${protocolLabel}`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => startFast()}
          className="kc-fast-pill-cta pressable inline-flex items-center gap-1 rounded-full bg-[#17432A] text-[#FBF8F2] px-3 py-1 text-[11px] font-extrabold shrink-0"
        >
          <Play size={11} fill="currentColor" aria-hidden="true" />
          <span>{ft.status.startFast}</span>
        </button>
      </div>

      {eating && (
        <>
          <div className="mt-1.5 flex items-baseline justify-between gap-2 tabular-nums">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-xl sm:text-2xl font-extrabold leading-none">
                {formatDurationCompact(eating.elapsedMs)}
              </span>
              <span className="text-xs font-bold opacity-75">/ {eatingHours}h</span>
            </div>
            <span className="text-xs font-extrabold">{pct}%</span>
          </div>
          <div className="kc-fast-track mt-2 h-2 w-full rounded-full bg-[#FBF8F2]/65 overflow-hidden">
            <div
              className="kc-fast-fill h-full rounded-full bg-[#286540] transition-[width] duration-300"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </>
      )}
    </section>
  );
};
