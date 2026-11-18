import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Download, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/formatters';

/** Local JSON backup controls. Kept in Settings so Statistics stays focused on charts. */
export const DataBackup: React.FC = () => {
  const { exportDataJson, importDataJson, t } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const handleExport = () => {
    const blob = new Blob([exportDataJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `kakcalculator_backup_${getTodayDateString()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const ok = content.length > 0 && importDataJson(content);
      setMessage({
        text: ok ? t.history.importSuccess : t.history.importError,
        error: !ok,
      });
    };
    reader.onerror = () => setMessage({ text: t.history.importError, error: true });
    reader.readAsText(file);
  };

  return (
    <section aria-label={t.history.backupTitle} className="bg-[var(--inset)] rounded-2xl p-3 space-y-2.5">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
        {t.history.backupTitle}
      </h3>
      {message && (
        <div
          role={message.error ? 'alert' : 'status'}
          className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
            message.error ? 'bg-[#F6D0D0] text-[#7A2727]' : 'bg-[#C9EFD3] text-[#174A2B]'
          }`}
        >
          {message.error ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
          <span>{message.text}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="pressable py-2.5 px-2 rounded-xl bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold text-xs flex items-center justify-center gap-1.5"
        >
          <Download size={15} />
          <span>{t.history.exportBtn}</span>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="pressable py-2.5 px-2 rounded-xl bg-[#CFE7FE] hover:bg-[#BDDDFC] text-[#183F66] font-extrabold text-xs flex items-center justify-center gap-1.5"
        >
          <Upload size={15} />
          <span>{t.history.importBtn}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
          aria-label={t.history.importBtn}
        />
      </div>
    </section>
  );
};
