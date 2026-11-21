#!/usr/bin/env node
// Writes the six launch animations and their wordmark "lockup" versions with the Koink-style brand art:
//
//   src/assets/kakcalculator_intro/animations/0N-<name>.svg           phase 1 only: the animation that the app plays at launch
//   src/assets/kakcalculator_intro/animations/0N-<name>-lockup.svg    phase 1 + phase 2 (the icon becomes the wordmark), design asset
//   src/assets/kakcalculator_intro/logos-and-animations-overview.html a gallery of every logo and animation with replay buttons
//
// Every animation ends on the exact frame of src/assets/brand/kakcalculator-icon.svg (same K, same poop, same halo,
// 1024 canvas, tile radius 240); the lockups end on the exact frame of the wordmark (src/assets/brand/kakcalculator-wordmark.svg).
// All numbers come from scripts/brand-geometry.mjs. Colours are the CSS tokens of the intro overlay (--kc-cream, --kc-ink,
// --kc-edge, see src/components/intro/intro.css) with Koink's palette as the fallback.
//
// Rules kept from the previous set (intro_animation.md): pure SVG + CSS keyframes, no scripts, no raster, motion is applied to
// wrapper <g> elements built as translate(pivot) > animated group > translate(-pivot) (never transform-origin), and every
// duration is written as `NNNms` because introAnimations.ts divides them by INTRO_SPEED.
//
//   node scripts/generate-intro-animations.mjs        (no dependency)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ICON, K, POOP, PALETTE, TILE_RADIUS, WORDMARK } from './brand-geometry.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const OUT = 'src/assets/kakcalculator_intro/';
const light = PALETTE.light;
const CREAM = `var(--kc-cream, ${light.bg})`;
const INK = `var(--kc-ink, ${light.ink})`;
const EDGE = 'var(--kc-edge, #D5C8B3)';
const TILE = `<rect width="1024" height="1024" rx="${TILE_RADIUS}"`;
const r = (v) => Math.round(v * 100) / 100;

// ---------- geometry ----------
const P = ICON.poop;
const POOP_C = { x: r(P.x + 32 * P.scale), y: r(P.y + 30.5 * P.scale) }; // centre of the poop
const POOP_B = { x: r(P.x + 32 * P.scale), y: r(P.y + 56 * P.scale) }; // centre of its flat base
const STEM_TOP = { x: r(K.stem.x + K.stem.width / 2), y: K.stem.y };
const ARM = { px: 352, py: 515, deg: 46.3 }; // the arm leaves the stem here and points up-right at 46.3 degrees
const LEG = { px: 352, py: 495, deg: 46.4 }; // the leg points down-right at 46.4 degrees
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/** translate(pivot) > animated group > translate(-pivot) */
const wrapAt = (p, cls, inner) => `<g transform="translate(${p.x} ${p.y})"><g class="${cls}"><g transform="translate(${-p.x} ${-p.y})">${inner}</g></g></g>`;

const stemShape = `<rect x="${K.stem.x}" y="${K.stem.y}" width="${K.stem.width}" height="${K.stem.height}" rx="${K.stem.rx}"/>`;
const armShape = `<path d="${K.arm}"/>`;
const legShape = `<path d="${K.leg}"/>`;
const kPart = (which, cls, fill = INK) => {
  const shape = { stem: stemShape, arm: armShape, leg: legShape }[which];
  const pivot = { stem: STEM_TOP, arm: { x: ARM.px, y: ARM.py }, leg: { x: LEG.px, y: LEG.py } }[which];
  return wrapAt(pivot, cls, `<g fill="${fill}">${shape}</g>`);
};
const kAll = (c = {}, fill = INK) => kPart('stem', c.stem || 'k-stem', fill) + kPart('arm', c.arm || 'k-arm', fill) + kPart('leg', c.leg || 'k-leg', fill);

/** The poop: halo (clears the K) + outline filled with `body` + three crease lines (`.cr1` .. `.cr3`, pathLength 100). */
function poopArt({ ink = INK, body = CREAM, halo = CREAM, prefix = 'c' }) {
  const place = `translate(${P.x} ${P.y}) scale(${P.scale})`;
  return (
    `<g transform="${place}" fill="${halo}" stroke="${halo}" stroke-width="${ICON.haloLocal}" stroke-linejoin="round" stroke-linecap="round"><path class="halo" d="${POOP.body}"/></g>` +
    `<g class="poop-ink" transform="${place}" fill="none" stroke="${ink}" stroke-width="${P.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${POOP.body}" fill="${body}"/>` +
    POOP.creases.map((d, i) => `<path class="${prefix}${i + 1}" pathLength="100" d="${d}"/>`).join('') +
    '</g>'
  );
}

