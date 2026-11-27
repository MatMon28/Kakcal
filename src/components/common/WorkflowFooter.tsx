import { Check, Plus } from 'lucide-react';

/** The dialog body can scroll without moving the two workflow actions. */
export function WorkflowFooter({ primary, onPrimary, disabled, more, onMore, moreDisabled }: {
  primary: string;
  onPrimary: () => void;
  disabled?: boolean;
  more?: string;
  onMore?: () => void;
  moreDisabled?: boolean;
}) {
  return (
    <div data-workflow-footer className={`grid gap-2 ${onMore ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {onMore && (
        <button type="button" onClick={onMore} disabled={moreDisabled} className="pressable min-h-11 min-w-0 py-2 px-2 rounded-2xl border border-[var(--border)] bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40">
          <Plus size={16} className="shrink-0" /> {more}
        </button>
      )}
      <button type="button" onClick={onPrimary} disabled={disabled} className="kc-primary-btn pressable min-h-11 min-w-0 py-2 px-2 rounded-2xl bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40">
        <Check size={16} className="shrink-0" /> {primary}
      </button>
    </div>
  );
}
