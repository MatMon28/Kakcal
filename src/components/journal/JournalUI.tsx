import { useState, type ReactNode } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useJournalText } from '../../i18n/journal';

export function JournalSection({
  tone,
  icon,
  title,
  subtitle,
  actions,
  children,
  className = '',
  defaultOpen = true,
}: {
  tone: 'yellow' | 'blue' | 'red';
  icon: ReactNode;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { settings } = useApp();
  const j = useJournalText();
  return (
    <section
      className={`journal-feature ${className}`}
      data-library-section={`journal-${tone}`}
      data-tone={tone}
      data-minimal={settings.ultraMinimal || undefined}
    >
      <header className="journal-section-heading">
        <button
          type="button"
          className="journal-section-title"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`${title}: ${j('expand or collapse', 'espandi o comprimi')}`}
        >
          <span className="journal-section-icon">{icon}</span>
          <span>
            <h2>{title}</h2>
            <span className="journal-section-description">{subtitle}</span>
          </span>
        </button>
        <div className="journal-heading-actions">
          {actions}
          <button
            type="button"
            className="journal-icon-button"
            aria-label={`${j('Toggle', 'Apri o chiudi')} ${title}`}
            onClick={() => setOpen(!open)}
          >
            <ChevronDown size={17} className={open ? 'journal-chevron is-open' : 'journal-chevron'} />
          </button>
        </div>
      </header>
      <div className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <div className="journal-section-body">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function JournalSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
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
