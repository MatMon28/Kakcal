/**
 * Path data of the body-part icons (24x24 grid, stroke only, like the lucide icons used elsewhere).
 * `shape` is the closed silhouette of the body part (soft fill + softer stroke), `detail` are optional
 * open lines inside it, `band` is the measuring tape around it (drawn bolder). Kept free of React so the
 * artwork can be previewed outside the app.
 */
export interface BodyIconArt {
  shape: string;
  detail?: string[];
  band: string;
}

export const BODY_ICON_ART = {
  // Vita: torso that narrows at the waist
  waist: {
    shape: 'M7 3.5H17C16.5 8 15 10 15 12C15 14 17 16 17.5 20.5H6.5C7 16 9 14 9 12C9 10 7.5 8 7 3.5Z',
    band: 'M4.5 12H19.5',
  },
  // Collo: head, neck and sloping shoulders
  neck: {
    shape: 'M10.2 9V11.5C10.2 13 5.5 12.8 3.5 16.5V20.5H20.5V16.5C18.5 12.8 13.8 13 13.8 11.5V9',
    detail: ['M8.9 6a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0-6.2 0'],
    band: 'M7.5 11H16.5',
  },
  // Fianchi: pelvis, widest point
  hips: {
    shape: 'M7 3.5H17C17.5 7 19.5 9.5 19.5 12.5C19.5 15.5 18 18 17.5 20.5H6.5C6 18 4.5 15.5 4.5 12.5C4.5 9.5 6.5 7 7 3.5Z',
    detail: ['M12 16V20.5'],
    band: 'M3 11.5H21',
  },
  // Petto: torso with shoulders and the chest line
  chest: {
    shape: 'M8.5 3.5C9.5 5 14.5 5 15.5 3.5L19.5 5.5C19 9 18.5 13 17.5 20.5H6.5C5.5 13 5 9 4.5 5.5Z',
    detail: ['M8 13C10 15 11.5 14.5 12 13C12.5 14.5 14 15 16 13'],
    band: 'M3.5 9.5H20.5',
  },
  // Avambracci: diagonal forearm from elbow to fist
  forearms: {
    shape: 'M9 3.5L18 13C20.5 14.5 20.5 16.5 18.5 18.5C16.5 20.5 14.5 20.5 13 18L3.5 9C5 6.5 7 4.5 9 3.5Z',
    band: 'M13.8 6.4L6.4 13.8',
  },
  // Bicipiti: upper arm with the muscle bulging at the front
  biceps: {
    shape: 'M8 3.5H15C17.5 7 18 10.5 15.5 13.5C14.5 15 14.5 17.5 15.5 20.5H8.5C7.5 14 7.5 8 8 3.5Z',
    band: 'M5.5 9H19.5',
  },
  // Cosce: thigh, wide at the top, narrowing to the knee
  thighs: {
    shape: 'M7 3.5H17C18.5 8 17 14 15.5 20.5H8.5C6.5 14 5.5 8 7 3.5Z',
    band: 'M4.5 9H19.5',
  },
  // Polpacci: lower leg with the calf bulging at the back
  calves: {
    shape: 'M9.5 3.5H15C15.5 8 15 14 14 20.5H10C9.5 17 7.5 15 6.5 12C5.5 9 8 6 9.5 3.5Z',
    band: 'M3.5 9.5H18',
  },
  // Personalizzata: a tape measure
  custom: {
    shape: 'M3 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0',
    detail: ['M7.8 12a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0', 'M17 19H21.5', 'M18.5 19V17M21 19V17.5'],
    band: 'M10 19H17',
  },
} satisfies Record<string, BodyIconArt>;

export type BodyIconId = keyof typeof BODY_ICON_ART;
