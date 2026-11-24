import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../src/context/AppContext';
import { DataBackup } from '../src/components/common/DataBackup';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { flushWrites } from '../src/storage/writeQueue';
import { resetBootForTests } from '../src/storage/boot';
import { importMealJournal } from '../src/utils/journalStore';

// The APK path: the file is written by the native plugin, never by a browser download.
const exportBackup = vi.hoisted(() => vi.fn());
vi.mock('../src/utils/android', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/android')>()),
  isAndroidApp: () => true,
  JournalDevice: { exportBackup, exportFile: vi.fn(), setLaunchBackground: vi.fn().mockResolvedValue(undefined) },
}));

beforeEach(async () => {
  await deleteDatabase(); resetDbForTests(); resetBootForTests(); localStorage.clear();
  importMealJournal({});
  exportBackup.mockReset();
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
});
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await flushWrites(); });

const renderBackup = () => render(<AppProvider><DataBackup /></AppProvider>);

describe('Android APK: Export JSON goes through the native plugin', () => {
  it('sends a non-empty version 2 backup with a file name and shows the saved size', async () => {
    exportBackup.mockResolvedValue({ bytes: 2048 });
    renderBackup();
    await act(async () => { fireEvent.click(screen.getByText('Export JSON')); });
    expect(exportBackup).toHaveBeenCalledTimes(1);
    const { json, filename } = exportBackup.mock.calls[0][0] as { json: string; filename: string };
    expect(json.length).toBeGreaterThan(100); // never an empty payload (that produced a 0 B file)
    expect(JSON.parse(json).version).toBe('2.0');
    expect(filename).toMatch(/^kakcal_backup_\d{4}-\d{2}-\d{2}\.json$/);
    expect(URL.createObjectURL).not.toHaveBeenCalled(); // no browser blob download inside the APK
    expect(screen.getByRole('status').textContent).toMatch(/Backup saved\. \(2\.0 KB\)/);
  });

  it('shows no success message when the user cancels the picker', async () => {
    exportBackup.mockResolvedValue({ cancelled: true });
    renderBackup();
    await act(async () => { fireEvent.click(screen.getByText('Export JSON')); });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows an error when the native side could not write the file', async () => {
    exportBackup.mockRejectedValue(new Error('Could not write the selected file'));
    renderBackup();
    await act(async () => { fireEvent.click(screen.getByText('Export JSON')); });
    expect(screen.getByRole('alert').textContent).toMatch(/Could not save the backup/);
  });
});
