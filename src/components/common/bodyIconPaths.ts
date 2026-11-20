/**
 * Path data of the body-part icons (24x24 grid, stroke only, like the lucide icons used elsewhere).
 * `shape` is the closed silhouette of the body part (soft fill + softer stroke), `detail` are optional
 * open lines inside it (muscle lines, fingers, a kneecap...), `band` is the measuring tape around it
 * (drawn bolder). `transform` (optional) is an SVG transform applied to `shape` and `detail` only, and
 * `extra` (optional) are more silhouettes drawn like `shape` but not transformed.
 *
 * Every icon shows the part with its joint / extremity where that helps recognition: a flexed arm (biceps, tape on the
 * muscle bulge), a fist on a forearm that widens to the elbow, a bent leg with knee and foot (thighs), a calf with the foot,
 * head + neck + narrow shoulders, a V-shaped chest with two pectorals. The biceps is the lucide `biceps-flexed` outline
 * (ISC licence), the rest is drawn in the same language. Kept free of React so the artwork can be previewed outside the app.
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
  // Collo: head, a clear neck and narrow, sloping shoulders; tape around the neck
  neck: {
    shape: 'M10.2 9.6V12.6C10.2 13.7 7.6 14.2 6.4 15.8C5.7 16.8 5.6 18.4 5.6 20.5H18.4C18.4 18.4 18.3 16.8 17.6 15.8C16.4 14.2 13.8 13.7 13.8 12.6V9.6',
    detail: ['M8.9 6a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0-6.2 0'],
    band: 'M8.4 11.6H15.6',
  },
  // Fianchi: pelvis with the start of both legs, tape at the widest point
  hips: {
    shape: 'M7.5 3.5H16.5C17 7 19.5 9 19.5 12.5C19.5 15.5 18.2 18 17.8 20.5H13.4L12 14.8L10.6 20.5H6.2C5.8 18 4.5 15.5 4.5 12.5C4.5 9 7 7 7.5 3.5Z',
    band: 'M3 11.5H21',
  },
  // Petto: V-shaped upper body with a collar and two separate pectoral muscles; tape under the pecs
  chest: {
    shape: 'M9 3.5C9.8 5 14.2 5 15 3.5L19 4.8C20.3 5.3 21 6.4 20.8 7.7L18.5 12.5C17.7 15 17.2 17.5 17.4 20.5H6.6C6.8 17.5 6.3 15 5.5 12.5L3.2 7.7C3 6.4 3.7 5.3 5 4.8Z',
    detail: ['M10.4 8.4C8.2 7.9 6.4 8.9 6.4 10.9C6.4 12.9 8.4 13.8 10.4 13', 'M13.6 8.4C15.8 7.9 17.6 8.9 17.6 10.9C17.6 12.9 15.6 13.8 13.6 13'],
    band: 'M4 16.6H20',
  },
  // Avambracci: raised fist on top of the forearm, widening towards the elbow with the muscle swelling; tape around the thickest part
  forearms: {
    shape: 'M8.6 2.5H15.4C16.5 2.5 17.2 3.2 17.2 4.3V8.6C17.2 9.4 16.7 9.9 16 10.2C16.7 12 18.1 14.5 18.2 17C18.3 19 17.5 20.5 16 21H8C6.5 20.5 5.7 19 5.8 17C5.9 14.5 7.3 12 8 10.2C7.3 9.9 6.8 9.4 6.8 8.6V4.3C6.8 3.2 7.5 2.5 8.6 2.5Z',
    detail: ['M9.5 2.8V6.2', 'M12 2.8V6.2', 'M14.5 2.8V6.2', 'M6.9 6.4H17.1', 'M12.2 12.6C11.4 14.6 11.6 17 12.6 19'],
    band: 'M4.2 14.6H19.8',
  },
  // Bicipiti: the flexed arm (lucide biceps-flexed), tape around the bulge of the muscle
  biceps: {
    shape: 'M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1',
    detail: ['M15 14a5 5 0 0 0-7.584 2', 'M9.964 6.825C8.019 7.977 9.5 13 8 15'],
    band: 'M17.2 9.4V21',
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
