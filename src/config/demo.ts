// Demo data is enabled for development and review builds by default.
// For a clean production deployment build, run:
//   VITE_DEMO_DATA=false npm run build
// You can also change this single default to false before shipping.
export const DEMO_MODE = import.meta.env.VITE_DEMO_DATA !== 'false';
