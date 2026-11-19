import { useEffect, useSyncExternalStore } from 'react';
import { getLoadedOffCatalog, loadOffCatalog, subscribeOffCatalog, type OffCatalog } from '../data/offCatalog';

/**
 * The offline Open Food Facts catalogue, or null while it loads (or if it is unavailable).
 * Pass `enabled` only while a food search is on screen: the 12 MB file is fetched the first time
 * this is enabled and then kept for the rest of the session.
 */
export function useOffCatalog(enabled = true): OffCatalog | null {
  const catalog = useSyncExternalStore(subscribeOffCatalog, getLoadedOffCatalog, () => null);
  useEffect(() => {
    if (enabled && !catalog) void loadOffCatalog();
  }, [enabled, catalog]);
  return catalog;
}
