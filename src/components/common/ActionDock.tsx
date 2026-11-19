import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface DockAction {
  id: string;
  icon: ReactNode;
  label: string;
  title?: string;
  tone: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
}

export function ActionDock({ label, actions }: {
  label: string;
  actions: DockAction[];
}) {
  if (!actions.length) return null;

  return createPortal(
    <div
      className="fixed bottom-[max(0.875rem,calc(env(safe-area-inset-bottom)+0.375rem))] sm:bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.375rem))] left-[env(safe-area-inset-left)] right-[env(safe-area-inset-right)] z-30 pointer-events-none flex justify-center px-3"
      data-no-swipe
    >
      <div
        role="group"
        aria-label={label}
        className="kc-dock anim-dock pointer-events-auto bg-[var(--surface)] border border-[var(--border)] shadow-lg shadow-black/10 rounded-full p-1.5 flex items-center gap-1 sm:gap-1.5 max-w-full overflow-x-auto no-scrollbar"
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            title={action.title ?? action.label}
            aria-label={action.label}
            aria-pressed={action.pressed}
            disabled={action.disabled}
            className={`kc-dock-btn pressable size-12 min-[390px]:size-[3.25rem] shrink-0 rounded-full flex items-center justify-center [&_svg]:size-[22px] enabled:hover:brightness-95 disabled:opacity-50 ${action.tone}`}
          >
            {action.icon}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
