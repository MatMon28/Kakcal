import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Download, Upload, Images, LoaderCircle, FileSpreadsheet, TriangleAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/formatters';
import { isAndroidApp, JournalDevice } from '../../utils/android';
import { Collapsible } from './Collapsible';
import { useMealJournal } from '../../utils/journalStore';
import { exportMealPictures } from '../../utils/photoExport';
import { saveLocalFile } from '../../utils/planSharing';
import { useJournalText } from '../../i18n/journal';
import { buildExcelExport } from '../../utils/excelExport';
import { useMealSlots } from '../../utils/mealSlots';
import { StorageInfo } from './StorageInfo';
import { getLastImportReport } from '../../utils/backupFormat';

/** Local JSON backup controls (a collapsible Settings group, like the others). Kept in Settings so Statistics stays focused on charts. */
export const DataBackup: React.FC = () => {
  const { exportDataJson, importDataJson, allDayLogs, userProfile, t } = useApp();
  const { label: slotLabel } = useMealSlots();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const { photos } = useMealJournal();
  const j = useJournalText();
  const [exportingPhotos, setExportingPhotos] = useState(false);
  // Shown before exporting when pictures exist on this device: the backup does not contain them.
  const [confirmExport, setConfirmExport] = useState(false);
  const { plans } = useMealJournal();
  const handleExcelExport = async () => {
    setMessage(null);
    try {
      const blob = buildExcelExport({ dayLogs: allDayLogs, profile: userProfile, plans, slotLabel, text: j });
      const saved = await saveLocalFile(blob, `kakcal_data_${getTodayDateString()}.xlsx`);
      if (!saved) return;
      setMessage({ text: j('Excel file exported: days, foods, activities, water and meal plans.', 'File Excel esportato: giorni, alimenti, attivita, acqua e pasti pianificati.'), error: false });
    } catch { setMessage({ text: j('Could not export the Excel file. Check device storage and try again.', 'Impossibile esportare il file Excel. Controlla lo spazio e riprova.'), error: true }); }
  };
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

  const picturesNote = j(
    'Pictures are not included in this backup. Keep the originals, or use "Export meal pictures" below.',
    'Le foto non sono incluse in questo backup. Conserva gli originali oppure usa "Esporta le foto dei pasti" qui sotto.',
  );

  const handleExport = async () => {
    setConfirmExport(false);
    if (isAndroidApp()) {
      setMessage(null);
      try {
        await JournalDevice.exportBackup({ json: await exportDataJson() });
        setMessage({ text: picturesNote, error: false });
      }
      catch { setMessage({ text: t.history.exportError, error: true }); }
      return;
    }
    let json: string;
    try { json = await exportDataJson(); }
    catch { setMessage({ text: t.history.exportError, error: true }); return; }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `kakcal_backup_${getTodayDateString()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage({ text: `${j('Backup saved.', 'Backup salvato.')} ${picturesNote}`, error: false });
  };

  // With pictures on the device the user has to confirm once that the file will not contain them.
  const handleExportClick = () => {
    setMessage(null);
    if (photos.length > 0) setConfirmExport(true);
    else void handleExport();
  };

  const importMessage = (): string => {
    const report = getLastImportReport();
    let text: string = t.history.importSuccess;
    if (!report) return text;
    if (report.picturesInFile) return text;
    text += ` ${j('Pictures are not part of a backup.', 'Le foto non fanno parte del backup.')}`;
    if (report.notesRestored > 0)
      text += ` ${j(`${report.notesRestored} picture note(s) were re-attached to pictures on this device.`, `${report.notesRestored} note delle foto sono state ricollegate alle foto presenti su questo dispositivo.`)}`;
    if (report.notesWithoutPicture > 0)
      text += ` ${j(`${report.notesWithoutPicture} picture note(s) were skipped because the picture is not on this device.`, `${report.notesWithoutPicture} note di foto sono state saltate perche la foto non e su questo dispositivo.`)}`;
    return text;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      void (content.length > 0 ? importDataJson(content) : Promise.resolve(false)).then((ok) => {
        setMessage({
          text: ok ? importMessage() : t.history.importError,
          error: !ok,
        });
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
      <div role="note" className="p-2.5 rounded-xl text-xs font-bold flex items-start gap-2 bg-[#FFE9B8] text-[#6B4A00]">
        <TriangleAlert size={15} className="shrink-0 mt-0.5" />
        <span>{j(
          'The backup contains all your data (meals, recipes, plans, shopping lists, settings, favourites...) but NOT your pictures. Export the pictures separately if you want to keep them.',
          'Il backup contiene tutti i tuoi dati (pasti, ricette, piani, liste della spesa, impostazioni, preferiti...) ma NON le tue foto. Esporta le foto separatamente se vuoi conservarle.',
        )}</span>
      </div>
      {confirmExport && (
        <div role="alertdialog" aria-label={j('Pictures are not included', 'Foto non incluse')} className="p-3 rounded-xl text-xs bg-[#FFD98A] text-[#4F3500] flex flex-col gap-2">
          <strong className="flex items-center gap-1.5"><TriangleAlert size={15} />{j('Pictures are not included', 'Foto non incluse')}</strong>
          <span>{j(
            `You have ${photos.length} picture(s) on this device. They will NOT be in the backup file. Use "Export meal pictures" to save them separately.`,
            `Hai ${photos.length} foto su questo dispositivo. NON saranno nel file di backup. Usa "Esporta le foto dei pasti" per salvarle separatamente.`,
          )}</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void handleExport()} className="pressable py-2 rounded-xl bg-[#174A2B] text-white font-extrabold">{j('Export without pictures', 'Esporta senza foto')}</button>
            <button type="button" onClick={() => setConfirmExport(false)} className="pressable py-2 rounded-xl bg-white/70 text-[#4F3500] font-extrabold">{j('Cancel', 'Annulla')}</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleExportClick}
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
      <button type="button" className="backup-photo-button" onClick={() => void handleExcelExport()}>
        <FileSpreadsheet size={18} />
        <span><strong>{j('Export to Excel', 'Esporta in Excel')}</strong><small>{j('Days, foods, activities, water and plans (.xlsx)', 'Giorni, alimenti, attivita, acqua e piani (.xlsx)')}</small></span>
        <Download size={16} />
      </button>
      <button type="button" className="backup-photo-button" disabled={!photos.length || exportingPhotos} onClick={() => void handlePhotoExport()}>
        {exportingPhotos ? <LoaderCircle size={18} className="animate-spin" /> : <Images size={18} />}
        <span><strong>{j('Export meal pictures', 'Esporta le foto dei pasti')}</strong><small>{j('Standard photos + notes in a ZIP', 'Foto standard e note in uno ZIP')} ({photos.length})</small></span>
        <Download size={16} />
      </button>
      <StorageInfo />
    </Collapsible>
  );
};
