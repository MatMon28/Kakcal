import { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useUiState } from '../src/context/AppContext';
import { SettingsModal } from '../src/components/modals/SettingsModal';
import { DataBackup } from '../src/components/common/DataBackup';
import { attachScrollFade } from '../src/utils/scrollFade';
import * as notifications from '../src/utils/notifications';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { resetBootForTests } from '../src/storage/boot';
import { flushWrites } from '../src/storage/writeQueue';

const OpenSettingsOnMount = () => {
  const { setIsSettingsOpen } = useUiState();
  useEffect(() => {
    setIsSettingsOpen(true);
  }, [setIsSettingsOpen]);
  return null;
};

const renderOpenSettings = () =>
  render(
    <AppProvider>
      <OpenSettingsOnMount />
      <SettingsModal />
    </AppProvider>,
  );

beforeEach(async () => {
  await deleteDatabase();
  resetDbForTests();
  resetBootForTests();
  localStorage.clear();
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await flushWrites();
});

describe('Settings performance: lazy-mounted groups and narrow work', () => {
  it('mounts only collapsed group headers on open and skips getNotificationPermission', () => {
    const permSpy = vi.spyOn(notifications, 'getNotificationPermission');
    renderOpenSettings();

    // Headers are present and collapsed
    const todayBtn = screen.getByRole('button', { name: 'Today' });
    const notificationsBtn = screen.getByRole('button', { name: 'Notifications' });
    const goalsBtn = screen.getByRole('button', { name: 'Goals & limits' });
    const backupBtn = screen.getByRole('button', { name: 'Data Backup' });
    const deleteBtn = screen.getByRole('button', { name: 'Delete data' });

    expect(todayBtn.getAttribute('aria-expanded')).toBe('false');
    expect(notificationsBtn.getAttribute('aria-expanded')).toBe('false');
    expect(goalsBtn.getAttribute('aria-expanded')).toBe('false');
    expect(backupBtn.getAttribute('aria-expanded')).toBe('false');
    expect(deleteBtn.getAttribute('aria-expanded')).toBe('false');

    // Bodies are NOT mounted while collapsed
    expect(screen.queryByText('Quick-add buttons')).toBeNull();
    expect(screen.queryByText('Water')).toBeNull();
    expect(screen.queryByText('Intake / burned difference')).toBeNull();
    expect(screen.queryByText('Export JSON')).toBeNull();
    expect(screen.queryByText('All logged food')).toBeNull();
    expect(screen.queryByText(/Storage/i)).toBeNull();
    expect(permSpy).not.toHaveBeenCalled();
  });

  it('mounts a group body on first expand and keeps it mounted when collapsed', async () => {
    const permSpy = vi.spyOn(notifications, 'getNotificationPermission').mockResolvedValue('prompt');
    renderOpenSettings();

    const todayBtn = screen.getByRole('button', { name: 'Today' });
    fireEvent.click(todayBtn);
    expect(todayBtn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Quick-add buttons')).toBeTruthy();

    // Collapsing keeps the body mounted for the CSS closing animation
    fireEvent.click(todayBtn);
    expect(todayBtn.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('Quick-add buttons')).toBeTruthy();

    // Opening Notifications triggers getNotificationPermission only then
    expect(permSpy).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    });
    expect(permSpy).toHaveBeenCalledTimes(1);
  });

  it('immediately mounts and expands NotificationSettings when requested by the guided tour', async () => {
    const permSpy = vi.spyOn(notifications, 'getNotificationPermission').mockResolvedValue('prompt');
    renderOpenSettings();

    expect(screen.queryByText('Water')).toBeNull();
    await act(async () => {
      notifications.requestOpenNotificationSettings();
    });

    const notificationsBtn = screen.getByRole('button', { name: 'Notifications' });
    expect(notificationsBtn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Water')).toBeTruthy();
    expect(permSpy).toHaveBeenCalledTimes(1);
  });

  it('does not mount ExcelExportModal or PdfExportModal until their buttons are clicked', async () => {
    render(
      <AppProvider>
        <DataBackup />
      </AppProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Data Backup' }));
    expect(screen.queryByRole('button', { name: /Export \.xlsx/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Export \.pdf/i })).toBeNull();

    fireEvent.click(screen.getByText('Export to Excel'));
    expect(await screen.findByRole('button', { name: /Export \.xlsx/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('button', { name: /Export \.xlsx/i })).toBeNull();

    fireEvent.click(screen.getByText('Export PDF report'));
    expect(await screen.findByRole('button', { name: /Export \.pdf/i })).toBeTruthy();
  });

  it('coalesces rapid scrollFade mutations/scrolls into one rAF and avoids redundant attribute writes', async () => {
    const rafQueue: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollHeight', { value: 400, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 200, configurable: true });
    Object.defineProperty(el, 'scrollTop', { value: 0, writable: true, configurable: true });
    document.body.appendChild(el);

    const setAttrSpy = vi.spyOn(el, 'setAttribute');
    const removeAttrSpy = vi.spyOn(el, 'removeAttribute');

    const stop = attachScrollFade(el, 'y');
    // Initial synchronous update sets data-scroll-fade and data-fade-end
    expect(el.getAttribute('data-scroll-fade')).toBe('y');
    expect(el.getAttribute('data-fade-end')).toBe('true');
    setAttrSpy.mockClear();
    removeAttrSpy.mockClear();

    // Multiple rapid scroll events in the same frame queue only ONE rAF
    fireEvent.scroll(el);
    fireEvent.scroll(el);
    fireEvent.scroll(el);
    expect(rafQueue).toHaveLength(1);

    // Flushing rAF with unchanged scroll position performs zero attribute writes
    rafQueue.shift()!(16);
    expect(setAttrSpy).not.toHaveBeenCalled();
    expect(removeAttrSpy).not.toHaveBeenCalled();

    // Scrolling to middle triggers one rAF and writes data-fade-start once
    el.scrollTop = 50;
    fireEvent.scroll(el);
    fireEvent.scroll(el);
    expect(rafQueue).toHaveLength(1);
    rafQueue.shift()!(32);
    expect(setAttrSpy).toHaveBeenCalledTimes(1);
    expect(setAttrSpy).toHaveBeenCalledWith('data-fade-start', 'true');

    stop();
    el.remove();
  });
});
