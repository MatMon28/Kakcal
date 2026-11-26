import { afterEach, describe, expect, it, vi } from 'vitest';
import { canShareFile, shareLocalFile } from '../src/utils/planSharing';

// Browser path (Capacitor platform "web" in jsdom): the Web Share API decides whether "Share" is offered.
afterEach(() => { vi.unstubAllGlobals(); });

const stubShare = (share: (data: ShareData) => Promise<void>, canShare = (data?: ShareData) => Boolean(data?.files?.length)) => {
  vi.stubGlobal('navigator', { ...navigator, share: vi.fn(share), canShare: vi.fn(canShare) });
};

describe('canShareFile (browser)', () => {
  it('is false when the browser has no Web Share API', () => {
    vi.stubGlobal('navigator', { ...navigator, share: undefined, canShare: undefined });
    expect(canShareFile(new Blob(['x']), 'a.pdf')).toBe(false);
  });
  it('asks canShare with a typed File', () => {
    stubShare(async () => undefined);
    expect(canShareFile(new Blob(['x']), 'a.xlsx')).toBe(true);
    const file = (navigator.canShare as ReturnType<typeof vi.fn>).mock.calls[0][0].files[0] as File;
    expect(file.name).toBe('a.xlsx');
    expect(file.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
  it('is false when the browser refuses this file type', () => {
    stubShare(async () => undefined, () => false);
    expect(canShareFile('{"a":1}', 'b.json')).toBe(false);
  });
});

describe('shareLocalFile (browser)', () => {
  it('shares the file and returns its size', async () => {
    stubShare(async () => undefined);
    expect(await shareLocalFile(new Blob(['pdf-bytes']), 'r.pdf', 'Kakcal')).toEqual({ bytes: 9 });
    const data = (navigator.share as ReturnType<typeof vi.fn>).mock.calls[0][0] as ShareData;
    expect(data.files?.[0].name).toBe('r.pdf');
    expect(data.files?.[0].type).toBe('application/pdf');
  });
  it('treats a closed share sheet as cancelled', async () => {
    stubShare(async () => { throw new DOMException('closed', 'AbortError'); });
    expect(await shareLocalFile('{"a":1}', 'b.json', 'Kakcal')).toEqual({ cancelled: true });
  });
  it('throws on any other failure and refuses an empty file', async () => {
    stubShare(async () => { throw new DOMException('no', 'NotAllowedError'); });
    await expect(shareLocalFile(new Blob(['x']), 'c.zip', 'Kakcal')).rejects.toThrow();
    await expect(shareLocalFile(new Blob([]), 'c.zip', 'Kakcal')).rejects.toThrow(/empty/);
  });
});
