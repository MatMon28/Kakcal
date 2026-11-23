import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Download, Upload, Images, LoaderCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/formatters';
import { isAndroidApp, JournalDevice } from '../../utils/android';
import { Collapsible } from './Collapsible';
import { useMealJournal } from '../../utils/journalStore';
import { exportMealPictures } from '../../utils/photoExport';
import { saveLocalFile } from '../../utils/planSharing';
import { useJournalText } from '../../i18n/journal';

/** Local JSON backup controls (a collapsible Settings group, like the others). Kept in Settings so Statistics stays focused on charts. */
export const DataBackup: React.FC = () => {
  const { exportDataJson, importDataJson, t } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const { photos } = useMealJournal();
  const j = useJournalText();
  const [exportingPhotos, setExportingPhotos] = useState(false);
  const handlePhotoExport = async () => {
    setExportingPhotos(true); setMessage(null);
    try {
      const blob = await exportMealPictures(photos);
      const saved = await saveLocalFile(blob, `kakcal_meal_pictures_${getTodayDateString()}.zip`);
      if (!saved) return;
      setMessage({ text: j(`${photos.length} pictures exported with their notes.`, `${photos.length} foto esportate con le note.`), error: false });
    } catch { setMessage({ text: j('Could not export pictures. Check device storage and try again.', 'Impossibile esportare le foto. Controlla lo spazio e riprova.'), error: true }); }
    finally { setExportingPhotos(false); }
  };

  const handleExport = async () => {
    if (isAndroidApp()) {
      setMessage(null);
      try { await JournalDevice.exportBackup({ json: exportDataJson() }); }
      catch { setMessage({ text: t.history.exportError, error: true }); }
      return;
    }
    const blob = new Blob([exportDataJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `kakcal_backup_${getTodayDateString()}.json`;
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
    <Collapsible title={t.history.backupTitle}>
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
      <button type="button" className="backup-photo-button" disabled={!photos.length || exportingPhotos} onClick={() => void handlePhotoExport()}>
        {exportingPhotos ? <LoaderCircle size={18} className="animate-spin" /> : <Images size={18} />}
        <span><strong>{j('Export meal pictures', 'Esporta le foto dei pasti')}</strong><small>{j('Standard photos + notes in a ZIP', 'Foto standard e note in uno ZIP')} ({photos.length})</small></span>
        <Download size={16} />
      </button>
    </Collapsible>
  );
};
