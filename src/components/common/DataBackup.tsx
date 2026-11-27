import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Download, Upload, Images, LoaderCircle, FileSpreadsheet, FileText, TriangleAlert, DatabaseBackup } from 'lucide-react';
import { TONE } from '../modals/settings/SettingsParts';
import { useApp } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/formatters';
import { isAndroidApp, type ExportResult, type NativeExportRecord } from '../../utils/android';
import { onNativeExportFinished, takeNativeExports } from '../../utils/nativeExport';
import { Collapsible } from './Collapsible';
import { useMealJournal } from '../../utils/journalStore';
import { exportMealPictures } from '../../utils/photoExport';
import { canShareFile, saveLocalFile, shareLocalFile, withSize } from '../../utils/planSharing';
import { useJournalText } from '../../i18n/journal';
import { buildExcelExport } from '../../utils/excelExport';
import { buildPdfReport } from '../../utils/pdfExport';
import { useMealSlots } from '../../utils/mealSlots';
import { StorageInfo } from './StorageInfo';
import { getLastImportReport } from '../../utils/backupFormat';
import { useAdvanced, useBodyEntries } from '../../utils/advancedStore';
import { getFasting } from '../../utils/fastingStore';
import { ExcelExportModal, type ExcelExportSelection } from '../modals/ExcelExportModal';
import { PdfExportModal, type PdfExportSelection } from '../modals/PdfExportModal';
import { SaveOrShareModal } from '../modals/SaveOrShareModal';

/** A built export file waiting for the "Save or share?" answer. */
interface PendingFile { content: Blob | string; name: string; savedText: (bytes: number) => string; failedText: string }

/** The native side puts the real failure (mode, exception class, message) in the error: keep it for the device report. */
const withDetail = (text: string, error: unknown): string => {
  const detail = (error as { message?: unknown } | null)?.message;
  return typeof detail === 'string' && detail.trim() ? `${text} (${detail.trim().slice(0, 400)})` : text;
};

/** The message for an export that finished after the app was away (same grammar: saved (size) / red error). */
const recoveredNotice = (record: NativeExportRecord | null, j: (en: string, it: string) => string): { text: string; error: boolean } | null => {
  if (!record) return null;
  if (record.status === 'saved' && typeof record.bytes === 'number' && record.bytes > 0) {
    const name = record.filename || j('the file', 'il file');
    return { text: withSize(j(`Saved after the app restarted: ${name}.`, `Salvato dopo il riavvio dell'app: ${name}.`), record.bytes), error: false };
  }
  return { text: withDetail(j('An export could not be completed after the app restarted.', "Un'esportazione non e stata completata dopo il riavvio dell'app."), { message: record.detail }), error: true };
};

