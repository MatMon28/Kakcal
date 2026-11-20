/**
 * Path data of the body-part icons (24x24 grid, stroke only, like the lucide icons used elsewhere).
 * `shape` is the closed silhouette of the body part (soft fill + softer stroke), `detail` are optional
 * open lines inside it (muscle lines, fingers, a kneecap...), `band` is the measuring tape around it
 * (drawn bolder). `transform` (optional) is an SVG transform applied to `shape` and `detail` only, and
 * `extra` (optional) are more silhouettes drawn like `shape` but not transformed.
 *
 * Every icon shows the part with its joint / extremity where that helps recognition: a flexed arm (biceps, tape on the
 * muscle bulge), an open hand on a forearm that widens to the elbow, a bent leg with knee and foot (thighs), a calf with the foot,
 * head + a short neck + narrow shoulders, a V-shaped chest with two pectorals. The biceps is the lucide `biceps-flexed` outline
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
  // Collo: head sitting on a short neck and narrow, sloping shoulders; tape around the neck
  neck: {
    shape: 'M10.2 10.5V12.5C10.2 13.4 7.4 13.9 6.2 15.3C5.6 16.1 5.5 18 5.5 20.5H18.5C18.5 18 18.4 16.1 17.8 15.3C16.6 13.9 13.8 13.4 13.8 12.5V10.5',
    detail: ['M8.7 7.3a3.3 3.3 0 1 0 6.6 0a3.3 3.3 0 1 0-6.6 0'],
    band: 'M8.6 11.7H15.4',
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
  // Avambracci: an open hand (four fingers and a thumb) on a forearm that is narrow at the wrist and swells towards the elbow; tape around the thickest part
  forearms: {
    shape: 'M8.2 10.6V5.6C8.2 4.3 10 4.3 10 5.6V4.2C10 2.9 11.9 2.9 11.9 4.2V3.6C11.9 2.3 13.8 2.3 13.8 3.6V4.4C13.8 3.1 15.7 3.1 15.7 4.4V10.6C15.7 11.2 15.1 11.8 15 12.4C15.9 14.6 17.1 17.2 17 19.4C16.9 20.4 16.2 21 15.2 21H8.8C7.8 21 7.1 20.4 7 19.4C6.9 17.2 8.1 14.6 9 12.4C8.8 11.8 8.2 11.2 8.2 10.6Z',
    extra: ['M8.2 9.8L5.9 7.9C5.3 7.4 5.4 6.5 6.1 6.4C6.6 6.3 7 6.6 7.4 7L8.2 7.9'],
    detail: ['M10 5.8V8', 'M11.9 4.4V8', 'M13.8 4.6V8', 'M10.8 12.8C10.4 14.6 10.6 16.6 11.4 18.4'],
    band: 'M5.6 16.2H18.4',
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
  // Personalizzata: a tape measure (rounded case with its reel, the tape pulled out with ticks and an end hook)
  custom: {
    shape: 'M3.5 8C3.5 6.3 4.8 5 6.5 5H14.5C16.2 5 17.5 6.3 17.5 8V15.5C17.5 17.2 16.2 18.5 14.5 18.5H6.5C4.8 18.5 3.5 17.2 3.5 15.5Z',
    detail: ['M7.7 11.7a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0', 'M19.1 16.6V15', 'M20.7 16.6V15.4', 'M21.8 16.6V19'],
    band: 'M17.5 16.6H21.8',
  },
} satisfies Record<string, BodyIconArt>;

export type BodyIconId = keyof typeof BODY_ICON_ART;
