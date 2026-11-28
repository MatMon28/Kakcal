import type {
  CustomButtonDef,
  DayLog,
  FoodItem,
  Language,
  LoggedFoodItem,
  MealSlotId,
  PeriodData,
  PoopSize,
  PreBuiltMeal,
  Settings,
  UserProfile,
} from '../types';
import type { AdvancedSettings, BodyEntries, BodySide } from '../types/advanced';
import type { FastingData } from '../types/fasting';
import type { MealMemory, MealPlan } from '../types/journal';
import type { translations } from '../i18n/translations';
import { activityLogLabel } from './activityLabel';
import { DEFAULT_MEASURES, isPairedMeasure, seriesKeysOf } from './advancedStore';
import { computeFastTiming, toLocalDateString } from './fastingStore';
import { getTodayDateString } from './formatters';
import {
  calculateBMR,
  calculateMacros,
  calculateTEF,
  calculateTotalActivityCalories,
  calculateTotalCalories,
} from './calculations';
import { getCustomEntries } from './customTrackers';
import { allMealItems } from './mealItems';
import { tagLabel } from './period';
import { zip } from './photoExport';

/**
 * Excel export (Settings > Backup): a real `.xlsx` workbook (Office Open XML) built locally, with no library and no
 * network. Reuses the store-only ZIP writer of the photo export. Supports period filtering, selective sheets,
 * OOXML styling (headers, zebra stripes, number formats, auto-filters, frozen headers), and live Excel formulas.
 */

export type ExcelSheetId =
  | 'summary'
  | 'days'
  | 'foods'
  | 'activities'
  | 'water'
  | 'poop'
  | 'customTrackers'
  | 'mealNotes'
  | 'plans'
  | 'savedLibrary'
  | 'body'
  | 'period'
  | 'fasting';

export const ALL_EXCEL_SHEETS: readonly ExcelSheetId[] = [
  'summary',
  'days',
  'foods',
  'activities',
  'water',
  'poop',
  'customTrackers',
  'mealNotes',
  'plans',
  'savedLibrary',
  'body',
  'period',
  'fasting',
];

type NumFmt = 'int' | 'dec1' | 'dec2' | 'signed' | 'pct';
type CellStyleKind = 'title' | 'section' | 'kpiLabel' | 'totalLabel' | 'plain';

export type Cell =
  | string
  | number
  | null
  | undefined
  | { date: string }
  | { value: number; numFmt?: NumFmt; bold?: boolean }
  | { formula: string; value?: number; numFmt?: NumFmt; bold?: boolean }
  | { text: string; style?: CellStyleKind };

export type Row = Cell[];

export interface Sheet {
  name: string;
  header?: string[];
  rows: Row[];
  footerRows?: Row[];
  widths?: number[];
  autoFilter?: boolean;
  freezeHeader?: boolean;
}

const STYLE = {
  TEXT: 0,
  TEXT_ALT: 1,
  HEADER: 2,
  DATE: 3,
  DATE_ALT: 4,
  INT: 5,
  INT_ALT: 6,
  DEC1: 7,
  DEC1_ALT: 8,
  DEC2: 9,
  DEC2_ALT: 10,
  SIGNED: 11,
  SIGNED_ALT: 12,
  PCT: 13,
  PCT_ALT: 14,
  TOTAL_LABEL: 15,
  TOTAL_INT: 16,
  TOTAL_DEC1: 17,
  TOTAL_DEC2: 18,
  TOTAL_SIGNED: 19,
  TITLE: 20,
  SECTION: 21,
  KPI_LABEL: 22,
  PLAIN: 23,
} as const;

const encoder = new TextEncoder();
const xmlText = (text: string) =>
  // eslint-disable-next-line no-control-regex
  text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

const xmlFormula = (formula: string) =>
  // eslint-disable-next-line no-control-regex
  formula.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);

const column = (index: number) => {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

/** Excel serial number of a `YYYY-MM-DD` date (days since 1899-12-30). */
const serial = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000) + 25569;
};

const quoteSheet = (name: string) => `'${name.replace(/'/g, "''")}'`;

function sanitizeSheetName(raw: string, used: Set<string>): string {
  // Excel forbids \ / ? * [ ] : and limits sheet names to 31 characters.
  const cleaned = (raw.replace(/[\\/?*[\]:]/g, ' ').trim() || 'Sheet').slice(0, 31).trim() || 'Sheet';
  if (!used.has(cleaned)) {
    used.add(cleaned);
    return cleaned;
  }
  for (let i = 2; i < 100; i++) {
    const suffix = ` (${i})`;
    const candidate = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  return cleaned;
}

function numStyle(fmt: NumFmt | undefined, alt: boolean, bold: boolean): number {
  if (bold) {
    switch (fmt) {
      case 'int': return STYLE.TOTAL_INT;
      case 'dec2': return STYLE.TOTAL_DEC2;
      case 'signed': return STYLE.TOTAL_SIGNED;
      case 'pct': return STYLE.PCT;
      default: return STYLE.TOTAL_DEC1;
    }
  }
  switch (fmt) {
    case 'int': return alt ? STYLE.INT_ALT : STYLE.INT;
    case 'dec2': return alt ? STYLE.DEC2_ALT : STYLE.DEC2;
    case 'signed': return alt ? STYLE.SIGNED_ALT : STYLE.SIGNED;
    case 'pct': return alt ? STYLE.PCT_ALT : STYLE.PCT;
    default: return alt ? STYLE.DEC1_ALT : STYLE.DEC1;
  }
}

function cellXml(value: Cell, ref: string, opts: { alt?: boolean; footer?: boolean; header?: boolean } = {}) {
  const alt = Boolean(opts.alt);
  const footer = Boolean(opts.footer);
  if (opts.header) {
    return `<c r="${ref}" s="${STYLE.HEADER}" t="inlineStr"><is><t xml:space="preserve">${xmlText(String(value ?? ''))}</t></is></c>`;
  }
  if (value === null || value === undefined || value === '') {
    const emptyStyle = footer ? STYLE.TOTAL_LABEL : alt ? STYLE.TEXT_ALT : STYLE.TEXT;
    return `<c r="${ref}" s="${emptyStyle}"/>`;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return `<c r="${ref}" s="${alt ? STYLE.TEXT_ALT : STYLE.TEXT}"/>`;
    const style = Number.isInteger(value) ? numStyle('int', alt, footer) : numStyle('dec1', alt, footer);
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }
  if (typeof value === 'string') {
    // Text that starts like a formula is stored as plain text (inlineStr), so nothing is evaluated.
    return `<c r="${ref}" s="${footer ? STYLE.TOTAL_LABEL : alt ? STYLE.TEXT_ALT : STYLE.TEXT}" t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
  }
  if ('date' in value) {
    return `<c r="${ref}" s="${alt ? STYLE.DATE_ALT : STYLE.DATE}"><v>${serial(value.date)}</v></c>`;
  }
  if ('text' in value) {
    const map: Record<CellStyleKind, number> = {
      title: STYLE.TITLE,
      section: STYLE.SECTION,
      kpiLabel: STYLE.KPI_LABEL,
      totalLabel: STYLE.TOTAL_LABEL,
      plain: STYLE.PLAIN,
    };
    const s = value.style ? map[value.style] : (alt ? STYLE.TEXT_ALT : STYLE.TEXT);
    return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlText(value.text)}</t></is></c>`;
  }
  if ('formula' in value) {
    const s = numStyle(value.numFmt, alt, Boolean(value.bold) || footer);
    const cached = typeof value.value === 'number' && Number.isFinite(value.value) ? `<v>${value.value}</v>` : '';
    return `<c r="${ref}" s="${s}"><f>${xmlFormula(value.formula)}</f>${cached}</c>`;
  }
  const s = numStyle(value.numFmt, alt, Boolean(value.bold) || footer);
  return Number.isFinite(value.value) ? `<c r="${ref}" s="${s}"><v>${value.value}</v></c>` : `<c r="${ref}" s="${s}"/>`;
}

function cellDisplayLength(value: Cell): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') return Math.min(48, value.length);
  if (typeof value === 'number') return String(value).length + 2;
  if ('date' in value) return 12;
  if ('text' in value) return Math.min(48, value.text.length);
  if ('formula' in value) return typeof value.value === 'number' ? String(value.value).length + 3 : 10;
  return String(value.value).length + 2;
}

