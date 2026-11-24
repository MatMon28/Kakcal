import { loadDayLogs, type LoadedDays } from './dayStore';

/**
 * Asynchronous storage start-up. `main.tsx` awaits `bootStorage()` together with the launch animation's first
 * paint, so the provider can read the loaded days synchronously on its first render.
 */
let booted: LoadedDays | null = null;
let starting: Promise<LoadedDays> | null = null;

export function bootStorage(): Promise<LoadedDays> {
  starting ??= loadDayLogs()
    .catch((error) => {
      console.error('Storage boot failed; starting empty', error);
      return { logs: {}, initialised: false, backend: 'local' as const };
    })
    .then((loaded) => { booted = loaded; return loaded; });
  return starting;
}

export const bootedDays = () => booted;
export function resetBootForTests() { booted = null; starting = null; }
