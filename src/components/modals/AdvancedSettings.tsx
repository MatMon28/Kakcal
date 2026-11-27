import React, { useEffect, useState } from 'react';
import { Candy, Check, Droplets, Flame, LayoutDashboard, RotateCcw, Scale, SlidersHorizontal, Target, Wheat } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAdvancedText } from '../../i18n/advanced';
import { useJournalText } from '../../i18n/journal';
import { useLayoutText } from '../../i18n/layout';
import { resetLayout, setLayoutEnabled, useLayout } from '../../utils/layoutStore';
import {
  GOAL_KEYS,
  GOAL_MAX,
  GOAL_MODE_CHOICES,
  GOAL_UNITS,
  BALANCE_MAX,
  DEFAULT_PROTEIN_PER_KG,
  PROTEIN_PER_KG_MAX,
  goalValue,
  setGoalsEnabled,
  updateBalance,
  updateGoal,
  useAdvanced,
} from '../../utils/advancedStore';
import type { GoalKey } from '../../types/advanced';
import { Collapsible } from '../common/Collapsible';
import { CollapseArrow, CollapseBody } from '../common/InlineCollapse';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { NumericInput } from '../common/NumericInput';
import { SaltCrystalIcon } from '../common/SaltCrystalIcon';
import { SwitchVisual } from '../common/Switch';
import { TONE } from './settings/SettingsParts';

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
  const { t, settings, userProfile } = useApp();
  const text = useAdvancedText();
  const j = useJournalText();
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
    <Collapsible title={text.settings.title} icon={<SlidersHorizontal size={15} />} tone={TONE.sand}>
      {/* ---------- Goals & limits ---------- */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl transition-colors">
          <button
            type="button"
            role="switch"
            aria-checked={advanced.goalsEnabled}
            onClick={() => setGoalsEnabled(!advanced.goalsEnabled)}
            className="pressable flex-1 min-w-0 flex items-center justify-between gap-3 pl-3 pr-1 py-3 text-left"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span data-settings-badge className="size-8 rounded-full bg-intake text-intake-ink flex items-center justify-center shrink-0">
                <Target size={15} />
              </span>
              <span className="block text-xs font-extrabold text-[var(--text)]">{text.settings.goalsTitle}</span>
            </span>
            <SwitchVisual on={advanced.goalsEnabled} />
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
                    role="switch"
                    aria-checked={goal.enabled}
                    onClick={() => updateGoal(key, { enabled: !goal.enabled })}
                    className="pressable w-full flex items-center justify-between gap-3 text-left"
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
                    <SwitchVisual on={goal.enabled} compact />
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
                          unit={key === 'protein' && goal.perKg ? 'g/kg' : unit}
                          min={0}
                          max={key === 'protein' && goal.perKg ? PROTEIN_PER_KG_MAX : GOAL_MAX[key]}
                          className="!py-2 !text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Protein: an absolute number of grams, or grams per kg of body weight. */}
                  {key === 'protein' && goal.enabled && (
                    <div className="space-y-1.5">
                      <div role="group" aria-label={j('Protein target basis', 'Base dell\'obiettivo proteine')} className="flex gap-1.5">
                        <button type="button" aria-pressed={!goal.perKg} onClick={() => goal.perKg && updateGoal('protein', { perKg: false, value: goalValue(goal, userProfile.weightKg) || 120 })} className={seg(!goal.perKg)}>
                          {j('Grams per day', 'Grammi al giorno')}
                        </button>
                        <button type="button" aria-pressed={Boolean(goal.perKg)} onClick={() => !goal.perKg && updateGoal('protein', { perKg: true, value: DEFAULT_PROTEIN_PER_KG })} className={seg(Boolean(goal.perKg))}>
                          {j('Per kg of body weight', 'Per kg di peso corporeo')}
                        </button>
                      </div>
                      {goal.perKg && (
                        <p className="text-[10px] font-medium text-[var(--muted)] px-0.5">
                          {j(
                            `${goal.value} g/kg x ${userProfile.weightKg} kg (your profile weight) = ${goalValue(goal, userProfile.weightKg)} g per day.`,
                            `${goal.value} g/kg x ${userProfile.weightKg} kg (peso del profilo) = ${goalValue(goal, userProfile.weightKg)} g al giorno.`,
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Energy balance target: the wanted difference between intake and burned, as a deficit or a surplus. */}
            <div className="bg-[var(--inset)] rounded-2xl px-3 py-2.5 space-y-2.5" data-balance-target>
              <button
                type="button"
                role="switch"
                aria-checked={advanced.balance.enabled}
                onClick={() => updateBalance({ enabled: !advanced.balance.enabled })}
                className="pressable w-full flex items-center justify-between gap-3 text-left"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="size-7 rounded-full bg-intake text-intake-ink flex items-center justify-center shrink-0"><Scale size={14} /></span>
                  <span className="min-w-0">
                    <span className="block text-xs font-extrabold text-[var(--text)] truncate">{j('Intake / burned difference', 'Differenza introdotte / bruciate')}</span>
                    <span className="block text-[10px] font-medium text-[var(--muted)]">{j('Aim for a deficit or a surplus every day.', 'Punta a un deficit o a un surplus ogni giorno.')}</span>
                  </span>
                </span>
                <SwitchVisual on={advanced.balance.enabled} compact />
              </button>
              {advanced.balance.enabled && (
                <div className="flex items-center gap-2">
                  <div role="group" aria-label={j('Deficit or surplus', 'Deficit o surplus')} className="flex gap-1.5 flex-1 min-w-0">
                    <button type="button" aria-pressed={advanced.balance.kind === 'deficit'} onClick={() => updateBalance({ kind: 'deficit' })} className={seg(advanced.balance.kind === 'deficit')}>
                      {j('Deficit', 'Deficit')}
                    </button>
                    <button type="button" aria-pressed={advanced.balance.kind === 'surplus'} onClick={() => updateBalance({ kind: 'surplus' })} className={seg(advanced.balance.kind === 'surplus')}>
                      {j('Surplus', 'Surplus')}
                    </button>
                  </div>
                  <div className="w-32 shrink-0">
                    <NumericInput
                      ariaLabel={j('Wanted difference in kcal', 'Differenza desiderata in kcal')}
                      value={advanced.balance.kcal}
                      onChange={(value) => updateBalance({ kcal: value })}
                      unit="kcal"
                      min={0}
                      max={BALANCE_MAX}
                      className="!py-2 !text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          </CollapseBody>
        )}
      </div>

      {/* Body measurements moved to Settings > Pages (the switch and the body profile shortcut). */}
      {/* ---------- Advanced layout ---------- */}
      <div className="space-y-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={layout.enabled}
          onClick={() => setLayoutEnabled(!layout.enabled)}
          className="pressable w-full flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-3 transition-colors text-left"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span data-settings-badge className="size-8 rounded-full bg-weight text-weight-ink flex items-center justify-center shrink-0">
              <LayoutDashboard size={15} />
            </span>
            <span className="block text-xs font-extrabold text-[var(--text)]">{layoutText.title}</span>
          </span>
          <SwitchVisual on={layout.enabled} />
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
