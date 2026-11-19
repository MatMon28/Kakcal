/**
 * Where the Android APK is downloaded from (shown in the installation guide on the tour page).
 *
 * Default: the file named `Kakcalculator.apk` attached to the newest GitHub release of the repository
 * (https://github.com/MatMon28/Kakcalculator/releases). Build the APK, create a release and upload it
 * under exactly that name, and the "Download APK" button works without any further change.
 * Override at build time with `VITE_APK_URL=https://example.com/Kakcalculator.apk npm run build`.
 */
export const RELEASES_URL = 'https://github.com/MatMon28/Kakcalculator/releases/latest';

export const APK_URL: string =
  (import.meta.env.VITE_APK_URL as string | undefined)?.trim() ||
  'https://github.com/MatMon28/Kakcalculator/releases/latest/download/Kakcalculator.apk';
