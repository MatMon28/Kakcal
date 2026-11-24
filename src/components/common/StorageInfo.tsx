import { useCallback, useEffect, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { readStorageInfo, requestPersistentStorage, type StorageInfo as Info } from '../../storage/photoStore';
import { useSettings } from '../../context/AppContext';

const mb = (bytes: number | null) => (bytes === null ? '?' : `${(bytes / 1024 / 1024).toFixed(bytes > 1e8 ? 0 : 1)} MB`);

/**
 * Storage information (storage review item 4). Browser quotas differ per browser, device and free disk space,
 * so this shows what the browser reports and never claims a fixed photo limit.
 */
export function StorageInfo() {
  const { language } = useSettings();
  const it = language === 'it';
  const [info, setInfo] = useState<Info | null>(null);
  const refresh = useCallback(() => { void readStorageInfo().then(setInfo); }, []);
  useEffect(refresh, [refresh]);
  if (!info) return null;
  return (
    <div className="mt-2 rounded-xl bg-[var(--inset)] border border-[var(--border)] p-3 text-xs font-medium text-[var(--muted)] space-y-1.5">
      <p className="flex items-center gap-1.5 font-extrabold text-[var(--text)]"><HardDrive size={14} />{it ? 'Memoria' : 'Storage'}</p>
      <p>
        {it ? 'Usata dal browser' : 'Used by this app'}: <strong>{mb(info.usage)}</strong>
        {info.quota !== null && <> {it ? 'di circa' : 'of about'} {mb(info.quota)} {it ? '(stima del browser, puo cambiare)' : '(browser estimate, can change)'}</>}
      </p>
      <p>{it ? 'Foto salvate' : 'Stored photos'}: <strong>{info.photoCount}</strong> ({mb(info.photoBytes)})</p>
      {info.persisted === false && (
        <button
          type="button"
          className="pressable mt-1 rounded-lg bg-[var(--text)] px-3 py-1.5 text-[11px] font-extrabold text-[var(--on-text)]"
          onClick={() => { void requestPersistentStorage().then(refresh); }}
        >
          {it ? 'Proteggi i dati dalla pulizia automatica' : 'Protect data from automatic clean-up'}
        </button>
      )}
      {info.persisted === true && <p>{it ? 'Dati protetti dalla pulizia automatica.' : 'Data is protected from automatic clean-up.'}</p>}
    </div>
  );
}
