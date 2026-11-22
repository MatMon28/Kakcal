import { prefersReducedMotion } from './motion';

/**
 * Barely noticeable entrance for the fields of a page after a page change (tab tap, Back, return from the food
 * catalogue). Every field fades in while rising 5 px, with a 14 ms stagger (capped at 9 steps, so the whole thing
 * is over in about 0.3 s). It uses only `opacity` and the individual `translate` property on the compositor, so it
 * never replaces a field's own `transform` (the advanced-layout grid positions fields with it) and leaves nothing
 * behind when it ends (`fill: backwards`, no persistent style).
 */
const DURATION = 230; // ms
const STAGGER = 14; // ms between neighbouring fields
const MAX_STEPS = 9; // the stagger stops growing after this many fields
const MAX_FIELDS = 28; // fields beyond this count are left alone
const RISE = '0 5px';
const EASING = 'cubic-bezier(.2,0,0,1)';

const elementChildren = (el: Element) => Array.from(el.children).filter((c): c is HTMLElement => c instanceof HTMLElement);

/** The "fields" of a page: the advanced-layout items when present, else the first level that has several children. */
export function collectPageFields(page: HTMLElement): HTMLElement[] {
  const grid = Array.from(page.querySelectorAll<HTMLElement>('[data-layout-item]'));
  if (grid.length) return grid;
  let list = elementChildren(page);
  for (let depth = 0; depth < 6 && list.length === 1; depth += 1) list = elementChildren(list[0]);
  return list;
}

export function animatePageFields(page: HTMLElement | null | undefined) {
  if (!page || prefersReducedMotion()) return;
  const fields = collectPageFields(page).slice(0, MAX_FIELDS);
  fields.forEach((field, index) => {
    if (!field.animate) return;
    field.animate(
      [{ opacity: 0, translate: RISE }, { opacity: 1, translate: '0 0' }],
      { duration: DURATION, delay: Math.min(index, MAX_STEPS) * STAGGER, easing: EASING, fill: 'backwards' },
    );
  });
}
