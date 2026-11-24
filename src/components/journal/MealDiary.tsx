import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  NotebookPen,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Utensils,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { useMealSlots } from '../../utils/mealSlots';
import { calculateMacros, calculateTotalCalories } from '../../utils/calculations';
import { getTodayDateString } from '../../utils/formatters';
import { memoryKey, updateMealMemory, useMealJournal } from '../../utils/journalStore';
import type { FoodItem, LoggedFoodItem, MealSlotId } from '../../types';
import { Modal } from '../common/Modal';
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

function useMealSearch() {
  const { allFoods } = useApp();
  const { label } = useMealSlots();
  const { memories } = useMealJournal();
  const byId = useMemo(() => new Map(allFoods.map((food) => [food.id, food])), [allFoods]);
  const ingredientNames = (food: FoodItem | undefined, seen = new Set<string>()): string => {
    if (!food || seen.has(food.id)) return '';
    seen.add(food.id);
    return `${food.name_en} ${food.name_it} ${food.name_de} ${(food.recipeIngredients || []).map((i) => ingredientNames(byId.get(i.foodId), seen)).join(' ')}`;
  };
  return (meal: DiaryMeal, query: string) =>
    `${label(meal.slot)} ${meal.items.map((i) => `${i.name} ${ingredientNames(byId.get(i.foodId))}`).join(' ')} ${memories[meal.key]?.note || ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
}

function useDiaryMeals() {
  const { allDayLogs } = useApp();
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
    return [...rows.values()].sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        ['breakfast', 'mid_morning', 'lunch', 'midday_snack', 'dinner', 'extra'].indexOf(a.slot) -
          ['breakfast', 'mid_morning', 'lunch', 'midday_snack', 'dinner', 'extra'].indexOf(b.slot),
    );
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
  const { language } = useApp();
  const { label } = useMealSlots();
  const { memories } = useMealJournal();
  const meals = useDiaryMeals();
  const matchesSearch = useMealSearch();
  const noteOf = useMealNote();
  const j = useJournalText();
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState(false);
  const [browser, setBrowser] = useState<'all' | 'filters' | null>(null);
  const [selected, setSelected] = useState<DiaryMeal | null>(null);
  const matches = meals.filter(
    (meal) => (!favorites || memories[meal.key]?.favorite) && matchesSearch(meal, query),
  );
  const previewCount = query.trim() || favorites ? 6 : 3;
  return (
    <>
      <JournalSection
        tone="yellow"
        className="journal-meal-diary"
        title={j('Meal diary', 'Diario dei pasti')}
        subtitle={j('Good meals are worth remembering.', 'I buoni pasti meritano di essere ricordati.')}
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
          <JournalChip active={favorites} onClick={() => setFavorites(!favorites)}>
            <Star size={13} fill={favorites ? 'currentColor' : 'none'} />
            {j('Favorites', 'Preferiti')}
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
                  <strong>{Math.round(calculateTotalCalories(meal.items))}</strong> kcal
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
  initialQuery,
  initialFavorites,
  showFilters,
  onClose,
}: {
  initialQuery: string;
  initialFavorites: boolean;
  showFilters: boolean;
  onClose: () => void;
}) {
  const { language } = useApp();
  const { label, options } = useMealSlots();
  const { memories } = useMealJournal();
  const meals = useDiaryMeals();
  const matchesSearch = useMealSearch();
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
  const matches = meals.filter((meal) => {
    const kcal = calculateTotalCalories(meal.items);
    const value = calculateMacros(meal.items)[macro];
    return (
      matchesSearch(meal, query) &&
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
  });
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
        subtitle={j(
          'Find a favorite. Notice a pattern. Remember a good meal.',
          "Ritrova un preferito. Scopri un'abitudine. Ricorda un buon pasto.",
        )}
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
  const { language, logItemsToSlot } = useApp();
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
      title={journalDate(meal.date, language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}
      maxWidth="max-w-lg"
    >
      <div className="journal-form">
        {/* The same card as an expanded meal in Today: icon, name, kcal, macro pills, then every food. */}
        <MealSummaryCard
          slot={meal.slot}
          title={label(meal.slot)}
          items={meal.items}
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
          {meal.items.length > 0 && (
            <button
              type="button"
              disabled={copied}
              className="journal-secondary-button"
              onClick={() => {
                logItemsToSlot(meal.slot, meal.items, getTodayDateString());
                setCopied(true);
              }}
            >
              {copied ? <Check size={15} /> : <Utensils size={15} />}
              {copied ? j('Logged today', 'Registrato oggi') : j('Log today', 'Registra oggi')}
            </button>
          )}
          <SaveAsMeal slot={meal.slot} date={meal.date} items={meal.items} />
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
      </div>
    </Modal>
  );
}

export function MealNoteAction({ date, slot }: { date: string; slot: MealSlotId }) {
  const { settings, allDayLogs } = useApp();
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
  const { settings } = useApp();
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
