import React, { memo } from 'react';
import { Candy, Droplets, Flame, Scale, Target, Wheat } from 'lucide-react';
import { useSettings } from '../../../context/AppContext';
import { useAdvancedText } from '../../../i18n/advanced';
import { useJournalText } from '../../../i18n/journal';
import {
  BALANCE_MAX,
  DEFAULT_PROTEIN_PER_KG,
  GOAL_KEYS,
  GOAL_MAX,
  GOAL_MODE_CHOICES,
  GOAL_UNITS,
  PROTEIN_PER_KG_MAX,
  goalValue,
  setGoalsEnabled,
  updateBalance,
  updateGoal,
  useAdvanced,
} from '../../../utils/advancedStore';
import type { GoalKey } from '../../../types/advanced';
import { Collapsible } from '../../common/Collapsible';
import { NumericInput } from '../../common/NumericInput';
import { SaltCrystalIcon } from '../../common/SaltCrystalIcon';
import { SwitchVisual } from '../../common/Switch';
import { TONE } from './SettingsParts';

const chip = (letter: string, tone: string) => (
  <span className={`size-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-extrabold ${tone}`}>{letter}</span>
);

const GOAL_ICON: Record<GoalKey, React.ReactNode> = {
  calories: <span className="size-7 rounded-full bg-intake text-intake-ink flex items-center justify-center shrink-0"><Flame size={14} /></span>,
  burned: <span className="size-7 rounded-full bg-activity text-activity-ink flex items-center justify-center shrink-0"><Flame size={14} /></span>,
  fiber: <span className="size-7 rounded-full bg-nutrient text-nutrient-ink flex items-center justify-center shrink-0"><Wheat size={14} /></span>,
  carbs: chip('C', 'bg-carbs text-carbs-ink'),
  protein: chip('P', 'bg-protein text-protein-ink'),
  fat: chip('F', 'bg-fat text-fat-ink'),
  salt: <span className="size-7 rounded-full bg-nutrient text-nutrient-ink flex items-center justify-center shrink-0"><SaltCrystalIcon size={14} /></span>,
  sugar: <span className="size-7 rounded-full bg-nutrient text-nutrient-ink flex items-center justify-center shrink-0"><Candy size={14} /></span>,
  water: <span className="size-7 rounded-full bg-carbs text-carbs-ink flex items-center justify-center shrink-0"><Droplets size={14} /></span>,
};

/**
 * Settings > Goals & limits: master switch for daily goals/limits and per-nutrient / energy-balance targets.
 */
const GoalsSettingsBody: React.FC = memo(() => {
  const { t, settings, userProfile } = useSettings();
  const text = useAdvancedText();
  const j = useJournalText();
  const advanced = useAdvanced();

  const seg = (active: boolean) =>
    `pressable flex-1 py-2 rounded-xl text-[11px] font-extrabold text-center border ${
      active
        ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
        : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
    }`;

  const nameOf = (key: GoalKey) =>
    key === 'calories' ? text.settings.calories : key === 'burned' ? text.settings.burned : key === 'water' ? text.settings.water : t.macros[key];

  return (
    <div className="space-y-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={advanced.goalsEnabled}
          onClick={() => setGoalsEnabled(!advanced.goalsEnabled)}
          className="pressable w-full flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-3 transition-colors text-left"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span data-settings-badge className="size-8 rounded-full bg-intake text-intake-ink flex items-center justify-center shrink-0">
              <Target size={15} />
            </span>
            <span className="block text-xs font-extrabold text-[var(--text)]">{text.settings.goalsTitle}</span>
          </span>
          <SwitchVisual on={advanced.goalsEnabled} />
        </button>

        {advanced.goalsEnabled && (
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
        )}
      </div>
  );
});

/**
 * Settings > Goals & limits: master switch for daily goals/limits and per-nutrient / energy-balance targets.
 */
export const GoalsSettings: React.FC = () => {
  const text = useAdvancedText();
  return (
    <Collapsible title={text.settings.goalsTitle} icon={<Target size={15} />} tone={TONE.mint}>
      <GoalsSettingsBody />
    </Collapsible>
  );
};
