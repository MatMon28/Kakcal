import { useMemo, useState } from 'react';
import type { PeriodDayLog } from '../types';
import { emptyDayLog } from './period';

type Changes = Partial<Omit<PeriodDayLog, 'updatedAt'>>;

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index]);

/** Keep only unsaved fields locally so catalogue changes cannot discard unrelated edits. */
export function usePeriodDayDraft(date: string, stored: PeriodDayLog | undefined) {
  const baseline = useMemo(() => stored ?? emptyDayLog(), [date, stored]);
  const [local, setLocal] = useState<{ date: string; changes: Changes } | null>(null);
  const draft = { ...baseline, ...(local?.date === date ? local.changes : {}) };
  const dirty = draft.isPeriod !== baseline.isPeriod || draft.flow !== baseline.flow ||
    draft.pillTaken !== baseline.pillTaken || (draft.notes ?? '') !== (baseline.notes ?? '') ||
    !sameList(draft.moods, baseline.moods) || !sameList(draft.symptoms, baseline.symptoms);

  const patch = (delta: Changes) => {
    setLocal((previous) => {
      const changes = { ...(previous?.date === date ? previous.changes : {}), ...delta };
      if (delta.isPeriod === false) changes.flow = 'none';
      else if (delta.flow && delta.flow !== 'none') changes.isPeriod = true;
      else if (delta.isPeriod === true && (changes.flow ?? baseline.flow) === 'none') changes.flow = 'medium';
      return { date, changes };
    });
  };

  return { draft, dirty, patch, discard: () => setLocal(null) };
}