/** `@keyframes` that grows a K part from nothing (scale 0 along its axis) between a% and b%. */
function grow(id, cls, which, a, b, D, timing = EASE) {
  const tf0 = which === 'stem' ? 'scale(1, 0)' : which === 'arm' ? `rotate(${-ARM.deg}deg) scale(0, 1) rotate(${ARM.deg}deg)` : `rotate(${LEG.deg}deg) scale(0, 1) rotate(${-LEG.deg}deg)`;
  return `.${id}-${cls} { animation: ${id}-${cls}-k ${D}ms linear both; }
@keyframes ${id}-${cls}-k {
  0%, ${a}% { opacity: 0; transform: ${tf0}; animation-timing-function: ${timing}; }
  ${a + 1}% { opacity: 1; }
  ${b}%, 100% { opacity: 1; transform: none; }
}`;
}
/** A crease line drawn between a% and b%. */
const crease = (id, n, a, b, D) => `.${id} .c${n} { stroke-dasharray: 100 100; animation: ${id}-c${n}-k ${D}ms linear both; }
@keyframes ${id}-c${n}-k { 0%, ${a}% { stroke-dashoffset: 100; opacity: 0; } ${a + 1}% { opacity: 1; animation-timing-function: ${EASE}; } ${b}%, 100% { stroke-dashoffset: 0; opacity: 1; } }`;

// ---------- the six animations ----------
// Each returns { id, name, D, css, defs, body(ctx) }. body() builds the card contents with ctx.k(html) / ctx.p(html) wrapping the
// K and the poop (phase 2 of the lockups moves them), and ctx.clip(html) for the tile clip.
function a01() {
  const id = 's1', D = 1150;
  const css = `
.${id}-card { animation: ${id}-card-k ${D}ms linear both; }
@keyframes ${id}-card-k {
  0% { opacity: 0; transform: scale(0.74); animation-timing-function: ${EASE}; }
  24% { opacity: 1; transform: scale(1.018); animation-timing-function: ease-out; }
  40% { transform: translate(0px, 0px) scale(1, 1); }
  50% { transform: translate(0px, 0px) scale(1, 1); animation-timing-function: cubic-bezier(0.25, 0.8, 0.4, 1); }
  57% { transform: translate(0px, 10px) scale(1.012, 0.988); animation-timing-function: ${SPRING}; }
  74% { transform: translate(0px, -3px) scale(0.997, 1.003); }
  90%, 100% { opacity: 1; transform: translate(0px, 0px) scale(1, 1); }
}
${grow(id, 'stem', 'stem', 9, 34, D)}
${grow(id, 'arm', 'arm', 21, 45, D)}
${grow(id, 'leg', 'leg', 31, 53, D)}
.${id}-poop { animation: ${id}-poop-k ${D}ms linear both; }
@keyframes ${id}-poop-k {
  0%, 42% { opacity: 0; transform: translate(0px, -290px) scale(0.76, 1.24); animation-timing-function: cubic-bezier(0.55, 0.05, 0.85, 0.35); }
  46% { opacity: 1; transform: translate(0px, -190px) scale(0.82, 1.2); animation-timing-function: cubic-bezier(0.55, 0.08, 0.85, 0.45); }
  56% { opacity: 1; transform: translate(0px, 8px) scale(1.26, 0.72); animation-timing-function: ${EASE}; }
  68% { transform: translate(0px, -28px) scale(0.89, 1.13); animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1); }
  79% { transform: translate(0px, 3px) scale(1.06, 0.95); animation-timing-function: ease-out; }
  89% { transform: translate(0px, 0px) scale(0.985, 1.015); }
  100% { opacity: 1; transform: translate(0px, 0px) scale(1, 1); }
}
${crease(`${id}-poop`, 3, 52, 70, D)}
${crease(`${id}-poop`, 2, 57, 75, D)}
${crease(`${id}-poop`, 1, 62, 80, D)}`;
  return {
    id, name: 'sketch-and-plop', D, css, defs: '',
    body: (c) => c.card(c.clip(
      c.k(kPart('stem', `${id}-stem`) + kPart('arm', `${id}-arm`) + kPart('leg', `${id}-leg`)) +
      c.p(wrapAt(POOP_B, `${id}-poop`, poopArt({})))
    )),
  };
}

