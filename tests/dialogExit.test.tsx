import { act, cleanup, render } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/context/AppContext', () => ({ useSettings: () => ({ t: { common: { close: 'Close' } } }) }));

import { Modal } from '../src/components/common/Modal';

interface FakeAnimation { onfinish: (() => void) | null; oncancel: (() => void) | null; cancel: () => void; keyframes: Keyframe[] }

let animations: FakeAnimation[] = [];
const originalAnimate = Element.prototype.animate;

beforeEach(() => {
  animations = [];
  Element.prototype.animate = function animate(keyframes: Keyframe[] | PropertyIndexedKeyframes | null) {
    const fake: FakeAnimation = { onfinish: null, oncancel: null, cancel() {}, keyframes: keyframes as Keyframe[] };
    animations.push(fake);
    return fake as unknown as Animation;
  } as typeof Element.prototype.animate;
});
afterEach(() => {
  cleanup();
  Element.prototype.animate = originalAnimate;
  document.body.innerHTML = '';
});

function Conditional({ initial = true }: { initial?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <>
      <button data-testid="toggle" onClick={() => setOpen((v) => !v)} />
      {open && <Modal isOpen onClose={() => setOpen(false)} title="Hello"><input data-testid="field" defaultValue="" /></Modal>}
    </>
  );
}

function Prop() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button data-testid="toggle" onClick={() => setOpen((v) => !v)} />
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Hello"><input data-testid="field" /></Modal>
    </>
  );
}

const overlays = () => Array.from(document.querySelectorAll<HTMLElement>('.dialog-viewport'));

describe.each([['parent unmounts the dialog', Conditional], ['isOpen turns false', Prop]] as const)('dialog exit: %s', (_name, Component) => {
  it('animates the live dialog (no clone) and removes it when the animation ends', () => {
    const { getByTestId } = render(<StrictMode><Component /></StrictMode>);
    const [overlay] = overlays();
    expect(overlay).toBeTruthy();
    const field = getByTestId('field') as HTMLInputElement;
    field.value = 'typed text';

    act(() => { getByTestId('toggle').click(); });

    // The very same node is still on screen, inert, being animated; nothing was cloned.
    expect(overlays()).toHaveLength(1);
    expect(overlays()[0]).toBe(overlay);
    expect(overlay.hasAttribute('inert')).toBe(true);
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect((overlay.querySelector('input') as HTMLInputElement).value).toBe('typed text');
    expect(animations).toHaveLength(2); // sheet + scrim (no dock on screen, so no pulse)

    act(() => { animations[0].onfinish?.(); });
    expect(overlays()).toHaveLength(0);
    expect(document.querySelector('[data-dialog-host]')?.childElementCount ?? 0).toBe(0);
  });

  it('a new press ends the exit at once', () => {
    const { getByTestId } = render(<Component />);
    act(() => { getByTestId('toggle').click(); });
    expect(overlays()).toHaveLength(1);
    act(() => { document.dispatchEvent(new Event('kc:overlay-open')); });
    expect(overlays()).toHaveLength(0);
  });

  it('can be reopened while the previous exit is still running', () => {
    const { getByTestId } = render(<Component />);
    act(() => { getByTestId('toggle').click(); });
    act(() => { getByTestId('toggle').click(); });
    expect(overlays().filter((el) => !el.hasAttribute('inert'))).toHaveLength(1);
  });

  it('removes the dialog at once with reduced motion', () => {
    const original = window.matchMedia;
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
    try {
      const { getByTestId } = render(<Component />);
      act(() => { getByTestId('toggle').click(); });
      expect(overlays()).toHaveLength(0);
      expect(animations).toHaveLength(0);
    } finally {
      window.matchMedia = original;
    }
  });
});
