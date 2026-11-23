import React, { useId, useState } from 'react';
import { ChevronDown, Plus, Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const libraryPalettes = {
  meals: { text: '#7D4E14', muted: '#8A5617', border: '#E8C68E' },
  recipes: { text: '#4D3582', muted: '#6E5BA8', border: '#C9B8F2' },
  foods: { text: '#174A2B', muted: '#1D5C38', border: '#9ADBB0' },
  // Journal sections (Meal diary, Meal planner, Photo diary) reuse the very same header.
  diary: { text: '#5D4911', muted: '#7A6320', border: '#E9D68F' },
  planner: { text: '#183F66', muted: '#3A6590', border: '#B9D7F2' },
  photos: { text: '#702D32', muted: '#8F4A50', border: '#E8B9BA' },
};

/** Transparent circle button used in every section header (search, filter, +). */
export const libraryIconButton =
  'pressable size-8 rounded-full bg-transparent hover:opacity-75 text-[var(--text)] flex items-center justify-center';

/**
 * Shared collapsible section header of the Custom page: icon circle, title + count + summary,
 * search toggle (inline search field below), optional actions, + and chevron.
 * Used by Meals, Recipes, Foods and by the journal sections (Meal diary, Meal planner, Photo diary).
 */
export function LibrarySectionHeader({ title, tone, summary, icon, count, createLabel, onCreate, extraActions, searchLabel, query, setQuery, open, onToggle }: {
  title: string;
  tone: keyof typeof libraryPalettes;
  summary?: string;
  icon: React.ReactNode;
  count?: number;
  createLabel?: string;
  onCreate?: () => void;
  /** Extra icon buttons shown between search and +, e.g. a filter button. Use `libraryIconButton` for their class. */
  extraActions?: React.ReactNode;
  searchLabel?: string;
  query?: string;
  setQuery?: (value: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const { settings, t } = useApp();
  const ultraMinimal = settings.ultraMinimal;
  const [searchOpen, setSearchOpen] = useState(false);
  const inputId = useId();
  const closeSearch = () => {
    setQuery?.('');
    setSearchOpen(false);
    document.getElementById(`${inputId}-toggle`)?.focus();
  };
  const palette = libraryPalettes[tone];
  // In Classic theme, only the coloured section header gets this palette; in the 6 new themes, inherit the theme tokens.
  const headerStyle =
    settings.themeStyle === 'classic'
      ? ({
          '--text': palette.text, '--muted': palette.muted, '--border': palette.border,
          '--bg': '#FBF8F2', '--inset': '#FBF8F2', '--hover': '#FFFFFF',
        } as React.CSSProperties)
      : undefined;
  // Circle rule: search and + circles are transparent (they take the section colour, no border or shadow).
  const iconBtn = libraryIconButton;
  return (
    <div className="space-y-2" style={headerStyle}>
      <div className="flex items-center justify-between gap-2">
        {/* Title row toggles the whole section, like a meal card header on Today */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${title}: ${open ? t.common.collapse : t.common.expand}`}
          className="min-w-0 flex-1 flex items-center gap-2.5 text-left"
        >
          <span className="size-9 rounded-full bg-transparent text-[var(--text)] flex items-center justify-center shrink-0">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <h2 className={`${ultraMinimal ? 'sr-only' : 'text-sm sm:text-base font-extrabold text-[var(--text)] truncate'}`}>{title}</h2>
              {typeof count === 'number' && !ultraMinimal && (
                <span className="text-[11px] font-bold tabular-nums text-[var(--muted)]">{count}</span>
              )}
            </span>
            {summary && !ultraMinimal && <span className="block text-[11px] font-medium text-[var(--muted)] truncate">{summary}</span>}
          </span>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          {setQuery && !ultraMinimal && (
            <button
              id={`${inputId}-toggle`}
              type="button"
              onClick={() => {
                if (searchOpen) closeSearch();
                else {
                  setSearchOpen(true);
                  if (!open) onToggle();
                }
              }}
              aria-label={searchLabel}
              aria-expanded={searchOpen}
              aria-controls={searchOpen ? inputId : undefined}
              title={searchLabel}
              className={iconBtn}
            >
              <Search size={15} strokeWidth={searchOpen ? 3 : 2} />
            </button>
          )}
          {extraActions}
          {onCreate && (
            <button type="button" onClick={onCreate} aria-label={createLabel} title={createLabel} className={iconBtn}>
              <Plus size={16} strokeWidth={2.5} />
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? t.common.collapse : t.common.expand}
            className="pressable size-8 rounded-full text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {searchOpen && setQuery && (
        <form
          id={inputId}
          role="search"
          aria-label={searchLabel}
          onSubmit={(event) => event.preventDefault()}
          className="relative w-full"
        >
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
          />
          <input
            autoFocus
            type="text"
            enterKeyHint="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                closeSearch();
              }
            }}
            aria-label={searchLabel}
            placeholder={`${searchLabel}…`}
            className="w-full bg-[var(--inset)] rounded-2xl border border-[var(--border)] pl-9 pr-9 py-2.5 text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-colors"
          />
          <button
            type="button"
            onClick={closeSearch}
            aria-label={t.common.close}
            className="pressable absolute right-2 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
          >
            <X size={14} />
          </button>
        </form>
      )}
    </div>
  );
}
