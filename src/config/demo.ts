// Browser review builds are populated. Android preparation always disables seeding.
export const DEMO_MODE = import.meta.env.VITE_ANDROID_RELEASE !== 'true' &&
  import.meta.env.VITE_DEMO_DATA !== 'false';
