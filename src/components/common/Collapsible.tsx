import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Controlled mode: pass both to let the parent open the group (e.g. the tour). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A settings group that opens and closes with a smooth height animation. Its sub-sections keep
 * their own titles when it is open. Closed content stays mounted but inert, so it cannot be
 * reached by keyboard or screen reader.
 */
export function Collapsible({ title, children, defaultOpen = false, open: controlledOpen, onOpenChange }: CollapsibleProps) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = controlledOpen ?? innerOpen;
  const setOpen = (next: (value: boolean) => boolean) => {
    const value = next(open);
    setInnerOpen(value);
    onOpenChange?.(value);
  };
  const id = useId();
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--inset)]/40 overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((value) => !value)}
        className="pressable w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">{title}</span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 text-[var(--muted)] transition-transform [transition-duration:480ms] [transition-timing-function:var(--ease-bounce)] ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div id={`${id}-panel`} className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <div className="px-4 pb-4 pt-1 space-y-5">{children}</div>
        </div>
      </div>
    </section>
  );
}
