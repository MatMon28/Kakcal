#!/usr/bin/env node
/**
 * Fails when a home-screen widget layout uses a view class that RemoteViews may not inflate.
 * A single plain <View> makes the launcher show "Can't load widget" (it.: "Impossibile caricare il
 * widget") and no Gradle or lint step reports it, so this runs as part of `npm run android:prepare`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../android/app/src/main/res/layout');
// Classes annotated @RemoteView in the Android framework, plus the layout-only tags.
const ALLOWED = new Set(['LinearLayout', 'FrameLayout', 'RelativeLayout', 'GridLayout', 'TextView', 'ImageView', 'ImageButton',
  'Button', 'ProgressBar', 'Chronometer', 'AnalogClock', 'TextClock', 'ViewFlipper', 'ViewStub', 'AdapterViewFlipper',
  'ListView', 'GridView', 'StackView', 'include', 'merge']);
const problems = [];
let checked = 0;
for (const file of readdirSync(dir).filter((f) => /^widget_.*\.xml$/.test(f))) {
  checked++;
  const xml = readFileSync(join(dir, file), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const [, tag] of xml.matchAll(/<([A-Za-z][\w.]*)[\s/>]/g)) {
    if (!ALLOWED.has(tag)) problems.push(`${file}: <${tag}> is not a RemoteViews-compatible class`);
  }
}
if (problems.length) {
  console.error('Widget layout check failed:\n  ' + [...new Set(problems)].join('\n  '));
  console.error('Use FrameLayout/LinearLayout/TextView/ImageView/ProgressBar... (a plain <View> spacer breaks the whole widget).');
  process.exit(1);
}
console.log(`Widget layouts OK (${checked} files, only RemoteViews-compatible classes).`);
