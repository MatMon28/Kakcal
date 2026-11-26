import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  DayLog,
  Language,
  MealSlotId,
  Settings,
  UserProfile,
} from '../types';
import type { AdvancedSettings, BodyEntries } from '../types/advanced';
import type { MealMemory } from '../types/journal';
import { activityLogLabel } from './activityLabel';
import { DEFAULT_MEASURES, isPairedMeasure, seriesKeysOf } from './advancedStore';
import {
  calculateBMR,
  calculateMacros,
  calculateTEF,
  calculateTotalActivityCalories,
  calculateTotalCalories,
} from './calculations';
import { addDaysToDateString } from './formatters';
import { allMealItems } from './mealItems';
import { dailyWaterTargetMl } from './waterTarget';

export interface PdfDateRange {
  from: string;
  to: string;
}

export interface PdfExportOptions {
  includeDailyLog: boolean;
  includeMealDiary: boolean;
}

export interface PdfExportInput {
  dayLogs: Record<string, DayLog>;
  profile: UserProfile;
  slotLabel: (slot: MealSlotId) => string;
  text: (en: string, it: string) => string;
  dateRange: PdfDateRange;
  options: PdfExportOptions;
  language: Language;
  memories?: Record<string, MealMemory>;
  bodyEntries?: BodyEntries;
  bodyConfig?: AdvancedSettings['body'];
  settings?: Settings;
  generatedDate?: string;
}

interface DaySummaryRow {
  date: string;
  log?: DayLog;
  intake: number;
  bmr: number;
  activityKcal: number;
  tef: number;
  burned: number;
  net: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  waterMl: number;
  weightKg?: number;
  activityMin: number;
  activityNames: string[];
  poopCount: number;
  hasAnyData: boolean;
}

/** Standard PDF Helvetica only supports Latin-1; normalize arrows/dashes and strip unsupported glyphs cleanly. */
function pdfSafe(str: string): string {
  return str
    .replace(/[\u2192]/g, '->')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022\u00b7]/g, '|')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e\xa0-\xff]/g, '');
}

function enumerateDates(from: string, to: string): string[] {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const dates: string[] = [];
  let cur = start;
  // Cap at 366 days to prevent runaway loops on malformed input
  for (let i = 0; i < 366 && cur <= end; i += 1) {
    dates.push(cur);
    cur = addDaysToDateString(cur, 1);
  }
  return dates;
}

function sumWaterMl(log?: DayLog): number {
  if (!log) return 0;
  if (log.waterEntries && log.waterEntries.length > 0) {
    return log.waterEntries.reduce((sum, e) => sum + e.ml, 0);
  }
  return log.waterMl ?? 0;
}

function drawKakcalMark(doc: jsPDF, x: number, y: number): void {
  // Compact rounded badge matching Kakcal's cream/ink palette + bold wordmark
  doc.setFillColor(249, 243, 230);
  doc.setDrawColor(215, 206, 188);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, 7.5, 7.5, 1.8, 1.8, 'FD');

  doc.setFillColor(11, 15, 30);
  // Three rounded tiers + tip of the Kakcal mark
  doc.roundedRect(x + 1.4, y + 4.7, 4.7, 1.7, 0.8, 0.8, 'F');
  doc.roundedRect(x + 2.0, y + 3.4, 3.5, 1.6, 0.8, 0.8, 'F');
  doc.roundedRect(x + 2.6, y + 2.2, 2.3, 1.5, 0.7, 0.7, 'F');
  doc.triangle(x + 3.75, y + 1.1, x + 2.9, y + 2.5, x + 4.6, y + 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(11, 15, 30);
  doc.text('Kakcal', x + 9.5, y + 5.6);
}

export function countPdfDaysWithLogs(
  dayLogs: Record<string, DayLog>,
  range: PdfDateRange,
): number {
  const start = range.from <= range.to ? range.from : range.to;
  const end = range.from <= range.to ? range.to : range.from;
  let count = 0;
  for (const [date, log] of Object.entries(dayLogs)) {
    if (date < start || date > end) continue;
    const hasFoods = allMealItems(log.meals).length > 0;
    const hasAct = log.activities.length > 0;
    const hasWater = sumWaterMl(log) > 0;
    const hasWeight = typeof log.weightKg === 'number';
    const hasPoop = (log.poops?.length ?? 0) > 0;
    if (hasFoods || hasAct || hasWater || hasWeight || hasPoop) count += 1;
  }
  return count;
}

