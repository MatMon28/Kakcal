import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div
        className={`relative w-full ${maxWidth} max-h-[92vh] sm:max-h-[86vh] flex flex-col bg-[var(--surface)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl z-10 overflow-hidden`}
      >
        <div className="w-full flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1.5 bg-[var(--border)] rounded-full" />
        </div>

        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[var(--text)] tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs font-medium text-[var(--muted)] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-[var(--inset)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto overscroll-contain flex-1 text-[var(--text)]">
          {children}
        </div>
      </div>
    </div>
  );
};
