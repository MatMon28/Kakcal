import type { DayLog, UserProfile, MealSlotId } from '../types';
import type { MealPlan } from '../types/journal';
import { calculateBMR, calculateMacros, calculateTEF, calculateTotalActivityCalories, calculateTotalCalories } from './calculations';
import { allMealItems } from './mealItems';
import { zip } from './photoExport';

/**
 * Excel export (Settings > Backup): a real `.xlsx` workbook (Office Open XML) built locally, with no library and no
 * network. It reuses the store-only ZIP writer of the photo export. Sheets: Days, Foods, Activities, Water, Meal plans.
 */

type Cell = string | number | null | undefined | { date: string };
type Row = Cell[];
interface Sheet {
  name: string;
  header: string[];
  rows: Row[];
  widths?: number[];
}

const encoder = new TextEncoder();
const xmlText = (text: string) =>
  // eslint-disable-next-line no-control-regex
  text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

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

// Style ids from styles.xml: 0 normal, 1 bold header, 2 date.
function cellXml(value: Cell, ref: string, style = 0) {
  if (value === null || value === undefined || value === '') return '';
  const s = style ? ` s="${style}"` : '';
  if (typeof value === 'number') return Number.isFinite(value) ? `<c r="${ref}"${s}><v>${value}</v></c>` : '';
  if (typeof value === 'object') return `<c r="${ref}" s="2"><v>${serial(value.date)}</v></c>`;
  // Text that starts like a formula is stored as plain text anyway (inline string), so nothing is evaluated.
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
}