function sheetXml(sheet: Sheet) {
  const hasHeader = Boolean(sheet.header && sheet.header.length > 0);
  const colCount = Math.max(
    sheet.header?.length ?? 0,
    ...sheet.rows.map((r) => r.length),
    ...(sheet.footerRows ?? []).map((r) => r.length),
    1,
  );

  const widths = Array.from({ length: colCount }, (_, i) => {
    let maxLen = sheet.header?.[i]?.length ?? 8;
    for (const r of sheet.rows) {
      if (i < r.length) maxLen = Math.max(maxLen, cellDisplayLength(r[i]));
    }
    for (const r of sheet.footerRows ?? []) {
      if (i < r.length) maxLen = Math.max(maxLen, cellDisplayLength(r[i]));
    }
    const auto = Math.min(48, Math.max(10, maxLen + 3));
    return Math.max(sheet.widths?.[i] ?? 0, auto);
  });

  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');

  let rowNum = 1;
  const rowsXml: string[] = [];
  if (hasHeader && sheet.header) {
    rowsXml.push(
      `<row r="${rowNum}" ht="24" customHeight="1">${sheet.header.map((h, i) => cellXml(h, `${column(i)}${rowNum}`, { header: true })).join('')}</row>`,
    );
    rowNum += 1;
  }

  const dataStartRow = rowNum;
  sheet.rows.forEach((row, idx) => {
    const r = rowNum++;
    const alt = hasHeader && idx % 2 === 1;
    const isTitle = row.some((c) => typeof c === 'object' && c !== null && 'text' in c && c.style === 'title');
    const ht = isTitle ? ' ht="24" customHeight="1"' : ' ht="19" customHeight="1"';
    const cells = Array.from({ length: Math.max(row.length, hasHeader ? colCount : row.length) }, (_, i) =>
      cellXml(row[i], `${column(i)}${r}`, { alt }),
    ).join('');
    rowsXml.push(`<row r="${r}"${ht}>${cells}</row>`);
  });
  const dataEndRow = Math.max(dataStartRow - 1, rowNum - 1);

  (sheet.footerRows ?? []).forEach((row) => {
    const r = rowNum++;
    const cells = Array.from({ length: colCount }, (_, i) => cellXml(row[i], `${column(i)}${r}`, { footer: true })).join('');
    rowsXml.push(`<row r="${r}" ht="21" customHeight="1">${cells}</row>`);
  });

  const freeze = sheet.freezeHeader ?? hasHeader;
  const sheetViews = freeze
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';

  const useFilter = (sheet.autoFilter ?? hasHeader) && hasHeader && colCount > 0;
  const filterEndRow = Math.max(1, dataEndRow);
  const autoFilterXml = useFilter ? `<autoFilter ref="A1:${column(colCount - 1)}${filterEndRow}"/>` : '';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    sheetViews +
    `<cols>${cols}</cols><sheetData>${rowsXml.join('')}</sheetData>${autoFilterXml}</worksheet>`
  );
}

function stylesXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="6">' +
    '<numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/>' +
    '<numFmt numFmtId="165" formatCode="#,##0"/>' +
    '<numFmt numFmtId="166" formatCode="#,##0.0"/>' +
    '<numFmt numFmtId="167" formatCode="#,##0.00"/>' +
    '<numFmt numFmtId="168" formatCode="+#,##0;-#,##0;0"/>' +
    '<numFmt numFmtId="169" formatCode="0.0%"/>' +
    '</numFmts>' +
    '<fonts count="5">' +
    '<font><sz val="11"/><color rgb="FF1A202C"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FF1A202C"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="14"/><color rgb="FF1E3A5F"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FF1E3A5F"/><name val="Calibri"/></font>' +
    '</fonts>' +
    // Excel requires fills 0 and 1 to be none and gray125.
    '<fills count="6">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1E3A5F"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF7F9FC"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE8F1FA"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDCE8F7"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="5">' +
    '<border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FFD8E0EA"/></left><right style="thin"><color rgb="FFD8E0EA"/></right><top style="thin"><color rgb="FFD8E0EA"/></top><bottom style="thin"><color rgb="FFD8E0EA"/></bottom><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FF2B4C7E"/></left><right style="thin"><color rgb="FF2B4C7E"/></right><top style="thin"><color rgb="FF2B4C7E"/></top><bottom style="medium"><color rgb="FF142842"/></bottom><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FFD8E0EA"/></left><right style="thin"><color rgb="FFD8E0EA"/></right><top style="thin"><color rgb="FF1E3A5F"/></top><bottom style="double"><color rgb="FF1E3A5F"/></bottom><diagonal/></border>' +
    '<border><left/><right/><top/><bottom style="thin"><color rgb="FF9BB4D4"/></bottom><diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="24">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center"/></xf>' + // 0 TEXT
    '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 1 TEXT_ALT
    '<xf numFmtId="0" fontId="2" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' + // 2 HEADER
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 3 DATE
    '<xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 4 DATE_ALT
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 5 INT
    '<xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 6 INT_ALT
    '<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 7 DEC1
    '<xf numFmtId="166" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 8 DEC1_ALT
    '<xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 9 DEC2
    '<xf numFmtId="167" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 10 DEC2_ALT
    '<xf numFmtId="168" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 11 SIGNED
    '<xf numFmtId="168" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 12 SIGNED_ALT
    '<xf numFmtId="169" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 13 PCT
    '<xf numFmtId="169" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 14 PCT_ALT
    '<xf numFmtId="0" fontId="1" fillId="4" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 15 TOTAL_LABEL
    '<xf numFmtId="165" fontId="1" fillId="4" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 16 TOTAL_INT
    '<xf numFmtId="166" fontId="1" fillId="4" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 17 TOTAL_DEC1
    '<xf numFmtId="167" fontId="1" fillId="4" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 18 TOTAL_DEC2
    '<xf numFmtId="168" fontId="1" fillId="4" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 19 TOTAL_SIGNED
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>' + // 20 TITLE
    '<xf numFmtId="0" fontId="4" fillId="5" borderId="4" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 21 SECTION
    '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>' + // 22 KPI_LABEL
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center"/></xf>' + // 23 PLAIN
    '</cellXfs></styleSheet>'
  );
}

