import { X } from 'lucide-react';
import { clearStorageError, useStorageStatus, type StorageErrorKind } from '../../storage/status';
import { useSettings } from '../../context/AppContext';

const TEXT: Record<'en' | 'it', Record<StorageErrorKind, string>> = {
  en: {
    quota: 'Your device storage is full, so the latest change could not be saved. Export a backup and free some space.',
    unavailable: 'Browser storage is unavailable (private mode?). Changes will be lost when you close the app.',
    failed: 'The latest change could not be saved. Export a backup to be safe.',
  },
  it: {
    quota: 'La memoria del dispositivo e piena: l\'ultima modifica non e stata salvata. Esporta un backup e libera spazio.',
    unavailable: 'La memoria del browser non e disponibile (navigazione privata?). Le modifiche andranno perse alla chiusura.',
    failed: 'Non e stato possibile salvare l\'ultima modifica. Esporta un backup per sicurezza.',
  },
};

/** Failed saves are reported, never swallowed (storage review item 3). Fed by `src/storage/status.ts`. */
export function StorageNotice() {
  const { error } = useStorageStatus();
  const { language } = useSettings();
  if (!error) return null;
  return (
    <div
      role="alert"
      className="kc-danger-btn fixed inset-x-3 top-[calc(0.5rem+env(safe-area-inset-top))] z-[2147483000] mx-auto max-w-lg rounded-2xl bg-[#F6D0D0] px-4 py-3 text-xs font-bold text-[#7A2727] shadow-lg flex items-start gap-3"
    >
      <span className="flex-1">{TEXT[language][error]}</span>
      <button type="button" onClick={clearStorageError} aria-label="Dismiss" className="pressable shrink-0 rounded-full p-1">
        <X size={14} />
      </button>
    </div>
  );
}
