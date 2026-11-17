import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { FoodCategory, FoodItem, Supermarket } from '../../types';
import { Check } from 'lucide-react';

export const CustomFoodModal: React.FC = () => {
  const { isCustomFoodOpen, setIsCustomFoodOpen, addCustomFood, t } = useApp();

  const [nameDe, setNameDe] = useState('');
  const [nameIt, setNameIt] = useState('');
  const [store, setStore] = useState<Supermarket>('Custom');
  const [category, setCategory] = useState<FoodCategory>('prepared');
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [kcal, setKcal] = useState<number>(150);
  const [carbs, setCarbs] = useState<number>(0);
  const [protein, setProtein] = useState<number>(0);
  const [fat, setFat] = useState<number>(0);
  const [fiber, setFiber] = useState<number>(0);
  const [salt, setSalt] = useState<number>(0);

  const reset = () => {
    setNameDe('');
    setNameIt('');
    setKcal(150);
    setCarbs(0);
    setProtein(0);
    setFat(0);
    setFiber(0);
    setSalt(0);
  };

  const handleCreate = () => {
    if (!nameDe.trim() && !nameIt.trim()) return;

    const newFood: FoodItem = {
      id: 'custom-' + Date.now(),
      name_de: nameDe.trim() || nameIt.trim(),
      name_it: nameIt.trim() || nameDe.trim(),
      name_en: nameDe.trim() || nameIt.trim(),
      store,
      category,
      unit,
      calories: Math.max(0, kcal),
      carbs: carbs > 0 ? carbs : null,
      protein: protein > 0 ? protein : null,
      fat: fat > 0 ? fat : null,
      fiber: fiber > 0 ? fiber : null,
      salt: salt > 0 ? salt : null,
      isCustom: true,
    };

    addCustomFood(newFood);
    setIsCustomFoodOpen(false);
    reset();
  };

  const inputCls =
    'w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-[var(--text)] placeholder-[var(--muted)] text-xs font-bold focus:outline-none';

  return (
    <Modal
      isOpen={isCustomFoodOpen}
      onClose={() => setIsCustomFoodOpen(false)}
      title={t.database.createCustom}
      maxWidth="max-w-md"
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-[var(--muted)] mb-1">Name (DE / EN)</label>
          <input
            type="text"
            value={nameDe}
            onChange={(e) => setNameDe(e.target.value)}
            placeholder="e.g. Bio Dinkelbrot"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--muted)] mb-1">Nome (IT)</label>
          <input
            type="text"
            value={nameIt}
            onChange={(e) => setNameIt(e.target.value)}
            placeholder="es. Pane di Farro Bio"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">Store</label>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value as Supermarket)}
              className={inputCls}
            >
              <option value="Lidl">Lidl</option>
              <option value="Aldi">Aldi</option>
              <option value="Netto">Netto</option>
              <option value="Generic">Generic</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FoodCategory)}
              className={inputCls}
            >
              <option value="prepared">Kebab & Prepared</option>
              <option value="grains_pasta">Cereals & Pasta</option>
              <option value="dairy">Dairy & Eggs</option>
              <option value="meat_fish">Meat & Fish</option>
              <option value="bakery">Bakery</option>
              <option value="produce_fruit">Fruit</option>
              <option value="produce_veg">Vegetables</option>
              <option value="snacks_sweets">Snacks</option>
              <option value="drinks">Drinks</option>
              <option value="condiments_oils">Oils & Sauces</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">
              Calories / 100{unit}
            </label>
            <NumericInput value={kcal} onChange={setKcal} unit="kcal" placeholder="150" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">Unit</label>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setUnit('g')}
                className={`py-2.5 rounded-xl text-xs font-bold border ${
                  unit === 'g'
                    ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                    : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                g
              </button>
              <button
                type="button"
                onClick={() => setUnit('ml')}
                className={`py-2.5 rounded-xl text-xs font-bold border ${
                  unit === 'ml'
                    ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                    : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                ml
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-bold text-[#8A5617] mb-1">Carbs (g)</label>
            <NumericInput value={carbs} onChange={setCarbs} unit="g" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#8C3A3A] mb-1">Protein (g)</label>
            <NumericInput value={protein} onChange={setProtein} unit="g" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#523A8C] mb-1">Fat (g)</label>
            <NumericInput value={fat} onChange={setFat} unit="g" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">Fiber (g)</label>
            <NumericInput value={fiber} onChange={setFiber} unit="g" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] mb-1">Salt (g)</label>
            <NumericInput value={salt} onChange={setSalt} unit="g" />
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={!nameDe.trim() && !nameIt.trim()}
          className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40 mt-2"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>{t.common.save}</span>
        </button>
      </div>
    </Modal>
  );
};
