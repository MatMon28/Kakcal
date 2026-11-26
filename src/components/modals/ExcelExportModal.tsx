import React, { useMemo, useState } from 'react';
import { Check, Download, FileSpreadsheet } from 'lucide-react';
import { Modal } from '../common/Modal';
import { addDaysToDateString, getTodayDateString } from '../../utils/formatters';
import {
  ALL_EXCEL_SHEETS,
  countExcelRecords,
  type ExcelDateRange,
  type ExcelExportInput,
  type ExcelSheetId,
} from '../../utils/excelExport';
import { useJournalText } from '../../i18n/journal';

type PeriodPreset = 'all' | '7d' | '30d' | '3m' | '1y' | 'custom';

function monthsAgo(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1 - months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
}

export interface ExcelExportSelection {
  dateRange?: ExcelDateRange;
  sheets: Partial<Record<ExcelSheetId, boolean>>;
  filenameSuffix: string;
}

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportInput: Omit<ExcelExportInput, 'text' | 'slotLabel' | 'dateRange' | 'sheets'>;
  onExport: (selection: ExcelExportSelection) => void;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  exportInput,
  onExport,
}) => {
  const j = useJournalText();
  const today = getTodayDateString();
  const [preset, setPreset] = useState<PeriodPreset>('all');
  const [customFrom, setCustomFrom] = useState(() => addDaysToDateString(today, -29));
  const [customTo, setCustomTo] = useState(today);

  const dateRange = useMemo<ExcelDateRange | undefined>(() => {
    switch (preset) {
      case 'all': return undefined;
      case '7d': return { from: addDaysToDateString(today, -6), to: today };
      case '30d': return { from: addDaysToDateString(today, -29), to: today };
      case '3m': return { from: monthsAgo(today, 3), to: today };
      case '1y': return { from: monthsAgo(today, 12), to: today };
      case 'custom':
        return customFrom <= customTo ? { from: customFrom, to: customTo } : { from: customTo, to: customFrom };
    }
  }, [preset, customFrom, customTo, today]);

  const counts = useMemo(() => countExcelRecords(exportInput, dateRange), [exportInput, dateRange]);

  const [selected, setSelected] = useState<Record<ExcelSheetId, boolean>>(() => {
    const initialCounts = countExcelRecords(exportInput, undefined);
    return {
      summary: true,
      days: true,
      foods: true,
      activities: true,
      water: true,
      poop: initialCounts.poop > 0,
      customTrackers: initialCounts.customTrackers > 0,
      mealNotes: initialCounts.mealNotes > 0,
      plans: initialCounts.plans > 0,
      savedLibrary: initialCounts.savedLibrary > 0,
      body: initialCounts.body > 0,
      period: initialCounts.period > 0,
      fasting: initialCounts.fasting > 0,
    };
  });

  const selectedCount = ALL_EXCEL_SHEETS.filter((id) => selected[id]).length;
  const allSelected = selectedCount === ALL_EXCEL_SHEETS.length;

  const sheetMeta: Record<ExcelSheetId, { label: string; desc: string }> = {
    summary: { label: j('Summary & formulas', 'Riepilogo e formule'), desc: j('Averages, totals, macro %, profile', 'Medie, totali, % macro, profilo') },
    days: { label: j('Days overview', 'Riepilogo giorni'), desc: j('Daily calories, macros, water, weight', 'Calorie, macro, acqua e peso per giorno') },
    foods: { label: j('Logged foods', 'Alimenti registrati'), desc: j('Every food item & macro by meal', 'Ogni alimento e macro per pasto') },
    activities: { label: j('Activities', 'Attivita'), desc: j('Workouts, duration, distance, kcal', 'Allenamenti, durata, distanza, kcal') },
    water: { label: j('Water', 'Acqua'), desc: j('Timestamped hydration logs', 'Voci idratazione con orario') },
    poop: { label: j('Poop', 'Poop'), desc: j('Size, Bristol type & notes', 'Quantita, tipo Bristol e note') },
    customTrackers: { label: j('Custom trackers', 'Tracciatori personalizzati'), desc: j('Toggles & quantity entries', 'Interruttori e quantita') },
    mealNotes: { label: j('Meal notes', 'Note pasti'), desc: j('Diary notes & favourites', 'Note del diario e preferiti') },
    plans: { label: j('Meal plans', 'Pasti pianificati'), desc: j('Planned meals & ingredients', 'Pasti pianificati e ingredienti') },
    savedLibrary: { label: j('Saved meals & recipes', 'Pasti e ricette salvate'), desc: j('Library nutrition & ingredients', 'Valori e ingredienti salvati') },
    body: { label: j('Body measurements', 'Misure del corpo'), desc: j('Measurements over time', 'Misure registrate nel tempo') },
    period: { label: j('Period & cycle', 'Ciclo mestruale'), desc: j('Flow, pill, moods & symptoms', 'Flusso, pillola, umore e sintomi') },
    fasting: { label: j('Intermittent fasting', 'Digiuno intermittente'), desc: j('Sessions, durations & fast notes', 'Sessioni, durate e note') },
  };

  const presets: [PeriodPreset, string][] = [
    ['all', j('All time', 'Tutto')],
    ['7d', j('7 days', '7 giorni')],
    ['30d', j('30 days', '30 giorni')],
    ['3m', j('3 months', '3 mesi')],
    ['1y', j('1 year', '1 anno')],
    ['custom', j('Custom', 'Personalizzato')],
  ];

  const handleConfirm = () => {
    const filenameSuffix = dateRange?.from && dateRange?.to
      ? `${dateRange.from}_${dateRange.to}`
      : today;
    onExport({ dateRange, sheets: selected, filenameSuffix });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={j('Export to Excel', 'Esporta in Excel')}
      subtitle={j('Choose the period and the sheets to include.', 'Scegli il periodo e i fogli da includere.')}
      maxWidth="max-w-md"
      footer={
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={handleConfirm}
          className="pressable w-full py-3 rounded-2xl bg-[#174A2B] hover:bg-[#1E5E3A] text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-45 disabled:pointer-events-none"
        >
          <FileSpreadsheet size={16} />
          <span>{j(`Export .xlsx (${selectedCount})`, `Esporta .xlsx (${selectedCount})`)}</span>
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
              {j(`${counts.days} day(s) with logs`, `${counts.days} giorni con dati`)}
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
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
              {j('Information to export', 'Informazioni da esportare')}
            </span>
            <button
              type="button"
              onClick={() => {
                const nextVal = !allSelected;
                setSelected(Object.fromEntries(ALL_EXCEL_SHEETS.map((id) => [id, nextVal])) as Record<ExcelSheetId, boolean>);
              }}
              className="pressable text-[11px] font-extrabold text-[var(--text)] px-2 py-0.5 rounded-lg bg-[var(--inset)] hover:bg-[var(--hover)]"
            >
              {allSelected ? j('Clear all', 'Deseleziona tutto') : j('Select all', 'Seleziona tutto')}
            </button>
          </div>
          <div className="space-y-1.5">
            {ALL_EXCEL_SHEETS.map((id) => {
              const on = selected[id];
              const info = sheetMeta[id];
              const count = counts[id];
              return (
                <button
                  key={id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setSelected((prev) => ({ ...prev, [id]: !prev[id] }))}
                  className={`pressable w-full flex items-center justify-between gap-2.5 rounded-2xl px-3 py-2 text-left border transition-colors ${
                    on
                      ? 'bg-[var(--inset)] border-[var(--text)]/25'
                      : 'bg-[var(--inset)]/60 border-[var(--border)] opacity-70'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`size-5 rounded-md flex items-center justify-center shrink-0 border ${
                        on
                          ? 'bg-[#174A2B] border-[#174A2B] text-white'
                          : 'bg-[var(--surface)] border-[var(--border)]'
                      }`}
                    >
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-extrabold text-[var(--text)] truncate">{info.label}</span>
                      <span className="block text-[10px] font-medium text-[var(--muted)] truncate">{info.desc}</span>
                    </span>
                  </span>
                  {id !== 'summary' && (
                    <span className="text-[11px] font-extrabold tabular-nums text-[var(--muted)] shrink-0 px-2 py-0.5 rounded-full bg-[var(--surface)]">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