function a02() {
  const id = 's2', D = 1120;
  const css = `
.${id}-skirt { animation: ${id}-skirt-k ${D}ms linear both; }
@keyframes ${id}-skirt-k { 0% { opacity: 0; } 12% { opacity: 1; } 80% { opacity: 1; } 90%, 100% { opacity: 0; } }
.${id}-card { animation: ${id}-card-k ${D}ms linear both; }
@keyframes ${id}-card-k {
  0% { opacity: 0; transform: translate(0px, 70px) scale(0.9); animation-timing-function: ${EASE}; }
  20% { opacity: 1; transform: translate(0px, -36px) scale(1.02); animation-timing-function: ease-in-out; }
  42% { transform: translate(0px, -30px) scale(1.02); animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.4); }
  55% { transform: translate(0px, 28px) scale(1.012, 0.988); animation-timing-function: ${SPRING}; }
  68% { transform: translate(0px, -10px) scale(1); animation-timing-function: ease-out; }
  80%, 100% { opacity: 1; transform: translate(0px, 0px) scale(1); }
}
.${id}-poop { animation: ${id}-poop-k ${D}ms linear both; }
@keyframes ${id}-poop-k {
  0%, 56% { opacity: 0; transform: scale(0); animation-timing-function: ${EASE}; }
  58% { opacity: 1; }
  64% { transform: scale(1.22); animation-timing-function: ease-in-out; }
  72% { transform: scale(0.94); animation-timing-function: ease-in-out; }
  80% { transform: scale(1.04); animation-timing-function: ease-out; }
  88%, 100% { opacity: 1; transform: scale(1); }
}
${[1, 2, 3].map((n) => `.${id}-t${n} { stroke-dasharray: 100 100; animation: ${id}-t-k ${D}ms linear both; }`).join('\n')}
@keyframes ${id}-t-k {
  0%, 58% { opacity: 0; stroke-dashoffset: 100; }
  60% { opacity: 1; animation-timing-function: ${EASE}; }
  70% { opacity: 1; stroke-dashoffset: 0; animation-timing-function: ease-in; }
  84%, 100% { opacity: 0; stroke-dashoffset: -100; }
}`;
  const ticks = [`M598 500 L566 468`, `M${POOP_C.x} 462 V412`, `M767 500 L799 468`]
    .map((d, i) => `<path class="${id}-t${i + 1}" pathLength="100" d="${d}"/>`).join('');
  return {
    id, name: 'tactile-keypress', D, css, defs: '',
    body: (c) => `<rect class="${id}-skirt" y="28" width="1024" height="1024" rx="${TILE_RADIUS}" fill="${EDGE}"/>` +
      c.card(c.clip(c.k(kAll({ stem: `${id}-ks`, arm: `${id}-ka`, leg: `${id}-kl` })) + c.p(wrapAt(POOP_B, `${id}-poop`, poopArt({}))) +
        `<g fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round">${ticks}</g>`), `${id}-card`),
  };
}

function a03() {
  const id = 's3', D = 1280;
  const dx = r(512 - POOP_C.x), dy = r(512 - POOP_C.y);
  const open = (cls, deg) => `.${id}-${cls} { animation: ${id}-${cls}-k ${D}ms linear both; }`;
  const css = `
.${id}-card { animation: ${id}-card-k ${D}ms linear both; }
@keyframes ${id}-card-k { 0% { opacity: 0; transform: scale(0.9); animation-timing-function: ${EASE}; } 12%, 100% { opacity: 1; transform: scale(1); } }
.${id}-poop { animation: ${id}-poop-k ${D}ms linear both; }
@keyframes ${id}-poop-k {
  0% { opacity: 0; transform: translate(${dx}px, ${dy}px) scale(0.5) rotate(0deg); animation-timing-function: ${SPRING}; }
  10% { opacity: 1; transform: translate(${dx}px, ${dy}px) scale(1.4) rotate(0deg); animation-timing-function: ease-in-out; }
  20% { transform: translate(${dx}px, ${dy}px) scale(1.4) rotate(-7deg); animation-timing-function: ease-in-out; }
  28% { transform: translate(${dx}px, ${dy}px) scale(1.4) rotate(6deg); animation-timing-function: ease-in-out; }
  36% { transform: translate(${dx}px, ${dy}px) scale(1.4) rotate(-3deg); animation-timing-function: ease-in-out; }
  44% { transform: translate(${dx}px, ${dy}px) scale(1.4) rotate(0deg); animation-timing-function: ease-in-out; }
  50% { transform: translate(${dx}px, ${dy}px) scale(1.4) rotate(0deg); animation-timing-function: ${SPRING}; }
  76%, 100% { opacity: 1; transform: translate(0px, 0px) scale(1) rotate(0deg); }
}
${crease(`${id}-poop`, 3, 12, 24, D)}
${crease(`${id}-poop`, 2, 16, 28, D)}
${crease(`${id}-poop`, 1, 20, 32, D)}
${grow(id, 'stem', 'stem', 50, 64, D)}
${open('arm')}
@keyframes ${id}-arm-k {
  0%, 56% { opacity: 0; transform: rotate(-43.7deg) scale(0.55); animation-timing-function: ${EASE}; }
  57% { opacity: 1; }
  74% { opacity: 1; transform: rotate(5deg) scale(1.02); animation-timing-function: ease-out; }
  84%, 100% { opacity: 1; transform: rotate(0deg) scale(1); }
}
${open('leg')}
@keyframes ${id}-leg-k {
  0%, 60% { opacity: 0; transform: rotate(43.6deg) scale(0.55); animation-timing-function: ${EASE}; }
  61% { opacity: 1; }
  78% { opacity: 1; transform: rotate(-5deg) scale(1.02); animation-timing-function: ease-out; }
  88%, 100% { opacity: 1; transform: rotate(0deg) scale(1); }
}`;
  return {
    id, name: 'swirl-and-unfold', D, css, defs: '',
    body: (c) => c.card(c.clip(
      c.k(kPart('stem', `${id}-stem`) + kPart('arm', `${id}-arm`) + kPart('leg', `${id}-leg`)) +
      c.p(wrapAt(POOP_C, `${id}-poop`, poopArt({})))
    )),
  };
}

