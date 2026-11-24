import React, { useDeferredValue, useMemo, useState } from 'react';
import { ArrowLeft, Candy, ChevronRight, Droplets, Footprints, NotebookPen, Scale, Search, Sparkles, Utensils, X } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useJournalText } from '../../../i18n/journal';
import { searchFoods } from '../../../utils/foodSearchIndex';
import { useCatalogueSearch } from '../../../utils/useCatalogueSearch';
import { catalogueScore } from '../../../data/offCatalog';
import { scrollFadeY } from '../../../utils/scrollFade';
import type { FoodItem, Settings } from '../../../types';
import { PoopIcon } from '../../common/PoopIcon';
import { SubSection, TONE, ToggleRow } from './SettingsParts';
import { CustomButtonsSettings } from './CustomButtonsSettings';

/**
 * Settings > Today. Sub-sections, in order: Quick-add buttons (the Today dock), Tracking (log water, log poop,
 * track sugar), Meal notes, Quick food shortcuts, and Custom buttons (moved here from the old Custom buttons group).
 */
export const TodaySettings: React.FC = () => {
  const j = useJournalText();
  const { t, settings, updateSettings, language, allFoods, rememberFood } = useApp();
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const nameOf = (f: FoodItem) => (language === 'it' ? f.name_it : f.name_en || f.name_de);
  const foodById = (id: string) => allFoods.find((x) => x.id === id);

  // Food picker results, same behaviour as the Add Food search (type to find, typos OK)
  const pickerQuery = useDeferredValue(query.trim());
  const { foods: catalogue } = useCatalogueSearch(pickerQuery, pickerIdx !== null, 25);
  const pickerResults = useMemo(() => {
    const q = pickerQuery;
    if (q.length < 2) return [];
    const local = searchFoods(allFoods, q, { combined: true });
    const known = new Set(local.map(({ f }) => f.id));
    const matches = catalogue.filter((f) => !known.has(f.id));
    return [...local, ...matches.map((f) => ({ f, score: catalogueScore(q) }))]
      .sort((a, b) => a.score - b.score)
      .slice(0, 25)
      .map((x) => x.f);
  }, [allFoods, pickerQuery, catalogue]);

  // Quick-add dock buttons. Water and poop are switched in the Tracking sub-section below, so they are not listed here.
  const quickRows = [
    { key: 'food' as const, icon: <Utensils size={14} />, tone: 'bg-intake text-intake-ink', label: t.quickAdd.food },
    { key: 'movement' as const, icon: <Footprints size={14} />, tone: 'bg-activity text-activity-ink', label: t.quickAdd.movement },
    { key: 'weight' as const, icon: <Scale size={14} />, tone: 'bg-weight text-weight-ink', label: t.quickAdd.weight },
    { key: 'custom' as const, icon: <Sparkles size={14} />, tone: TONE.butter, label: t.quickAdd.custom },
  ];

  const setQuick = (key: keyof Settings['quickAdd'], value: boolean) =>
    updateSettings({ quickAdd: { ...settings.quickAdd, [key]: value } });

  if (pickerIdx !== null) {
    /* ---------- Food picker for a quick-add shortcut ---------- */
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setPickerIdx(null);
            setQuery('');
          }}
          className="pressable inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft size={14} />
          <span>{t.common.back}</span>
        </button>

        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.foodModal.typeToSearch}
            autoFocus
            className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-9 pr-9 py-2.5 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
              aria-label={t.common.clear}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {query.trim().length < 2 ? (
          <p className="text-[11px] font-medium text-[var(--muted)] px-1">{t.foodModal.minCharsHint}</p>
        ) : (
          <div ref={scrollFadeY} className="max-h-72 overflow-y-auto divide-y divide-[var(--border)] bg-[var(--inset)] border border-[var(--border)] rounded-2xl">
            {pickerResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--muted)]">{t.foodModal.noResults}</div>
            ) : (
              pickerResults.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => {
                    const next = [...settings.quickFoods];
                    rememberFood(food);
                    next[pickerIdx] = food.id;
                    updateSettings({ quickFoods: next });
                    setPickerIdx(null);
                    setQuery('');
                  }}
                  className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--hover)] transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate">{nameOf(food)}</span>
                  <span className="text-xs font-extrabold tabular-nums text-[var(--muted)] shrink-0">
                    {food.calories} kcal/100{food.unit}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SubSection title={j('Quick-add buttons', 'Pulsanti rapidi')} hint={j('The buttons in the Today bottom bar.', 'I pulsanti nella barra in basso di Oggi.')}>
        {quickRows.map((r) => {
          const unavailable = r.key === 'custom' && settings.customButtons.length === 0;
          return (
            <ToggleRow
              key={r.key}
              icon={r.icon}
              tone={r.tone}
              title={r.label}
              on={settings.quickAdd[r.key] && !unavailable}
              disabled={unavailable}
              onToggle={() => setQuick(r.key, !settings.quickAdd[r.key])}
            />
          );
        })}
      </SubSection>

      <SubSection title={j('Tracking', 'Monitoraggio')} hint={j('Turn off what you do not want to log in Today.', 'Disattiva ciò che non vuoi registrare in Oggi.')}>
        <ToggleRow
          icon={<Droplets size={14} />}
          tone={TONE.sky}
          title={j('Log water', 'Registra acqua')}
          description={j('Water card and water button.', 'Scheda e pulsante dell’acqua.')}
          on={settings.quickAdd.water}
          onToggle={() => setQuick('water', !settings.quickAdd.water)}
        />
        <ToggleRow
          icon={<PoopIcon size={14} />}
          tone={TONE.peach}
          title={j('Log poop', 'Registra poop')}
          description={j('Poop card and poop button.', 'Scheda e pulsante del poop.')}
          on={!settings.hidePoop}
          onToggle={() =>
            // Turning it back on also restores the poop button in the dock.
            updateSettings({ hidePoop: !settings.hidePoop, quickAdd: { ...settings.quickAdd, poop: settings.hidePoop } })
          }
        />
        <ToggleRow
          icon={<Candy size={14} />}
          tone={TONE.butter}
          title={j('Track sugar', 'Traccia zuccheri')}
          description={j('Sugar in meals, food forms and statistics.', 'Zuccheri nei pasti, nei moduli alimento e nelle statistiche.')}
          on={settings.trackSugar}
          onToggle={() => updateSettings({ trackSugar: !settings.trackSugar })}
        />
      </SubSection>

      <SubSection title={j('Meal notes', 'Note dei pasti')}>
        <ToggleRow
          icon={<NotebookPen size={14} />}
          tone={TONE.lilac}
          title={j('Meal notes in Today', 'Note dei pasti in Oggi')}
          description={j('Add a diary note in a meal field or while logging food.', 'Aggiungi note dai pasti in Oggi o mentre registri alimenti.')}
          on={settings.inlineMealNotes}
          onToggle={() => updateSettings({ inlineMealNotes: !settings.inlineMealNotes })}
        />
      </SubSection>

      <SubSection title={t.settings.quickFoodsLabel}>
        {settings.quickFoods.map((id, i) => {
          const f = foodById(id);
          return (
            <button
              key={i}
              type="button"
              onClick={() => setPickerIdx(i)}
              className="pressable w-full min-h-[52px] flex items-center justify-between gap-2 bg-[var(--inset)] hover:bg-[var(--hover)] rounded-2xl px-3 py-2.5 text-left"
            >
              <span className="text-sm font-bold text-[var(--text)] truncate">{f ? nameOf(f) : id}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                {f && <span className="text-[11px] font-bold tabular-nums text-[var(--muted)]">{f.calories} kcal/100{f.unit}</span>}
                <ChevronRight size={15} className="text-[var(--muted)]" />
              </span>
            </button>
          );
        })}
      </SubSection>

      <SubSection title={t.settings.customButtons}>
        <CustomButtonsSettings />
      </SubSection>
    </div>
  );
};
