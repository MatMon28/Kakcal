import { useState, type ReactNode } from 'react';
import { ChevronUp } from 'lucide-react';
import { useJournalText } from '../../i18n/journal';

/** Recent foods shown at first. */
export const RECENT_SHOWN = 5;
/** Further recent foods revealed by the "..." chip. Callers hand over at most `RECENT_SHOWN + RECENT_MORE` items. */
export const RECENT_MORE = 10;

/**
 * Recent-food chips shared by Log food and the meal planner: the 5 newest foods, then a "..." chip that reveals the
 * next 10 (the chevron that replaces it folds them away again). Nothing is rendered for an empty list and no "..."
 * chip is rendered when there is nothing more to show. The caller supplies the chip markup so each place keeps its
 * own look.
 */
export function RecentChips<T>({
  items,
  getKey,
  renderChip,
  className = 'flex flex-wrap gap-1.5',
  toggleClassName,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderChip: (item: T) => ReactNode;
  className?: string;
  /** Class of the "..." / chevron chip (normally the same as the food chips). */
  toggleClassName: string;
}) {
  const j = useJournalText();
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const visible = expanded ? items.slice(0, RECENT_SHOWN + RECENT_MORE) : items.slice(0, RECENT_SHOWN);
  const hasMore = items.length > RECENT_SHOWN;
  const label = expanded ? j('Show fewer recent foods', 'Mostra meno alimenti recenti') : j('Show more recent foods', 'Mostra altri alimenti recenti');
  return (
    <div className={className} data-recent-chips data-expanded={expanded}>
      {visible.map((item) => (
        <span key={getKey(item)} className="contents">
          {renderChip(item)}
        </span>
      ))}
      {hasMore && (
        <button
          type="button"
          data-recent-more
          aria-expanded={expanded}
          aria-label={label}
          title={label}
          className={toggleClassName}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={14} /> : '...'}
        </button>
      )}
    </div>
  );
}
