import { useEffect, useRef } from 'react';
import { scheduleWrite } from './writeQueue';

/**
 * Persists `value` to localStorage under `key` whenever it CHANGES (not on mount), from an effect and through the
 * coalescing queue. Replaces the `localStorage.setItem` calls that used to live inside state updater functions.
 */
export function usePersistLocal<T>(key: string, value: T, serialize: (value: T) => string = JSON.stringify): void {
  const last = useRef(value);
  useEffect(() => {
    if (last.current === value) return;
    last.current = value;
    scheduleWrite(`ls:${key}`, () => localStorage.setItem(key, serialize(value)));
  }, [key, value, serialize]);
}