function toLocalTimeString(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Builds the workbook file. Exported separately from the data collection so it can be tested on its own. */
export function buildWorkbook(sheets: Sheet[]): Blob {
  const used = new Set<string>();
  const normalized = sheets.map((s) => ({ ...s, name: sanitizeSheetName(s.name, used) }));
  const files = [
    {
      name: '[Content_Types].xml',
      xml:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        normalized.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      xml: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      xml:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        normalized.map((s, i) => `<sheet name="${xmlText(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
        '</sheets></workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      xml:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        normalized.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
        `<Relationship Id="rId${normalized.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      xml: stylesXml(),
    },
    ...normalized.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, xml: sheetXml(sheet) })),
  ];
  const blob = zip(files.map((f) => ({ name: f.name, bytes: encoder.encode(f.xml) })));
  return new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const round = (n: number, digits = 1) => Math.round(n * 10 ** digits) / 10 ** digits;

export interface ExcelDateRange {
  from?: string;
  to?: string;
}

export interface ExcelExportInput {
  dayLogs: Record<string, DayLog>;
  profile: UserProfile;
  plans: MealPlan[];
  slotLabel: (slot: MealSlotId) => string;
  /** Header and sheet names, in the language of the app. */
  text: (english: string, italian: string) => string;
  dateRange?: ExcelDateRange;
  sheets?: Partial<Record<ExcelSheetId, boolean>>;
  language?: Language;
  customButtons?: CustomButtonDef[];
  memories?: Record<string, MealMemory>;
  preBuiltMeals?: PreBuiltMeal[];
  allFoods?: FoodItem[];
  bodyEntries?: BodyEntries;
  bodyConfig?: AdvancedSettings['body'];
  periodData?: PeriodData;
  fastingData?: FastingData;
  t?: typeof translations.en;
}

