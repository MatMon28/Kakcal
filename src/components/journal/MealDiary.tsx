import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  NotebookPen,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Trash2,
  Utensils,
} from 'lucide-react';
import { useJournalData, useNavActions, useSettings, useUiState } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useMealSlots } from '../../utils/mealSlots';
import { calculateMacros, calculateTotalCalories } from '../../utils/calculations';
import { getTodayDateString } from '../../utils/formatters';
import { revealMealSlot } from '../../utils/journalNavigation';
import { setLastAmount } from '../../utils/amountMemory';
import { memoryKey, updateMealMemory, useMealJournal } from '../../utils/journalStore';
import type { FoodItem, LoggedFoodItem, MealSlotId } from '../../types';
import { Modal } from '../common/Modal';
import { AmountSelector } from '../common/AmountSelector';
import { WorkflowFooter } from '../common/WorkflowFooter';
import { MealSlotIcon } from '../common/mealSlotIcon';
import { MealSummaryCard } from './MealSummaryCard';
import { SaveAsMeal } from './SaveAsMeal';
import {
  JournalChip,
  JournalEmpty,
  JournalHeaderButton,
  JournalSearch,
  JournalSection,
  journalDate,
} from './JournalUI';

interface DiaryMeal {
  date: string;
  slot: MealSlotId;
  items: LoggedFoodItem[];
  key: string;
}

type MealSearch = (meal: DiaryMeal, query: string) => boolean;

/**
 * `(meal, query) => boolean` for the diary search.
 *
 * The haystack of a meal (every item name, the names of the ingredients of a recipe, the note) is built ONCE per meal
 * and kept in `cache`, not once per meal per keystroke: typing used to rebuild and lower-case N strings, walking the
 * recipe ingredients recursively for each. The cache is renewed when the diary (`meals`), the foods or the notes
 * change. The meal-type label is the only part that depends on the language / meal types, so it is added at query
 * time (`label + ' ' + haystack`, the same text as before). The returned function keeps its identity, so a `useMemo`
 * that filters with it is not invalidated by every render; `labelKey` renews it when a label changes.
 */
