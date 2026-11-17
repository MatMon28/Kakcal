import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { FoodCategory, FoodItem, MealSlotId, Supermarket } from '../../types';
import { Modal } from '../common/Modal';
import { AmountSelector } from '../common/AmountSelector';
import { NumericInput } from '../common/NumericInput';
import { getLastAmount, setLastAmount } from '../../utils/amountMemory';
import { fuzzyMatch } from '../../utils/fuzzy';
import {
  BookOpen,
  Search,
  Plus,
  Egg,
  Fish,
  Croissant,
  Apple,
  Carrot,
  Wheat,
  Cookie,
  Coffee,
  Droplet,
  Utensils,
  Check,
  ScanBarcode,
} from 'lucide-react';

export const FoodDatabaseView: React.FC = () => {
  const {
    allFoods,
    addCustomFood,
    logFoodItem,
    targetMealSlot,
    setIsBarcodeOpen,
    language,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Quick log modal
  const [foodToLog, setFoodToLog] = useState<FoodItem | null>(null);
  const [logSlot, setLogSlot] = useState<MealSlotId>(targetMealSlot);
  const [logAmount, setLogAmount] = useState<number>(100);

  // Custom food modal
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customNameDe, setCustomNameDe] = useState('');
  const [customNameIt, setCustomNameIt] = useState('');
  const [customStore, setCustomStore] = useState<Supermarket>('Custom');
  const [customCategory, setCustomCategory] = useState<FoodCategory>('prepared');
  const [customUnit, setCustomUnit] = useState<'g' | 'ml'>('g');
  const [customKcal, setCustomKcal] = useState<number>(150);
  const [customCarbs, setCustomCarbs] = useState<number>(0);
  const [customProtein, setCustomProtein] = useState<number>(0);
  const [customFat, setCustomFat] = useState<number>(0);
  const [customFiber, setCustomFiber] = useState<number>(0);
  const [customSalt, setCustomSalt] = useState<number>(0);

  const getCategoryIcon = (category: FoodCategory) => {
    switch (category) {
      case 'dairy':
        return Egg;
      case 'meat_fish':
        return Fish;
      case 'bakery':
        return Croissant;
      case 'produce_fruit':
        return Apple;
      case 'produce_veg':
        return Carrot;
      case 'grains_pasta':
        return Wheat;
      case 'snacks_sweets':
        return Cookie;
      case 'drinks':
        return Coffee;
      case 'condiments_oils':
        return Droplet;
      case 'prepared':
      default:
        return Utensils;
    }
  };

  const filteredFoods = useMemo(() => {
    return allFoods.filter((f) => {
      const matchSearch = !search.trim() || fuzzyMatch(search, [f.name_de, f.name_it, f.name_en, f.brand || '']);

      const matchCategory =
        selectedCategory === 'all' || f.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [allFoods, search, selectedCategory]);

  const handleCreateCustom = () => {
    if (!customNameDe.trim() && !customNameIt.trim()) return;

    const newFood: FoodItem = {
      id: 'custom-' + Date.now(),
      name_de: customNameDe.trim() || customNameIt.trim(),
      name_it: customNameIt.trim() || customNameDe.trim(),
      name_en: customNameDe.trim() || customNameIt.trim(),
      store: customStore,
      category: customCategory,
      unit: customUnit,
      calories: Math.max(0, customKcal),
      carbs: customCarbs > 0 ? customCarbs : null,
      protein: customProtein > 0 ? customProtein : null,
      fat: customFat > 0 ? customFat : null,
      fiber: customFiber > 0 ? customFiber : null,
      salt: customSalt > 0 ? customSalt : null,
      isCustom: true,
    };

    addCustomFood(newFood);
    setIsCustomModalOpen(false);
    setCustomNameDe('');
    setCustomNameIt('');
  };

  const handleConfirmQuickLog = () => {
    if (!foodToLog) return;
    const finalAmount = logAmount > 0 ? logAmount : 100;
    setLastAmount(foodToLog.id, finalAmount);
    logFoodItem(logSlot, foodToLog, finalAmount);
    setFoodToLog(null);
  };

  const mealSlots: { id: MealSlotId; label: string }[] = [
    { id: 'breakfast', label: t.mealSlots.breakfast },
    { id: 'mid_morning', label: t.mealSlots.mid_morning },
    { id: 'lunch', label: t.mealSlots.lunch },
    { id: 'midday_snack', label: t.mealSlots.midday_snack },
    { id: 'dinner', label: t.mealSlots.dinner },
    { id: 'extra', label: t.mealSlots.extra },
  ];

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#C9EFD3] text-[#1A5632] flex items-center justify-center">
            <BookOpen size={17} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--text)]">
              {t.database.title}
            </h2>
            <span className="text-xs font-medium text-[var(--muted)]">
              {t.database.itemsCount.replace('{count}', String(filteredFoods.length))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBarcodeOpen(true)}
            className="px-3.5 py-2.5 rounded-full bg-[var(--inset)] hover:bg-[var(--border)] text-[var(--text)] font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <ScanBarcode size={15} />
            <span className="hidden xs:inline">Barcode</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomModalOpen(true)}
            className="px-4 py-2.5 rounded-full bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{t.database.createCustom}</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.database.searchPlaceholder}
            className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-10 pr-3.5 py-2.5 text-[var(--text)] placeholder-[var(--muted)] text-sm font-medium focus:outline-none focus:border-[var(--muted)]"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#C9EFD3] text-[#174A2B]'
                : 'bg-[var(--inset)] text-[#6E665E] hover:text-[var(--text)]'
            }`}
          >
            {t.database.allCategories}
          </button>
          {(
            [
              'prepared',
              'grains_pasta',
              'dairy',
              'meat_fish',
              'produce_fruit',
              'produce_veg',
              'bakery',
              'snacks_sweets',
              'drinks',
              'condiments_oils',
            ] as FoodCategory[]
          ).map((cat) => {
            const Icon = getCategoryIcon(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#C9EFD3] text-[#174A2B]'
                    : 'bg-[var(--inset)] text-[#6E665E] hover:text-[var(--text)]'
                }`}
              >
                <Icon size={13} />
                <span>{t.categories[cat]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredFoods.length > 150 && (
        <p className="text-[11px] font-medium text-[var(--muted)] px-1">
          {t.database.itemsCount.replace('{count}', String(filteredFoods.length))} ·{' '}
          {filteredFoods.length - 150} hidden — refine your search
        </p>
      )}

      {/* Foods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredFoods.slice(0, 150).map((food) => {
          const CategoryIcon = getCategoryIcon(food.category);
          const primaryName =
            language === 'it' ? food.name_it : food.name_en || food.name_de;
          const secondaryName = language === 'it' ? food.name_de : food.name_it;

          return (
            <div
              key={food.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CategoryIcon size={17} className="text-[var(--muted)] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-extrabold text-[var(--text)] truncate">
                          {primaryName}
                        </h4>
                      </div>
                      <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                        {secondaryName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-extrabold text-[var(--text)]">
                      {food.calories}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--muted)] ml-0.5">
                      kcal
                    </span>
                  </div>
                </div>

                {/* Macros per 100g */}
                <div className="grid grid-cols-5 gap-1.5 pt-3 text-center">
                  <div className="bg-[#FAE0B4] p-1.5 rounded-2xl text-[#7D4E14]">
                    <span className="text-[10px] font-bold block">C</span>
                    <span className="text-xs font-extrabold">
                      {food.carbs !== null ? `${food.carbs}g` : '—'}
                    </span>
                  </div>
                  <div className="bg-[#F6D0D0] p-1.5 rounded-2xl text-[#7A2727]">
                    <span className="text-[10px] font-bold block">P</span>
                    <span className="text-xs font-extrabold">
                      {food.protein !== null ? `${food.protein}g` : '—'}
                    </span>
                  </div>
                  <div className="bg-[#E2D6FF] p-1.5 rounded-2xl text-[#4D3582]">
                    <span className="text-[10px] font-bold block">F</span>
                    <span className="text-xs font-extrabold">
                      {food.fat !== null ? `${food.fat}g` : '—'}
                    </span>
                  </div>
                  <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]">
                    <span className="text-[10px] font-bold block">Fib</span>
                    <span className="text-xs font-extrabold">
                      {food.fiber !== null ? `${food.fiber}g` : '—'}
                    </span>
                  </div>
                  <div className="bg-[var(--inset)] p-1.5 rounded-2xl text-[var(--muted)]">
                    <span className="text-[10px] font-bold block">Salt</span>
                    <span className="text-xs font-extrabold">
                      {food.salt !== null ? `${food.salt}g` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--muted)]">
                  100{food.unit} · {t.categories[food.category]}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFoodToLog(food);
                    setLogSlot(targetMealSlot);
                    setLogAmount(getLastAmount(food.id));
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] text-xs font-extrabold flex items-center gap-1 transition-colors"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>{t.mealSlots.addItem}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Log Modal */}
      <Modal
        isOpen={foodToLog !== null}
        onClose={() => setFoodToLog(null)}
        title={
          foodToLog
            ? language === 'it'
              ? foodToLog.name_it
              : foodToLog.name_en || foodToLog.name_de
            : ''
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-1.5">
            {mealSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setLogSlot(slot.id)}
                className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition-colors ${
                  logSlot === slot.id
                    ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                    : 'bg-[var(--inset)] text-[#6E665E] border-[var(--border)]'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>

          <AmountSelector
            value={logAmount}
            onChange={setLogAmount}
            unit={foodToLog?.unit || 'g'}
          />

          <button
            type="button"
            onClick={handleConfirmQuickLog}
            className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>
              {t.foodModal.addBtn} ({t.mealSlots[logSlot]})
            </span>
          </button>
        </div>
      </Modal>

      {/* Add Custom Product Modal */}
      <Modal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title={t.database.createCustom}
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#6E665E] mb-1">
              Name (DE / EN)
            </label>
            <input
              type="text"
              value={customNameDe}
              onChange={(e) => setCustomNameDe(e.target.value)}
              placeholder="e.g. Bio Dinkelbrot"
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-[var(--text)] text-xs font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6E665E] mb-1">
              Nome (IT)
            </label>
            <input
              type="text"
              value={customNameIt}
              onChange={(e) => setCustomNameIt(e.target.value)}
              placeholder="es. Pane di Farro Bio"
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-[var(--text)] text-xs font-bold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-[#6E665E] mb-1">
                Store
              </label>
              <select
                value={customStore}
                onChange={(e) => setCustomStore(e.target.value as Supermarket)}
                className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-xs font-bold focus:outline-none"
              >
                <option value="Lidl">Lidl</option>
                <option value="Aldi">Aldi</option>
                <option value="Netto">Netto</option>
                <option value="Generic">Generic</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6E665E] mb-1">
                Category
              </label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as FoodCategory)}
                className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text)] text-xs font-bold focus:outline-none"
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
              <label className="block text-xs font-bold text-[#6E665E] mb-1">
                Calories / 100{customUnit}
              </label>
              <NumericInput
                value={customKcal}
                onChange={setCustomKcal}
                unit="kcal"
                placeholder="150"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6E665E] mb-1">
                Unit
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setCustomUnit('g')}
                  className={`py-2.5 rounded-xl text-xs font-bold border ${
                    customUnit === 'g'
                      ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                      : 'bg-[var(--inset)] text-[#6E665E] border-[var(--border)]'
                  }`}
                >
                  g
                </button>
                <button
                  type="button"
                  onClick={() => setCustomUnit('ml')}
                  className={`py-2.5 rounded-xl text-xs font-bold border ${
                    customUnit === 'ml'
                      ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                      : 'bg-[var(--inset)] text-[#6E665E] border-[var(--border)]'
                  }`}
                >
                  ml
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-[#8A5617] mb-1">
                Carbs (g)
              </label>
              <NumericInput value={customCarbs} onChange={setCustomCarbs} unit="g" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#8C3A3A] mb-1">
                Protein (g)
              </label>
              <NumericInput value={customProtein} onChange={setCustomProtein} unit="g" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#523A8C] mb-1">
                Fat (g)
              </label>
              <NumericInput value={customFat} onChange={setCustomFat} unit="g" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-[#6E665E] mb-1">
                Fiber (g)
              </label>
              <NumericInput value={customFiber} onChange={setCustomFiber} unit="g" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6E665E] mb-1">
                Salt (g)
              </label>
              <NumericInput value={customSalt} onChange={setCustomSalt} unit="g" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateCustom}
            disabled={!customNameDe.trim() && !customNameIt.trim()}
            className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-40 mt-2"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>{t.common.save}</span>
          </button>
        </div>
      </Modal>
    </div>
  );
};
