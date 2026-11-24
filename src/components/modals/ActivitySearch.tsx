import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, PlusCircle, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AppContextType } from '../../context/appContextType';
import type { Language } from '../../types';
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_DB,
  ActivityCategory,
  ActivityInfo,
  activityName,
  categoryLabel,
  customActivityToInfo,
  CUSTOM_ACTIVITY_PREFIX,
} from '../../data/activities';
import { fuzzyMatch, fuzzyScore } from '../../utils/fuzzy';
import { matchesFirstChar, sortFavoritesFirst } from '../../utils/favorites';
import { FavoriteButton } from '../common/FavoriteButton';
import { scrollFadeRef, scrollFadeX } from '../../utils/scrollFade';

interface ActivitySearchProps {
  onPick: (activity: ActivityInfo) => void;
  /** Called with the typed text when nothing matches and the user wants a custom activity instead. */
  onUseCustom: (name: string) => void;
}

interface ActivityRowProps {
  activity: ActivityInfo;
  language: Language;
  t: AppContextType['t'];
  onPick: (activity: ActivityInfo) => void;
  onRemoveCustom: (id: string) => void;
}

/** Module-scope row (item 10): declaring it inside `ActivitySearch` remounted every row on each render. */
const ActivityRow: React.FC<ActivityRowProps> = ({ activity, language, t, onPick, onRemoveCustom }) => (
  <div className="flex items-center gap-2 p-3 hover:bg-[var(--hover)] active:bg-[var(--border)] transition-colors">
    <button type="button" onClick={() => onPick(activity)} className="min-w-0 flex-1 text-left">
      <span className="text-xs sm:text-sm font-bold text-[var(--text)] block leading-snug">
        {activityName(activity, language)}
      </span>
      <span className="text-[11px] font-medium text-[var(--muted)]">
        {categoryLabel(activity.category, language)}
      </span>
    </button>
    <span className="text-xs font-extrabold tabular-nums text-[var(--muted)] shrink-0">
      {activity.met.toFixed(1)} {t.activities.met}
    </span>
    {activity.category === 'custom' && (
      <button
        type="button"
        onClick={() => onRemoveCustom(activity.id.slice(CUSTOM_ACTIVITY_PREFIX.length))}
        className="pressable size-8 shrink-0 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
        title={t.common.delete}
        aria-label={`${t.common.delete}: ${activity.name_en}`}
      >
        <Trash2 size={13} />
      </button>
    )}
    <FavoriteButton foodId={activity.id} kind="activity" />
  </div>
);

/**
 * Search page behind Activity → Other. Mirrors the food search: fuzzy matching, a clear button,
 * and starred favourites pinned above everything else (also while browsing without typing).
 */