/** Local JSON backup controls (a collapsible Settings group, like the others). Kept in Settings so Statistics stays focused on charts. */
export const DataBackup: React.FC = () => {
  const { exportDataJson, importDataJson, allDayLogs, userProfile, preBuiltMeals, allFoods, settings, periodData, language, t } = useApp();
  const { label: slotLabel } = useMealSlots();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const { photos, plans, memories } = useMealJournal();
  const advanced = useAdvanced();
  const bodyEntries = useBodyEntries();
  const j = useJournalText();
  const [exportingPhotos, setExportingPhotos] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  // Shown before exporting when pictures exist on this device: the backup does not contain them.
  const [confirmExport, setConfirmExport] = useState(false);
  // An export that finished while the app was away (activity re-created / process killed while the picker was open).
  const [recovered, setRecovered] = useState<NativeExportRecord | null>(null);
  useEffect(() => {
    if (!isAndroidApp()) return undefined; // the browser downloads the Blob itself; there is nothing native to recover
    let alive = true;
    const consume = () => { void takeNativeExports().then((records) => { if (alive && records.length) setRecovered(records[records.length - 1]); }); };
    consume();
    const stopListening = onNativeExportFinished(consume);
    return () => { alive = false; stopListening(); };
  }, []);

  /**
   * One path for Export JSON, Export to Excel and Export meal pictures, one message grammar:
   * saved -> "<text> (12.4 KB)"; picker closed -> nothing; failure -> the red error (with the native detail on Android).
   * A success without a byte count never reaches the screen (saveLocalFile throws instead).
   */
  const runExport = async (save: () => Promise<ExportResult>, savedText: (bytes: number) => string, failedText: string): Promise<void> => {
    setMessage(null); setRecovered(null);
    try {
      const result = await save();
      if (result.cancelled || typeof result.bytes !== 'number') return;
      setMessage({ text: savedText(result.bytes), error: false });
    } catch (error) { setMessage({ text: withDetail(failedText, error), error: true }); }
  };

  /**
   * Builds the export file first, then asks "Save or share?" (SaveOrShareModal) when this device can share it
   * (always in the APK; in a browser only when the Web Share API accepts the file type). Otherwise it is saved directly.
   */
  const offerFile = async (build: () => Blob | string | Promise<Blob | string>, name: string, savedText: (bytes: number) => string, failedText: string): Promise<void> => {
    setMessage(null); setRecovered(null);
    let content: Blob | string;
    try { content = await build(); } catch (error) { setMessage({ text: withDetail(failedText, error), error: true }); return; }
    if (canShareFile(content, name)) setPendingFile({ content, name, savedText, failedText });
    else await runExport(() => saveLocalFile(content, name), savedText, failedText);
  };
  const pendingBytes = pendingFile ? (typeof pendingFile.content === 'string' ? new Blob([pendingFile.content]).size : pendingFile.content.size) : 0;
  const savePending = () => {
    if (!pendingFile) return;
    const { content, name, savedText, failedText } = pendingFile;
    setPendingFile(null);
    void runExport(() => saveLocalFile(content, name), savedText, failedText);
  };
  // Called straight from the Share tap: shareLocalFile reaches navigator.share without an earlier await.
  const sharePending = () => {
    if (!pendingFile) return;
    const { content, name } = pendingFile;
    setPendingFile(null);
    void runExport(
      () => shareLocalFile(content, name, 'Kakcal'),
      (bytes) => withSize(j(`Sent to the share menu: ${name}.`, `Inviato al menu di condivisione: ${name}.`), bytes),
      j('Could not share the file. Update the app, or save it and share it from your files.', 'Impossibile condividere il file. Aggiorna l\'app, oppure salvalo e condividilo dai tuoi file.'),
    );
  };

  const handleExcelExport = (selection: ExcelExportSelection) => {
    setExcelModalOpen(false);
    void offerFile(
      () => buildExcelExport({
          dayLogs: allDayLogs,
          profile: userProfile,
          plans,
          slotLabel,
          text: j,
          dateRange: selection.dateRange,
          sheets: selection.sheets,
          language,
          customButtons: settings.customButtons,
          memories,
          preBuiltMeals,
          allFoods,
          bodyEntries,
          bodyConfig: advanced.body,
          periodData,
          fastingData: getFasting(),
          t,
        }),
      `kakcal_data_${selection.filenameSuffix}.xlsx`,
      (bytes) => withSize(j('Excel file exported.', 'File Excel esportato.'), bytes),
      j('Could not export the Excel file. Check device storage and try again.', 'Impossibile esportare il file Excel. Controlla lo spazio e riprova.'),
    );
  };
  const handlePdfExport = (selection: PdfExportSelection) => {
    setPdfModalOpen(false);
    void offerFile(
      () => buildPdfReport({
          dayLogs: allDayLogs,
          profile: userProfile,
          slotLabel,
          text: j,
          dateRange: selection.dateRange,
          options: selection.options,
          language,
          memories,
          bodyEntries,
          bodyConfig: advanced.body,
          settings,
        }),
      `kakcal_report_${selection.filenameSuffix}.pdf`,
      (bytes) => withSize(j('PDF report exported.', 'Report PDF esportato.'), bytes),
      j('Could not export the PDF report. Check device storage and try again.', 'Impossibile esportare il report PDF. Controlla lo spazio e riprova.'),
    );
  };
  const handlePhotoExport = async () => {
    setExportingPhotos(true);
    try {
      await offerFile(
        () => exportMealPictures(photos),
        `kakcal_meal_pictures_${getTodayDateString()}.zip`,
        (bytes) => withSize(j(`${photos.length} pictures exported with their notes.`, `${photos.length} foto esportate con le note.`), bytes),
        j('Could not export pictures. Check device storage and try again.', 'Impossibile esportare le foto. Controlla lo spazio e riprova.'),
      );
    } finally { setExportingPhotos(false); }
  };

  const picturesNote = j(
    'Pictures are not included in this backup. Keep the originals, or use "Export meal pictures" below.',
    'Le foto non sono incluse in questo backup. Conserva gli originali oppure usa "Esporta le foto dei pasti" qui sotto.',
  );

  const handleExport = async () => {
    setConfirmExport(false);
    await offerFile(
      () => exportDataJson(),
      `kakcal_backup_${getTodayDateString()}.json`,
      (bytes) => `${withSize(j('Backup saved.', 'Backup salvato.'), bytes)} ${picturesNote}`,
      t.history.exportError,
    );
  };

  // With pictures on the device the user has to confirm once that the file will not contain them.
  const handleExportClick = () => {
    setMessage(null); setRecovered(null);
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

  const notice = message ?? recoveredNotice(recovered, j);

  return (
    <Collapsible title={t.history.backupTitle} icon={<DatabaseBackup size={15} />} tone={TONE.slate}>
      {notice && (
        <div
          role={notice.error ? 'alert' : 'status'}
          className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
            notice.error ? 'kc-danger-btn bg-[#F6D0D0] text-[#7A2727]' : 'kc-modal-banner bg-[#C9EFD3] text-[#174A2B]'
          }`}
        >
          {notice.error ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
          <span>{notice.text}</span>
        </div>
      )}
      <div role="note" className="kc-modal-banner p-2.5 rounded-xl text-xs font-bold flex items-start gap-2 bg-[#FFE9B8] text-[#6B4A00]">
        <TriangleAlert size={15} className="shrink-0 mt-0.5" />
        <span>{j(
          'The backup contains all your data (meals, recipes, plans, shopping lists, settings, favourites...) but NOT your pictures. Export the pictures separately if you want to keep them.',
          'Il backup contiene tutti i tuoi dati (pasti, ricette, piani, liste della spesa, impostazioni, preferiti...) ma NON le tue foto. Esporta le foto separatamente se vuoi conservarle.',
        )}</span>
      </div>
      {confirmExport && (
        <div role="alertdialog" aria-label={j('Pictures are not included', 'Foto non incluse')} className="kc-modal-banner p-3 rounded-xl text-xs bg-[#FFD98A] text-[#4F3500] flex flex-col gap-2">
          <strong className="flex items-center gap-1.5"><TriangleAlert size={15} />{j('Pictures are not included', 'Foto non incluse')}</strong>
          <span>{j(
            `You have ${photos.length} picture(s) on this device. They will NOT be in the backup file. Use "Export meal pictures" to save them separately.`,
            `Hai ${photos.length} foto su questo dispositivo. NON saranno nel file di backup. Usa "Esporta le foto dei pasti" per salvarle separatamente.`,
          )}</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void handleExport()} className="kc-primary-btn pressable py-2 rounded-xl bg-intake hover:bg-intake-hover text-intake-ink font-extrabold">{j('Export without pictures', 'Esporta senza foto')}</button>
            <button type="button" onClick={() => setConfirmExport(false)} className="pressable py-2 rounded-xl bg-[var(--surface)] text-[var(--text)] font-extrabold">{j('Cancel', 'Annulla')}</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleExportClick}
          className="kc-primary-btn pressable py-2.5 px-2 rounded-xl bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold text-xs flex items-center justify-center gap-1.5"
        >
          <Download size={15} />
          <span>{t.history.exportBtn}</span>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="kc-action-pill pressable py-2.5 px-2 rounded-xl bg-[#CFE7FE] hover:bg-[#BDDDFC] text-[#183F66] font-extrabold text-xs flex items-center justify-center gap-1.5"
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
      <button type="button" className="backup-photo-button" onClick={() => setPdfModalOpen(true)}>
        <FileText size={18} />
        <span><strong>{j('Export PDF report', 'Esporta report PDF')}</strong><small>{j('Weekly or monthly summary for you & your doctor (.pdf)', 'Riepilogo settimanale o mensile per te e il medico (.pdf)')}</small></span>
        <Download size={16} />
      </button>
      {pdfModalOpen && (
        <PdfExportModal
          isOpen={pdfModalOpen}
          onClose={() => setPdfModalOpen(false)}
          dayLogs={allDayLogs}
          onExport={handlePdfExport}
        />
      )}
      <button type="button" className="backup-photo-button" onClick={() => setExcelModalOpen(true)}>
        <FileSpreadsheet size={18} />
        <span><strong>{j('Export to Excel', 'Esporta in Excel')}</strong><small>{j('Choose period & info to export (.xlsx)', 'Scegli periodo e dati da esportare (.xlsx)')}</small></span>
        <Download size={16} />
      </button>
      {excelModalOpen && (
        <ExcelExportModal
          isOpen={excelModalOpen}
          onClose={() => setExcelModalOpen(false)}
          exportInput={{
            dayLogs: allDayLogs,
            profile: userProfile,
            plans,
            language,
            customButtons: settings.customButtons,
            memories,
            preBuiltMeals,
            allFoods,
            bodyEntries,
            bodyConfig: advanced.body,
            periodData,
            fastingData: getFasting(),
            t,
          }}
          onExport={handleExcelExport}
        />
      )}
      <button type="button" className="backup-photo-button" disabled={!photos.length || exportingPhotos} onClick={() => void handlePhotoExport()}>
        {exportingPhotos ? <LoaderCircle size={18} className="animate-spin" /> : <Images size={18} />}
        <span><strong>{j('Export meal pictures', 'Esporta le foto dei pasti')}</strong><small>{j('Standard photos + notes in a ZIP', 'Foto standard e note in uno ZIP')} ({photos.length})</small></span>
        <Download size={16} />
      </button>
      <StorageInfo />
      {pendingFile && (
        <SaveOrShareModal filename={pendingFile.name} bytes={pendingBytes} onSave={savePending} onShare={sharePending} onClose={() => setPendingFile(null)} />
      )}
    </Collapsible>
  );
};
