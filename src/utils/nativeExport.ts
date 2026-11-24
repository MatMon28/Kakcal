import type { PluginListenerHandle } from '@capacitor/core';
import { JournalDevice, type NativeExportRecord } from './android';

/** Exports the native side finished after the call was lost. Never rejects (browser or old APK = empty list). */
export async function takeNativeExports(): Promise<NativeExportRecord[]> {
  try {
    const result = await JournalDevice.takeLastExport();
    return Array.isArray(result?.exports) ? result.exports : [];
  } catch {
    return [];
  }
}

/** Calls `listener` when the native side finished an export whose call was lost. Returns the unsubscribe. */
export function onNativeExportFinished(listener: () => void): () => void {
  let handle: PluginListenerHandle | undefined;
  let stopped = false;
  try {
    void Promise.resolve(JournalDevice.addListener('exportFinished', listener)).then((h) => {
      if (stopped) void h?.remove?.(); else handle = h;
    }).catch(() => undefined);
  } catch { /* old APK without the event */ }
  return () => { stopped = true; void handle?.remove?.(); };
}
