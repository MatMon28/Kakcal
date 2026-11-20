import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Animated height container (same `accordion-grid` used by `Collapsible`); closed content is inert. */
export function CollapseBody({ open, id, children }: { open: boolean; id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="accordion-grid" data-open={open} inert={!open}>
      <div className="accordion-inner">{children}</div>
    </div>
  );
}

/** The small arrow that opens / closes a `CollapseBody`. */
export function CollapseArrow({ open, className = '' }: { open: boolean; className?: string }) {
  return (
    <ChevronDown
      size={16}
      aria-hidden="true"
      className={`shrink-0 text-[var(--muted)] transition-transform [transition-duration:480ms] [transition-timing-function:var(--ease-bounce)] ${open ? 'rotate-180' : ''} ${className}`}
    />
  );
}

/**
 * A titled block inside a settings group with a collapse arrow (for example the Quick add toggles in
 * Settings > Today & pages). Open by default; the content stays mounted but inert while closed.
 */
export function InlineCollapse({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={() => setOpen((value) => !value)}
        className="pressable w-full flex items-center justify-between gap-2 mb-2 text-left"
      >
        <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{label}</span>
        <CollapseArrow open={open} />
      </button>
      <CollapseBody open={open} id={`${id}-body`}>
        {children}
      </CollapseBody>
    </div>
  );
}
