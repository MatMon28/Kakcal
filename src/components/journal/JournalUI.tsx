import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { useSettings } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';
import { usePersistentState } from '../../utils/usePersistentState';
import { LibrarySectionHeader, libraryIconButton } from '../common/LibrarySectionHeader';
import { LazyBody } from '../common/LazyBody';

const toneToPalette = { yellow: 'diary', blue: 'planner', red: 'photos', teal: 'shopping' } as const;

/**
 * Journal section (Meal diary, Meal planner, Photo diary). It deliberately uses the same
 * `LibrarySectionHeader` as Meals / Recipes / Foods, so the icon circle, title + count, search
 * toggle, + button and chevron look and behave exactly like the rest of the Custom page.
 */
export function JournalSection({
  tone,
  icon,
  title,
  summary,
  count,
  createLabel,
  onCreate,
  extraActions,
  searchLabel,
  query,
  setQuery,
  children,
  className = '',
}: {
  tone: 'yellow' | 'blue' | 'red' | 'teal';
  icon: ReactNode;
  title: string;
  summary?: string;
  count?: number;
  createLabel?: string;
  onCreate?: () => void;
  extraActions?: ReactNode;
  searchLabel?: string;
  query?: string;
  setQuery?: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = // Closed unless the user opened it (then the choice is remembered): a section is a header row until it is needed.
  usePersistentState<boolean>(`kcak_journal_${tone}_open`, false);
  const { settings } = useSettings();
  return (
    <section
      className={`journal-feature space-y-3 ${className}`}
      data-library-section={`journal-${tone}`}
      data-tone={tone}
      data-minimal={settings.ultraMinimal || undefined}
      data-section-open={open}
    >
      <LibrarySectionHeader
        title={title}
        tone={toneToPalette[tone]}
        summary={summary}
        icon={icon}
        count={count}
        createLabel={createLabel}
        onCreate={onCreate}
        extraActions={extraActions}
        searchLabel={searchLabel}
        query={query}
        setQuery={setQuery}
        open={open}
        onToggle={() => setOpen(!open)}
      />
      <div className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <LazyBody open={open} defer>
            <div className="journal-section-body">{children}</div>
          </LazyBody>
        </div>
      </div>
    </section>
  );
}

/** Icon-only header button (same transparent circle as search and +). */
export function JournalHeaderButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`${libraryIconButton} ${active ? 'opacity-100' : ''}`}
    >
      {children}
    </button>
  );
}

/** Pill chip identical to the category chips on the Foods page. */
export function JournalChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pressable journal-chip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${active ? 'is-active' : ''}`}
    >
      {children}
    </button>
  );
}

export function JournalSearch({
  value,
  onChange,
  placeholder,
  onFocus,
  onBlur,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const j = useJournalText();
  return (
    <div className="journal-search">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {value && (
        <button type="button" aria-label={j('Clear search', 'Cancella ricerca')} onClick={() => onChange('')}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function JournalEmpty({ children }: { children: ReactNode }) {
  return <p className="journal-empty">{children}</p>;
}

export function journalDate(date: string, language: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(
    language === 'it' ? 'it-IT' : 'en-GB',
    options ?? { day: 'numeric', month: 'short' },
  );
}
