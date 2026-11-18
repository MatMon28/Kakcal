import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const bundlePath = new URL('./smoke.bundle.js', import.meta.url);
const dom = new JSDOM(
  '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
  { url: 'https://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' }
);
const { window } = dom;

// Environment the browser normally provides.
window.scrollTo = () => {};
window.Element.prototype.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true });

const errors = [];
window.addEventListener('error', (event) => errors.push(event.message || String(event.error)));
dom.virtualConsole?.on('jsdomError', (error) => errors.push(error.message || String(error)));

let results = [];
try {
  window.eval(readFileSync(bundlePath, 'utf8'));
  results = await window.__smokeRun__();
  for (const line of results) console.log(`OK: ${line}`);
} catch (error) {
  console.error('FAILED:', error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) console.error(error.stack.split('\n').slice(0, 8).join('\n'));
  process.exitCode = 1;
}
if (errors.length) {
  console.error('Runtime errors:', errors.map((e) => String(e).split('\n')[0]));
  process.exitCode = 1;
} else if (process.exitCode !== 1) {
  console.log('No runtime errors.');
}
dom.window.close();
process.exit(process.exitCode ?? 0);