function useMealSearch(meals: DiaryMeal[]): MealSearch {
  const { allFoods } = useJournalData();
  const { language } = useSettings();
  const { label, options } = useMealSlots();
  const { memories } = useMealJournal();
  const byId = useMemo(() => new Map(allFoods.map((food) => [food.id, food])), [allFoods]);
  const latestLabel = useRef(label);
  latestLabel.current = label;
  const labelKey = `${language}|${options.map((o) => `${o.id}:${o.label}`).join('|')}`;
  // `meals` renews the cache when the diary changes (a new array whenever the day logs or the notes change).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cache = useMemo(() => new Map<string, string>(), [meals, byId, memories]);
  return useCallback((meal, query) => {
    // No search text: every meal matches (and nothing is built).
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    let body = cache.get(meal.key);
    if (body === undefined) {
      body = `${meal.items.map((i) => `${i.name} ${ingredientNames(byId.get(i.foodId), byId)}`).join(' ')} ${memories[meal.key]?.note || ''}`
        .toLowerCase();
      cache.set(meal.key, body);
    }
    return `${latestLabel.current(meal.slot).toLowerCase()} ${body}`.includes(needle);
    // `labelKey` is not read inside: it renews the function (and every memo that filters with it) when a label changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, byId, memories, labelKey]);
}

function ingredientNames(food: FoodItem | undefined, byId: Map<string, FoodItem>, seen = new Set<string>()): string {
  if (!food || seen.has(food.id)) return '';
  seen.add(food.id);
  return `${food.name_en} ${food.name_it} ${food.name_de} ${(food.recipeIngredients || []).map((i) => ingredientNames(byId.get(i.foodId), byId, seen)).join(' ')}`;
}

const SLOT_ORDER = ['breakfast', 'mid_morning', 'lunch', 'midday_snack', 'dinner', 'extra'];
const SLOT_RANK = new Map(SLOT_ORDER.map((slot, index) => [slot, index]));

/** Newest day first, then the order of the day. Dates are `YYYY-MM-DD`, so a plain comparison orders them like
 * `localeCompare` did - without ICU collation on every comparison of an N log N sort. */
function newestFirst(a: DiaryMeal, b: DiaryMeal): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (SLOT_RANK.get(a.slot) ?? -1) - (SLOT_RANK.get(b.slot) ?? -1);
}

function useDiaryMeals() {
  const { allDayLogs } = useJournalData();
  const { memories } = useMealJournal();
  return useMemo(() => {
    const rows = new Map<string, DiaryMeal>();
    for (const [date, day] of Object.entries(allDayLogs))
      for (const [slot, items] of Object.entries(day.meals)) {
        if (items?.length)
          rows.set(memoryKey(date, slot as MealSlotId), {
            date,
            slot: slot as MealSlotId,
            items,
            key: memoryKey(date, slot as MealSlotId),
          });
      }
    for (const [key, memory] of Object.entries(memories))
      if ((memory.note || memory.favorite) && !rows.has(key)) {
        const [date, slot] = key.split(':');
        rows.set(key, { date, slot: slot as MealSlotId, items: [], key });
      }
    return [...rows.values()].sort(newestFirst);
  }, [allDayLogs, memories]);
}

/** Same colourless icon the meal has in Today (no tinted background). */
function MealSymbol({ slot }: { slot: MealSlotId }) {
  return <MealSlotIcon slot={slot} size={20} />;
}

/** The saved note of a meal, or nothing: previews show the note under the meal name instead of the foods. */
function useMealNote() {
  const { memories } = useMealJournal();
  return (key: string) => memories[key]?.note?.trim() || '';
}

export function MealDiary() {
  const { language, settings } = useSettings();
  const { label } = useMealSlots();
  const { memories } = useMealJournal();
  const meals = useDiaryMeals();
  const matchesSearch = useMealSearch(meals);
  const noteOf = useMealNote();
  const j = useJournalText();
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState(false);
  const [browser, setBrowser] = useState<'all' | 'filters' | null>(null);
  const [selected, setSelected] = useState<DiaryMeal | null>(null);
  // The input shows `query` at once; the filtering of the whole history follows with the deferred value.
  const searched = useDeferredValue(query);
  // Nothing typed and no favourites filter: the matches ARE the diary (no copy, no pass over the history), and the
  // section shows its first 3 rows. The filter is memoised, so an unrelated re-render (a dialog opens, the date
  // changes) does not run it again.
  const noFilter = !searched.trim() && !favorites;
  const matches = useMemo(
    () => (noFilter ? meals : meals.filter((meal) => (!favorites || memories[meal.key]?.favorite) && matchesSearch(meal, searched))),
    [meals, noFilter, favorites, memories, matchesSearch, searched],
  );
  const previewCount = noFilter ? 3 : 6;
  return (
    <>
      <JournalSection
        tone="yellow"
        className="journal-meal-diary"
        title={j('Meal diary', 'Diario dei pasti')}
        icon={<NotebookPen size={16} strokeWidth={2.2} />}
        count={meals.length}
        searchLabel={j('Search a meal or an ingredient', 'Cerca un pasto o un ingrediente')}
        query={query}
        setQuery={setQuery}
        extraActions={
          <JournalHeaderButton
            label={j('Filter meal diary', 'Filtra diario dei pasti')}
            onClick={() => setBrowser('filters')}
          >
            <SlidersHorizontal size={15} />
          </JournalHeaderButton>
        }
      >
        <div className="journal-chip-row" data-no-swipe>
          <JournalChip active={!favorites} onClick={() => setFavorites(false)}>
            {j('All', 'Tutti')}
          </JournalChip>
          <JournalChip active={favorites} onClick={() => setFavorites(!favorites)} title={j('Favorites', 'Preferiti')} aria-label={j('Favorites', 'Preferiti')}>
            <Star size={13} fill={favorites ? 'currentColor' : 'none'} />
            <span className={settings.ultraMinimal ? 'sr-only' : ''}>{j('Favorites', 'Preferiti')}</span>
          </JournalChip>
        </div>
        <div className="journal-recent-meals">
          {matches.slice(0, previewCount).map((meal) => (
            <div className="journal-recent-meal" key={meal.key}>
              <button className="journal-meal-preview" type="button" onClick={() => setSelected(meal)}>
                <span className="journal-meal-symbol">
                  <MealSymbol slot={meal.slot} />
                </span>
                <span>
                  <small>{journalDate(meal.date, language)}</small>
                  <strong>{label(meal.slot)}</strong>
                  {noteOf(meal.key) && <span>{noteOf(meal.key)}</span>}
                </span>
                <ChevronRight className="journal-preview-arrow" size={16} />
              </button>
              <div className="journal-recent-meal-footer">
                <span>
                  <strong>{Math.round(calculateTotalCalories(meal.items))}</strong>{!settings.ultraMinimal && ' kcal'}
                </span>
                <FavoriteMeal date={meal.date} slot={meal.slot} />
              </div>
            </div>
          ))}
        </div>
        {!matches.length && (
          <JournalEmpty>
            {meals.length
              ? j(
                  'No meals match yet. Try another ingredient or filter.',
                  'Nessun risultato. Prova un altro ingrediente o filtro.',
                )
              : j(
                  'Your food story starts with your first logged meal.',
                  'La tua storia inizia dal primo pasto registrato.',
                )}
          </JournalEmpty>
        )}
        {matches.length > previewCount && (
          <button type="button" className="journal-secondary-button journal-see-all" onClick={() => setBrowser('all')}>
            {j('See all meals', 'Vedi tutti i pasti')}
            <ArrowUpRight size={14} />
          </button>
        )}
      </JournalSection>
      {browser && (
        <DiaryBrowser
          meals={meals}
          matchesSearch={matchesSearch}
          initialQuery={query}
          initialFavorites={favorites}
          showFilters={browser === 'filters'}
          onClose={() => setBrowser(null)}
        />
      )}
      {selected && <MealDetails meal={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

export function FavoriteMeal({ date, slot }: { date: string; slot: MealSlotId }) {
  const { memories } = useMealJournal();
  const { label } = useMealSlots();
  const j = useJournalText();
  const favorite = Boolean(memories[memoryKey(date, slot)]?.favorite);
  return (
    <button
      type="button"
      className={`journal-star ${favorite ? 'is-favorite' : ''}`}
      aria-pressed={favorite}
      aria-label={`${favorite ? j('Unfavorite', 'Rimuovi dai preferiti') : j('Favorite', 'Aggiungi ai preferiti')} ${label(slot)}, ${date}`}
      onClick={() => updateMealMemory(date, slot, { favorite: !favorite })}
    >
      <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
    </button>
  );
}

function DiaryBrowser({
  meals,
  matchesSearch,
  initialQuery,
  initialFavorites,
  showFilters,
  onClose,
}: {
  /** The one diary index of `MealDiary` (not walked and sorted a second time here). */
  meals: DiaryMeal[];
  matchesSearch: MealSearch;
  initialQuery: string;
  initialFavorites: boolean;
  showFilters: boolean;
  onClose: () => void;
}) {
  const { language } = useSettings();
  const { label, options } = useMealSlots();
  const { memories } = useMealJournal();
  const noteOf = useMealNote();
  const j = useJournalText();
  const [query, setQuery] = useState(initialQuery);
  const [filterOpen, setFilterOpen] = useState(showFilters);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [weekday, setWeekday] = useState('');
  const [slot, setSlot] = useState('');
  const [calMin, setCalMin] = useState('');
  const [calMax, setCalMax] = useState('');
  const [macro, setMacro] = useState<
    'carbsGrams' | 'proteinGrams' | 'fatGrams' | 'fiberGrams' | 'saltGrams' | 'sugarGrams'
  >('proteinGrams');
  const [macroMin, setMacroMin] = useState('');
  const [macroMax, setMacroMax] = useState('');
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<DiaryMeal | null>(null);
  const needsKcal = calMin !== '' || calMax !== '';
  const needsMacro = macroMin !== '' || macroMax !== '';
  const searched = useDeferredValue(query);
  // Memoised on the whole filter state: a re-render that changes none of it (and a keystroke still being typed, which
  // only moves `query`, not `searched`) does not walk the history again.
  const matches = useMemo(() => meals.filter((meal) => {
    // Only add up calories / macros when a filter on them is set.
    const kcal = needsKcal ? calculateTotalCalories(meal.items) : 0;
    const value = needsMacro ? calculateMacros(meal.items)[macro] : 0;
    return (
      matchesSearch(meal, searched) &&
      (!favorites || memories[meal.key]?.favorite) &&
      (!from || meal.date >= from) &&
      (!to || meal.date <= to) &&
      (!slot || meal.slot === slot) &&
      (weekday === '' || new Date(`${meal.date}T12:00:00`).getDay() === Number(weekday)) &&
      (calMin === '' || kcal >= Number(calMin)) &&
      (calMax === '' || kcal <= Number(calMax)) &&
      (macroMin === '' || value >= Number(macroMin)) &&
      (macroMax === '' || value <= Number(macroMax))
    );
  }), [meals, matchesSearch, searched, favorites, memories, from, to, slot, weekday, calMin, calMax, macro, macroMin, macroMax, needsKcal, needsMacro]);
  const reset = () => {
    setFrom('');
    setTo('');
    setWeekday('');
    setSlot('');
    setCalMin('');
    setCalMax('');
    setMacroMin('');
    setMacroMax('');
    setFavorites(false);
    setQuery('');
  };
  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={j('Your meal diary', 'Il tuo diario dei pasti')}
        maxWidth="max-w-3xl"
      >
        <div className="journal-form">
          <JournalSearch
            value={query}
            onChange={(v) => {
              setQuery(v);
              setLimit(20);
            }}
            placeholder={j('Search meals, ingredients or notes', 'Cerca pasti, ingredienti o note')}
          />
          <div className="journal-browser-toolbar">
            <JournalChip active={filterOpen} onClick={() => setFilterOpen(!filterOpen)}>
              <SlidersHorizontal size={13} />
              {j('Filters', 'Filtri')}
            </JournalChip>
            <JournalChip active={favorites} onClick={() => setFavorites(!favorites)}>
              <Star size={13} fill={favorites ? 'currentColor' : 'none'} />
              {j('Favorites only', 'Solo preferiti')}
            </JournalChip>
            <button
              type="button"
              className="journal-reset-button"
              onClick={reset}
              aria-label={j('Reset filters', 'Reimposta filtri')}
              title={j('Reset filters', 'Reimposta filtri')}
            >
              <RotateCcw size={15} />
            </button>
          </div>
          {filterOpen && (
            <div className="journal-filter-grid">
              <label>
                {j('From date', 'Dalla data')}
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                {j('To date', 'Alla data')}
                <input
                  type="date"
                  min={from || undefined}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              <label>
                {j('Day of the week', 'Giorno della settimana')}
                <select value={weekday} onChange={(e) => setWeekday(e.target.value)}>
                  <option value="">{j('Any day', 'Qualsiasi giorno')}</option>
                  {Array.from({ length: 7 }, (_, day) => (
                    <option key={day} value={day}>
                      {new Date(2026, 0, 4 + day).toLocaleDateString(language === 'it' ? 'it' : 'en', {
                        weekday: 'long',
                      })}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {j('Meal', 'Pasto')}
                <select value={slot} onChange={(e) => setSlot(e.target.value)}>
                  <option value="">{j('All meals', 'Tutti i pasti')}</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {j('Minimum calories', 'Calorie minime')}
                <input
                  type="number"
                  min={0}
                  placeholder="0 kcal"
                  value={calMin}
                  onChange={(e) => setCalMin(e.target.value)}
                />
              </label>
              <label>
                {j('Maximum calories', 'Calorie massime')}
                <input
                  type="number"
                  min={0}
                  placeholder={j('No limit', 'Nessun limite')}
                  value={calMax}
                  onChange={(e) => setCalMax(e.target.value)}
                />
              </label>
              <label>
                {j('Macronutrient', 'Nutriente')}
                <select value={macro} onChange={(e) => setMacro(e.target.value as typeof macro)}>
                  <option value="proteinGrams">{j('Protein', 'Proteine')}</option>
                  <option value="carbsGrams">{j('Carbs', 'Carboidrati')}</option>
                  <option value="fatGrams">{j('Fat', 'Grassi')}</option>
                  <option value="fiberGrams">{j('Fibre', 'Fibre')}</option>
                  <option value="saltGrams">{j('Salt', 'Sale')}</option>
                  <option value="sugarGrams">{j('Sugar', 'Zuccheri')}</option>
                </select>
              </label>
              <div className="journal-form-columns">
                <label>
                  {j('Min. grams', 'Grammi min.')}
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={macroMin}
                    onChange={(e) => setMacroMin(e.target.value)}
                  />
                </label>
                <label>
                  {j('Max. grams', 'Grammi max.')}
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={macroMax}
                    onChange={(e) => setMacroMax(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}
          <p className="journal-result-count" aria-live="polite">
            {matches.length} {j('meals to remember', 'pasti da ricordare')}
          </p>
          <div className="journal-diary-results">
            {matches.slice(0, limit).map((meal) => (
              <div className="journal-diary-result" key={meal.key}>
                <button type="button" onClick={() => setSelected(meal)}>
                  <span className="journal-meal-symbol">
                    <MealSymbol slot={meal.slot} />
                  </span>
                  <span>
                    <strong>
                      {label(meal.slot)}
                      <small>
                        {journalDate(meal.date, language, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </small>
                    </strong>
                    {noteOf(meal.key) && <span>{noteOf(meal.key)}</span>}
                  </span>
                  <b>
                    {Math.round(calculateTotalCalories(meal.items))}
                    <small>kcal</small>
                  </b>
                </button>
                <FavoriteMeal date={meal.date} slot={meal.slot} />
              </div>
            ))}
          </div>
          {!matches.length && (
            <JournalEmpty>
              {j(
                'No meals match these filters. Try widening your search.',
                'Nessun pasto corrisponde ai filtri. Prova una ricerca piu ampia.',
              )}
            </JournalEmpty>
          )}
          {matches.length > limit && (
            <button type="button" className="journal-secondary-button" onClick={() => setLimit(limit + 20)}>
              {j('Show more meals', 'Mostra altri pasti')}
            </button>
          )}
        </div>
      </Modal>
      {selected && <MealDetails meal={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function MealDetails({ meal, onClose }: { meal: DiaryMeal; onClose: () => void }) {
  const { language } = useSettings();
  const { allFoods, allDayLogs, logItemsToSlot, removeLoggedFoodItem, updateLoggedFoodItemAmount } = useJournalData();
  const { setSelectedDate, setTargetMealSlot, setIsAddFoodOpen } = useUiState();
  const { setActiveTab } = useNavActions();
  const items = allDayLogs[meal.date]?.meals[meal.slot] ?? [];
  const [editing, setEditing] = useState(false);
  const [amountEdit, setAmountEdit] = useState<{ id: string; value: number } | null>(null);
  const goToDay = () => {
    onClose();
    setSelectedDate(meal.date);
    setActiveTab('today');
    revealMealSlot(meal.slot);
  };
  const addFood = () => {
    setSelectedDate(meal.date);
    setTargetMealSlot(meal.slot);
    setIsAddFoodOpen(true);
  };
  const { label } = useMealSlots();
  const { memories } = useMealJournal();
  const j = useJournalText();
  const [note, setNote] = useState(memories[meal.key]?.note || '');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal
      isOpen
      onClose={onClose}
      onBack={editing ? () => { setEditing(false); setAmountEdit(null); } : undefined}
      bodyKey={editing ? 'edit-meal' : 'meal-detail'}
      footer={editing ? <WorkflowFooter more={j('Add food', 'Aggiungi alimento')} onMore={addFood}
        primary={j('Done editing', 'Fine modifica')} onPrimary={() => { setEditing(false); setAmountEdit(null); }} /> : undefined}
      title={journalDate(meal.date, language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}
      maxWidth="max-w-lg"
    >
      {editing ? (
        <div className="space-y-3">
          <h3 className="font-extrabold">{j('Edit meal', 'Modifica pasto')} · {label(meal.slot)}</h3>
          {!items.length && <p className="text-sm text-[var(--muted)]">{j('No foods logged', 'Nessun alimento')}</p>}
          {items.map((item) => <div key={item.id} className="space-y-2 rounded-2xl p-3 border border-[var(--border)] bg-[var(--inset)]">
            <div className="flex items-center gap-2">
              <p className="flex-1 min-w-0 font-bold text-sm break-words">{item.name}</p>
              <button type="button" className="journal-secondary-button" aria-label={j(`Edit amount for ${item.name}`, `Modifica quantità per ${item.name}`)}
                onClick={() => setAmountEdit({ id: item.id, value: item.amount })}><Pencil size={14} /> {item.amount} {item.unit}</button>
              <button type="button" className="kc-danger-icon-hover pressable size-9 rounded-full grid place-items-center hover:bg-[#F6D0D0] hover:text-[#7A2727]"
                aria-label={j(`Delete ${item.name}`, `Elimina ${item.name}`)} onClick={() => {
                  if (amountEdit?.id === item.id) setAmountEdit(null);
                  removeLoggedFoodItem(meal.slot, item.id, meal.date);
                }}><Trash2 size={15} /></button>
            </div>
            {amountEdit?.id === item.id && <>
              <AmountSelector
                value={amountEdit.value}
                onChange={(value) => setAmountEdit({ id: item.id, value })}
                unit={item.unit}
                food={(allFoods ?? []).find((f) => f.id === item.foodId) ?? { id: item.foodId, unit: item.unit }}
              />
              <div className="journal-form-actions">
                <button type="button" className="journal-secondary-button" onClick={() => setAmountEdit(null)}>{j('Cancel', 'Annulla')}</button>
                <button type="button" className="journal-primary-button" disabled={!Number.isFinite(amountEdit.value) || amountEdit.value <= 0} onClick={() => {
                  setLastAmount(item.foodId, amountEdit.value);
                  updateLoggedFoodItemAmount(meal.slot, item.id, amountEdit.value, meal.date);
                  setAmountEdit(null);
                }}><Check size={15} /> {j('Save amount', 'Salva quantità')}</button>
              </div>
            </>}
          </div>)}
        </div>
      ) : <div className="journal-form">
        <div className="journal-form-actions">
          <button type="button" className="journal-secondary-button" onClick={() => setEditing(true)}><Pencil size={15} /> {j('Edit meal', 'Modifica pasto')}</button>
          <button type="button" className="journal-secondary-button" onClick={goToDay}><CalendarDays size={15} /> {j('Go to day', 'Vai al giorno')}</button>
        </div>
        {/* The same card as an expanded meal in Today: icon, name, kcal, macro pills, then every food. */}
        <MealSummaryCard
          slot={meal.slot}
          title={label(meal.slot)}
          items={items}
          emptyText={j('No foods logged', 'Nessun alimento')}
          trailing={<FavoriteMeal date={meal.date} slot={meal.slot} />}
        >
          <label className="journal-detail-note">
            {j('A note for this meal', 'Una nota per questo pasto')}
            <textarea
              rows={3}
              maxLength={4000}
              value={note}
              placeholder={j(
                'How was it? A little detail to remember...',
                "Com'era? Un piccolo dettaglio da ricordare...",
              )}
              onChange={(e) => {
                setNote(e.target.value);
                setSaved(false);
              }}
            />
          </label>
        </MealSummaryCard>
        {error && (
          <p role="alert" className="journal-error">
            {error}
          </p>
        )}
        <div className="journal-form-actions">
          {items.length > 0 && (
            <button
              type="button"
              disabled={copied}
              className="journal-secondary-button"
              onClick={() => {
                logItemsToSlot(meal.slot, items, getTodayDateString());
                setCopied(true);
              }}
            >
              {copied ? <Check size={15} /> : <Utensils size={15} />}
              {copied ? j('Logged today', 'Registrato oggi') : j('Log today', 'Registra oggi')}
            </button>
          )}
          <SaveAsMeal slot={meal.slot} date={meal.date} items={items} />
          <button
            type="button"
            className="journal-primary-button"
            onClick={() => {
              try {
                updateMealMemory(meal.date, meal.slot, { note: note.trim() });
                setSaved(true);
              } catch {
                setError(
                  j('Not enough storage to save this note.', 'Spazio insufficiente per salvare la nota.'),
                );
              }
            }}
          >
            <Check size={16} />
            {saved ? j('Note saved', 'Nota salvata') : j('Save note', 'Salva nota')}
          </button>
        </div>
      </div>}
    </Modal>
  );
}

export function MealNoteAction({ date, slot }: { date: string; slot: MealSlotId }) {
  const { settings } = useSettings();
  const { allDayLogs } = useJournalData();
  const j = useJournalText();
  const [open, setOpen] = useState(false);
  if (!settings.inlineMealNotes) return null;
  return (
    <>
      <button
        type="button"
        className="journal-icon-button journal-meal-note-action"
        title={j('Meal diary note', 'Nota del pasto')}
        aria-label={j('Meal diary note', 'Nota del pasto')}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <NotebookPen size={16} />
      </button>
      {open && (
        <MealDetails
          meal={{ date, slot, items: allDayLogs[date]?.meals[slot] || [], key: memoryKey(date, slot) }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function MealNoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { settings } = useSettings();
  const j = useJournalText();
  if (!settings.inlineMealNotes) return null;
  return (
    <label className="journal-log-note">
      <span>
        <NotebookPen size={15} />
        {j('Meal note (optional)', 'Nota del pasto (facoltativa)')}
      </span>
      <textarea
        maxLength={4000}
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={j('Something you want to remember?', 'Qualcosa da ricordare?')}
      />
    </label>
  );
}

export function InlineMealNote({ date, slot }: { date: string; slot: MealSlotId }) {
  const { memories } = useMealJournal();
  const note = memories[memoryKey(date, slot)]?.note;
  return note ? (
    <div className="journal-inline-memory">
      <NotebookPen size={15} />
      <p>{note}</p>
    </div>
  ) : null;
}