function a04() {
  const id = 's4', D = 1060;
  const css = `
.${id}-shell { animation: ${id}-shell-k ${D}ms linear both; }
@keyframes ${id}-shell-k { 0% { opacity: 0; transform: scale(0.86); animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); } 18%, 100% { opacity: 1; transform: scale(1); } }
.${id}-dark { animation: ${id}-dark-k ${D}ms linear both; }
@keyframes ${id}-dark-k { 0%, 83% { opacity: 1; } 86%, 100% { opacity: 0; } }
${grow(id, 'ds', 'stem', 6, 24, D, 'cubic-bezier(0.16, 1, 0.3, 1)')}
${grow(id, 'da', 'arm', 13, 31, D, 'cubic-bezier(0.16, 1, 0.3, 1)')}
${grow(id, 'dl', 'leg', 19, 37, D, 'cubic-bezier(0.16, 1, 0.3, 1)')}
.${id}-dpoop { animation: ${id}-dpoop-k ${D}ms linear both; }
@keyframes ${id}-dpoop-k { 0%, 28% { opacity: 0; transform: scale(0) rotate(-20deg); animation-timing-function: cubic-bezier(0.22, 1.4, 0.36, 1); } 32% { opacity: 1; } 44%, 100% { opacity: 1; transform: scale(1.08) rotate(0deg); } }
.${id}-iris { animation: ${id}-iris-k ${D}ms linear both; }
@keyframes ${id}-iris-k { 0%, 41% { transform: scale(0); animation-timing-function: ${EASE}; } 84%, 100% { transform: scale(1); } }
.${id}-ring { animation: ${id}-ring-k ${D}ms linear both; }
@keyframes ${id}-ring-k { 0%, 40% { opacity: 0; transform: scale(0.05); animation-timing-function: ${EASE}; } 45% { opacity: 0.9; } 82%, 100% { opacity: 0; transform: scale(1.04); } }
.${id}-lpoop { animation: ${id}-lpoop-k ${D}ms linear both; }
@keyframes ${id}-lpoop-k { 0%, 40% { transform: scale(0.84) rotate(-16deg); animation-timing-function: ${SPRING}; } 66% { transform: scale(1.08) rotate(4deg); animation-timing-function: ease-out; } 84%, 100% { transform: scale(1) rotate(0deg); } }`;
  const R = 1100; // larger than the distance from the poop to the farthest corner
  return {
    id, name: 'polarity-iris-flip', D, css,
    defs: `<mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><g transform="translate(${POOP_C.x} ${POOP_C.y})"><g class="${id}-iris"><circle r="${R}" fill="#fff"/></g></g></mask>`,
    body: (c) => c.card(
      // the inverted icon first: ink tile, cream K, ink poop with cream lines
      `<g class="${id}-dark" clip-path="url(#${c.pre}-clip)"><g data-tile>${TILE} fill="${INK}"/></g>` +
      kAll({ stem: `${id}-ds`, arm: `${id}-da`, leg: `${id}-dl` }, CREAM) +
      wrapAt(POOP_C, `${id}-dpoop`, poopArt({ ink: CREAM, body: INK, halo: INK })) +
      `<g transform="translate(${POOP_C.x} ${POOP_C.y})"><g class="${id}-ring"><circle r="${R}" fill="none" stroke="${CREAM}" stroke-width="28"/></g></g></g>` +
      // then the real icon, revealed by the iris
      `<g data-mask mask="url(#${id}-mask)"><g data-tile>${TILE} fill="${CREAM}"/></g>` +
      c.k(kAll({ stem: 'k-s', arm: 'k-a', leg: 'k-l' })) + c.p(wrapAt(POOP_C, `${id}-lpoop`, poopArt({}))) + '</g>', null, true),
  };
}

function a05() {
  const id = 's5', D = 1220;
  const css = `
.${id}-card { animation: ${id}-card-k ${D}ms linear both; }
@keyframes ${id}-card-k {
  0% { opacity: 0; transform: rotate(-26deg) scale(0.82); animation-timing-function: ${EASE}; }
  8% { opacity: 1; }
  60% { transform: rotate(3deg) scale(1.01); animation-timing-function: ease-in-out; }
  76% { transform: rotate(-1deg) scale(1); animation-timing-function: ease-out; }
  90%, 100% { opacity: 1; transform: rotate(0deg) scale(1); }
}
.${id}-r1 { animation: ${id}-r1-k ${D}ms linear both; }
@keyframes ${id}-r1-k { 0%, 6% { opacity: 0; transform: rotate(0deg) scale(1.15); } 14% { opacity: 0.9; } 56%, 100% { opacity: 0; transform: rotate(480deg) scale(0.12); } }
.${id}-r2 { animation: ${id}-r2-k ${D}ms linear both; }
@keyframes ${id}-r2-k { 0%, 10% { opacity: 0; transform: rotate(0deg) scale(1.05); } 18% { opacity: 0.9; } 62%, 100% { opacity: 0; transform: rotate(-600deg) scale(0.1); } }
.${id}-poop { animation: ${id}-poop-k ${D}ms linear both; }
@keyframes ${id}-poop-k {
  0%, 38% { opacity: 0; transform: translate(0px, 70px) scale(0.2) rotate(-540deg); animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1); }
  42% { opacity: 1; }
  70% { opacity: 1; transform: translate(0px, -24px) scale(1.15) rotate(24deg); animation-timing-function: ease-in-out; }
  86% { transform: translate(0px, 4px) scale(0.98) rotate(-4deg); animation-timing-function: ease-out; }
  100% { opacity: 1; transform: translate(0px, 0px) scale(1) rotate(0deg); }
}
${crease(`${id}-poop`, 3, 62, 76, D)}
${crease(`${id}-poop`, 2, 66, 80, D)}
${crease(`${id}-poop`, 1, 70, 84, D)}`;
  const ring = (cls, rad, dash) => `<g transform="translate(${POOP_C.x} ${POOP_C.y})"><g class="${id}-${cls}"><circle r="${rad}" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round" stroke-dasharray="${dash}"/></g></g>`;
  return {
    id, name: 'flush-vortex-spin', D, css, defs: '',
    body: (c) => c.card(c.clip(c.k(kAll({ stem: 'k-s', arm: 'k-a', leg: 'k-l' })) + ring('r1', 330, '150 110') + ring('r2', 210, '100 80') +
      c.p(wrapAt(POOP_C, `${id}-poop`, poopArt({})))), `${id}-card`),
  };
}

