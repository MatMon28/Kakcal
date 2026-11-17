import React from 'react';
import { useApp } from '../../context/AppContext';
import { X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, hideToast, t } = useApp();
  if (!toast) return null;
  return (
    <div className="fixed left-0 right-0 bottom-24 sm:bottom-28 z-50 flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        className="pointer-events-auto max-w-sm w-full bg-[var(--text)] text-[var(--surface)] rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-lg"
      >
        <span className="text-sm font-bold">{toast.message}</span>
        <span className="flex items-center gap-1.5 shrink-0">
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                hideToast();
              }}
              className="px-3 py-1 rounded-full bg-[var(--surface)] text-[var(--text)] text-xs font-extrabold"
            >
              {t.period.undo}
            </button>
          )}
          <button type="button" onClick={hideToast} className="w-7 h-7 rounded-full flex items-center justify-center opacity-80" aria-label={t.common.close}>
            <X size={14} />
          </button>
        </span>
      </div>
    </div>
  );
};
