import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../src/context/AppContext';
import { DataBackup } from '../src/components/common/DataBackup';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { flushWrites } from '../src/storage/writeQueue';
import { resetBootForTests } from '../src/storage/boot';
import { addMealPhoto, importMealJournal } from '../src/utils/journalStore';
import { saveLocalFile } from '../src/utils/planSharing';

// The APK path: the file is written by the native plugin, never by a browser download.
const { exportBackup, exportFile, takeLastExport } = vi.hoisted(() => ({ exportBackup: vi.fn(), exportFile: vi.fn(), takeLastExport: vi.fn() }));
vi.mock('../src/utils/android', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/android')>()),
  isAndroidApp: () => true,
  JournalDevice: {
    exportBackup, exportFile, takeLastExport,
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    setLaunchBackground: vi.fn().mockResolvedValue(undefined),
  },
}));
// Excel and the pictures ZIP are built in the browser; only their hand-over to the native plugin is under test here.
vi.mock('../src/utils/excelExport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/excelExport')>()),
  buildExcelExport: () => new Blob(['xlsx-bytes'], { type: 'application/octet-stream' }),
}));
vi.mock('../src/utils/photoExport', () => ({ exportMealPictures: async () => new Blob(['zip-bytes'], { type: 'application/zip' }) }));

beforeEach(async () => {
  await deleteDatabase(); resetDbForTests(); resetBootForTests(); localStorage.clear();
  importMealJournal({});
  exportBackup.mockReset(); exportFile.mockReset(); takeLastExport.mockReset();
  takeLastExport.mockResolvedValue({ exports: [] });
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
});
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await flushWrites(); });

// tests/setup.ts swaps in Node's Blob, which jsdom's FileReader refuses; this stand-in encodes the same way.
class TestFileReader {
  result: string | null = null; onload: (() => void) | null = null; onerror: (() => void) | null = null; error: unknown = null;
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((buffer) => { this.result = `data:;base64,${Buffer.from(buffer).toString('base64')}`; this.onload?.(); });
  }
}
beforeEach(() => { vi.stubGlobal('FileReader', TestFileReader); });
afterEach(() => { vi.unstubAllGlobals(); });

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

// Round 2: the three buttons share ONE contract: { cancelled?, bytes? } in, "saved (size)" / nothing / red error out.
describe.each([
  { name: 'Export to Excel', click: 'Export to Excel', file: /^kakcal_data_\d{4}-\d{2}-\d{2}\.xlsx$/, kind: 'xlsx', saved: /Excel file exported.*\(12\.4 KB\)/ },
  { name: 'Export meal pictures', click: 'Export meal pictures', file: /^kakcal_meal_pictures_\d{4}-\d{2}-\d{2}\.zip$/, kind: 'zip', saved: /1 pictures exported with their notes\. \(12\.4 KB\)/ },
])('Android APK: $name honours cancel and byte count', ({ click, file, kind, saved }) => {
  const press = async () => {
    await addMealPhoto({ id: 'p1', date: '2026-02-03', slot: 'lunch', note: '', createdAt: '' }, new Blob(['img'], { type: 'image/jpeg' }));
    renderBackup();
    await act(async () => { fireEvent.click(screen.getByText(click)); });
    if (kind === 'xlsx') {
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Export \.xlsx/i })); });
    }
  };

  it('hands a non-empty file with the right name and kind to the native plugin and shows the size', async () => {
    exportFile.mockResolvedValue({ bytes: 12700 });
    await press();
    expect(exportFile).toHaveBeenCalledTimes(1);
    const call = exportFile.mock.calls[0][0] as { base64: string; filename: string; kind: string };
    expect(call.base64.length).toBeGreaterThan(0);
    expect(call.filename).toMatch(file);
    expect(call.kind).toBe(kind);
    expect(screen.getByRole('status').textContent).toMatch(saved);
  });

  it('shows nothing when the picker is closed', async () => {
    exportFile.mockResolvedValue({ cancelled: true });
    await press();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the red error, with the native detail, when the write failed', async () => {
    exportFile.mockRejectedValue(new Error('Could not write the selected file: mode=wt FileNotFoundException: boom (provider=x) [the empty document was removed]'));
    await press();
    expect(screen.getByRole('alert').textContent).toMatch(/mode=wt FileNotFoundException/);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('treats a success without a byte count as an error, never as "saved"', async () => {
    exportFile.mockResolvedValue({});
    await press();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('alert').textContent).toMatch(/byte count/);
  });
});

describe('Android APK: Export JSON never reports success without a byte count', () => {
  it('shows the red error when the native side answers without bytes', async () => {
    exportBackup.mockResolvedValue({});
    renderBackup();
    await act(async () => { fireEvent.click(screen.getByText('Export JSON')); });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

describe('Android APK: an export that finished while the app was away', () => {
  it('shows the saved size when the app starts after the picker returned', async () => {
    takeLastExport.mockResolvedValue({ exports: [{ id: 'a', status: 'saved', filename: 'kakcal_backup_2026-02-03.json', bytes: 12700 }] });
    await act(async () => { renderBackup(); });
    expect(screen.getByRole('status').textContent).toMatch(/Saved after the app restarted: kakcal_backup_2026-02-03\.json\. \(12\.4 KB\)/);
  });

  it('shows the red error with the real cause when the recovered write failed', async () => {
    takeLastExport.mockResolvedValue({ exports: [{ id: 'b', status: 'failed', detail: 'Could not write the selected file: mode=wt SecurityException: gone [the empty document was removed]' }] });
    await act(async () => { renderBackup(); });
    expect(screen.getByRole('alert').textContent).toMatch(/SecurityException/);
  });

  it('shows nothing when there is nothing to report (or an APK without takeLastExport)', async () => {
    takeLastExport.mockRejectedValue(new Error('not implemented'));
    await act(async () => { renderBackup(); });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('saveLocalFile (APK)', () => {
  it('sends the JSON backup as text through exportBackup and returns the bytes', async () => {
    exportBackup.mockResolvedValue({ bytes: 5 });
    expect(await saveLocalFile('{"a":1}', 'x.json')).toEqual({ bytes: 5 });
    expect(exportBackup).toHaveBeenCalledWith({ json: '{"a":1}', filename: 'x.json' });
  });
  it('refuses to export nothing', async () => {
    await expect(saveLocalFile(new Blob([]), 'x.zip')).rejects.toThrow(/empty/);
    expect(exportFile).not.toHaveBeenCalled();
  });
});