function a06() {
  const id = 's6', D = 1240;
  const css = `
.${id}-card { animation: ${id}-card-k ${D}ms linear both; }
@keyframes ${id}-card-k {
  0% { opacity: 0; transform: scale(0.92); animation-timing-function: ${EASE}; }
  14% { opacity: 1; transform: scale(1); }
  50% { transform: scale(1, 1); animation-timing-function: ease-out; }
  54% { transform: scale(1.014, 0.986); animation-timing-function: ease-out; }
  64%, 100% { opacity: 1; transform: scale(1, 1); }
}
.${id}-stem { animation: ${id}-stem-k ${D}ms linear both; }
@keyframes ${id}-stem-k { 0%, 8% { opacity: 0; transform: translate(0px, 520px); animation-timing-function: ${EASE}; } 9% { opacity: 1; } 34% { transform: translate(0px, -14px); animation-timing-function: ease-in-out; } 42%, 100% { opacity: 1; transform: translate(0px, 0px); } }
.${id}-arm { animation: ${id}-arm-k ${D}ms linear both; }
@keyframes ${id}-arm-k { 0%, 14% { opacity: 0; transform: translate(300px, -314px); animation-timing-function: ${EASE}; } 15% { opacity: 1; } 42% { transform: translate(-12px, 12px); animation-timing-function: ease-in-out; } 50%, 100% { opacity: 1; transform: translate(0px, 0px); } }
.${id}-leg { animation: ${id}-leg-k ${D}ms linear both; }
@keyframes ${id}-leg-k { 0%, 20% { opacity: 0; transform: translate(300px, 314px); animation-timing-function: ${EASE}; } 21% { opacity: 1; } 46% { transform: translate(-12px, -12px); animation-timing-function: ease-in-out; } 54%, 100% { opacity: 1; transform: translate(0px, 0px); } }
.${id}-wipe { animation: ${id}-wipe-k ${D}ms linear both; }
@keyframes ${id}-wipe-k {
  0%, 52% { transform: scale(1, 0); }
  58% { transform: scale(1, 0.3); animation-timing-function: steps(1, end); }
  60% { transform: scale(1, 0.3); animation-timing-function: ease-out; }
  66% { transform: scale(1, 0.55); animation-timing-function: steps(1, end); }
  68% { transform: scale(1, 0.55); animation-timing-function: ease-out; }
  74% { transform: scale(1, 0.8); animation-timing-function: steps(1, end); }
  76% { transform: scale(1, 0.8); animation-timing-function: ease-out; }
  82%, 100% { transform: scale(1, 1); }
}
.${id}-stack { animation: ${id}-stack-k ${D}ms linear both; }
@keyframes ${id}-stack-k {
  0%, 52% { transform: translate(0px, 0px); animation-timing-function: ease-out; }
  58% { transform: translate(0px, 10px); animation-timing-function: ease-out; }
  64% { transform: translate(0px, -4px); animation-timing-function: ease-in-out; }
  70% { transform: translate(0px, 8px); animation-timing-function: ease-out; }
  76% { transform: translate(0px, -3px); animation-timing-function: ease-in-out; }
  82%, 100% { transform: translate(0px, 0px); }
}
${crease(`${id}-poop`, 3, 56, 66, D)}
${crease(`${id}-poop`, 2, 64, 74, D)}
${crease(`${id}-poop`, 1, 72, 82, D)}`;
  const bottom = r(POOP_B.y + 16);
  return {
    id, name: 'modular-stack', D, css,
    defs: `<mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><g transform="translate(0 ${bottom})"><g class="${id}-wipe"><rect x="300" y="-420" width="700" height="420" fill="#fff"/></g></g></mask>`,
    body: (c) => c.card(c.clip(
      c.k(kPart('stem', `${id}-stem`) + kPart('arm', `${id}-arm`) + kPart('leg', `${id}-leg`)) +
      c.p(`<g class="${id}-stack"><g mask="url(#${id}-mask)"><g class="${id}-poop">${poopArt({})}</g></g></g>`)
    ), `${id}-card`),
  };
}

