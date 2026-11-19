// Normal-use mode is the default: a production browser build starts with the visitor's own
// (empty) journal and never seeds demo meals behind their back.
// Review/demo builds must opt in explicitly: VITE_DEMO_DATA=true npm run build.
// The Android preparation script sets VITE_ANDROID_RELEASE=true and always disables seeding.
export const DEMO_MODE = import.meta.env.VITE_ANDROID_RELEASE !== 'true' &&
  import.meta.env.VITE_DEMO_DATA === 'true';
