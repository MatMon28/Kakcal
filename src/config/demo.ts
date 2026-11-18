// Demo data is enabled for development and review builds by default.
// For a clean production deployment build, run:
//   VITE_DEMO_DATA=false npm run build          (Vite / Capacitor project)
//   NEXT_PUBLIC_DEMO_DATA=false npm run build   (Next.js preview wrapper)
// You can also change this single default to false before shipping.
const viteFlag = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  ?.VITE_DEMO_DATA;
const nextFlag = process.env.NEXT_PUBLIC_DEMO_DATA;

export const DEMO_MODE = (viteFlag ?? nextFlag) !== 'false';