/**
 * Generates a clinician- and user-readable A4 PDF report for a selected date range.
 * Page 1: Executive & clinical summary (KPIs, macros, hydration/activity, intake vs target chart, weight evolution).
 * Optional Page 2+: Daily breakdown table.
 * Optional Pages 3+: Meal-by-meal food diary with meal notes.
 */
export function buildPdfReport(input: PdfExportInput): Blob {
  const {
    dayLogs,
    profile,
    slotLabel,
    text,
    dateRange,
    options,
    language,
    memories = {},
    bodyEntries = {},
    bodyConfig,
    generatedDate = new Date().toISOString().slice(0, 10),
  } = input;

  const dates = enumerateDates(dateRange.from, dateRange.to);
  const start = dates[0] ?? dateRange.from;
  const end = dates[dates.length - 1] ?? dateRange.to;
  const bmr = calculateBMR(profile);
  const targetIntake = profile.targetIntakeKcal && profile.targetIntakeKcal > 0 ? profile.targetIntakeKcal : bmr;
  const activityLabels = {
    walking: text('Walking', 'Camminata'),
    running: text('Running', 'Corsa'),
    custom: text('Custom', 'Personalizzata'),
    other: text('Other', 'Altro'),
  };

  const rows: DaySummaryRow[] = dates.map((date) => {
    const log = dayLogs[date];
    const items = log ? allMealItems(log.meals) : [];
    const intake = Math.round(calculateTotalCalories(items));
    const macros = calculateMacros(items);
    const activityKcal = log ? Math.round(calculateTotalActivityCalories(log.activities)) : 0;
    const tef = calculateTEF(macros.carbsGrams, macros.proteinGrams, macros.fatGrams).totalTEF;
    const burned = bmr + activityKcal + tef;
    const waterMl = Math.round(sumWaterMl(log));
    const weightKg = typeof log?.weightKg === 'number' ? log.weightKg : undefined;
    const activityMin = log ? log.activities.reduce((s, a) => s + (a.durationMin ?? 0), 0) : 0;
    const activityNames = log ? log.activities.map((a) => activityLogLabel(a, language, activityLabels)) : [];
    const poopCount = log?.poops?.length ?? 0;
    const hasAnyData = items.length > 0 || (log?.activities.length ?? 0) > 0 || waterMl > 0 || weightKg !== undefined || poopCount > 0;
    return {
      date,
      log,
      intake,
      bmr,
      activityKcal,
      tef,
      burned,
      net: intake - burned,
      carbs: macros.carbsGrams,
      protein: macros.proteinGrams,
      fat: macros.fatGrams,
      fiber: macros.fiberGrams,
      waterMl,
      weightKg,
      activityMin,
      activityNames,
      poopCount,
      hasAnyData,
    };
  });

  const loggedRows = rows.filter((r) => r.hasAnyData);
  const denom = loggedRows.length || 1;
  const avgIntake = Math.round(loggedRows.reduce((s, r) => s + r.intake, 0) / denom);
  const avgBurned = Math.round(loggedRows.reduce((s, r) => s + r.burned, 0) / denom);
  const avgAct = Math.round(loggedRows.reduce((s, r) => s + r.activityKcal, 0) / denom);
  const avgTef = Math.round(loggedRows.reduce((s, r) => s + r.tef, 0) / denom);
  const avgNet = avgIntake - avgBurned;
  const totalNet = loggedRows.reduce((s, r) => s + r.net, 0);

  const avgProtein = loggedRows.reduce((s, r) => s + r.protein, 0) / denom;
  const avgCarbs = loggedRows.reduce((s, r) => s + r.carbs, 0) / denom;
  const avgFat = loggedRows.reduce((s, r) => s + r.fat, 0) / denom;
  const avgFiber = loggedRows.reduce((s, r) => s + r.fiber, 0) / denom;
  const macroKcal = avgProtein * 4 + avgCarbs * 4 + avgFat * 9;
  const pPct = macroKcal > 0 ? Math.round(((avgProtein * 4) / macroKcal) * 100) : 0;
  const cPct = macroKcal > 0 ? Math.round(((avgCarbs * 4) / macroKcal) * 100) : 0;
  const fPct = macroKcal > 0 ? Math.max(0, 100 - pPct - cPct) : 0;

  const weightPoints = rows
    .filter((r): r is DaySummaryRow & { weightKg: number } => typeof r.weightKg === 'number')
    .map((r) => ({ date: r.date, value: r.weightKg }));

  const currentWeight = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1].value : profile.weightKg;
  const proteinPerKg = currentWeight > 0 ? (avgProtein / currentWeight).toFixed(2) : '-';

  const avgWater = Math.round(loggedRows.reduce((s, r) => s + r.waterMl, 0) / denom);
  const waterTarget = dailyWaterTargetMl(profile, avgAct);
  const totalSessions = rows.reduce((s, r) => s + (r.log?.activities.length ?? 0), 0);
  const totalActMin = rows.reduce((s, r) => s + r.activityMin, 0);
  const totalPoops = rows.reduce((s, r) => s + r.poopCount, 0);

  // Collect body measurement delta summary if any entries fall inside [start, end]
  const bodySummaryParts: string[] = [];
  const defaultMeasureNames: Record<string, [string, string]> = {
    waist: ['Waist', 'Vita'],
    neck: ['Neck', 'Collo'],
    hips: ['Hips', 'Fianchi'],
    chest: ['Chest', 'Torace'],
    forearms: ['Forearms', 'Avambracci'],
    biceps: ['Biceps', 'Bicipiti'],
    thighs: ['Thighs', 'Cosce'],
    calves: ['Calves', 'Polpacci'],
  };
  const allMeasures = [
    ...DEFAULT_MEASURES.map((m) => {
      const pair = defaultMeasureNames[m.id];
      return { id: m.id, name: pair ? text(pair[0], pair[1]) : m.id, unit: 'cm' };
    }),
    ...(bodyConfig?.custom ?? []).map((m) => ({ id: m.id, name: m.name, unit: m.unit })),
  ];
  for (const m of allMeasures) {
    const seriesList = seriesKeysOf(m.id);
    for (const { side, key } of seriesList) {
      const list = (bodyEntries[key] ?? [])
        .filter((e) => e.date >= start && e.date <= end)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (list.length > 0) {
        const sideSuffix = isPairedMeasure(m.id) && side ? (side === 'left' ? ` (${text('L', 'S')})` : ` (${text('R', 'D')})`) : '';
        const first = list[0].value;
        const last = list[list.length - 1].value;
        const textVal = list.length > 1 ? `${first} -> ${last} ${m.unit}` : `${last} ${m.unit}`;
        bodySummaryParts.push(`${m.name}${sideSuffix}: ${textVal}`);
        break;
      }
    }
    if (bodySummaryParts.length >= 2) break;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // 210
  const pageH = doc.internal.pageSize.getHeight(); // 297
  const margin = 14;
  const contentW = pageW - margin * 2; // 182

  // ---- HEADER ----
  drawKakcalMark(doc, margin, 11);

  const periodLabel = dates.length <= 7
    ? text(`Weekly Summary (${start} to ${end})`, `Riepilogo settimanale (${start} - ${end})`)
    : dates.length <= 31
      ? text(`Monthly Summary (${start} to ${end})`, `Riepilogo mensile (${start} - ${end})`)
      : text(`Period Summary (${start} to ${end})`, `Riepilogo periodo (${start} - ${end})`);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(pdfSafe(periodLabel), margin, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(pdfSafe(text(`Generated ${generatedDate} | ${dates.length} days`, `Generato il ${generatedDate} | ${dates.length} giorni`)), margin, 29);

  // Right-aligned patient / user profile block
  const sexLabel = profile.sex === 'male' ? text('M', 'M') : text('F', 'F');
  const weightHdr = weightPoints.length >= 2
    ? `${weightPoints[0].value.toFixed(1)} -> ${weightPoints[weightPoints.length - 1].value.toFixed(1)} kg (${(weightPoints[weightPoints.length - 1].value - weightPoints[0].value) >= 0 ? '+' : ''}${(weightPoints[weightPoints.length - 1].value - weightPoints[0].value).toFixed(1)} kg)`
    : `${currentWeight.toFixed(1)} kg`;

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(pdfSafe(`${text('Profile', 'Profilo')}: ${profile.age}${text('y', 'a')} | ${sexLabel} | ${profile.heightCm} cm`), pageW - margin, 15, { align: 'right' });
  doc.text(pdfSafe(`${text('Weight', 'Peso')}: ${weightHdr}`), pageW - margin, 20, { align: 'right' });
  doc.text(pdfSafe(`${text('Target', 'Obiettivo')}: ${targetIntake} kcal/d | BMR ${bmr} kcal`), pageW - margin, 25, { align: 'right' });

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(margin, 33, pageW - margin, 33);

  // ---- SECTION 1: KPI CARDS ----
  let y = 39;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(pdfSafe(text('1. PERIOD AVERAGES & COMPLIANCE', '1. MEDIE DEL PERIODO E ADERENZA')), margin, y);
  y += 3;

  const kpiGap = 3;
  const kpiW = (contentW - kpiGap * 3) / 4;
  const kpiH = 20;
  const kpis = [
    {
      label: text('Avg. Daily Intake', 'Assunzione media'),
      val: `${avgIntake} kcal`,
      sub: `${text('Target', 'Obiettivo')}: ${targetIntake} (${avgIntake - targetIntake >= 0 ? '+' : ''}${avgIntake - targetIntake})`,
      accent: avgIntake <= targetIntake ? [5, 150, 105] : [217, 119, 6],
    },
    {
      label: text('Avg. Daily Burned', 'Dispendio medio'),
      val: `${avgBurned} kcal`,
      sub: `BMR ${bmr} | Act ${avgAct} | TEF ${avgTef}`,
      accent: [15, 23, 42],
    },
    {
      label: text('Avg. Net Balance', 'Bilancio netto medio'),
      val: `${avgNet >= 0 ? '+' : ''}${avgNet} kcal/d`,
      sub: `${text('Total', 'Totale')}: ${totalNet >= 0 ? '+' : ''}${totalNet} kcal`,
      accent: avgNet <= 0 ? [5, 150, 105] : [217, 119, 6],
    },
    {
      label: text('Logging Compliance', 'Giorni registrati'),
      val: `${loggedRows.length} / ${dates.length} ${text('days', 'gg')}`,
      sub: `${Math.round((loggedRows.length / (dates.length || 1)) * 100)}% ${text('complete', 'completato')}`,
      accent: [15, 23, 42],
    },
  ];

  kpis.forEach((k, idx) => {
    const kx = margin + idx * (kpiW + kpiGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(kx, y, kpiW, kpiH, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafe(k.label), kx + 3, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(k.accent[0], k.accent[1], k.accent[2]);
    doc.text(pdfSafe(k.val), kx + 3, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(pdfSafe(k.sub), kx + 3, y + 17);
  });

  y += kpiH + 7;

  // ---- SECTION 2 & 3: MACROS + HYDRATION/WELLNESS ----
  const halfW = (contentW - 4) / 2;
  const boxH = 44;

  // Box 2: Macros
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, halfW, boxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(pdfSafe(text('2. MACRONUTRIENT DISTRIBUTION (AVG)', '2. DISTRIBUZIONE MACRONUTRIENTI (MEDIA)')), margin + 4, y + 6);

  const macroBars = [
    { label: `${text('Protein', 'Proteine')} - ${avgProtein.toFixed(0)} g (${proteinPerKg} g/kg)`, pct: pPct, color: [79, 70, 229] },
    { label: `${text('Carbohydrates', 'Carboidrati')} - ${avgCarbs.toFixed(0)} g`, pct: cPct, color: [245, 158, 11] },
    { label: `${text('Fat', 'Grassi')} - ${avgFat.toFixed(0)} g`, pct: fPct, color: [244, 63, 94] },
  ];

  macroBars.forEach((m, i) => {
    const my = y + 12 + i * 9.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(pdfSafe(m.label), margin + 4, my);
    doc.text(`${m.pct}%`, margin + halfW - 4, my, { align: 'right' });

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + 4, my + 1.8, halfW - 8, 2.2, 1, 1, 'F');
    if (m.pct > 0) {
      doc.setFillColor(m.color[0], m.color[1], m.color[2]);
      doc.roundedRect(margin + 4, my + 1.8, Math.max(2, ((halfW - 8) * m.pct) / 100), 2.2, 1, 1, 'F');
    }
  });
  if (avgFiber > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafe(`${text('Avg. Fiber', 'Fibre medie')}: ${avgFiber.toFixed(1)} g/d`), margin + 4, y + 40.5);
  }

  // Box 3: Hydration, Activity & Wellness
  const box3X = margin + halfW + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(box3X, y, halfW, boxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(pdfSafe(text('3. HYDRATION, ACTIVITY & WELLNESS', '3. IDRATAZIONE, ATTIVITA E BENESSERE')), box3X + 4, y + 6);

  const wellnessRows = [
    [text('Avg. Water Intake', 'Acqua media'), `${avgWater} / ${waterTarget} ml`],
    [text('Exercise Sessions', 'Sessioni esercizio'), `${totalSessions} (${totalActMin} min)`],
    [text('Digestive (Poop) Log', 'Voci intestinali'), `${totalPoops} ${text('entries', 'voci')}`],
    [text('Body Measurements', 'Misure corporee'), bodySummaryParts[0] ?? text('None recorded', 'Nessuna')],
  ];
  wellnessRows.forEach(([k, v], i) => {
    const wy = y + 13 + i * 7.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafe(k), box3X + 4, wy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(pdfSafe(v), box3X + halfW - 4, wy, { align: 'right' });
  });

  y += boxH + 7;

  // ---- SECTION 4 & 5: DAILY INTAKE VS TARGET + WEIGHT EVOLUTION ----
  const chartBoxH = 58;

  // Box 4: Daily Intake vs Target
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, halfW, chartBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(pdfSafe(text('4. DAILY INTAKE VS. TARGET', '4. ASSUNZIONE GIORNALIERA VS OBIETTIVO')), margin + 4, y + 6);

  const chartX = margin + 5;
  const chartW = halfW - 10;
  const chartBottom = y + 48;
  const chartH = 32;
  const maxBarKcal = Math.max(targetIntake * 1.2, ...rows.map((r) => r.intake), 1);

  // Baseline
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(chartX, chartBottom, chartX + chartW, chartBottom);

  // Bars (exact proportional scale)
  const slotW = chartW / Math.max(rows.length, 1);
  const barW = Math.min(8, slotW * 0.68);
  rows.forEach((r, idx) => {
    const bx = chartX + idx * slotW + (slotW - barW) / 2;
    const bh = (r.intake / maxBarKcal) * chartH;
    if (r.intake > 0) {
      if (r.intake > targetIntake) doc.setFillColor(245, 158, 11);
      else doc.setFillColor(5, 150, 105);
      doc.rect(bx, chartBottom - bh, barW, bh, 'F');

      if (rows.length <= 10) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(String(r.intake), bx + barW / 2, chartBottom - bh - 1.2, { align: 'center' });
      }
    }
    const showLabel = rows.length <= 10 || idx === 0 || idx === Math.floor(rows.length / 2) || idx === rows.length - 1;
    if (showLabel) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(r.date.slice(5), bx + barW / 2, chartBottom + 4, { align: 'center' });
    }
  });

  // Dashed Target Line (no text label on the line, coherent with bar scale)
  const targetY = chartBottom - (targetIntake / maxBarKcal) * chartH;
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([1.5, 1.2], 0);
  doc.line(chartX, targetY, chartX + chartW, targetY);
  doc.setLineDashPattern([], 0);

  // Box 5: Weight Evolution
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(box3X, y, halfW, chartBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(pdfSafe(text('5. WEIGHT EVOLUTION', '5. ANDAMENTO DEL PESO')), box3X + 4, y + 6);

  if (weightPoints.length >= 2) {
    const firstW = weightPoints[0].value;
    const lastW = weightPoints[weightPoints.length - 1].value;
    const deltaW = lastW - firstW;
    const minW = Math.min(...weightPoints.map((p) => p.value));
    const maxW = Math.max(...weightPoints.map((p) => p.value));
    const avgW = weightPoints.reduce((s, p) => s + p.value, 0) / weightPoints.length;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(deltaW <= 0 ? 5 : 217, deltaW <= 0 ? 150 : 119, deltaW <= 0 ? 105 : 6);
    doc.text(`${deltaW >= 0 ? '+' : ''}${deltaW.toFixed(1)} kg`, box3X + halfW - 4, y + 6, { align: 'right' });

    const wX = box3X + 6;
    const wW = halfW - 12;
    const wTop = y + 14;
    const wH = 29;
    const lo = minW - 0.3;
    const hi = maxW + 0.3;
    const coords = weightPoints.map((p, idx) => ({
      x: wX + (idx / (weightPoints.length - 1)) * wW,
      y: wTop + (1 - (p.value - lo) / (hi - lo || 1)) * wH,
      value: p.value,
    }));

    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.6);
    for (let i = 1; i < coords.length; i += 1) {
      doc.line(coords[i - 1].x, coords[i - 1].y, coords[i].x, coords[i].y);
    }
    coords.forEach((c, idx) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(0.5);
      doc.circle(c.x, c.y, 0.9, 'FD');
      if (coords.length <= 10 || idx === 0 || idx === coords.length - 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(51, 65, 85);
        doc.text(c.value.toFixed(1), c.x, c.y - 2, { align: 'center' });
      }
    });

    doc.setDrawColor(241, 245, 249);
    doc.line(box3X + 4, y + 48, box3X + halfW - 4, y + 48);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(
      pdfSafe(`${text('Start', 'Inizio')}: ${firstW.toFixed(1)} | ${text('Avg', 'Media')}: ${avgW.toFixed(1)} | ${text('Min', 'Min')}: ${minW.toFixed(1)} | ${text('End', 'Fine')}: ${lastW.toFixed(1)} kg`),
      box3X + halfW / 2,
      y + 53.5,
      { align: 'center' },
    );
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const msg = weightPoints.length === 1
      ? `${text('Single weight entry', 'Unica pesata')}: ${weightPoints[0].value.toFixed(1)} kg`
      : text('No weight entries in this period.', 'Nessun peso registrato in questo periodo.');
    doc.text(pdfSafe(msg), box3X + halfW / 2, y + 30, { align: 'center' });
  }

  // ---- OPTIONAL PAGE 2: DAILY LOG TABLE ----
  if (options.includeDailyLog) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafe(text('Daily Overview', 'Riepilogo giornaliero')), margin, 16);

    autoTable(doc, {
      startY: 20,
      margin: { left: margin, right: margin, bottom: 16 },
      head: [[
        text('Date', 'Data'),
        text('Weight', 'Peso'),
        text('Intake', 'Assunte'),
        text('Burned', 'Bruciate'),
        text('Net', 'Netto'),
        'P / C / F (g)',
        text('Water', 'Acqua'),
        text('Activity', 'Attivita'),
      ]],
      body: rows.map((r) => [
        r.date,
        r.weightKg !== undefined ? `${r.weightKg.toFixed(1)} kg` : '-',
        r.intake > 0 ? `${r.intake}` : '-',
        `${r.burned}`,
        `${r.net >= 0 ? '+' : ''}${r.net}`,
        `${Math.round(r.protein)} / ${Math.round(r.carbs)} / ${Math.round(r.fat)}`,
        r.waterMl > 0 ? `${r.waterMl} ml` : '-',
        pdfSafe(r.activityNames.length > 0 ? `${r.activityNames.join(', ')}${r.activityMin > 0 ? ` (${r.activityMin}m)` : ''}` : '-'),
      ]),
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  // ---- OPTIONAL PAGE 3+: DETAILED MEAL DIARY ----
  if (options.includeMealDiary) {
    const diaryRows: string[][] = [];
    for (const r of rows) {
      if (!r.log) continue;
      for (const [slotKey, items] of Object.entries(r.log.meals) as [MealSlotId, typeof r.log.meals.breakfast][]) {
        if (!items || items.length === 0) continue;
        const sLabel = slotLabel(slotKey);
        const memNote = (memories[`${r.date}:${slotKey}`]?.note ?? '').trim();
        items.forEach((item, idx) => {
          const factor = item.amount / 100;
          const kcal = Math.round(item.calories * factor);
          const p = Math.round((item.protein ?? 0) * factor);
          const c = Math.round((item.carbs ?? 0) * factor);
          const f = Math.round((item.fat ?? 0) * factor);
          diaryRows.push([
            idx === 0 ? r.date : '',
            idx === 0 ? pdfSafe(sLabel) : '',
            pdfSafe(`${item.name} (${item.amount} ${item.unit})`),
            `${kcal}`,
            `${p} / ${c} / ${f}`,
            idx === 0 && memNote ? pdfSafe(memNote) : '',
          ]);
        });
      }
    }

    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafe(text('Detailed Meal Diary', 'Diario dettagliato dei pasti')), margin, 16);

    if (diaryRows.length > 0) {
      autoTable(doc, {
        startY: 20,
        margin: { left: margin, right: margin, bottom: 16 },
        head: [[
          text('Date', 'Data'),
          text('Meal', 'Pasto'),
          text('Food & Portion', 'Alimento e porzione'),
          'kcal',
          'P / C / F (g)',
          text('Note', 'Nota'),
        ]],
        body: diaryRows,
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 41, 59] },
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 2: { cellWidth: 56 }, 5: { cellWidth: 34 } },
      });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(pdfSafe(text('No meals logged in this period.', 'Nessun pasto registrato in questo periodo.')), margin, 26);
    }
  }

  // ---- FOOTER ON ALL PAGES ----
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Kakcal', margin, pageH - 7.5);
    doc.text(pdfSafe(text(`Page ${i} of ${totalPages}`, `Pagina ${i} di ${totalPages}`)), pageW - margin, pageH - 7.5, { align: 'right' });
  }

  return doc.output('blob');
}
