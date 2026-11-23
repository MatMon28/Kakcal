// Continuous rail position; subscribers update the pill without a React render per frame.
let position: number | null = null;
const listeners = new Set<() => void>();
export const getPagePosition = () => position;
export function setPagePosition(next: number | null) {
  if (position === next) return;
  position = next;
  listeners.forEach((listener) => listener());
}
export function subscribePagePosition(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}