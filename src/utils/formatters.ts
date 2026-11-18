import { Language } from '../types';

// Intl formatters are expensive to construct (they load locale data), and the journal
// formats dozens of numbers and dates per render. Reuse one instance per locale + options
// instead of letting every toLocaleString()/toLocaleDateString() call create a new one.
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const numberFormatters = new Map<string, Intl.NumberFormat>();

export function dateFormatter(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale ?? ''}|${JSON.stringify(options)}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

export function numberFormatter(locale?: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale ?? ''}|${options ? JSON.stringify(options) : ''}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr: string, lang: Language): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const todayStr = getTodayDateString();
  const yesterdayStr = addDaysToDateString(todayStr, -1);
  const tomorrowStr = addDaysToDateString(todayStr, 1);

  if (dateStr === todayStr) {
    return lang === 'it' ? 'Oggi' : 'Today';
  } else if (dateStr === yesterdayStr) {
    return lang === 'it' ? 'Ieri' : 'Yesterday';
  } else if (dateStr === tomorrowStr) {
    return lang === 'it' ? 'Domani' : 'Tomorrow';
  }

  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  return dateFormatter(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

export function formatFullDate(dateStr: string, lang: Language): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  return dateFormatter(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export function formatKcal(val: number): string {
  return numberFormatter().format(Math.round(val));
}

export function diffDays(fromDateStr: string, toDateStr: string): number {
  const [fy, fm, fd] = fromDateStr.split('-').map(Number);
  const [ty, tm, td] = toDateStr.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}