// ---------- assembly ----------
const ANIMS = [a01, a02, a03, a04, a05, a06];

/** A tiny affine helper: uniform scale s and offset (e, f). */
const T = (s, e, f) => ({ s, e, f });
const compose = (a, b) => T(a.s * b.s, a.s * b.e + a.e, a.s * b.f + a.f); // a after b
const invert = (a) => T(1 / a.s, -a.e / a.s, -a.f / a.s);
const css = (m) => `translate(${r(m.e)}px, ${r(m.f)}px) scale(${Math.round(m.s * 1e5) / 1e5})`;

function build(anim, lockup, textD) {
  const id = anim.id;
  const pre = lockup ? `${id}l` : id;
  const D = anim.D;
  const hasDark = anim.name === 'polarity-iris-flip';
  // phase 2 (lockup only): the K and the poop move from the icon slot into the wordmark slot
  const S0 = 300 / 1024, A0 = T(S0, 381, 0); // the icon sits centred in the 1062 x 300 banner
  const kFinal = T(WORDMARK.k.scale * 2, (WORDMARK.k.tx - 51) * 2, (WORDMARK.k.ty - 40) * 2);
  const pw = WORDMARK.poop;
  const pFinal = T(pw.scale * 2, (pw.x - 51) * 2, (pw.y - 40) * 2);
  const pIcon = T(P.scale, P.x, P.y);
  const Gk = compose(invert(A0), kFinal);
  // the p2 wrapper sits outside the poop's own translate/scale: A0 after GpIcon after the icon's poop placement = the wordmark's placement
  const GpIcon = compose(invert(A0), compose(pFinal, invert(pIcon)));
  const p1 = D + 260, p2 = 1500, total = p1 + p2;
  const pct = (ms) => Math.round((ms / total) * 10000) / 100;
  const phase2 = lockup ? `
.${pre}-p2k { animation: ${pre}-p2k-k ${p2}ms cubic-bezier(0.65, 0, 0.35, 1) ${p1}ms both; }
@keyframes ${pre}-p2k-k { 0% { transform: translate(0px, 0px) scale(1); } 100% { transform: ${css(Gk)}; } }
.${pre}-p2p { animation: ${pre}-p2p-k ${p2}ms cubic-bezier(0.65, 0, 0.35, 1) ${p1}ms both; }
@keyframes ${pre}-p2p-k { 0% { transform: translate(0px, 0px) scale(1); } 100% { transform: ${css(GpIcon)}; } }
.${pre}-hop { animation: ${pre}-hop-k ${p2}ms linear ${p1}ms both; }
@keyframes ${pre}-hop-k { 0% { transform: translate(0px, 0px); } 45% { transform: translate(0px, -260px); animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.5); } 75% { transform: translate(0px, 0px) ; } 85% { transform: translate(0px, 22px) } 100% { transform: translate(0px, 0px); } }
.${pre}-line { animation: ${pre}-line-k ${p2}ms ease-in-out ${p1}ms both; }
@keyframes ${pre}-line-k { 0% { stroke-width: ${P.strokeWidth}; } 100% { stroke-width: ${pw.strokeWidth}; } }
.${pre}-gone { animation: ${pre}-gone-k ${p2}ms linear ${p1}ms both; }
@keyframes ${pre}-gone-k { 0%, 55% { opacity: 1; } 75%, 100% { opacity: 0; } }
.${pre}-tile { animation: ${pre}-tile-k ${total}ms linear both; }
@keyframes ${pre}-tile-k { 0%, ${pct(p1)}% { opacity: 1; } ${pct(p1) + 0.01}%, 100% { opacity: 0; } }
.${pre}-plate { animation: ${pre}-plate-k ${total}ms linear both, ${pre}-plate-w ${p2}ms cubic-bezier(0.65, 0, 0.35, 1) ${p1}ms both; }
@keyframes ${pre}-plate-k { 0%, ${pct(p1)}% { opacity: 0; } ${pct(p1) + 0.01}%, 100% { opacity: 1; } }
@keyframes ${pre}-plate-w { 0% { x: 381px; width: 300px; } 100% { x: 0px; width: 1062px; } }
.${pre}-unclip { animation: ${pre}-unclip-k ${total}ms linear both; }
@keyframes ${pre}-unclip-k { 0%, ${pct(p1)}% { clip-path: url(#${pre}-clip); } ${pct(p1) + 0.01}%, 100% { clip-path: none; } }
.${pre}-unmask { animation: ${pre}-unmask-k ${total}ms linear both; }
@keyframes ${pre}-unmask-k { 0%, ${pct(p1)}% { mask: url(#${id}-mask); } ${pct(p1) + 0.01}%, 100% { mask: none; } }
.${pre}-text { animation: ${pre}-text-k ${p2}ms ease-out ${p1}ms both; }
@keyframes ${pre}-text-k { 0%, 55% { opacity: 0; transform: translate(-40px, 0px); } 100% { opacity: 1; transform: translate(0px, 0px); } }` : '';

  const ctx = {
    pre,
    k: (html) => (lockup ? `<g class="${pre}-p2k">${html}</g>` : html),
    p: (html) => (lockup ? `<g class="${pre}-p2p"><g class="${pre}-hop">${html}</g></g>` : html),
    clip: (html) => `<g clip-path="url(#${pre}-clip)"${lockup ? ` class="${pre}-unclip"` : ''}>${html}</g>`,
    card: (inner, cardCls, noTile) => {
      const cls = cardCls || `${id}-card`;
      const tile = noTile ? '' : `<g${lockup ? ` class="${pre}-tile"` : ''}>${TILE} fill="${CREAM}"/></g>`;
      return `<g transform="translate(512 512)"><g class="${cls}"><g transform="translate(-512 -512)">${tile}${inner}</g></g></g>`;
    },
  };
  // the polarity animation builds its own card (the tile is part of its two layers) and its own tile fade
  let inner;
  if (hasDark) {
    inner = anim.body({ ...ctx, card: (html) => ctx.card(html, `${id}-shell`, true) });
    inner = inner.replace(/<g data-tile>/g, lockup ? `<g class="${pre}-tile">` : '<g>');
    // the iris mask only matters during phase 1: in the lockup it is dropped at the hand-off so the K and the poop can leave the tile
    inner = inner.replace('<g data-mask ', lockup ? `<g class="${pre}-unmask" ` : '<g ');
  } else inner = anim.body(ctx);
  let cssText = anim.css.trim() + phase2;
  const defs = `<clipPath id="${pre}-clip">${TILE}/></clipPath>${anim.defs}`;
  const svgInner = inner;
  // the halo and the poop's fill disappear in the wordmark (its poop is an outline only), and the line weight follows
  if (lockup) {
    cssText += `\n.${pre}-p2p .halo { animation: ${pre}-gone-k ${p2}ms linear ${p1}ms both; }
.${pre}-p2p .poop-ink { animation: ${pre}-line-k ${p2}ms ease-in-out ${p1}ms both; }
.${pre}-p2p .poop-ink > path:first-child { animation: ${pre}-fill-k ${p2}ms linear ${p1}ms both; }
@keyframes ${pre}-fill-k { 0%, 55% { fill-opacity: 1; } 75%, 100% { fill-opacity: 0; } }`;
  }
  const body = lockup
    ? `<rect class="${pre}-plate" x="381" y="0" width="300" height="300" rx="70" fill="${CREAM}"/>` +
      `<g class="${pre}-textwrap" transform="translate(-102 -80) scale(2)"><g class="${pre}-text"><path fill="${INK}" d="${textD}"/></g></g>` +
      `<g transform="translate(${A0.e} ${A0.f}) scale(${r(A0.s * 1e5) / 1e5})">${svgInner}</g>`
    : svgInner;
  const vb = lockup ? '0 0 1062 300' : '0 0 1024 1024';
  const size = lockup ? 'width="1062" height="300"' : 'width="512" height="512"';
  const title = `Kakcal launch animation ${anim.id.slice(1)}: ${anim.name.replace(/-/g, ' ')}${lockup ? ' (with wordmark hand-off)' : ''}`;
  return `<!-- Generated by scripts/generate-intro-animations.mjs (Koink-style art). Do not hand-edit. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${size} role="img" aria-label="Kakcal">
<title>${title}</title>
<style>
${cssText}
</style>
<defs>${defs}</defs>
${body}
</svg>
`;
}

