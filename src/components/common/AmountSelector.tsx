import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useSettings } from '../../context/AppContext';
import { usePortionsText } from '../../i18n/portions';
import { addCustomPortion, removeCustomPortion, useCustomPortions } from '../../utils/customPortions';
import {
  amountToPortions,
  formatPortionCount,
  formatWeightAmount,
  getFoodPortions,
  getPortionLabel,
  parseDecimalInput,
  portionsToAmount,
  portionStepDown,
  portionStepUp,
  type PortionFoodRef,
} from '../../utils/foodPortions';
import { AmountStepper } from './AmountStepper';

interface Props {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  compact?: boolean;
  /** When provided, enables Portions / Weight switching and custom portion saving. */
  food?: PortionFoodRef;
}

const QUICK = [10, 50, 100, 150, 200, 250];
const QUICK_PORTIONS = [
  { val: 0.25, label: '¼' },
  { val: 0.5, label: '½' },
  { val: 1, label: '1' },
  { val: 1.5, label: '1½' },
  { val: 2, label: '2' },
  { val: 3, label: '3' },
];

export const AmountSelector: React.FC<Props> = ({ value, onChange, unit, compact, food }) => {
  const { language } = useSettings();
  const txt = usePortionsText();
  const customPortions = useCustomPortions(food?.id ?? '');
  const portions = food ? getFoodPortions(food, customPortions) : [];

  const [mode, setMode] = useState<'portions' | 'weight'>(() => (portions.length > 0 ? 'portions' : 'weight'));
  const [selectedPortionId, setSelectedPortionId] = useState<string | null>(() => {
    if (!portions.length) return null;
    const matched = portions.find((p) => Math.abs(p.grams - value) <= 0.05);
    return (matched ?? portions[0]).id;
  });
  const [portionFocused, setPortionFocused] = useState(false);
  const [portionText, setPortionText] = useState(() => {
    if (!portions.length) return '1';
    const matched = portions.find((p) => Math.abs(p.grams - value) <= 0.05) ?? portions[0];
    return formatPortionCount(amountToPortions(value, matched.grams), language);
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPrompt, setDrawerPrompt] = useState('');
  const [drawerGrams, setDrawerGrams] = useState('120');
  const [drawerLabel, setDrawerLabel] = useState('');
  const [drawerError, setDrawerError] = useState('');

  const prevFoodIdRef = useRef<string | undefined>(food?.id);
  useEffect(() => {
    if (prevFoodIdRef.current === food?.id) return;
    prevFoodIdRef.current = food?.id;
    const nextPortions = food ? getFoodPortions(food, customPortions) : [];
    setDrawerOpen(false);
    setDrawerPrompt('');
    setDrawerError('');
    setPortionFocused(false);
    if (nextPortions.length > 0) {
      const matched = nextPortions.find((p) => Math.abs(p.grams - value) <= 0.05) ?? nextPortions[0];
      setMode('portions');
      setSelectedPortionId(matched.id);
      setPortionText(formatPortionCount(amountToPortions(value, matched.grams), language));
    } else {
      setMode('weight');
      setSelectedPortionId(null);
      setPortionText('1');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [food?.id]);

  const activePortion = portions.find((p) => p.id === selectedPortionId) ?? portions[0] ?? null;

  useEffect(() => {
    if (!activePortion) {
      if (selectedPortionId !== null) setSelectedPortionId(null);
      return;
    }
    if (selectedPortionId !== activePortion.id) {
      setSelectedPortionId(activePortion.id);
    }
  }, [activePortion, selectedPortionId]);

  useEffect(() => {
    if (portionFocused || mode !== 'portions' || !activePortion) return;
    const currentParsed = parseDecimalInput(portionText);
    const derived = amountToPortions(value, activePortion.grams);
    if (currentParsed === null || Math.abs(currentParsed - derived) > 0.009) {
      setPortionText(formatPortionCount(derived, language));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode, activePortion?.id, activePortion?.grams, portionFocused, language]);

  // Plain fallback when no `food` prop is passed
  if (!food) {
    return (
      <div className="space-y-2">
        <AmountStepper value={value} onChange={onChange} unit={unit} compact={compact} foodSteps />
        <div className="flex gap-1.5 flex-wrap">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onChange(q)}
              className={`pressable flex-1 min-w-[46px] rounded-xl tabular-nums ${
                compact ? 'py-1.5 text-[11px]' : 'py-1.5 text-xs'
              } font-bold border ${
                value === q
                  ? 'kc-chip-active bg-[#C9EFD3] text-[#1A5632] border-[#9ADBB0]'
                  : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] border-[var(--border)]'
              }`}
            >
              {q}{unit}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const parsedCount = parseDecimalInput(portionText);
  const currentPortionCount = parsedCount ?? (activePortion ? amountToPortions(value, activePortion.grams) : 1);
  const portionWord = Math.abs(currentPortionCount - 1) < 0.001 ? txt.portionSingular : txt.portionPlural;
  const weightLabel = unit === 'ml' ? txt.volume : txt.weight;

  const switchToPortions = () => {
    if (!portions.length) {
      const prefill = value > 0 && Math.abs(value - 100) > 0.05 ? formatWeightAmount(value) : '120';
      setDrawerPrompt(txt.emptyHint);
      setDrawerGrams(prefill);
      setDrawerLabel('');
      setDrawerError('');
      setDrawerOpen(true);
      return;
    }
    const target = activePortion ?? portions[0];
    setSelectedPortionId(target.id);
    setPortionText(formatPortionCount(amountToPortions(value, target.grams), language));
    setDrawerPrompt('');
    setMode('portions');
  };

  const switchToWeight = () => {
    setDrawerPrompt('');
    setMode('weight');
  };

  const handleSelectPortionChip = (portionId: string) => {
    const target = portions.find((p) => p.id === portionId);
    if (!target) return;
    setSelectedPortionId(target.id);
    const count = currentPortionCount > 0 ? currentPortionCount : 1;
    setPortionText(formatPortionCount(count, language));
    onChange(portionsToAmount(count, target.grams));
  };

  const handleRemoveCustomPortion = (portionId: string) => {
    removeCustomPortion(food.id, portionId);
    const remaining = portions.filter((p) => p.id !== portionId);
    if (!remaining.length) {
      setSelectedPortionId(null);
      setMode('weight');
      return;
    }
    if (activePortion?.id === portionId) {
      const next = remaining[0];
      setSelectedPortionId(next.id);
      const count = currentPortionCount > 0 ? currentPortionCount : 1;
      setPortionText(formatPortionCount(count, language));
      onChange(portionsToAmount(count, next.grams));
    }
  };

  const handlePortionStep = (dir: 'up' | 'down') => {
    if (!activePortion) return;
    const nextCount = dir === 'up' ? portionStepUp(currentPortionCount) : portionStepDown(currentPortionCount);
    setPortionText(formatPortionCount(nextCount, language));
    onChange(portionsToAmount(nextCount, activePortion.grams));
  };

  const handleQuickPortion = (val: number) => {
    if (!activePortion) return;
    setPortionText(formatPortionCount(val, language));
    onChange(portionsToAmount(val, activePortion.grams));
  };

  const handlePortionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
    setPortionText(cleaned);
    if (!activePortion) return;
    if (cleaned === '') {
      onChange(0);
      return;
    }
    const parsed = parseDecimalInput(cleaned);
    if (parsed !== null) {
      onChange(portionsToAmount(parsed, activePortion.grams));
    }
  };

  const handlePortionInputBlur = () => {
    setPortionFocused(false);
    if (!activePortion) return;
    const parsed = parseDecimalInput(portionText);
    if (parsed === null || parsed <= 0) {
      setPortionText('0');
      onChange(0);
    } else {
      setPortionText(formatPortionCount(parsed, language));
      onChange(portionsToAmount(parsed, activePortion.grams));
    }
  };

  const openCustomForm = (withHint = false) => {
    const prefill = value > 0 && Math.abs(value - 100) > 0.05 ? formatWeightAmount(value) : '120';
    setDrawerPrompt(withHint ? txt.emptyHint : '');
    setDrawerGrams(prefill);
    setDrawerLabel('');
    setDrawerError('');
    setDrawerOpen(true);
  };

  const handleSaveCustomPortion = () => {
    const parsed = parseDecimalInput(drawerGrams);
    if (parsed === null || parsed <= 0) {
      setDrawerError(txt.errInvalidWeight);
      return;
    }
    if (Math.abs(parsed - 100) <= 0.01) {
      setDrawerError(txt.errNot100.replace('{unit}', unit));
      return;
    }
    const created = addCustomPortion(food.id, parsed, drawerLabel.trim() || txt.defaultCustomLabel);
    if (!created) {
      setDrawerError(txt.errInvalidWeight);
      return;
    }
    setSelectedPortionId(created.id);
    setMode('portions');
    setPortionText('1');
    setDrawerOpen(false);
    setDrawerPrompt('');
    setDrawerError('');
    onChange(created.grams);
  };

  const alreadyHasExactPortion = portions.some((p) => Math.abs(p.grams - value) <= 0.05);
  const saveBarText =
    value > 0 && Math.abs(value - 100) > 0.05 && !alreadyHasExactPortion
      ? txt.saveAsPortion.replace('{amount}', formatWeightAmount(value)).replace('{unit}', unit)
      : txt.saveNewPortion;

  const stepBtnClass = `pressable ${
    compact ? 'w-9 h-9' : 'w-11 h-11'
  } shrink-0 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center font-bold select-none disabled:opacity-35`;

  return (
    <div className="space-y-2" data-amount-selector>
      {/* Mode switcher: Portions | Weight (g) / Volume (ml) */}
      <div
        data-portion-mode-switch
        className="bg-[var(--inset)] border border-[var(--border)] rounded-xl p-1 grid grid-cols-2 gap-1"
      >
        <button
          type="button"
          onClick={switchToPortions}
          aria-pressed={mode === 'portions'}
          className={`pressable py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1 ${
            mode === 'portions'
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <span>{txt.portions}</span>
          <span className="text-[11px] opacity-75 font-bold">
            {portions.length > 0 ? `(${portions.length})` : `(${txt.setHint})`}
          </span>
        </button>
        <button
          type="button"
          onClick={switchToWeight}
          aria-pressed={mode === 'weight'}
          className={`pressable py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1 ${
            mode === 'weight'
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <span>{weightLabel}</span>
        </button>
      </div>

      {mode === 'portions' && activePortion ? (
        <div className="space-y-2" data-portions-panel>
          {/* Saved portions chip row + "+ Custom" */}
          <div className="flex flex-wrap items-center gap-1.5">
            {portions.map((p) => {
              const active = p.id === activePortion.id;
              return (
                <div
                  key={p.id}
                  className={`inline-flex items-center rounded-xl border text-xs font-bold ${
                    active
                      ? 'kc-chip-active bg-[#C9EFD3] text-[#1A5632] border-[#9ADBB0]'
                      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] border-[var(--border)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectPortionChip(p.id)}
                    className={`pressable ${compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'} flex items-center gap-1`}
                  >
                    <span className="tabular-nums">{formatWeightAmount(p.grams)}{unit}</span>
                    <span className="opacity-80 font-semibold">· {getPortionLabel(p, language)}</span>
                  </button>
                  {p.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomPortion(p.id)}
                      aria-label={txt.removePortion}
                      className="pr-2 pl-0.5 py-1 opacity-70 hover:opacity-100 flex items-center justify-center"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => openCustomForm(false)}
              className={`pressable rounded-xl border border-[var(--border)] bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] font-bold ${
                compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs'
              }`}
            >
              {txt.addCustom}
            </button>
          </div>

          {/* Portion stepper with arbitrary decimal input + live weight pill next to "portion(s)" */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={stepBtnClass}
              disabled={currentPortionCount <= 0}
              onClick={() => handlePortionStep('down')}
              aria-label={txt.decreasePortion}
            >
              <Minus size={compact ? 15 : 18} />
            </button>
            <div
              className={`flex-1 min-w-0 ${
                compact ? 'h-9 px-2' : 'h-11 px-2.5'
              } rounded-xl bg-[var(--inset)] border border-[var(--border)] flex items-center justify-center gap-1.5`}
            >
              <input
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                aria-label={txt.portionCountAria}
                value={portionText}
                onChange={handlePortionInputChange}
                onFocus={(e) => {
                  setPortionFocused(true);
                  const inp = e.currentTarget;
                  requestAnimationFrame(() => {
                    try { inp.select(); } catch { /* ignore */ }
                  });
                }}
                onBlur={handlePortionInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                }}
                placeholder="1"
                className={`${
                  compact ? 'w-11 text-xs' : 'w-13 text-sm'
                } bg-transparent text-right font-extrabold text-[var(--text)] tabular-nums focus:outline-none`}
              />
              <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-bold text-[var(--muted)] shrink-0`}>
                {portionWord}
              </span>
              <span
                data-portion-weight-pill
                className={`px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] ${
                  compact ? 'text-[11px]' : 'text-xs'
                } font-extrabold text-[var(--text)] tabular-nums shrink-0`}
              >
                {formatWeightAmount(value)}{unit}
              </span>
            </div>
            <button
              type="button"
              className={stepBtnClass}
              onClick={() => handlePortionStep('up')}
              aria-label={txt.increasePortion}
            >
              <Plus size={compact ? 15 : 18} />
            </button>
          </div>

          {/* Quick portion fraction/multiple chips */}
          <div className="grid grid-cols-6 gap-1.5">
            {QUICK_PORTIONS.map((q) => {
              const active = Math.abs(currentPortionCount - q.val) < 0.001;
              return (
                <button
                  key={q.val}
                  type="button"
                  onClick={() => handleQuickPortion(q.val)}
                  className={`pressable rounded-xl tabular-nums ${
                    compact ? 'py-1.5 text-[11px]' : 'py-1.5 text-xs'
                  } font-bold border ${
                    active
                      ? 'kc-chip-active bg-[#C9EFD3] text-[#1A5632] border-[#9ADBB0]'
                      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] border-[var(--border)]'
                  }`}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2" data-weight-panel>
          <AmountStepper value={value} onChange={onChange} unit={unit} compact={compact} foodSteps />
          <div className="flex gap-1.5 flex-wrap">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onChange(q)}
                className={`pressable flex-1 min-w-[46px] rounded-xl tabular-nums ${
                  compact ? 'py-1.5 text-[11px]' : 'py-1.5 text-xs'
                } font-bold border ${
                  value === q
                    ? 'bg-[#C9EFD3] text-[#1A5632] border-[#9ADBB0]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] border-[var(--border)]'
                }`}
              >
                {q}{unit}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openCustomForm(false)}
            className="pressable w-full py-1.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--inset)] hover:bg-[var(--hover)] text-xs font-bold text-[var(--text)]"
          >
            {saveBarText}
          </button>
        </div>
      )}

      {/* Inline "Save custom portion" drawer */}
      {drawerOpen && (
        <div
          data-custom-portion-form
          className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl p-2.5 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-[var(--text)]">{txt.formTitle}</span>
            <button
              type="button"
              onClick={() => { setDrawerOpen(false); setDrawerPrompt(''); setDrawerError(''); }}
              className="text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
            >
              {txt.close}
            </button>
          </div>
          {drawerPrompt && <p className="text-[11px] font-semibold text-[var(--muted)]">{drawerPrompt}</p>}
          <div className="grid grid-cols-5 gap-1.5">
            <div className="col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                aria-label={txt.customWeightAria}
                value={drawerGrams}
                onChange={(e) => {
                  setDrawerGrams(e.target.value.replace(/[^0-9.,]/g, ''));
                  setDrawerError('');
                }}
                placeholder={txt.weightPlaceholder}
                className="w-full bg-transparent text-xs font-extrabold text-[var(--text)] tabular-nums focus:outline-none"
              />
              <span className="text-xs font-bold text-[var(--muted)] shrink-0">{unit}</span>
            </div>
            <div className="col-span-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 flex items-center">
              <input
                type="text"
                aria-label={txt.customLabelAria}
                value={drawerLabel}
                onChange={(e) => setDrawerLabel(e.target.value)}
                placeholder={txt.labelPlaceholder}
                className="w-full bg-transparent text-xs font-semibold text-[var(--text)] focus:outline-none"
              />
            </div>
          </div>
          {drawerError && <p className="text-xs font-bold text-[var(--text-warn)]">{drawerError}</p>}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => { setDrawerOpen(false); setDrawerPrompt(''); setDrawerError(''); }}
              className="pressable py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-bold text-[var(--text)]"
            >
              {txt.cancel}
            </button>
            <button
              type="button"
              onClick={handleSaveCustomPortion}
              className="kc-primary-btn pressable py-1.5 rounded-xl bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] text-xs font-extrabold"
            >
              {txt.saveAndUse}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
