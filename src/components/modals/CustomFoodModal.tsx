import React, { useId, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FOOD_CATEGORIES } from '../../data/foodCategories';
import { Modal } from '../common/Modal';
import { FoodCategory, FoodItem, Supermarket } from '../../types';
import { setLastAmount } from '../../utils/amountMemory';
import { WorkflowFooter } from '../common/WorkflowFooter';
import { useJournalText } from '../../i18n/journal';

const parseOptionalNum = (raw: string): number | null => {
  const s = raw.trim().replace(',', '.');
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

const cleanDec = (raw: string) => {
  const s = raw.replace(',', '.');
  return s === '' || /^\d*\.?\d*$/.test(s) ? s : null;
};

interface CustomFoodModalProps {
  onReturn?: () => void;
  onPick?: (food: FoodItem) => void;
  initialName?: string;
}

export const CustomFoodModal: React.FC<CustomFoodModalProps> = ({ onReturn, onPick, initialName = '' }) => {
  const {
    isCustomFoodOpen,
    setIsCustomFoodOpen,
    addCustomFood,
    logFoodItem,
    settings,
    targetMealSlot,

    t,
  } = useApp();

  const j = useJournalText();
  const close = onReturn ?? (() => setIsCustomFoodOpen(false));
  const [name, setName] = useState(initialName);
  const [brand, setBrand] = useState('');
  const [store, setStore] = useState<Supermarket>('Custom');
  const [category, setCategory] = useState<FoodCategory>('prepared');
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [kcalStr, setKcalStr] = useState('');
  const [carbsStr, setCarbsStr] = useState('');
  const [proteinStr, setProteinStr] = useState('');
  const [fatStr, setFatStr] = useState('');
  const [fiberStr, setFiberStr] = useState('');
  const [saltStr, setSaltStr] = useState('');
  const [sugarStr, setSugarStr] = useState('');
  const fieldId = useId();

  const macroKcalEstimate = useMemo(() => {
    const c = parseOptionalNum(carbsStr) ?? 0;
    const p = parseOptionalNum(proteinStr) ?? 0;
    const f = parseOptionalNum(fatStr) ?? 0;
    const fib = parseOptionalNum(fiberStr) ?? 0;
    const total = Math.round(c * 4 + p * 4 + f * 9 + fib * 2);
    return total > 0 ? total : null;
  }, [carbsStr, proteinStr, fatStr, fiberStr]);

  const reset = () => {
    setName('');
    setBrand('');
    setKcalStr('');
    setCarbsStr('');
    setProteinStr('');
    setFatStr('');
    setFiberStr('');
    setSaltStr('');
    setSugarStr('');
  };

  const buildFood = (): FoodItem | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const enteredKcal = parseOptionalNum(kcalStr);
    const finalKcal = Math.max(0, Math.round(enteredKcal ?? macroKcalEstimate ?? 0));

    return {
      id: 'custom-' + Date.now(),
      name_de: trimmed,
      name_it: trimmed,
      name_en: trimmed,
      brand: brand.trim() || undefined,
      store,
      category,
      unit,
      calories: finalKcal,
      carbs: parseOptionalNum(carbsStr),
      protein: parseOptionalNum(proteinStr),
      fat: parseOptionalNum(fatStr),
      fiber: parseOptionalNum(fiberStr),
      salt: parseOptionalNum(saltStr),
      sugar: parseOptionalNum(sugarStr),
      isCustom: true,
    };
  };

  const handleSave = (alsoLog: boolean) => {
    const newFood = buildFood();
    if (!newFood) return;
    addCustomFood(newFood);
    if (onPick) onPick(newFood);
    else if (alsoLog) {
      setLastAmount(newFood.id, 100);
      logFoodItem(targetMealSlot, newFood, 100);
    }
    close();
    reset();
  };

  const inputCls =
    'w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--text)] placeholder-[var(--muted)]/60 text-sm font-bold focus:outline-none focus:border-[var(--muted)] transition-colors';

  const numField = (
    val: string,
    setVal: (s: string) => void,
    unitTxt: string,
    placeholder = '—',
    nutrient?: 'fiber' | 'salt' | 'sugar',
  ) => (
    <div className="relative flex items-center" data-custom-nutrient={nutrient}>
      <input
        id={nutrient ? `${fieldId}-${nutrient}` : undefined}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        value={val}
        placeholder={placeholder}
        onChange={(e) => {
          const next = cleanDec(e.target.value);
          if (next !== null) setVal(next);
        }}
        className={`kc-custom-num-input w-full ${nutrient ? 'bg-nutrient text-nutrient-ink' : 'bg-[var(--inset)] text-[var(--text)]'} border border-[var(--border)] rounded-xl pl-3 pr-9 py-2.5 placeholder-current/55 text-sm font-bold tabular-nums focus:outline-none focus:border-[var(--muted)] transition-colors`}
      />
      <span className={`kc-custom-num-unit absolute right-2.5 text-[11px] font-bold ${nutrient ? 'text-nutrient-ink' : 'text-[var(--muted)]'} pointer-events-none select-none`}>
        {unitTxt}
      </span>
    </div>
  );

  return (
    <Modal
      dockId="food"
      isOpen={Boolean(onReturn) || isCustomFoodOpen}
      onClose={close}
      onBack={close}
      footer={<WorkflowFooter
        primary={onPick ? j('Save and select', 'Salva e seleziona') : j(`Save and log (100${unit})`, `Salva e registra (100${unit})`)}
        onPrimary={() => handleSave(true)} disabled={!name.trim()}
        more={t.common.save} onMore={onPick ? undefined : () => handleSave(false)} moreDisabled={!name.trim()}
      />}
      title={t.database.createCustom}
      maxWidth="max-w-md"
    >
      <div className="space-y-3">
        <div>
          <label htmlFor={`${fieldId}-name`} className="block text-xs font-bold text-[var(--muted)] mb-1">
            {t.database.foodName}
          </label>
          <input
            id={`${fieldId}-name`}
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.database.foodNamePlaceholder}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">
              {t.database.brandLabel}
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder={t.database.brandPlaceholder}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">
              {t.database.storeLabel}
            </label>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value as Supermarket)}
              className={inputCls}
            >
              <option value="Custom">Custom</option>
              <option value="Generic">Generic</option>
              <option value="Lidl">Lidl</option>
              <option value="Aldi">Aldi</option>
              <option value="Netto">Netto</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">
              {t.database.categoryLabel}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FoodCategory)}
              className={inputCls}
            >
              {FOOD_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.categories[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">
              {t.database.unitLabel}
            </label>
            <div className="grid grid-cols-2 gap-1 w-24">
              {(['g', 'ml'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`pressable py-2.5 rounded-xl text-xs font-extrabold border ${
                    unit === u
                      ? 'kc-chip-active bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                      : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className="text-xs font-bold text-[var(--muted)]">
              {t.database.caloriesPer100.replace('{unit}', unit)}
            </label>
            {macroKcalEstimate !== null && String(macroKcalEstimate) !== kcalStr && (
              <button
                type="button"
                onClick={() => setKcalStr(String(macroKcalEstimate))}
                className="kc-action-pill pressable px-2 py-0.5 rounded-full bg-[#C9EFD3] text-[#174A2B] text-[10px] font-extrabold tabular-nums"
              >
                {t.database.fromMacros.replace('{kcal}', String(macroKcalEstimate))}
              </button>
            )}
          </div>
          {numField(
            kcalStr,
            setKcalStr,
            'kcal',
            macroKcalEstimate !== null ? String(macroKcalEstimate) : '150'
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label data-macro="carbs" className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#CFE7FE] text-[#1A4670] mb-1">
              {t.macros.carbs}
            </label>
            {numField(carbsStr, setCarbsStr, 'g')}
          </div>
          <div>
            <label data-macro="protein" className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FAE0B4] text-[#7D4E14] mb-1">
              {t.macros.protein}
            </label>
            {numField(proteinStr, setProteinStr, 'g')}
          </div>
          <div>
            <label data-macro="fat" className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#E2D6FF] text-[#4D3582] mb-1">
              {t.macros.fat}
            </label>
            {numField(fatStr, setFatStr, 'g')}
          </div>
        </div>

        <div className={`grid ${settings.trackSugar ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
          {([
            ['fiber', fiberStr, setFiberStr], ['salt', saltStr, setSaltStr],
            ...(settings.trackSugar ? [['sugar', sugarStr, setSugarStr] as const] : []),
          ] as const).map(([key, value, setter]) => (
            <div key={key} className="min-w-0">
              <label htmlFor={`${fieldId}-${key}`} className="block text-xs font-bold text-[var(--muted)] mb-1">
                {t.macros[key]} ({t.activities.optional})
              </label>
              {numField(value, setter, 'g', undefined, key)}
            </div>
          ))}
        </div>

      </div>
    </Modal>
  );
};
