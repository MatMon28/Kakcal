import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRemovals, offerRemovalUndo } from '../src/utils/undoRemoval';
import { UndoRemovalNotice } from '../src/components/common/UndoRemovalNotice';

vi.mock('../src/i18n/journal', () => ({
  useJournalText: () => (en: string) => en,
}));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('UndoRemovalNotice swipe-to-dismiss', () => {
  it('swiping the undo toast removes it immediately without calling undo', () => {
    const undo = vi.fn();
    offerRemovalUndo(undo);
    render(<UndoRemovalNotice floating />);
    const status = screen.getByRole('status');
    const pill = status.parentElement!;

    fireEvent.pointerDown(pill, { isPrimary: true, button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(pill, { pointerId: 1, clientX: 165, clientY: 100 });
    fireEvent.pointerUp(pill, { pointerId: 1, clientX: 165, clientY: 100 });

    expect(screen.queryByRole('status')).toBeNull();
    expect(getRemovals()).toHaveLength(0);
    expect(undo).not.toHaveBeenCalled();
  });
});
