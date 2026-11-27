import React, { useMemo, useState } from 'react';
import { Check, Download, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useJournalText } from '../../i18n/journal';
import type { DayLog } from '../../types';
import { addDaysToDateString, getTodayDateString } from '../../utils/formatters';
import { countPdfDaysWithLogs, type PdfDateRange, type PdfExportOptions } from '../../utils/pdfExport';

type PdfPeriodPreset = '7d' | '30d' | 'custom';

export interface PdfExportSelection {
  dateRange: PdfDateRange;
  options: PdfExportOptions;
  filenameSuffix: string;
}

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayLogs: Record<string, DayLog>;
  onExport: (selection: PdfExportSelection) => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  dayLogs,
  onExport,
}) => {
  const j = useJournalText();
  const today = getTodayDateString();
  const [preset, setPreset] = useState<PdfPeriodPreset>('7d');
  const [customFrom, setCustomFrom] = useState(() => addDaysToDateString(today, -29));
  const [customTo, setCustomTo] = useState(today);
  const [includeDailyLog, setIncludeDailyLog] = useState(true);
  const [includeMealDiary, setIncludeMealDiary] = useState(true);

  const dateRange = useMemo<PdfDateRange>(() => {
    switch (preset) {
      case '7d': return { from: addDaysToDateString(today, -6), to: today };
      case '30d': return { from: addDaysToDateString(today, -29), to: today };
      case 'custom':
        return customFrom <= customTo ? { from: customFrom, to: customTo } : { from: customTo, to: customFrom };
    }
  }, [preset, customFrom, customTo, today]);

  const loggedDaysCount = useMemo(() => countPdfDaysWithLogs(dayLogs, dateRange), [dayLogs, dateRange]);

  const presets: [PdfPeriodPreset, string][] = [
    ['7d', j('7 days', '7 giorni')],
    ['30d', j('30 days', '30 giorni')],
    ['custom', j('Custom', 'Personalizzato')],
  ];

  const handleConfirm = () => {
    onExport({
      dateRange,
      options: { includeDailyLog, includeMealDiary },
      filenameSuffix: `${dateRange.from}_${dateRange.to}`,
    });
  };

  const toggles: { id: string; checked: boolean; onToggle: () => void; label: string; desc: string }[] = [
    {
      id: 'daily-log',
      checked: includeDailyLog,
      onToggle: () => setIncludeDailyLog((v) => !v),
      label: j('Daily log table', 'Tabella riepilogo giornaliero'),
      desc: j('Weight, calories, macros, water and activity per day', 'Peso, calorie, macro, acqua e attivita per giorno'),
    },
    {
      id: 'meal-diary',
      checked: includeMealDiary,
      onToggle: () => setIncludeMealDiary((v) => !v),
      label: j('Detailed meal diary', 'Diario dettagliato dei pasti'),
      desc: j('Every logged food, portion, macros and meal notes', 'Ogni alimento, porzione, macro e note dei pasti'),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={j('Export PDF report', 'Esporta report PDF')}
      subtitle={j('Clinical & personal summary with optional daily tables.', 'Riepilogo clinico e personale con tabelle opzionali.')}
      maxWidth="max-w-md"
      footer={
        <button
          type="button"
          onClick={handleConfirm}
          className="pressable w-full py-3 rounded-2xl bg-intake hover:bg-intake-hover text-intake-ink font-extrabold text-sm flex items-center justify-center gap-2"
        >
          <FileText size={16} />
          <span>{j('Export .pdf', 'Esporta .pdf')}</span>
          <Download size={15} />
        </button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
              {j('Period', 'Periodo')}
            </span>
            <span className="text-[11px] font-bold text-[var(--muted)] tabular-nums">
              {j(`${loggedDaysCount} day(s) with logs`, `${loggedDaysCount} giorni con dati`)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={j('Period', 'Periodo')}>
            {presets.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={preset === id}
                onClick={() => setPreset(id)}
                className={`pressable px-3 py-1.5 rounded-full text-xs font-extrabold border ${
                  preset === id
                    ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="space-y-1 text-[11px] font-bold text-[var(--muted)]">
                <span>{j('From', 'Da')}</span>
                <input
                  type="date"
                  aria-label={j('From', 'Da')}
                  value={customFrom}
                  onChange={(e) => e.target.value && setCustomFrom(e.target.value)}
                  className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text)] focus:outline-none focus:border-[var(--muted)]"
                />
              </label>
              <label className="space-y-1 text-[11px] font-bold text-[var(--muted)]">
                <span>{j('To', 'A')}</span>
                <input
                  type="date"
                  aria-label={j('To', 'A')}
                  value={customTo}
                  onChange={(e) => e.target.value && setCustomTo(e.target.value)}
                  className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text)] focus:outline-none focus:border-[var(--muted)]"
                />
              </label>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
            {j('Sections to include', 'Sezioni da includere')}
          </span>
          <div className="rounded-2xl px-3 py-2 bg-[var(--inset)] border border-[var(--border)]">
            <span className="block text-xs font-extrabold text-[var(--text)]">
              {j('Page 1: Clinical & weight summary', 'Pagina 1: Riepilogo clinico e peso')}
            </span>
            <span className="block text-[10px] font-medium text-[var(--muted)]">
              {j('Always included (KPIs, macros, intake vs target, weight evolution)', 'Sempre inclusa (medie, macro, assunzione vs obiettivo, peso)')}
            </span>
          </div>
          <div className="space-y-1.5">
            {toggles.map((item) => (
              <button
                key={item.id}
                type="button"
                role="checkbox"
                aria-checked={item.checked}
                onClick={item.onToggle}
                className={`pressable w-full flex items-center justify-between gap-2.5 rounded-2xl px-3 py-2 text-left border transition-colors ${
                  item.checked
                    ? 'bg-[var(--inset)] border-[var(--text)]/25'
                    : 'bg-[var(--inset)]/60 border-[var(--border)] opacity-70'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    aria-hidden="true"
                    className={`size-5 rounded-md flex items-center justify-center shrink-0 border ${
                      item.checked
                        ? 'bg-[var(--text)] border-[var(--text)] text-[var(--on-text)]'
                        : 'bg-[var(--surface)] border-[var(--border)]'
                    }`}
                  >
                    {item.checked && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-extrabold text-[var(--text)] truncate">{item.label}</span>
                    <span className="block text-[10px] font-medium text-[var(--muted)] truncate">{item.desc}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
