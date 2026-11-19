import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'vite';

if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Use Node.js 22 or newer.');
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const config = JSON.parse(await readFile('capacitor.config.json', 'utf8'));
if (config.webDir !== 'dist' || config.server?.url || config.server?.allowNavigation?.length) {
  throw new Error('A release must load dist from APK assets, without remote navigation or a live-reload URL.');
}
process.env.VITE_DEMO_DATA = 'false';
process.env.VITE_ANDROID_RELEASE = 'true';
// The download archive and browser service worker do not belong in an APK.
await build({ root, mode: 'android', publicDir: false, build: { emptyOutDir: true } });
await mkdir('dist/licenses', { recursive: true });
await cp('public/licenses', 'dist/licenses', { recursive: true });
// The offline Open Food Facts catalogue (loaded lazily by src/data/offCatalog.ts). publicDir is off above,
// so it has to be copied explicitly or the APK would silently ship without it.
await cp('public/data', 'dist/data', { recursive: true });
if ((await readFile('dist/data/off-foods.bin')).readUInt32LE(0) !== 0x464f464b) throw new Error('dist/data/off-foods.bin is not a KOFF catalogue. Run npm run build:catalog.');
// The PWA tags (manifest, apple-touch-icon) point at files from public/, which this build does not ship.
const html = (await readFile('dist/index.html', 'utf8')).replace(/[ \t]*<!-- pwa:start[\s\S]*?<!-- pwa:end -->\n?/, '').replace('<head>',
  '<head>\n    <meta name="kakcalculator-runtime" content="android-local-no-demo" />');
if (html.includes('manifest.webmanifest')) throw new Error('PWA tags were not removed from the Android build.');
await writeFile('dist/index.html', html);
const sync = spawnSync(process.execPath, [path.join(root, 'node_modules/@capacitor/cli/bin/capacitor'), 'sync', 'android'], { stdio: 'inherit' });
if (sync.status !== 0) throw new Error('Capacitor sync failed. Run npm ci and try again.');
const assets = 'android/app/src/main/assets/';
if (await readFile(assets + 'public/index.html', 'utf8') !== html) throw new Error('Synced web bundle mismatch.');
const plugins = JSON.parse(await readFile(assets + 'capacitor.plugins.json', 'utf8'));
if (!plugins.some((plugin) => plugin.pkg === '@capacitor/app')) throw new Error('Android Back plugin missing.');
if (!plugins.some((plugin) => plugin.pkg === '@capacitor/local-notifications')) throw new Error('Android notifications plugin missing.');
console.log(`Android assets ready. SHA-256: ${createHash('sha256').update(html).digest('hex')}`);
console.log('Open the android folder in Android Studio. See android/BUILD_APK.md.');