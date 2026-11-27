import React, { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Language } from '../../types';
import { formatPortionCount, formatWeightAmount, parseDecimalInput } from '../../utils/foodPortions';
import {
  isSamePortion,
  partsForPortionGrams,
  portionFractions,
  portionGramsForParts,
} from '../../utils/portionFractions';
import { AmountStepper } from '../common/AmountStepper';
import { ingredientTextButton as smallButton } from '../common/IngredientRow';

interface RecipePortionPickerProps {
  wholeGrams: number;
  kcal100: number;
  /** Standard portion in grams (`0` means fallback 100 g). */
  value: number;
  onChange: (grams: number) => void;
  j: (en: string, it: string) => string;
  language: Language;
}

const QUICK_WEIGHTS = [100, 150, 200, 250, 300];

export const RecipePortionPicker: React.FC<RecipePortionPickerProps> = ({
  wholeGrams,
  kcal100,
  value,
  onChange,
  j,
  language,
}) => {
  const displayGrams = value > 0 ? value : 100;
  const hasWhole = Number.isFinite(wholeGrams) && wholeGrams > 0;
  const [mode, setMode] = useState<'servings' | 'weight'>(() => (hasWhole ? 'servings' : 'weight'));
  const [partsFocused, setPartsFocused] = useState(false);
  const [partsText, setPartsText] = useState(() =>
    formatPortionCount(partsForPortionGrams(wholeGrams, displayGrams), language),
  );

  useEffect(() => {
    if (!hasWhole && mode === 'servings') setMode('weight');
  }, [hasWhole, mode]);

  useEffect(() => {
    if (partsFocused || !hasWhole) return;
    const derived = partsForPortionGrams(wholeGrams, displayGrams);
    const parsed = parseDecimalInput(partsText);
    if (parsed === null || Math.abs(parsed - derived) > 0.01) {
      setPartsText(formatPortionCount(derived, language));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wholeGrams, displayGrams, partsFocused, language, hasWhole]);

  const parsedParts = parseDecimalInput(partsText);
  const currentParts = parsedParts ?? (hasWhole ? partsForPortionGrams(wholeGrams, displayGrams) : 1);
  const servingWord = Math.abs(currentParts - 1) < 0.001 ? j('serving', 'porzione') : j('servings', 'porzioni');
  const portionKcal = Math.round((kcal100 * displayGrams) / 100);

  const applyParts = (nextParts: number) => {
    if (!hasWhole || nextParts <= 0) return;
    setPartsText(formatPortionCount(nextParts, language));
    onChange(portionGramsForParts(wholeGrams, nextParts));
  };

  const handlePartsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
    setPartsText(cleaned);
    const parsed = parseDecimalInput(cleaned);
    if (parsed !== null && parsed > 0 && hasWhole) {
      onChange(portionGramsForParts(wholeGrams, parsed));
    }
  };

  const handlePartsInputBlur = () => {
    setPartsFocused(false);
    if (!hasWhole) return;
    const parsed = parseDecimalInput(partsText);
    const safe = parsed !== null && parsed > 0 ? parsed : partsForPortionGrams(wholeGrams, displayGrams);
    setPartsText(formatPortionCount(safe, language));
    onChange(portionGramsForParts(wholeGrams, safe));
  };

  const stepBtnClass =
    'pressable w-10 h-10 shrink-0 rounded-xl bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center font-bold select-none disabled:opacity-35';

  const fractions = portionFractions(wholeGrams);
  const showWholeChip = hasWhole && !QUICK_WEIGHTS.some((w) => Math.abs(w - wholeGrams) <= 0.5);

  return (
    <div className="pt-2.5 space-y-2.5">
      {/* Header info + live energy per portion */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-[var(--muted)]">
          {hasWhole
            ? j(`Whole recipe: ${wholeGrams} g.`, `Ricetta intera: ${wholeGrams} g.`)
            : j('Default amount when logging.', 'Quantità predefinita per la registrazione.')}
        </p>
        <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] font-extrabold tabular-nums text-[var(--text)]">
          {portionKcal} kcal / {j('portion', 'porzione')}
        </span>
      </div>

      {/* Mode switcher: By servings | By weight (g) */}
      <div
        data-portion-mode-switch
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1 grid grid-cols-2 gap-1"
      >
        <button
          type="button"
          disabled={!hasWhole}
          onClick={() => setMode('servings')}
          aria-pressed={mode === 'servings'}
          className={`pressable py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1 disabled:opacity-40 ${
            mode === 'servings'
              ? 'bg-[var(--inset)] text-[var(--text)] shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          {j('By servings', 'Per porzioni')}
        </button>
        <button
          type="button"
          onClick={() => setMode('weight')}
          aria-pressed={mode === 'weight'}
          className={`pressable py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1 ${
            mode === 'weight'
              ? 'bg-[var(--inset)] text-[var(--text)] shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          {j('By weight (g)', 'Per peso (g)')}
        </button>
      </div>

      {mode === 'servings' && hasWhole ? (
        <div className="space-y-2" data-recipe-servings-panel>
          {/* Stepper: - | [ parts ] servings [ weight g ] | + */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={stepBtnClass}
              disabled={currentParts <= 1}
              onClick={() => applyParts(Math.max(1, Math.ceil(currentParts) - 1))}
              aria-label={j('Fewer portions', 'Meno porzioni')}
            >
              <Minus size={16} />
            </button>
            <div className="flex-1 min-w-0 h-10 px-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center gap-1.5">
              <input
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                aria-label={j('Number of portions in the recipe', 'Numero di porzioni nella ricetta')}
                value={partsText}
                onChange={handlePartsInputChange}
                onFocus={(e) => {
                  setPartsFocused(true);
                  const inp = e.currentTarget;
                  requestAnimationFrame(() => {
                    try { inp.select(); } catch { /* ignore */ }
                  });
                }}
                onBlur={handlePartsInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                }}
                placeholder="1"
                className="w-12 text-sm bg-transparent text-right font-extrabold text-[var(--text)] tabular-nums focus:outline-none"
              />
              <span className="text-xs font-bold text-[var(--muted)] shrink-0">{servingWord}</span>
              <span
                data-portion-weight-pill
                className="px-2 py-0.5 rounded-full bg-[var(--inset)] border border-[var(--border)] text-xs font-extrabold text-[var(--text)] tabular-nums shrink-0"
              >
                {formatWeightAmount(displayGrams)} g
              </span>
            </div>
            <button
              type="button"
              className={stepBtnClass}
              onClick={() => applyParts(Math.floor(currentParts) + 1)}
              aria-label={j('More portions', 'Più porzioni')}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Quick whole & fraction chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={isSamePortion(value, wholeGrams)}
              className={`kc-chip-pressable ${smallButton} aria-pressed:bg-[#E2D6FF] aria-pressed:text-[#4D3582]`}
              onClick={() => onChange(isSamePortion(value, wholeGrams) ? 0 : Math.round(wholeGrams * 10) / 10)}
            >
              {j('Whole', 'Intera')} · {formatWeightAmount(wholeGrams)} g
            </button>
            {fractions.map(({ parts, grams }) => (
              <button
                key={parts}
                type="button"
                aria-pressed={isSamePortion(value, grams)}
                className={`kc-chip-pressable ${smallButton} aria-pressed:bg-[#E2D6FF] aria-pressed:text-[#4D3582]`}
                onClick={() => onChange(isSamePortion(value, grams) ? 0 : grams)}
              >
                1/{parts} · {grams} g
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2" data-recipe-weight-panel>
          <AmountStepper
            value={displayGrams}
            onChange={onChange}
            unit="g"
            compact
            foodSteps
            ariaLabel={j('Standard portion in grams', 'Porzione standard in grammi')}
          />
          <div className="flex flex-wrap gap-1.5">
            {QUICK_WEIGHTS.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={Math.abs(displayGrams - w) <= 0.5}
                className={`kc-chip-pressable ${smallButton} aria-pressed:bg-[#E2D6FF] aria-pressed:text-[#4D3582]`}
                onClick={() => onChange(w === 100 ? 0 : w)}
              >
                {w} g
              </button>
            ))}
            {showWholeChip && (
              <button
                type="button"
                aria-pressed={isSamePortion(value, wholeGrams)}
                className={`kc-chip-pressable ${smallButton} aria-pressed:bg-[#E2D6FF] aria-pressed:text-[#4D3582]`}
                onClick={() => onChange(Math.round(wholeGrams * 10) / 10)}
              >
                {j('Whole', 'Intera')} ({formatWeightAmount(wholeGrams)} g)
              </button>
            )}
          </div>
          {hasWhole && (
            <p className="text-[11px] font-semibold text-[var(--muted)] tabular-nums">
              ≈ {formatPortionCount(partsForPortionGrams(wholeGrams, displayGrams), language)}{' '}
              {j('servings of', 'porzioni su')} {wholeGrams} g
            </p>
          )}
        </div>
      )}
    </div>
  );
};
