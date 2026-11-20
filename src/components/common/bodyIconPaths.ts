/**
 * Path data of the body-part icons (24x24 grid, stroke only, like the lucide icons used elsewhere).
 * `shape` is the closed silhouette of the body part (soft fill + softer stroke), `detail` are optional
 * open lines inside it (muscle lines, fingers, a kneecap...), `band` is the measuring tape around it
 * (drawn bolder). `transform` (optional) is an SVG transform applied to `shape` and `detail` only, and
 * `extra` (optional) are more silhouettes drawn like `shape` but not transformed.
 *
 * Every icon shows the part together with the joint / extremity next to it so that it is recognisable at
 * 22 px: a flexed arm (biceps), a forearm with its hand, a bent leg with the knee and foot (thighs), a calf
 * with the foot. The biceps and the hand are the lucide `biceps-flexed` and `hand` outlines (ISC licence),
 * the rest is drawn in the same language. Kept free of React so the artwork can be previewed outside the app.
 */
export interface BodyIconArt {
  shape: string;
  detail?: string[];
  band: string;
  transform?: string;
  extra?: string[];
}

export const BODY_ICON_ART = {
  // Vita: torso with a gentle waist, tape at the waist and the navel below it
  waist: {
    shape: 'M6 3.5H18C18.4 8 17 10 17 12C17 14 18.6 16.5 19 20.5H5C5.4 16.5 7 14 7 12C7 10 5.6 8 6 3.5Z',
    detail: ['M12 16.4H12.01'],
    band: 'M4 12H20',
  },
  // Collo (simplified): head, a clear neck and the shoulders, tape around the neck
  neck: {
    shape: 'M10.3 9.2V11C10.3 12.6 5 12.6 3.5 17.5V20.5H20.5V17.5C19 12.6 13.7 12.6 13.7 11V9.2',
    detail: ['M8.8 5.6a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0'],
    band: 'M8 10.8H16',
  },
  // Fianchi: pelvis with the start of both legs, tape at the widest point
  hips: {
    shape: 'M7.5 3.5H16.5C17 7 19.5 9 19.5 12.5C19.5 15.5 18.2 18 17.8 20.5H13.4L12 14.8L10.6 20.5H6.2C5.8 18 4.5 15.5 4.5 12.5C4.5 9 7 7 7.5 3.5Z',
    band: 'M3 11.5H21',
  },
  // Petto: torso with the shoulders and the two pectoral muscles
  chest: {
    shape: 'M5 3.5H19L20.5 8C20 12 18.8 16 18.3 20.5H5.7C5.2 16 4 12 3.5 8Z',
    detail: ['M7.2 12.5C7.5 15.5 11.3 15.9 11.8 13.1', 'M16.8 12.5C16.5 15.5 12.7 15.9 12.2 13.1'],
    band: 'M3 9.5H21',
  },
  // Avambracci: forearm (left) with the hand (the lucide hand turned to the right, fingers pointing right)
  forearms: {
    shape: 'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
    detail: ['M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2', 'M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2', 'M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8'],
    transform: 'translate(6.2 3.4) scale(0.72) rotate(90 12 12)',
    extra: ['M8.4 8.9L3.7 8.1C2.7 7.9 2 8.7 2 9.7V14.3C2 15.3 2.7 16.1 3.7 15.9L8.4 15.1'],
    band: 'M5.2 5.6V18.4',
  },
  // Bicipiti: the flexed arm (lucide biceps-flexed), tape around the muscle
  biceps: {
    shape: 'M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1',
    detail: ['M15 14a5 5 0 0 0-7.584 2', 'M9.964 6.825C8.019 7.977 9.5 13 8 15'],
    band: 'M5.8 8.6L11.4 12.6',
  },
  // Cosce: seated leg: the thigh (tape), the knee, the shin and the foot
  thighs: {
    shape: 'M3.5 7C3.5 6 4.3 5.5 5.3 5.5H15.3C18.2 5.5 20.5 7.5 20.5 10.5V18C22 18.3 22.7 19 22.7 20.2C22.7 20.6 22.4 20.8 22 20.8H15.5C14.9 20.8 14.8 20.3 14.8 19.8V13H5.3C4.3 13 3.5 12.3 3.5 11.4Z',
    detail: ['M16.2 8.6C16.7 7.8 17.6 7.5 18.4 7.8'],
    band: 'M9 3.5V15',
  },
  // Polpacci: lower leg with the calf bulging at the back and the foot
  calves: {
    shape: 'M9.5 3.5H14.5L14.2 15.2C14.3 16.6 15.9 17 17.8 17.7C19.8 18.4 21 19.2 21 20.2C21 21.1 20.3 21.5 19.5 21.5H9.2C8 21.5 7.4 20.6 7.8 19.6C8.2 18.5 9.6 17 9.8 15.6C10 13 6.2 12 6.6 8.2C6.8 6.2 8.2 5 9.5 3.5Z',
    detail: ['M11.2 21.5C12.2 20.3 14.2 20.3 15.2 21.5'],
    band: 'M3.5 9.5H16.5',
  },
  // Personalizzata: a tape measure
  custom: {
    shape: 'M3 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0',
    detail: ['M7.8 12a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0', 'M17 19H21.5', 'M18.5 19V17M21 19V17.5'],
    band: 'M10 19H17',
  },
} satisfies Record<string, BodyIconArt>;

export type BodyIconId = keyof typeof BODY_ICON_ART;
