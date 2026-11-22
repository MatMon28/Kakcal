import React, { useEffect, useState } from 'react';
import { Candy, Check, Droplets, Flame, LayoutDashboard, RotateCcw, Ruler, Target, User, Wheat } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAdvancedText } from '../../i18n/advanced';
import { useLayoutText } from '../../i18n/layout';
import { resetLayout, setLayoutEnabled, useLayout } from '../../utils/layoutStore';
import {
  GOAL_KEYS,
  GOAL_MAX,
  GOAL_MODE_CHOICES,
  GOAL_UNITS,
  setBodyEnabled,
  setGoalsEnabled,
  updateGoal,
  useAdvanced,
} from '../../utils/advancedStore';
import type { GoalKey } from '../../types/advanced';
import { Collapsible } from '../common/Collapsible';
import { CollapseArrow, CollapseBody } from '../common/InlineCollapse';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { NumericInput } from '../common/NumericInput';
import { SaltCrystalIcon } from '../common/SaltCrystalIcon';

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

const chip = (letter: string, tone: string) => (
  <span className={`size-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-extrabold ${tone}`}>{letter}</span>
);

const GOAL_ICON: Record<GoalKey, React.ReactNode> = {
  calories: <span className="size-7 rounded-full bg-intake text-intake-ink flex items-center justify-center shrink-0"><Flame size={14} /></span>,
  burned: <span className="size-7 rounded-full bg-activity text-activity-ink flex items-center justify-center shrink-0"><Flame size={14} /></span>,
  fiber: <span className="size-7 rounded-full bg-nutrient text-nutrient-ink flex items-center justify-center shrink-0"><Wheat size={14} /></span>,
  carbs: chip('C', 'bg-[#CFE7FE] text-[#1A4670]'),
  protein: chip('P', 'bg-[#FAE0B4] text-[#7D4E14]'),
  fat: chip('F', 'bg-[#E2D6FF] text-[#4D3582]'),
  salt: <span className="size-7 rounded-full bg-nutrient text-nutrient-ink flex items-center justify-center shrink-0"><SaltCrystalIcon size={14} /></span>,
  sugar: <span className="size-7 rounded-full bg-nutrient text-nutrient-ink flex items-center justify-center shrink-0"><Candy size={14} /></span>,
  water: <span className="size-7 rounded-full bg-[#CFE7FE] text-[#183F66] flex items-center justify-center shrink-0"><Droplets size={14} /></span>,
};

/**
 * Settings > Advanced. Every advanced option is switched on here: goals / limits (each item on its own)
 * and body measurements (which adds the Body page and the Profile section).
 */