export function isDateInRange(date: string, range?: ExcelDateRange): boolean {
  if (!range) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

const poopSizeLabel = (size: PoopSize, text: (en: string, it: string) => string, t?: typeof translations.en) => {
  if (t) {
    switch (size) {
      case 'very_little': return t.poop.veryLittle;
      case 'little': return t.poop.little;
      case 'normal': return t.poop.normal;
      case 'a_lot': return t.poop.aLot;
      case 'huge': return t.poop.huge;
    }
  }
  switch (size) {
    case 'very_little': return text('Very little', 'Pochissima');
    case 'little': return text('Little', 'Poca');
    case 'normal': return text('Normal', 'Normale');
    case 'a_lot': return text('A lot', 'Molta');
    case 'huge': return text('Huge', 'Enorme');
  }
};

const flowLabel = (flow: PeriodData['logs'][string]['flow'], text: (en: string, it: string) => string, t?: typeof translations.en) => {
  if (t) return t.period[`flow_${flow}` as keyof typeof t.period] as string;
  switch (flow) {
    case 'none': return text('None', 'Nessuno');
    case 'light': return text('Light', 'Leggero');
    case 'medium': return text('Medium', 'Medio');
    case 'heavy': return text('Heavy', 'Abbondante');
  }
};

export function buildExcelExport({
  dayLogs,
  profile,
  plans,
  slotLabel,
  text,
  dateRange,
  sheets,
  language = 'en',
  customButtons = [],
  memories = {},
  preBuiltMeals = [],
  allFoods = [],
  bodyEntries = {},
  bodyConfig,
  periodData,
  fastingData,
  t,
}: ExcelExportInput): Blob {
  const bmr = calculateBMR(profile);
  const want = (id: ExcelSheetId) => sheets?.[id] ?? (sheets === undefined
    ? id === 'days' || id === 'foods' || id === 'activities' || id === 'water' || id === 'plans' || id === 'summary'
    : false);

  const normalizedRange: ExcelDateRange | undefined = dateRange && (dateRange.from || dateRange.to)
    ? (dateRange.from && dateRange.to && dateRange.from > dateRange.to
        ? { from: dateRange.to, to: dateRange.from }
        : dateRange)
    : undefined;

  const dates = Object.keys(dayLogs).filter((d) => isDateInRange(d, normalizedRange)).sort();
  const buttonById = new Map(customButtons.map((b) => [b.id, b]));
  const foodMap = new Map(allFoods.map((f) => [f.id, f]));

  const days: Row[] = [];
  const foods: Row[] = [];
  const activities: Row[] = [];
  const water: Row[] = [];
  const poopRows: Row[] = [];
  const trackerRows: Row[] = [];

  let sumIntake = 0;
  let sumBurned = 0;
  let sumActExp = 0;
  let sumTef = 0;
  let sumCarbs = 0;
  let sumProtein = 0;
  let sumFat = 0;
  let sumFiber = 0;
  let sumSalt = 0;
  let sumSugar = 0;
  let sumWater = 0;
  const weights: number[] = [];

  for (const date of dates) {
    const log = dayLogs[date];
    const items = allMealItems(log.meals);
    const macros = calculateMacros(items);
    const intake = calculateTotalCalories(items);
    const actExp = calculateTotalActivityCalories(log.activities);
    const tef = calculateTEF(macros.carbsGrams, macros.proteinGrams, macros.fatGrams).totalTEF;
    const burned = bmr + actExp + tef;
    const waterMl = (log.waterEntries ?? []).reduce((sum, entry) => sum + entry.ml, 0);
    const poops = log.poops ?? [];
    const hasCustom = customButtons.some((b) =>
      b.type === 'toggle' ? typeof log.custom?.[b.id] === 'boolean' : getCustomEntries(log, b.id).length > 0,
    );
    const hasData = items.length > 0 || log.activities.length > 0 || waterMl > 0 || typeof log.weightKg === 'number' || poops.length > 0 || hasCustom;
    if (hasData) {
      const r = days.length + 2;
      sumIntake += intake;
      sumBurned += burned;
      sumActExp += actExp;
      sumTef += tef;
      sumCarbs += macros.carbsGrams;
      sumProtein += macros.proteinGrams;
      sumFat += macros.fatGrams;
      sumFiber += macros.fiberGrams;
      sumSalt += macros.saltGrams;
      sumSugar += macros.sugarGrams;
      sumWater += waterMl;
      if (typeof log.weightKg === 'number') weights.push(log.weightKg);

      days.push([
        { date },
        { value: round(intake, 0), numFmt: 'int' },
        { formula: `D${r}+E${r}+F${r}`, value: round(burned, 0), numFmt: 'int' },
        { value: round(bmr, 0), numFmt: 'int' },
        { value: round(actExp, 0), numFmt: 'int' },
        { value: round(tef, 0), numFmt: 'int' },
        { formula: `B${r}-C${r}`, value: round(intake - burned, 0), numFmt: 'signed' },
        { value: round(macros.carbsGrams), numFmt: 'dec1' },
        { value: round(macros.proteinGrams), numFmt: 'dec1' },
        { value: round(macros.fatGrams), numFmt: 'dec1' },
        { value: round(macros.fiberGrams), numFmt: 'dec1' },
        { value: round(macros.saltGrams, 2), numFmt: 'dec2' },
        { value: round(macros.sugarGrams), numFmt: 'dec1' },
        waterMl ? { value: waterMl, numFmt: 'int' } : null,
        typeof log.weightKg === 'number' ? { value: round(log.weightKg, 1), numFmt: 'dec1' } : null,
        poops.length ? { value: poops.length, numFmt: 'int' } : null,
      ]);
    }
    for (const [slot, list] of Object.entries(log.meals) as [MealSlotId, DayLog['meals'][MealSlotId]][]) {
      for (const item of list ?? []) {
        const k = item.amount / 100;
        foods.push([
          { date },
          slotLabel(slot),
          item.name,
          { value: round(item.amount, 1), numFmt: 'dec1' },
          item.unit,
          { value: round(item.calories * k, 0), numFmt: 'int' },
          item.carbs == null ? null : { value: round(item.carbs * k), numFmt: 'dec1' },
          item.protein == null ? null : { value: round(item.protein * k), numFmt: 'dec1' },
          item.fat == null ? null : { value: round(item.fat * k), numFmt: 'dec1' },
          item.fiber == null ? null : { value: round(item.fiber * k), numFmt: 'dec1' },
          item.salt == null ? null : { value: round(item.salt * k, 2), numFmt: 'dec2' },
          item.sugar == null ? null : { value: round(item.sugar * k), numFmt: 'dec1' },
        ]);
      }
    }
    for (const a of log.activities) {
      const label = t
        ? activityLogLabel(a, language, t.activities)
        : a.customName || a.type;
      activities.push([
        { date },
        toLocalTimeString(a.timestamp),
        label,
        a.durationMin ?? null,
        a.distanceKm == null ? null : { value: round(a.distanceKm, 2), numFmt: 'dec2' },
        { value: round(a.caloriesBurned, 0), numFmt: 'int' },
        a.notes ?? null,
      ]);
    }
    for (const w of log.waterEntries ?? []) {
      water.push([{ date }, toLocalTimeString(w.timestamp), { value: w.ml, numFmt: 'int' }]);
    }
    for (const p of poops) {
      poopRows.push([
        { date },
        toLocalTimeString(p.timestamp),
        poopSizeLabel(p.size, text, t),
        p.bristol ?? null,
        p.description ?? null,
      ]);
    }
    for (const [id, val] of Object.entries(log.custom ?? {})) {
      if (typeof val !== 'boolean') continue;
      const btn = buttonById.get(id);
      trackerRows.push([
        { date },
        null,
        btn?.name ?? id,
        text('Toggle', 'Interruttore'),
        val ? text('Yes', 'Si') : text('No', 'No'),
        null,
      ]);
    }
    for (const id of new Set([...customButtons.filter((b) => b.type === 'quantity').map((b) => b.id), ...Object.keys(log.customEntries ?? {})])) {
      const btn = buttonById.get(id);
      for (const entry of getCustomEntries(log, id)) {
        trackerRows.push([
          { date },
          toLocalTimeString(entry.timestamp),
          btn?.name ?? id,
          text('Quantity', 'Quantita'),
          { value: round(entry.amount, 2), numFmt: 'dec2' },
          btn?.unit ?? null,
        ]);
      }
    }
  }

  const mealNoteRows: Row[] = Object.entries(memories)
    .map(([key, mem]) => {
      const sep = key.indexOf(':');
      const date = sep > 0 ? key.slice(0, sep) : '';
      const slot = (sep > 0 ? key.slice(sep + 1) : '') as MealSlotId;
      return { date, slot, mem };
    })
    .filter(({ date, mem }) => date && isDateInRange(date, normalizedRange) && (mem.favorite || Boolean((mem.note ?? '').trim())))
    .sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot))
    .map(({ date, slot, mem }) => [
      { date },
      slotLabel(slot),
      mem.favorite ? text('Yes', 'Si') : text('No', 'No'),
      mem.note || null,
    ]);

  const planRows: Row[] = [...plans]
    .filter((p) => isDateInRange(p.date, normalizedRange))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => [
      { date: p.date },
      slotLabel(p.slot),
      p.title,
      p.note,
      p.items.map((i) => `${(language === 'it' ? i.food.name_it : i.food.name_en) || i.food.name_de} ${i.amount}${i.food.unit}`).join(', '),
      p.loggedAt ? text('Yes', 'Si') : text('No', 'No'),
    ]);

  const savedLibraryRows: Row[] = [
    ...preBuiltMeals.map((meal): Row => {
      const mealLoggedItems: LoggedFoodItem[] = [];
      for (const ing of meal.ingredients) {
        const f = foodMap.get(ing.foodId);
        if (!f) continue;
        mealLoggedItems.push({
          id: '',
          foodId: f.id,
          name: f.name_en || f.name_de,
          store: f.store,
          amount: ing.amount,
          unit: f.unit,
          calories: f.calories,
          carbs: f.carbs,
          protein: f.protein,
          fat: f.fat,
          fiber: f.fiber,
          salt: f.salt,
          sugar: f.sugar,
          loggedAt: '',
        });
      }
      const n = calculateMacros(mealLoggedItems);
      const kcal = calculateTotalCalories(mealLoggedItems);
      const ing = meal.ingredients
        .map((i) => {
          const f = foodMap.get(i.foodId);
          const name = f ? ((language === 'it' ? f.name_it : f.name_en) || f.name_de) : i.foodId;
          return `${name} ${i.amount}${f?.unit ?? 'g'}`;
        })
        .join(', ');
      return [
        text('Saved meal', 'Pasto salvato'),
        meal.name,
        meal.slot ? slotLabel(meal.slot) : null,
        { value: round(kcal, 0), numFmt: 'int' },
        { value: round(n.carbsGrams), numFmt: 'dec1' },
        { value: round(n.proteinGrams), numFmt: 'dec1' },
        { value: round(n.fatGrams), numFmt: 'dec1' },
        { value: round(n.fiberGrams), numFmt: 'dec1' },
        { value: round(n.saltGrams, 2), numFmt: 'dec2' },
        { value: round(n.sugarGrams), numFmt: 'dec1' },
        ing || meal.description || null,
      ];
    }),
    ...allFoods
      .filter((f) => f.isRecipe)
      .map((recipe): Row => {
        const ing = (recipe.recipeIngredients ?? [])
          .map((i) => {
            const f = foodMap.get(i.foodId);
            const name = f ? ((language === 'it' ? f.name_it : f.name_en) || f.name_de) : i.foodId;
            return `${name} ${i.amount}${f?.unit ?? 'g'}`;
          })
          .join(', ');
        return [
          text('Recipe', 'Ricetta'),
          (language === 'it' ? recipe.name_it : recipe.name_en) || recipe.name_de,
          recipe.portion ? `${recipe.portion}${recipe.unit}` : `100${recipe.unit}`,
          { value: round(recipe.calories, 0), numFmt: 'int' },
          recipe.carbs == null ? null : { value: round(recipe.carbs), numFmt: 'dec1' },
          recipe.protein == null ? null : { value: round(recipe.protein), numFmt: 'dec1' },
          recipe.fat == null ? null : { value: round(recipe.fat), numFmt: 'dec1' },
          recipe.fiber == null ? null : { value: round(recipe.fiber), numFmt: 'dec1' },
          recipe.salt == null ? null : { value: round(recipe.salt, 2), numFmt: 'dec2' },
          recipe.sugar == null ? null : { value: round(recipe.sugar), numFmt: 'dec1' },
          ing || null,
        ];
      }),
  ];

  const customMeasureMap = new Map((bodyConfig?.custom ?? []).map((m) => [m.id, m]));
  const bodyRows: Row[] = [];
  const measureMeta = (baseId: string): { name: string; unit: string } => {
    const custom = customMeasureMap.get(baseId);
    if (custom) return { name: custom.name, unit: custom.unit };
    const englishNames: Record<string, [string, string]> = {
      waist: ['Waist', 'Vita'],
      neck: ['Neck', 'Collo'],
      hips: ['Hips', 'Fianchi'],
      chest: ['Chest', 'Torace'],
      forearms: ['Forearms', 'Avambracci'],
      biceps: ['Biceps', 'Bicipiti'],
      thighs: ['Thighs', 'Cosce'],
      calves: ['Calves', 'Polpacci'],
    };
    const pair = englishNames[baseId];
    return { name: pair ? text(pair[0], pair[1]) : baseId, unit: 'cm' };
  };
  const bodyIds = new Set<string>([
    ...DEFAULT_MEASURES.map((m) => m.id),
    ...(bodyConfig?.custom ?? []).map((m) => m.id),
    ...Object.keys(bodyEntries).map((k) => k.split(':')[0]),
  ]);
  for (const id of bodyIds) {
    const meta = measureMeta(id);
    const keys = isPairedMeasure(id)
      ? seriesKeysOf(id)
      : [{ side: null as BodySide | null, key: id }];
    for (const { side, key } of keys) {
      for (const entry of bodyEntries[key] ?? []) {
        if (!isDateInRange(entry.date, normalizedRange)) continue;
        bodyRows.push([
          { date: entry.date },
          meta.name,
          side === 'left' ? text('Left', 'Sinistra') : side === 'right' ? text('Right', 'Destra') : '—',
          { value: round(entry.value, 1), numFmt: 'dec1' },
          meta.unit,
        ]);
      }
    }
  }
  bodyRows.sort((a, b) => {
    const da = (a[0] as { date: string }).date;
    const db = (b[0] as { date: string }).date;
    return da.localeCompare(db) || String(a[1]).localeCompare(String(b[1]));
  });

  const periodBuiltinLabel = (group: 'mood' | 'symptom', key: string) =>
    t ? (t.period[`${group === 'mood' ? 'mood' : 'sym'}_${key}` as keyof typeof t.period] as string) : key;
  const periodRows: Row[] = periodData
    ? Object.keys(periodData.logs)
        .filter((d) => isDateInRange(d, normalizedRange))
        .sort()
        .map((date): Row => {
          const l = periodData.logs[date];
          return [
            { date },
            l.isPeriod ? text('Yes', 'Si') : text('No', 'No'),
            flowLabel(l.flow, text, t),
            l.pillTaken === undefined ? '—' : l.pillTaken ? text('Yes', 'Si') : text('No', 'No'),
            l.intercourse ? text('Yes', 'Si') : text('No', 'No'),
            l.moods.map((id) => tagLabel(id, periodData.settings, periodBuiltinLabel)).join(', ') || null,
            l.symptoms.map((id) => tagLabel(id, periodData.settings, periodBuiltinLabel)).join(', ') || null,
            l.notes ?? null,
          ];
        })
    : [];

  const daysName = text('Days', 'Giorni');
  const daysSheetRef = quoteSheet(daysName);
  const daysEndRow = days.length + 1;
  const daysFooter: Row[] = days.length > 0
    ? [
        [
          { text: text('Total', 'Totale'), style: 'totalLabel' },
          { formula: `SUM(B2:B${daysEndRow})`, value: round(sumIntake, 0), numFmt: 'int', bold: true },
          { formula: `SUM(C2:C${daysEndRow})`, value: round(sumBurned, 0), numFmt: 'int', bold: true },
          { formula: `SUM(D2:D${daysEndRow})`, value: round(bmr * days.length, 0), numFmt: 'int', bold: true },
          { formula: `SUM(E2:E${daysEndRow})`, value: round(sumActExp, 0), numFmt: 'int', bold: true },
          { formula: `SUM(F2:F${daysEndRow})`, value: round(sumTef, 0), numFmt: 'int', bold: true },
          { formula: `SUM(G2:G${daysEndRow})`, value: round(sumIntake - sumBurned, 0), numFmt: 'signed', bold: true },
          { formula: `SUM(H2:H${daysEndRow})`, value: round(sumCarbs), numFmt: 'dec1', bold: true },
          { formula: `SUM(I2:I${daysEndRow})`, value: round(sumProtein), numFmt: 'dec1', bold: true },
          { formula: `SUM(J2:J${daysEndRow})`, value: round(sumFat), numFmt: 'dec1', bold: true },
          { formula: `SUM(K2:K${daysEndRow})`, value: round(sumFiber), numFmt: 'dec1', bold: true },
          { formula: `SUM(L2:L${daysEndRow})`, value: round(sumSalt, 2), numFmt: 'dec2', bold: true },
          { formula: `SUM(M2:M${daysEndRow})`, value: round(sumSugar), numFmt: 'dec1', bold: true },
          { formula: `SUM(N2:N${daysEndRow})`, value: round(sumWater, 0), numFmt: 'int', bold: true },
          null,
          { formula: `SUM(P2:P${daysEndRow})`, value: poopRows.length, numFmt: 'int', bold: true },
        ],
        [
          { text: text('Average', 'Media'), style: 'totalLabel' },
          { formula: `AVERAGE(B2:B${daysEndRow})`, value: round(sumIntake / days.length, 0), numFmt: 'int', bold: true },
          { formula: `AVERAGE(C2:C${daysEndRow})`, value: round(sumBurned / days.length, 0), numFmt: 'int', bold: true },
          { formula: `AVERAGE(D2:D${daysEndRow})`, value: round(bmr, 0), numFmt: 'int', bold: true },
          { formula: `AVERAGE(E2:E${daysEndRow})`, value: round(sumActExp / days.length, 0), numFmt: 'int', bold: true },
          { formula: `AVERAGE(F2:F${daysEndRow})`, value: round(sumTef / days.length, 0), numFmt: 'int', bold: true },
          { formula: `AVERAGE(G2:G${daysEndRow})`, value: round((sumIntake - sumBurned) / days.length, 0), numFmt: 'signed', bold: true },
          { formula: `AVERAGE(H2:H${daysEndRow})`, value: round(sumCarbs / days.length), numFmt: 'dec1', bold: true },
          { formula: `AVERAGE(I2:I${daysEndRow})`, value: round(sumProtein / days.length), numFmt: 'dec1', bold: true },
          { formula: `AVERAGE(J2:J${daysEndRow})`, value: round(sumFat / days.length), numFmt: 'dec1', bold: true },
          { formula: `AVERAGE(K2:K${daysEndRow})`, value: round(sumFiber / days.length), numFmt: 'dec1', bold: true },
          { formula: `AVERAGE(L2:L${daysEndRow})`, value: round(sumSalt / days.length, 2), numFmt: 'dec2', bold: true },
          { formula: `AVERAGE(M2:M${daysEndRow})`, value: round(sumSugar / days.length), numFmt: 'dec1', bold: true },
          { formula: `IF(COUNT(N2:N${daysEndRow})>0,AVERAGE(N2:N${daysEndRow}),0)`, value: round(sumWater / days.length, 0), numFmt: 'int', bold: true },
          weights.length
            ? { formula: `IF(COUNT(O2:O${daysEndRow})>0,AVERAGE(O2:O${daysEndRow}),0)`, value: round(weights.reduce((s, w) => s + w, 0) / weights.length), numFmt: 'dec1', bold: true }
            : null,
          { formula: `IF(COUNT(P2:P${daysEndRow})>0,AVERAGE(P2:P${daysEndRow}),0)`, numFmt: 'dec1', bold: true },
        ],
      ]
    : [];

  const includeDays = want('days');
  const useLiveDaysRef = includeDays && days.length > 0;
  const avgDenom = Math.max(1, days.length);
  const macroKcalSum = Math.max(0.0001, sumCarbs * 4 + sumProtein * 4 + sumFat * 9);

  const periodRangeText = normalizedRange?.from || normalizedRange?.to
    ? `${normalizedRange.from ?? '…'} → ${normalizedRange.to ?? '…'}`
    : text('All time', 'Tutto il periodo');

  const summaryRows: Row[] = [
    [{ text: text('Kakcal — Nutrition & Health Report', 'Kakcal — Report Nutrizione e Salute'), style: 'title' }],
    [{ text: text('Period', 'Periodo'), style: 'kpiLabel' }, periodRangeText, null],
    [{ text: text('Exported', 'Esportato'), style: 'kpiLabel' }, { date: getTodayDateString() }, null],
    [],
    [{ text: text('Profile', 'Profilo'), style: 'section' }, { text: '', style: 'section' }, { text: '', style: 'section' }],
    [{ text: text('Weight', 'Peso'), style: 'kpiLabel' }, { value: profile.weightKg, numFmt: 'dec1' }, 'kg'],
    [{ text: text('Height', 'Altezza'), style: 'kpiLabel' }, { value: profile.heightCm, numFmt: 'int' }, 'cm'],
    [{ text: text('Age', 'Eta'), style: 'kpiLabel' }, { value: profile.age, numFmt: 'int' }, text('years', 'anni')],
    [{ text: text('Sex', 'Sesso'), style: 'kpiLabel' }, profile.sex === 'female' ? text('Female', 'Donna') : text('Male', 'Uomo'), null],
    [{ text: 'BMR', style: 'kpiLabel' }, { value: round(bmr, 0), numFmt: 'int' }, 'kcal'],
    ...(profile.targetIntakeKcal ? [[{ text: text('Target intake', 'Obiettivo calorie'), style: 'kpiLabel' as const }, { value: profile.targetIntakeKcal, numFmt: 'int' as const }, 'kcal']] : []),
    [],
    [{ text: text('Daily averages & totals', 'Medie e totali giornalieri'), style: 'section' }, { text: '', style: 'section' }, { text: '', style: 'section' }],
    [
      { text: text('Logged days', 'Giorni registrati'), style: 'kpiLabel' },
      useLiveDaysRef ? { formula: `COUNTA(${daysSheetRef}!A2:A${daysEndRow})`, value: days.length, numFmt: 'int' } : { value: days.length, numFmt: 'int' },
      text('days', 'giorni'),
    ],
  ];

  if (days.length > 0) {
    // Rows 15, 16, 17, ... let macro split formulas reference the average gram rows directly when Days is present.
    const carbsAvgRow = summaryRows.length + 6; // Intake avg, Burned avg, Balance avg, Total intake, Total burned, Carbs avg
    const proteinAvgRow = carbsAvgRow + 1;
    const fatAvgRow = carbsAvgRow + 2;
    summaryRows.push(
      [
        { text: text('Average intake', 'Media introdotte'), style: 'kpiLabel' },
        useLiveDaysRef ? { formula: `AVERAGE(${daysSheetRef}!B2:B${daysEndRow})`, value: round(sumIntake / avgDenom, 0), numFmt: 'int' } : { value: round(sumIntake / avgDenom, 0), numFmt: 'int' },
        'kcal',
      ],
      [
        { text: text('Average burned', 'Media bruciate'), style: 'kpiLabel' },
        useLiveDaysRef ? { formula: `AVERAGE(${daysSheetRef}!C2:C${daysEndRow})`, value: round(sumBurned / avgDenom, 0), numFmt: 'int' } : { value: round(sumBurned / avgDenom, 0), numFmt: 'int' },
        'kcal',
      ],
      [
        { text: text('Average balance', 'Bilancio medio'), style: 'kpiLabel' },
        useLiveDaysRef ? { formula: `AVERAGE(${daysSheetRef}!G2:G${daysEndRow})`, value: round((sumIntake - sumBurned) / avgDenom, 0), numFmt: 'signed' } : { value: round((sumIntake - sumBurned) / avgDenom, 0), numFmt: 'signed' },
        'kcal',
      ],
      [
        { text: text('Total intake', 'Totale introdotte'), style: 'kpiLabel' },
        useLiveDaysRef ? { formula: `SUM(${daysSheetRef}!B2:B${daysEndRow})`, value: round(sumIntake, 0), numFmt: 'int' } : { value: round(sumIntake, 0), numFmt: 'int' },
        'kcal',
      ],
      [
        { text: text('Total burned', 'Totale bruciate'), style: 'kpiLabel' },
        useLiveDaysRef ? { formula: `SUM(${daysSheetRef}!C2:C${daysEndRow})`, value: round(sumBurned, 0), numFmt: 'int' } : { value: round(sumBurned, 0), numFmt: 'int' },
        'kcal',
      ],
      [
        { text: text('Average carbs', 'Media carboidrati'), style: 'kpiLabel' },
        useLiveDaysRef ? { formula: `AVERAGE(${daysSheetRef}!H2:H${daysEndRow})`, value: round(sumCarbs / avgDenom), numFmt: 'dec1' } : { value: round(sumCarbs / avgDenom), numFmt: 'dec1' },
        'g',
      ],
      [
        { text: text('Average protein', 'Media proteine'), style: 'kpiLabel' },
        useLiveDaysRef ? { formula: `AVERAGE(${daysSheetRef}!I2:I${daysEndRow})`, value: round(sumProtein / avgDenom), numFmt: 'dec1' } : { value: round(sumProtein / avgDenom), numFmt: 'dec1' },
        'g',
      ],
      [
        { text: text('Average fat', 'Media grassi'), style: 'kpiLabel' },
        useLiveDaysRef ? { formula: `AVERAGE(${daysSheetRef}!J2:J${daysEndRow})`, value: round(sumFat / avgDenom), numFmt: 'dec1' } : { value: round(sumFat / avgDenom), numFmt: 'dec1' },
        'g',
      ],
      [
        { text: text('Carbs share (% kcal)', 'Quota carboidrati (% kcal)'), style: 'kpiLabel' },
        {
          formula: `IF((B${carbsAvgRow}*4+B${proteinAvgRow}*4+B${fatAvgRow}*9)>0,(B${carbsAvgRow}*4)/(B${carbsAvgRow}*4+B${proteinAvgRow}*4+B${fatAvgRow}*9),0)`,
          value: round((sumCarbs * 4) / macroKcalSum, 4),
          numFmt: 'pct',
        },
        text('energy share', 'quota energia'),
      ],
      [
        { text: text('Protein share (% kcal)', 'Quota proteine (% kcal)'), style: 'kpiLabel' },
        {
          formula: `IF((B${carbsAvgRow}*4+B${proteinAvgRow}*4+B${fatAvgRow}*9)>0,(B${proteinAvgRow}*4)/(B${carbsAvgRow}*4+B${proteinAvgRow}*4+B${fatAvgRow}*9),0)`,
          value: round((sumProtein * 4) / macroKcalSum, 4),
          numFmt: 'pct',
        },
        text('energy share', 'quota energia'),
      ],
      [
        { text: text('Fat share (% kcal)', 'Quota grassi (% kcal)'), style: 'kpiLabel' },
        {
          formula: `IF((B${carbsAvgRow}*4+B${proteinAvgRow}*4+B${fatAvgRow}*9)>0,(B${fatAvgRow}*9)/(B${carbsAvgRow}*4+B${proteinAvgRow}*4+B${fatAvgRow}*9),0)`,
          value: round((sumFat * 9) / macroKcalSum, 4),
          numFmt: 'pct',
        },
        text('energy share', 'quota energia'),
      ],
      [
        { text: text('Average water', 'Media acqua'), style: 'kpiLabel' },
        useLiveDaysRef ? { formula: `IF(COUNT(${daysSheetRef}!N2:N${daysEndRow})>0,AVERAGE(${daysSheetRef}!N2:N${daysEndRow}),0)`, value: round(sumWater / avgDenom, 0), numFmt: 'int' } : { value: round(sumWater / avgDenom, 0), numFmt: 'int' },
        'ml',
      ],
    );
    if (weights.length > 0) {
      const minW = Math.min(...weights);
      const maxW = Math.max(...weights);
      summaryRows.push(
        [
          { text: text('Weight (min)', 'Peso (min)'), style: 'kpiLabel' },
          useLiveDaysRef ? { formula: `MIN(${daysSheetRef}!O2:O${daysEndRow})`, value: round(minW), numFmt: 'dec1' } : { value: round(minW), numFmt: 'dec1' },
          'kg',
        ],
        [
          { text: text('Weight (max)', 'Peso (max)'), style: 'kpiLabel' },
          useLiveDaysRef ? { formula: `MAX(${daysSheetRef}!O2:O${daysEndRow})`, value: round(maxW), numFmt: 'dec1' } : { value: round(maxW), numFmt: 'dec1' },
          'kg',
        ],
      );
    }
  }

  summaryRows.push(
    [],
    [{ text: text('Dataset summary', 'Riepilogo dati'), style: 'section' }, { text: '', style: 'section' }, { text: '', style: 'section' }],
    [{ text: text('Foods logged', 'Alimenti registrati'), style: 'kpiLabel' }, { value: foods.length, numFmt: 'int' }, text('entries', 'voci')],
    [{ text: text('Activities', 'Attivita'), style: 'kpiLabel' }, { value: activities.length, numFmt: 'int' }, text('entries', 'voci')],
    [{ text: text('Water entries', 'Voci acqua'), style: 'kpiLabel' }, { value: water.length, numFmt: 'int' }, text('entries', 'voci')],
    [{ text: text('Poop entries', 'Voci poop'), style: 'kpiLabel' }, { value: poopRows.length, numFmt: 'int' }, text('entries', 'voci')],
    [{ text: text('Custom tracker entries', 'Voci tracciatori'), style: 'kpiLabel' }, { value: trackerRows.length, numFmt: 'int' }, text('entries', 'voci')],
    [{ text: text('Meal notes', 'Note pasti'), style: 'kpiLabel' }, { value: mealNoteRows.length, numFmt: 'int' }, text('entries', 'voci')],
    [{ text: text('Meal plans', 'Pasti pianificati'), style: 'kpiLabel' }, { value: planRows.length, numFmt: 'int' }, text('entries', 'voci')],
    [{ text: text('Saved meals & recipes', 'Pasti e ricette salvate'), style: 'kpiLabel' }, { value: savedLibraryRows.length, numFmt: 'int' }, text('items', 'elementi')],
    [{ text: text('Body measurements', 'Misure del corpo'), style: 'kpiLabel' }, { value: bodyRows.length, numFmt: 'int' }, text('entries', 'voci')],
    [{ text: text('Period logs', 'Giorni ciclo'), style: 'kpiLabel' }, { value: periodRows.length, numFmt: 'int' }, text('days', 'giorni')],
  );

  const selectedSheets: Sheet[] = [];
  if (want('summary')) {
    selectedSheets.push({
      name: text('Summary', 'Riepilogo'),
      rows: summaryRows,
      widths: [34, 18, 24],
      autoFilter: false,
      freezeHeader: false,
    });
  }
  if (includeDays) {
    selectedSheets.push({
      name: daysName,
      header: [
        text('Date', 'Data'), text('Intake (kcal)', 'Introdotte (kcal)'), text('Burned (kcal)', 'Bruciate (kcal)'), 'BMR (kcal)',
        text('Activity (kcal)', 'Attivita (kcal)'), 'TEF (kcal)', text('Intake - burned (kcal)', 'Introdotte - bruciate (kcal)'),
        text('Carbs (g)', 'Carboidrati (g)'), text('Protein (g)', 'Proteine (g)'), text('Fat (g)', 'Grassi (g)'),
        text('Fibre (g)', 'Fibre (g)'), text('Salt (g)', 'Sale (g)'), text('Sugar (g)', 'Zuccheri (g)'),
        text('Water (ml)', 'Acqua (ml)'), text('Weight (kg)', 'Peso (kg)'), 'Poop',
      ],
      rows: days,
      footerRows: daysFooter,
      widths: [12, 14, 14, 11, 14, 10, 22, 14, 13, 11, 11, 10, 12, 12, 12, 9],
    });
  }
  if (want('foods')) {
    selectedSheets.push({
      name: text('Foods', 'Alimenti'),
      header: [
        text('Date', 'Data'), text('Meal', 'Pasto'), text('Food', 'Alimento'), text('Amount', 'Quantita'), text('Unit', 'Unita'),
        'kcal', text('Carbs (g)', 'Carboidrati (g)'), text('Protein (g)', 'Proteine (g)'), text('Fat (g)', 'Grassi (g)'),
        text('Fibre (g)', 'Fibre (g)'), text('Salt (g)', 'Sale (g)'), text('Sugar (g)', 'Zuccheri (g)'),
      ],
      rows: foods,
      widths: [12, 16, 36, 10, 8, 9, 13, 13, 11, 11, 10, 12],
    });
  }
  if (want('activities')) {
    selectedSheets.push({
      name: text('Activities', 'Attivita'),
      header: [text('Date', 'Data'), text('Time', 'Ora'), text('Activity', 'Attivita'), text('Minutes', 'Minuti'), 'km', text('Burned (kcal)', 'Bruciate (kcal)'), text('Notes', 'Note')],
      rows: activities,
      widths: [12, 8, 24, 10, 8, 14, 30],
    });
  }
  if (want('water')) {
    selectedSheets.push({
      name: text('Water', 'Acqua'),
      header: [text('Date', 'Data'), text('Time', 'Ora'), 'ml'],
      rows: water,
      widths: [12, 8, 10],
    });
  }
  if (want('poop')) {
    selectedSheets.push({
      name: text('Poop', 'Poop'),
      header: [text('Date', 'Data'), text('Time', 'Ora'), text('Size', 'Quantita'), 'Bristol', text('Notes', 'Note')],
      rows: poopRows,
      widths: [12, 8, 14, 10, 30],
    });
  }
  if (want('customTrackers')) {
    selectedSheets.push({
      name: text('Custom trackers', 'Tracciatori'),
      header: [text('Date', 'Data'), text('Time', 'Ora'), text('Tracker', 'Tracciatore'), text('Type', 'Tipo'), text('Value', 'Valore'), text('Unit', 'Unita')],
      rows: trackerRows,
      widths: [12, 8, 22, 12, 12, 10],
    });
  }
  if (want('mealNotes')) {
    selectedSheets.push({
      name: text('Meal notes', 'Note pasti'),
      header: [text('Date', 'Data'), text('Meal', 'Pasto'), text('Favourite', 'Preferito'), text('Note', 'Nota')],
      rows: mealNoteRows,
      widths: [12, 16, 12, 44],
    });
  }
  if (want('plans')) {
    selectedSheets.push({
      name: text('Meal plans', 'Pasti pianificati'),
      header: [text('Date', 'Data'), text('Meal', 'Pasto'), text('Plan', 'Piano'), text('Note', 'Nota'), text('Foods', 'Alimenti'), text('Logged', 'Registrato')],
      rows: planRows,
      widths: [12, 16, 28, 36, 48, 10],
    });
  }
  if (want('savedLibrary')) {
    selectedSheets.push({
      name: text('Meals & Recipes', 'Pasti e ricette'),
      header: [
        text('Type', 'Tipo'), text('Name', 'Nome'), text('Slot / Portion', 'Pasto / Porzione'), 'kcal',
        text('Carbs (g)', 'Carboidrati (g)'), text('Protein (g)', 'Proteine (g)'), text('Fat (g)', 'Grassi (g)'),
        text('Fibre (g)', 'Fibre (g)'), text('Salt (g)', 'Sale (g)'), text('Sugar (g)', 'Zuccheri (g)'),
        text('Ingredients', 'Ingredienti'),
      ],
      rows: savedLibraryRows,
      widths: [14, 28, 16, 9, 13, 13, 11, 11, 10, 12, 44],
    });
  }
  if (want('body')) {
    selectedSheets.push({
      name: text('Body measurements', 'Misure corpo'),
      header: [text('Date', 'Data'), text('Measure', 'Misura'), text('Side', 'Lato'), text('Value', 'Valore'), text('Unit', 'Unita')],
      rows: bodyRows,
      widths: [12, 20, 12, 12, 8],
    });
  }
  if (want('period')) {
    selectedSheets.push({
      name: text('Period', 'Ciclo'),
      header: [
        text('Date', 'Data'), text('Period day', 'Giorno ciclo'), text('Flow', 'Flusso'), text('Pill taken', 'Pillola'),
        text('Intercourse', 'Rapporti'), text('Moods', 'Umore'), text('Symptoms', 'Sintomi'), text('Notes', 'Note'),
      ],
      rows: periodRows,
      widths: [12, 13, 12, 11, 13, 24, 24, 32],
    });
  }
  if (want('fasting')) {
    const fastingRows: Row[] = (fastingData?.sessions ?? [])
      .filter((s) => isDateInRange(toLocalDateString(s.endedAt ?? s.startedAt), normalizedRange))
      .map((s) => {
        const timing = computeFastTiming(s);
        const sessionNotes = (fastingData?.notes ?? [])
          .filter((n) => n.sessionId === s.id)
          .map((n) => `${n.mood} (${n.hunger}/5)${n.text ? `: ${n.text}` : ''}`)
          .join(' | ');
        return [
          { date: toLocalDateString(s.startedAt) },
          toLocalTimeString(s.startedAt),
          s.endedAt ? { date: toLocalDateString(s.endedAt) } : null,
          toLocalTimeString(s.endedAt),
          s.protocol.toUpperCase(),
          { value: Math.round((timing.elapsedMs / 3_600_000) * 10) / 10, numFmt: 'dec1' },
          { value: s.targetFastingHours, numFmt: 'dec1' },
          timing.reached ? text('Yes', 'Si') : text('No', 'No'),
          sessionNotes || null,
        ];
      });
    selectedSheets.push({
      name: text('Fasting', 'Digiuno'),
      header: [
        text('Start date', 'Data inizio'), text('Start time', 'Ora inizio'), text('End date', 'Data fine'),
        text('End time', 'Ora fine'), text('Protocol', 'Protocollo'), text('Duration (h)', 'Durata (h)'),
        text('Target (h)', 'Obiettivo (h)'), text('Completed', 'Completato'), text('Notes', 'Note'),
      ],
      rows: fastingRows,
      widths: [12, 10, 12, 10, 12, 13, 12, 12, 44],
    });
  }

  if (selectedSheets.length === 0) {
    selectedSheets.push({
      name: text('Summary', 'Riepilogo'),
      rows: summaryRows,
      widths: [34, 18, 24],
      autoFilter: false,
      freezeHeader: false,
    });
  }

  return buildWorkbook(selectedSheets);
}

