import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, ClipboardCheck, Droplets, Scale, Sparkles, UtensilsCrossed } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Collapsible } from '../common/Collapsible';
import { isAndroidApp } from '../../utils/android';
import {
  consumeOpenNotificationRequest,
  getNotificationPermission,
  hasAnyReminderEnabled,
  MEAL_REMINDER_SLOTS,
  OPEN_NOTIFICATION_SETTINGS_EVENT,
  requestNotificationPermission,
  sendTestNotification,
  WATER_INTERVALS,
  waterReminderMinutes,
  type NotificationPermission,
} from '../../utils/notifications';
import type { DailyReminderSetting, NotificationSettings as NotificationSettingsData } from '../../types';

const Switch: React.FC<{ on: boolean }> = ({ on }) => (
  <span
    aria-hidden="true"
    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-150 shrink-0 inline-flex items-center border ${
      on ? 'bg-[#C9EFD3] border-[#9ADBB0]' : 'bg-[var(--border)] border-[var(--border)]'
    }`}
  >
    <span
      className={`block w-5 h-5 rounded-full transition-transform [transition-duration:420ms] [transition-timing-function:var(--ease-bounce)] shadow-sm ${
        on ? 'translate-x-5 bg-[#1E5E3A]' : 'translate-x-0 bg-[#FBF8F2]'
      }`}
    />
  </span>
);

const TimeField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <label className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
    <span>{label}</span>
    <input
      type="time"
      value={value}
      onChange={(e) => { if (e.target.value) onChange(e.target.value); }}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-sm font-bold text-[var(--text)] tabular-nums normal-case tracking-normal"
    />
  </label>
);

const formatInterval = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

interface RowProps {
  icon: React.ReactNode;
  tone: string;
  title: string;
  desc?: string;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

/** A switch row; its controls (time, interval…) open below it while it is on. */
const Row: React.FC<RowProps> = ({ icon, tone, title, desc, on, onToggle, disabled, children }) => (
  <div className="bg-[var(--inset)] rounded-2xl">
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onToggle}
      className="w-full min-h-[52px] flex items-center justify-between gap-3 px-3 py-2.5 text-left rounded-2xl hover:bg-[var(--hover)] transition-colors disabled:opacity-50"
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <span className={`size-8 rounded-full flex items-center justify-center shrink-0 ${tone}`}>{icon}</span>
        <span className="min-w-0">
          <span className="block text-xs font-extrabold text-[var(--text)] leading-tight">{title}</span>
          {desc && <span className="block text-[11px] font-medium text-[var(--muted)] leading-tight mt-0.5">{desc}</span>}
        </span>
      </span>
      <Switch on={on} />
    </button>
    {on && children && <div className="px-3 pb-3 pt-1 space-y-2.5">{children}</div>}
  </div>
);

export const NotificationSettings: React.FC = () => {
  const { settings, updateSettings, t } = useApp();
  const n = settings.notifications;
  const copy = t.notifications;
  const [permission, setPermission] = useState<NotificationPermission>('prompt');
  // The guided tour can ask for this group to be open (requestOpenNotificationSettings).
  const [open, setOpen] = useState(consumeOpenNotificationRequest);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reveal = () => {
      if (!consumeOpenNotificationRequest()) return;
      setOpen(true);
      window.setTimeout(() => anchorRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 420);
    };
    window.addEventListener(OPEN_NOTIFICATION_SETTINGS_EVENT, reveal);
    if (open) window.setTimeout(() => anchorRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 420);
    return () => window.removeEventListener(OPEN_NOTIFICATION_SETTINGS_EVENT, reveal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshPermission = useCallback(() => { void getNotificationPermission().then(setPermission); }, []);
  useEffect(() => {
    refreshPermission();
    document.addEventListener('visibilitychange', refreshPermission);
    return () => document.removeEventListener('visibilitychange', refreshPermission);
  }, [refreshPermission]);

  const save = (next: NotificationSettingsData) => updateSettings({ notifications: next });

  /** Turning a reminder on asks for the system permission first (a tap is needed in browsers). */
  const ensurePermission = async () => {
    if (permission !== 'granted') setPermission(await requestNotificationPermission());
  };

  const toggle = (enabled: boolean, apply: (next: boolean) => void) => {
    apply(!enabled);
    if (!enabled) void ensurePermission();
  };

  const customCount = settings.customButtons.length;
  const waterCount = waterReminderMinutes(n.water).length;
  const anyOn = hasAnyReminderEnabled(n);

  const daily = (key: 'customButtons' | 'weight' | 'logData', patch: Partial<DailyReminderSetting>) =>
    save({ ...n, [key]: { ...n[key], ...patch } });
  const meal = (slot: (typeof MEAL_REMINDER_SLOTS)[number], patch: Partial<DailyReminderSetting>) =>
    save({ ...n, meals: { ...n.meals, [slot]: { ...n.meals[slot], ...patch } } });

  return (
    <div ref={anchorRef} id="settings-notifications" className="scroll-mt-2">
    <Collapsible title={copy.title} open={open} onOpenChange={setOpen}>
      <p className="text-[11px] font-medium text-[var(--muted)] px-1">{copy.hint}</p>

      {permission === 'denied' && (
        <p role="alert" className="text-[11px] font-bold rounded-xl px-3 py-2 bg-[#FAE0B4] text-[#7D4E14]">{copy.denied}</p>
      )}
      {permission === 'unsupported' && (
        <p className="text-[11px] font-bold rounded-xl px-3 py-2 bg-[var(--inset)] text-[var(--muted)]">{copy.unsupported}</p>
      )}
      {permission === 'prompt' && anyOn && (
        <button
          type="button"
          onClick={() => void ensurePermission()}
          className="pressable w-full rounded-xl px-3 py-2.5 text-xs font-extrabold bg-[var(--text)] text-[var(--surface)]"
        >
          {copy.allow}
        </button>
      )}

      {/* Water */}
      <Row
        icon={<Droplets size={15} />}
        tone="bg-[#CFE7FE] text-[#183F66]"
        title={copy.waterTitle}
        desc={copy.waterDesc}
        on={n.water.enabled}
        onToggle={() => toggle(n.water.enabled, (enabled) => save({ ...n, water: { ...n.water, enabled } }))}
      >
        <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{copy.every}</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={copy.every}>
          {WATER_INTERVALS.map((minutes) => {
            const active = n.water.intervalMinutes === minutes;
            return (
              <button
                key={minutes}
                type="button"
                aria-pressed={active}
                onClick={() => save({ ...n, water: { ...n.water, intervalMinutes: minutes } })}
                className={`pressable px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border tabular-nums ${
                  active
                    ? 'bg-[var(--text)] text-[var(--surface)] border-[var(--text)]'
                    : 'bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                {formatInterval(minutes)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <TimeField label={copy.from} value={n.water.from} onChange={(from) => save({ ...n, water: { ...n.water, from } })} />
          <TimeField label={copy.until} value={n.water.to} onChange={(to) => save({ ...n, water: { ...n.water, to } })} />
        </div>
        <p className="text-[11px] font-medium text-[var(--muted)]">
          {waterCount === 1 ? copy.oneReminderPerDay : copy.remindersPerDay.replace('{count}', String(waterCount))}
        </p>
      </Row>

      {/* Meals: one switch and one time for every meal */}
      <div className="bg-[var(--inset)] rounded-2xl px-3 py-3 space-y-2">
        <div className="flex items-center gap-2.5">
          <span className="size-8 rounded-full flex items-center justify-center shrink-0 bg-intake text-intake-ink">
            <UtensilsCrossed size={15} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-extrabold text-[var(--text)] leading-tight">{copy.mealsTitle}</span>
            <span className="block text-[11px] font-medium text-[var(--muted)] leading-tight mt-0.5">{copy.mealsDesc}</span>
          </span>
        </div>
        <div className="space-y-1.5">
          {MEAL_REMINDER_SLOTS.map((slot) => {
            const m = n.meals[slot];
            return (
              <div key={slot} className="bg-[var(--surface)] rounded-xl">
                <button
                  type="button"
                  aria-pressed={m.enabled}
                  onClick={() => toggle(m.enabled, (enabled) => meal(slot, { enabled }))}
                  className="w-full min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 text-left rounded-xl hover:bg-[var(--hover)] transition-colors"
                >
                  <span className="text-xs font-bold text-[var(--text)]">{t.mealSlots[slot]}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {m.enabled && <span className="text-[11px] font-extrabold tabular-nums text-[var(--muted)]">{m.time}</span>}
                    <span className="scale-[0.82] origin-right"><Switch on={m.enabled} /></span>
                  </span>
                </button>
                {m.enabled && (
                  <div className="px-3 pb-2.5">
                    <TimeField label={copy.at} value={m.time} onChange={(time) => meal(slot, { time })} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom buttons */}
      <Row
        icon={<Sparkles size={15} />}
        tone="bg-[#E4D9F8] text-[#41296E]"
        title={copy.customButtonsTitle}
        desc={customCount === 0 ? copy.noCustomButtons : copy.customButtonsDesc}
        on={n.customButtons.enabled}
        disabled={customCount === 0 && !n.customButtons.enabled}
        onToggle={() => toggle(n.customButtons.enabled, (enabled) => daily('customButtons', { enabled }))}
      >
        <TimeField label={copy.at} value={n.customButtons.time} onChange={(time) => daily('customButtons', { time })} />
      </Row>

      {/* Weight */}
      <Row
        icon={<Scale size={15} />}
        tone="bg-weight text-weight-ink"
        title={copy.weightTitle}
        desc={copy.weightDesc}
        on={n.weight.enabled}
        onToggle={() => toggle(n.weight.enabled, (enabled) => daily('weight', { enabled }))}
      >
        <TimeField label={copy.at} value={n.weight.time} onChange={(time) => daily('weight', { time })} />
      </Row>

      {/* General log reminder */}
      <Row
        icon={<ClipboardCheck size={15} />}
        tone="bg-activity text-activity-ink"
        title={copy.logTitle}
        desc={copy.logDesc}
        on={n.logData.enabled}
        onToggle={() => toggle(n.logData.enabled, (enabled) => daily('logData', { enabled }))}
      >
        <TimeField label={copy.at} value={n.logData.time} onChange={(time) => daily('logData', { time })} />
      </Row>

      <button
        type="button"
        onClick={() => void sendTestNotification(copy).finally(refreshPermission)}
        className="pressable w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] border border-[var(--border)]"
      >
        <BellRing size={14} />
        {copy.test}
      </button>

      {!isAndroidApp() && <p className="text-[11px] font-medium text-[var(--muted)] px-1">{copy.webNote}</p>}
    </Collapsible>
    </div>
  );
};
