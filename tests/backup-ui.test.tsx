import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../src/context/AppContext';
import { DataBackup } from '../src/components/common/DataBackup';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { flushWrites } from '../src/storage/writeQueue';
import { resetBootForTests } from '../src/storage/boot';
import { addMealPhoto, importMealJournal } from '../src/utils/journalStore';

const created: Blob[] = [];

beforeEach(async () => {
  await deleteDatabase(); resetDbForTests(); resetBootForTests(); localStorage.clear();
  importMealJournal({});
  created.length = 0;
  URL.createObjectURL = vi.fn((blob: Blob) => { created.push(blob); return 'blob:test'; });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await flushWrites(); });

const renderBackup = () => {
  const res = render(<AppProvider><DataBackup /></AppProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Data Backup' }));
  return res;
};

describe('Settings > Data Backup warns that pictures are not included', () => {
  it('always shows the notice and exports at once when there are no pictures', async () => {
    renderBackup();
    expect(screen.getByRole('note').textContent).toMatch(/NOT your pictures/);
    await act(async () => { fireEvent.click(screen.getByText('Export JSON')); });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(created).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toMatch(/Pictures are not included/);
  });

  it('asks for confirmation when pictures exist and exports a file without them', async () => {
    await addMealPhoto(
      { id: 'pic1', date: '2026-02-03', slot: 'lunch', note: 'n', createdAt: '' },
      new Blob(['fake-image-bytes'], { type: 'image/jpeg' }),
    );
    renderBackup();
    fireEvent.click(screen.getByText('Export JSON'));
    expect(screen.getByRole('alertdialog').textContent).toMatch(/1 picture\(s\)/);
    expect(created).toHaveLength(0); // nothing is exported before the user confirms

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(created).toHaveLength(0);

    fireEvent.click(screen.getByText('Export JSON'));
    await act(async () => { fireEvent.click(screen.getByText('Export without pictures')); });
    expect(created).toHaveLength(1);
    const text = await created[0].text();
    expect(JSON.parse(text).picturesIncluded).toBe(false);
    expect(text).not.toMatch(/data:image/);
  });
});