function sheetXml(sheet: Sheet) {
  const cols = sheet.header.map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${sheet.widths?.[i] ?? 14}" customWidth="1"/>`).join('');
  const head = `<row r="1">${sheet.header.map((h, i) => cellXml(h, `${column(i)}1`, 1)).join('')}</row>`;
  const body = sheet.rows
    .map((row, r) => `<row r="${r + 2}">${row.map((v, i) => cellXml(v, `${column(i)}${r + 2}`)).join('')}</row>`)
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${cols}</cols><sheetData>${head}${body}</sheetData></worksheet>`
  );
}

/** Builds the workbook file. Exported separately from the data collection so it can be tested on its own. */
export function buildWorkbook(sheets: Sheet[]): Blob {
  const files = [
    {
      name: '[Content_Types].xml',
      xml:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
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
        sheets.map((s, i) => `<sheet name="${xmlText(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
        '</sheets></workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      xml:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
        `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      xml:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts>' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
        '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>',
    },
    ...sheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, xml: sheetXml(sheet) })),
  ];
  const blob = zip(files.map((f) => ({ name: f.name, bytes: encoder.encode(f.xml) })));
  return new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const round = (n: number, digits = 1) => Math.round(n * 10 ** digits) / 10 ** digits;

export interface ExcelExportInput {
  dayLogs: Record<string, DayLog>;
  profile: UserProfile;
  plans: MealPlan[];
  slotLabel: (slot: MealSlotId) => string;
  /** Header and sheet names, in the language of the app. */
  text: (english: string, italian: string) => string;
}

export function buildExcelExport({ dayLogs, profile, plans, slotLabel, text }: ExcelExportInput): Blob {
  const bmr = calculateBMR(profile);
  const dates = Object.keys(dayLogs).sort();
  const days: Row[] = [];
  const foods: Row[] = [];
  const activities: Row[] = [];
  const water: Row[] = [];

  for (const date of dates) {
    const log = dayLogs[date];
    const items = allMealItems(log.meals);
    const macros = calculateMacros(items);
    const intake = calculateTotalCalories(items);
    const actExp = calculateTotalActivityCalories(log.activities);
    const tef = calculateTEF(macros.carbsGrams, macros.proteinGrams, macros.fatGrams).totalTEF;
    const burned = bmr + actExp + tef;
    const waterMl = (log.waterEntries ?? []).reduce((sum, entry) => sum + entry.ml, 0);
    const hasData = items.length > 0 || log.activities.length > 0 || waterMl > 0 || typeof log.weightKg === 'number';
    if (hasData) {
      days.push([
        { date }, round(intake, 0), round(burned, 0), round(bmr, 0), round(actExp, 0), round(tef, 0), round(intake - burned, 0),
        round(macros.carbsGrams), round(macros.proteinGrams), round(macros.fatGrams), round(macros.fiberGrams),
        round(macros.saltGrams, 2), round(macros.sugarGrams), waterMl || null, log.weightKg ?? null,
      ]);
    }
    for (const [slot, list] of Object.entries(log.meals) as [MealSlotId, DayLog['meals'][MealSlotId]][]) {
      for (const item of list ?? []) {
        const k = item.amount / 100;
        foods.push([
          { date }, slotLabel(slot), item.name, item.amount, item.unit, round(item.calories * k, 0),
          item.carbs == null ? null : round(item.carbs * k), item.protein == null ? null : round(item.protein * k),
          item.fat == null ? null : round(item.fat * k), item.fiber == null ? null : round(item.fiber * k),
          item.salt == null ? null : round(item.salt * k, 2), item.sugar == null ? null : round(item.sugar * k),
        ]);
      }
    }
    for (const a of log.activities) {
      activities.push([
        { date }, a.timestamp ? a.timestamp.slice(11, 16) : null, a.customName || a.type, a.durationMin ?? null,
        a.distanceKm ?? null, round(a.caloriesBurned, 0), a.notes ?? null,
      ]);
    }
    for (const w of log.waterEntries ?? []) water.push([{ date }, w.timestamp ? w.timestamp.slice(11, 16) : null, w.ml]);
  }

  const planRows: Row[] = [...plans]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => [
      { date: p.date }, slotLabel(p.slot), p.title, p.note,
      p.items.map((i) => `${i.food.name_en || i.food.name_it} ${i.amount}${i.food.unit}`).join(', '),
      p.loggedAt ? text('Yes', 'Si') : text('No', 'No'),
    ]);

  return buildWorkbook([
    {
      name: text('Days', 'Giorni'),
      header: [
        text('Date', 'Data'), text('Intake (kcal)', 'Introdotte (kcal)'), text('Burned (kcal)', 'Bruciate (kcal)'), 'BMR (kcal)',
        text('Activity (kcal)', 'Attivita (kcal)'), 'TEF (kcal)', text('Intake - burned (kcal)', 'Introdotte - bruciate (kcal)'),
        text('Carbs (g)', 'Carboidrati (g)'), text('Protein (g)', 'Proteine (g)'), text('Fat (g)', 'Grassi (g)'),
        text('Fibre (g)', 'Fibre (g)'), text('Salt (g)', 'Sale (g)'), text('Sugar (g)', 'Zuccheri (g)'),
        text('Water (ml)', 'Acqua (ml)'), text('Weight (kg)', 'Peso (kg)'),
      ],
      rows: days,
      widths: [12, 14, 14, 11, 14, 10, 20, 13, 13, 11, 11, 10, 12, 12, 12],
    },
    {
      name: text('Foods', 'Alimenti'),
      header: [
        text('Date', 'Data'), text('Meal', 'Pasto'), text('Food', 'Alimento'), text('Amount', 'Quantita'), text('Unit', 'Unita'),
        'kcal', text('Carbs (g)', 'Carboidrati (g)'), text('Protein (g)', 'Proteine (g)'), text('Fat (g)', 'Grassi (g)'),
        text('Fibre (g)', 'Fibre (g)'), text('Salt (g)', 'Sale (g)'), text('Sugar (g)', 'Zuccheri (g)'),
      ],
      rows: foods,
      widths: [12, 16, 36, 10, 8, 9, 13, 13, 11, 11, 10, 12],
    },
    {
      name: text('Activities', 'Attivita'),
      header: [text('Date', 'Data'), text('Time', 'Ora'), text('Activity', 'Attivita'), text('Minutes', 'Minuti'), 'km', text('Burned (kcal)', 'Bruciate (kcal)'), text('Notes', 'Note')],
      rows: activities,
      widths: [12, 8, 24, 10, 8, 14, 30],
    },
    { name: text('Water', 'Acqua'), header: [text('Date', 'Data'), text('Time', 'Ora'), 'ml'], rows: water, widths: [12, 8, 10] },
    {
      name: text('Meal plans', 'Pasti pianificati'),
      header: [text('Date', 'Data'), text('Meal', 'Pasto'), text('Plan', 'Piano'), text('Note', 'Nota'), text('Foods', 'Alimenti'), text('Logged', 'Registrato')],
      rows: planRows,
      widths: [12, 16, 28, 36, 48, 10],
    },
  ]);
}