const word = await readFile(path.join(root, 'src/assets/brand/kakcalculator-wordmark.svg'), 'utf8');
const textD = word.match(/class="kc-text"[^>]*\sd="([^"]+)"/)[1];
const files = [];
for (const make of ANIMS) {
  const anim = make();
  const n = anim.id.slice(1);
  const base = `0${n}-${anim.name}`;
  await writeFile(path.join(root, `${OUT}animations/${base}.svg`), build(anim, false, textD));
  await writeFile(path.join(root, `${OUT}animations/${base}-lockup.svg`), build(make(), true, textD));
  files.push({ base, name: anim.name, D: anim.D, n });
}
console.log(`wrote ${files.length * 2} animation SVGs`);

// ---------- overview sheet ----------
const LOGOS = [
  ['kakcalculator-icon.svg', 'icon'], ['kakcalculator-icon-inverted.svg', 'icon'], ['kakcalculator-icon-theme-aware.svg', 'icon'],
  ['kakcalculator-wordmark.svg', 'wordmark'], ['kakcalculator-wordmark-inverted.svg', 'wordmark'], ['kakcalculator-wordmark-transparent.svg', 'wordmark'],
  ['kakcalculator-wordmark-theme-aware.svg', 'wordmark'],
];
const strip = (svg) => svg.replace(/<!--[\s\S]*?-->\s*/g, '').replace(/<title>[\s\S]*?<\/title>/, '').trim();
const cell = (file, svg, kind, animated) =>
  `<figure class="cell${kind === 'wordmark' ? ' is-wordmark' : ''}${file.includes('transparent') ? ' is-transparent' : ''}"><div class="art" data-svg>${strip(svg)}</div>` +
  `<figcaption>${file}${animated ? ' <button type="button" class="replay">replay</button>' : ''}</figcaption></figure>`;
