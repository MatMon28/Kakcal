import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  clearLabel?: string;
  autoFocus?: boolean;
  onClear?: () => void;
  onEscape?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

/** Shared rounded-2xl search bar with leading icon, clear button, and keyboard focus-visible ring. */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
  clearLabel = 'Clear',
  autoFocus = false,
  onClear,
  onEscape,
  inputRef,
  className = '',
}) => {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
      inputRef?.current?.focus();
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <Search
        size={15}
        aria-hidden="true"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
      />
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        type="text"
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && onEscape) {
            event.stopPropagation();
            onEscape();
          }
        }}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="w-full h-[42px] bg-[var(--inset)] rounded-2xl border border-[var(--border)] pl-9 pr-9 text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] focus-visible:outline-2 focus-visible:outline-[var(--muted)] focus-visible:outline-offset-1 transition-colors"
      />
      {(value.length > 0 || onClear) && (
        <button
          type="button"
          onClick={handleClear}
          aria-label={clearLabel}
          className="pressable absolute right-2 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