/** Counts how many records each sheet would export for a given period, for the export picker modal. */
export function countExcelRecords(
  input: Pick<ExcelExportInput, 'dayLogs' | 'plans' | 'customButtons' | 'memories' | 'preBuiltMeals' | 'allFoods' | 'bodyEntries' | 'periodData' | 'fastingData'>,
  range?: ExcelDateRange,
): Record<ExcelSheetId, number> {
  const counts: Record<ExcelSheetId, number> = {
    summary: 1,
    days: 0,
    foods: 0,
    activities: 0,
    water: 0,
    poop: 0,
    customTrackers: 0,
    mealNotes: 0,
    plans: 0,
    savedLibrary: (input.preBuiltMeals?.length ?? 0) + (input.allFoods?.filter((f) => f.isRecipe).length ?? 0),
    body: 0,
    period: 0,
    fasting: 0,
  };
  const buttons = input.customButtons ?? [];
  for (const [date, log] of Object.entries(input.dayLogs)) {
    if (!isDateInRange(date, range)) continue;
    const foodItems = allMealItems(log.meals);
    const wLen = (log.waterEntries ?? []).length;
    const pLen = (log.poops ?? []).length;
    let cLen = 0;
    for (const val of Object.values(log.custom ?? {})) {
      if (typeof val === 'boolean') cLen += 1;
    }
    for (const id of new Set([...buttons.filter((b) => b.type === 'quantity').map((b) => b.id), ...Object.keys(log.customEntries ?? {})])) {
      cLen += getCustomEntries(log, id).length;
    }
    counts.foods += foodItems.length;
    counts.activities += log.activities.length;
    counts.water += wLen;
    counts.poop += pLen;
    counts.customTrackers += cLen;
    if (foodItems.length > 0 || log.activities.length > 0 || wLen > 0 || typeof log.weightKg === 'number' || pLen > 0 || cLen > 0) {
      counts.days += 1;
    }
  }
  for (const [key, mem] of Object.entries(input.memories ?? {})) {
    const date = key.split(':')[0];
    if (date && isDateInRange(date, range) && (mem.favorite || Boolean((mem.note ?? '').trim()))) counts.mealNotes += 1;
  }
  for (const p of input.plans) {
    if (isDateInRange(p.date, range)) counts.plans += 1;
  }
  for (const list of Object.values(input.bodyEntries ?? {})) {
    for (const e of list) {
      if (isDateInRange(e.date, range)) counts.body += 1;
    }
  }
  for (const d of Object.keys(input.periodData?.logs ?? {})) {
    if (isDateInRange(d, range)) counts.period += 1;
  }
  for (const s of input.fastingData?.sessions ?? []) {
    if (isDateInRange(toLocalDateString(s.endedAt ?? s.startedAt), range)) counts.fasting += 1;
  }
  return counts;
}

export type { Settings };