export const ActivitySearch: React.FC<ActivitySearchProps> = ({ onPick, onUseCustom }) => {
  const { t, language, favoriteActivities, customActivities, removeCustomActivity } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ActivityCategory>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  // The list keeps its own ref (scroll to top on a new query) and gets the edge-fade.
  const setListEl = useMemo(
    () => scrollFadeRef('y', (el) => { listRef.current = el as HTMLDivElement | null; }),
    [],
  );

  const trimmed = query.trim();

  // A new query or category starts at the top of the list.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [trimmed, category]);

  // Saved custom activities are listed first (newest first), ahead of the Compendium rows.
  const allActivities = useMemo(
    () => [...customActivities.map(customActivityToInfo), ...ACTIVITY_DB],
    [customActivities]
  );
  const inCategory = useMemo(
    () => allActivities.filter((a) => category === 'all' || a.category === category),
    [category, allActivities]
  );
  const visibleCategories = ACTIVITY_CATEGORIES.filter((c) => c.id !== 'custom' || customActivities.length > 0);

  const { favorites, others, isSearch } = useMemo(() => {
    let list: ActivityInfo[];
    let searching = false;

    if (trimmed.length >= 2) {
      searching = true;
      const words = trimmed.split(/\s+/).length;
      const scored = inCategory
        .filter((a) =>
          fuzzyMatch(trimmed, [a.name_en, a.name_it, categoryLabel(a.category, 'en'), categoryLabel(a.category, 'it')])
        )
        .map((a) => ({
          a,
          // Name matches rank first; a category-name match ("cycling", "dance") ranks just behind them.
          score: Math.min(
            fuzzyScore(trimmed, a.name_en),
            fuzzyScore(trimmed, a.name_it),
            fuzzyScore(trimmed, categoryLabel(a.category, 'en')) + 0.9,
            fuzzyScore(trimmed, categoryLabel(a.category, 'it')) + 0.9
          ),
        }))
        .sort((x, y) => x.score - y.score);
      // Direct hits (exact / prefix / substring per word) win; typo-tolerant matches only
      // fill in when there are none, and then only the closest ones ("swiming" → swimming).
      const directLimit = words + 0.5;
      const direct = scored.filter((x) => x.score <= directLimit);
      const best = scored.length ? scored[0].score : 0;
      list = (direct.length > 0 ? direct : scored.filter((x) => x.score <= best + 0.5)).map((x) => x.a);
    } else if (trimmed.length === 1) {
      searching = true;
      list = inCategory.filter((a) => matchesFirstChar({ name_de: '', name_it: a.name_it, name_en: a.name_en }, trimmed));
    } else {
      list = inCategory;
    }

    // Starred activities always sort above the rest (stable: everything else keeps its rank).
    const ordered = sortFavoritesFirst(list, favoriteActivities, (a) => a.id);
    const favSet = new Set(favoriteActivities);
    return {
      favorites: ordered.filter((a) => favSet.has(a.id)),
      others: ordered.filter((a) => !favSet.has(a.id)),
      isSearch: searching,
    };
  }, [trimmed, inCategory, favoriteActivities]);

  const total = favorites.length + others.length;

  const sectionHeader = (label: string, hint?: string) => (
    <div className="px-3 py-2 flex items-center justify-between gap-2 bg-[var(--bg)]/40 border-b border-[var(--border)]">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      {hint && <span className="text-[10px] font-medium text-[var(--muted)] text-right">{hint}</span>}
    </div>
  );

  const chip = (active: boolean) =>
    `pressable px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border shrink-0 ${
      active
        ? 'bg-activity text-activity-ink border-activity-border'
        : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] border-[var(--border)]'
    }`;

  return (
    <div className="space-y-3">
      {/* Search field */}
      <div className="space-y-1">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.activities.searchPlaceholder}
            aria-label={t.activities.searchTitle}
            className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-9 pr-9 py-2.5 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="pressable absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] flex items-center justify-center"
              aria-label={t.common.clear}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {trimmed.length === 1 && (
          <p className="text-[11px] font-medium text-[var(--muted)] px-1">{t.activities.minCharsHint}</p>
        )}
      </div>

      {/* Category filter */}
      <div ref={scrollFadeX} className="flex gap-1.5 overflow-x-auto overscroll-x-contain -mx-1 px-1 pb-1" role="group" aria-label={t.activities.searchTitle}>
        <button type="button" onClick={() => setCategory('all')} className={chip(category === 'all')} aria-pressed={category === 'all'}>
          {t.activities.allCategories}
        </button>
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={chip(category === c.id)}
            aria-pressed={category === c.id}
          >
            {language === 'it' ? c.it : c.en}
          </button>
        ))}
      </div>

      {/* Results: favourites first, then the rest */}
      <div
        ref={setListEl}
        className="max-h-72 overflow-y-auto overscroll-contain bg-[var(--inset)] border border-[var(--border)] rounded-2xl"
      >
        {total === 0 ? (
          <div className="p-5 space-y-3 text-center">
            <p className="text-xs font-medium text-[var(--muted)]">{t.activities.noResults}</p>
            {trimmed && (
              <button
                type="button"
                onClick={() => onUseCustom(trimmed)}
                className="pressable px-3.5 py-2 rounded-full bg-activity hover:bg-activity-hover text-activity-ink text-xs font-extrabold inline-flex items-center gap-1.5"
              >
                <PlusCircle size={14} />
                {t.activities.addAsCustom}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {favorites.length > 0 && !isSearch && sectionHeader(t.favorites.title, t.activities.favoritesHint)}
            {favorites.map((a) => (
              <ActivityRow key={a.id} activity={a} language={language} t={t} onPick={onPick} onRemoveCustom={removeCustomActivity} />
            ))}
            {favorites.length > 0 && others.length > 0 && !isSearch && sectionHeader(t.activities.suggestions)}
            {others.map((a) => (
              <ActivityRow key={a.id} activity={a} language={language} t={t} onPick={onPick} onRemoveCustom={removeCustomActivity} />
            ))}
          </div>
        )}
      </div>

      {favoriteActivities.length === 0 && !isSearch && (
        <p className="text-[11px] font-medium text-[var(--muted)] px-1">{t.activities.favoritesEmpty}</p>
      )}
    </div>
  );
};
