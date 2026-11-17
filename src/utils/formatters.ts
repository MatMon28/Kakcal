import { Language } from '../types';

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
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatFullDate(dateStr: string, lang: Language): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatKcal(val: number): string {
  return Math.round(val).toLocaleString();
}

export function diffDays(fromDateStr: string, toDateStr: string): number {
  const [fy, fm, fd] = fromDateStr.split('-').map(Number);
  const [ty, tm, td] = toDateStr.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}