export const AdvancedSettings: React.FC = () => {
  const { t, settings, setIsSettingsOpen, setIsProfileOpen } = useApp();
  const text = useAdvancedText();
  const advanced = useAdvanced();
  const layoutText = useLayoutText().settings;
  const layout = useLayout();
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restored, setRestored] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(true);
  useEffect(() => {
    if (!restored) return undefined;
    const timer = window.setTimeout(() => setRestored(false), 2500);
    return () => window.clearTimeout(timer);
  }, [restored]);

  const seg = (active: boolean) =>
    `pressable flex-1 py-2 rounded-xl text-[11px] font-extrabold text-center border ${
      active
        ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
        : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
    }`;

  const nameOf = (key: GoalKey) =>
    key === 'calories' ? text.settings.calories : key === 'burned' ? text.settings.burned : key === 'water' ? text.settings.water : t.macros[key];

  return (
    <Collapsible title={text.settings.title}>
      {/* ---------- Goals & limits ---------- */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl transition-colors">
          <button
            type="button"
            aria-pressed={advanced.goalsEnabled}
            onClick={() => setGoalsEnabled(!advanced.goalsEnabled)}
            className="flex-1 min-w-0 flex items-center justify-between gap-3 pl-3 pr-1 py-3 text-left"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="size-8 rounded-full bg-[#C9EFD3] text-[#174A2B] flex items-center justify-center shrink-0">
                <Target size={15} />
              </span>
              <span className="block text-xs font-extrabold text-[var(--text)]">{text.settings.goalsTitle}</span>
            </span>
            <Switch on={advanced.goalsEnabled} />
          </button>
          {/* Collapse arrow: hides the list of goals and limits (only while the group is on). */}
          {advanced.goalsEnabled ? (
            <button
              type="button"
              aria-expanded={goalsOpen}
              aria-label={text.settings.goalsTitle}
              onClick={() => setGoalsOpen((value) => !value)}
              className="pressable size-10 mr-1 rounded-full flex items-center justify-center shrink-0 hover:bg-[var(--inset)]"
            >
              <CollapseArrow open={goalsOpen} />
            </button>
          ) : (
            <span className="w-3 shrink-0" aria-hidden="true" />
          )}
        </div>

        {advanced.goalsEnabled && (
          <CollapseBody open={goalsOpen}>
          {/* Sub-sections of "Goals & limits": indented under a guide line so they clearly belong to the group above. */}
          <div data-goals-subsections className="space-y-2 ml-5 pl-3 border-l-2 border-[var(--border)] rounded-bl-xl">
            {GOAL_KEYS.map((key) => {
              const goal = advanced.goals[key];
              const choices = GOAL_MODE_CHOICES[key];
              const unit = GOAL_UNITS[key];
              return (
                <div key={key} className="bg-[var(--inset)] rounded-2xl px-3 py-2.5 space-y-2.5">
                  <button
                    type="button"
                    aria-pressed={goal.enabled}
                    onClick={() => updateGoal(key, { enabled: !goal.enabled })}
                    className="w-full flex items-center justify-between gap-3 text-left"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {GOAL_ICON[key]}
                      <span className="min-w-0">
                        <span className="block text-xs font-extrabold text-[var(--text)] truncate">{nameOf(key)}</span>
                        {key === 'sugar' && !settings.trackSugar && (
                          <span className="block text-[10px] font-medium text-[var(--muted)]">{text.settings.sugarNote}</span>
                        )}
                      </span>
                    </span>
                    <span className="scale-[0.85] origin-right shrink-0"><Switch on={goal.enabled} /></span>
                  </button>

                  {goal.enabled && (
                    <div className="flex items-center gap-2">
                      {choices.length > 1 ? (
                        <div role="group" aria-label={nameOf(key)} className="flex gap-1.5 flex-1 min-w-0">
                          {choices.map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              aria-pressed={goal.mode === mode}
                              onClick={() => updateGoal(key, { mode })}
                              className={seg(goal.mode === mode)}
                            >
                              {mode === 'objective' ? text.settings.objective : text.settings.limit}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="flex-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                          {text.settings.limit}
                        </span>
                      )}
                      <div className="w-32 shrink-0">
                        <NumericInput
                          ariaLabel={`${nameOf(key)} ${goal.mode === 'objective' ? text.settings.objective : text.settings.limit}`}
                          value={goal.value}
                          onChange={(value) => updateGoal(key, { value })}
                          unit={unit}
                          min={0}
                          max={GOAL_MAX[key]}
                          className="!py-2 !text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </CollapseBody>
        )}
      </div>

      {/* ---------- Body measurements ---------- */}
      <div className="space-y-2.5">
        <button
          type="button"
          aria-pressed={advanced.body.enabled}
          onClick={() => setBodyEnabled(!advanced.body.enabled)}
          className="w-full flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-3 transition-colors text-left"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="size-8 rounded-full bg-weight text-weight-ink flex items-center justify-center shrink-0">
              <Ruler size={15} />
            </span>
            <span className="block text-xs font-extrabold text-[var(--text)]">{text.settings.bodyTitle}</span>
          </span>
          <Switch on={advanced.body.enabled} />
        </button>

        {advanced.body.enabled && (
          <button
            type="button"
            onClick={() => { setIsSettingsOpen(false); setIsProfileOpen(true); }}
            className="pressable w-full py-2.5 px-4 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-dashed border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] text-center"
          >
            {/* Icon and text flow together and are centred together, so a wrapped label no longer leaves the icon at the left edge. */}
            <User size={14} className="inline-block align-[-2px] mr-1.5" aria-hidden="true" />
            <span>{text.settings.bodyProfileHint}</span>
          </button>
        )}
      </div>
      {/* ---------- Advanced layout ---------- */}
      <div className="space-y-2.5">
        <button
          type="button"
          aria-pressed={layout.enabled}
          onClick={() => setLayoutEnabled(!layout.enabled)}
          className="w-full flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-3 transition-colors text-left"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="size-8 rounded-full bg-[#E2D6FF] text-[#49346F] flex items-center justify-center shrink-0">
              <LayoutDashboard size={15} />
            </span>
            <span className="block text-xs font-extrabold text-[var(--text)]">{layoutText.title}</span>
          </span>
          <Switch on={layout.enabled} />
        </button>

        <button
          type="button"
          onClick={() => setConfirmRestore(true)}
          data-restore-layout
          className="pressable w-full py-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-dashed border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center gap-1.5"
        >
          {restored ? <Check size={14} /> : <RotateCcw size={14} />}
          <span>{restored ? layoutText.restored : layoutText.restore}</span>
        </button>
        <ConfirmDialog
          open={confirmRestore}
          title={layoutText.restoreTitle}
          message={layoutText.restoreText}
          confirmLabel={layoutText.restoreConfirm}
          onCancel={() => setConfirmRestore(false)}
          onConfirm={() => { resetLayout(); setConfirmRestore(false); setRestored(true); }}
        />
      </div>
    </Collapsible>
  );
};