const logoCells = [];
for (const [f, kind] of LOGOS) logoCells.push(cell(f, await readFile(path.join(root, `${OUT}logos/${f}`), 'utf8'), kind, false));
const p1Cells = [], p2Cells = [];
for (const f of files) {
  p1Cells.push(cell(`${f.base}.svg`, await readFile(path.join(root, `${OUT}animations/${f.base}.svg`), 'utf8'), 'icon', true));
  p2Cells.push(cell(`${f.base}-lockup.svg`, await readFile(path.join(root, `${OUT}animations/${f.base}-lockup.svg`), 'utf8'), 'wordmark', true));
}
const dark = PALETTE.dark;
const overview = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Kakcal &mdash; intro animation &amp; logo overview</title>
<!-- Generated by scripts/generate-intro-animations.mjs. Do not hand-edit. -->
<style>
  :root { --kc-cream:${light.bg}; --kc-ink:${light.ink}; --kc-edge:#D5C8B3; --page:${dark.bg}; --text:${light.bg}; }
  body.is-light { --page:${light.bg}; --text:${light.ink}; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--page); color:var(--text); font-family:ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif; padding:34px 26px 60px; }
  h1 { font-size:22px; letter-spacing:-0.02em; }
  h2 { font-size:12px; text-transform:uppercase; letter-spacing:0.15em; opacity:.6; margin:36px 0 14px; border-top:1px solid rgba(127,127,127,0.25); padding-top:16px; }
  p.lead { font-size:13px; opacity:.75; margin-top:7px; max-width:78ch; line-height:1.55; }
  .bar { display:flex; gap:10px; margin-top:14px; }
  .bar button, .replay { font:inherit; font-size:12px; color:inherit; background:rgba(127,127,127,0.18); border:1px solid rgba(127,127,127,0.35); border-radius:999px; padding:4px 12px; cursor:pointer; }
  .replay { font-size:10px; padding:1px 8px; margin-left:8px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:14px; }
  .cell { background:rgba(127,127,127,0.1); border:1px solid rgba(127,127,127,0.25); border-radius:12px; overflow:hidden; }
  .art { display:flex; align-items:center; justify-content:center; padding:14px; height:190px; }
  .art svg { max-width:100%; max-height:100%; width:auto; height:auto; display:block; overflow:visible; }
  .cell.is-wordmark .art { height:120px; }
  /* the transparent wordmark is ink on nothing, so show it on the paper colour it is meant for */
  .cell.is-transparent .art { background:${light.bg}; }
  figcaption { font-family:ui-monospace,Menlo,monospace; font-size:10.5px; padding:8px 11px; background:rgba(0,0,0,0.25); border-top:1px solid rgba(127,127,127,0.2); }
  /* the theme-aware files read these two tokens */
  [data-art] { --kc-surface:var(--kc-cream); --kc-contrast:var(--kc-ink); }
</style>
</head>
<body>
  <h1>Kakcal &mdash; intro animation &amp; logo set</h1>
  <p class="lead">Koink-style brand art (ink ${light.ink} on ${light.bg}; dark ${dark.ink} on ${dark.bg}). Every file below is a standalone, dependency-free SVG shown live at its real speed. The <em>-lockup</em> variants run the two-phase launch: the icon animation settles first, then the K and the poop move into the wordmark. Use the buttons to switch the sheet between the light and the dark tokens, or to replay everything.</p>
  <div class="bar"><button type="button" id="theme">Light / dark</button><button type="button" id="all">Replay all</button></div>
  <h2>Logos &mdash; ${LOGOS.length} files</h2>
  <div class="grid" data-art>${logoCells.join('')}</div>
  <h2>Animations, phase 1 only &mdash; 6 files</h2>
  <div class="grid" data-art>${p1Cells.join('')}</div>
  <h2>Animations, phase 1 + phase 2 (icon &rarr; app name) &mdash; 6 files</h2>
  <div class="grid" data-art>${p2Cells.join('')}</div>
<script>
  // Replaying = putting the same markup back, which restarts every CSS animation.
  var arts = [].slice.call(document.querySelectorAll('[data-svg]'));
  var sources = arts.map(function (a) { return a.innerHTML; });
  function replay(i) { arts[i].innerHTML = ''; void arts[i].offsetWidth; arts[i].innerHTML = sources[i]; }
  document.getElementById('all').onclick = function () { arts.forEach(function (_, i) { replay(i); }); };
  [].forEach.call(document.querySelectorAll('.replay'), function (b) { b.onclick = function () { replay(arts.indexOf(b.closest('.cell').querySelector('[data-svg]'))); }; });
  document.getElementById('theme').onclick = function () {
    var light = document.body.classList.toggle('is-light');
    var root = document.documentElement.style;
    root.setProperty('--kc-cream', light ? '${light.bg}' : '${dark.bg}');
    root.setProperty('--kc-ink', light ? '${light.ink}' : '${dark.ink}');
    document.getElementById('all').click();
  };
  document.body.classList.add('is-light');
  document.documentElement.style.setProperty('--kc-cream', '${light.bg}');
</script>
</body>
</html>
`;
await writeFile(path.join(root, `${OUT}logos-and-animations-overview.html`), overview);
console.log('wrote the overview sheet');
