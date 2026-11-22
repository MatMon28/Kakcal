// The Kakcal animations, as SVG + CSS keyframes (no script, no raster): the six LAUNCH animations of the app icon,
// the wordmark animation, and the six LOGO-PRESS animations (what happens when the wordmark in the header is tapped).
// Every animation ends exactly on the static icon / wordmark. They are generated, never hand-edited:
//   scripts/generate-intro-animations.mjs  writes the launch + wordmark animations (src/assets/kakcalculator_intro/animations)
//   scripts/generate-poop-animations.mjs   writes the logo-press CSS (src/components/common/poop-anim.css)
// Shared geometry (the poop's tiers, the K, the wordmark layout) comes from scripts/brand-geometry.mjs.
// Needs opentype.js (not a project dependency):  npm i --no-save opentype.js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { K, K_BOX, PALETTE, POOP, SILHOUETTE, layoutWordmark } from './brand-geometry.mjs';

const r = (n) => Math.round(n * 100) / 100;
const TIP = POOP.tip;
/** The K as a one-colour shape (the carved-out K of the icon), centred at (cx, cy) with height h. */
const kShape = (cx, cy, h, fill) => {
  const s = h / K_BOX.h;
  return `<g transform="translate(${r(cx)} ${r(cy)}) scale(${r(s * 1000) / 1000}) translate(${-r(K_BOX.cx)} ${-r(K_BOX.cy)})" fill="${fill}"><rect x="${K.stem.x}" y="${K.stem.y}" width="${K.stem.width}" height="${K.stem.height}" rx="${K.stem.rx}"/><path d="${K.arm}"/><path d="${K.leg}"/></g>`;
};
export function loadWordmarkFont() {
  const b = readFileSync(fileURLToPath(new URL('../node_modules/@fontsource/nunito/files/nunito-latin-900-normal.woff', import.meta.url)));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
const font = loadWordmarkFont();
const WL = layoutWordmark(font);
/** The wordmark layout in the shape the animations below use. */
function kakWordmark(theme) {
  const { bg, ink } = KK[theme];
  return { W: WL.width, t1: WL.first, t2: WL.rest, px: WL.px, ty: WL.poop.y, s: WL.poop.rawScale, ink, bg };
}

const SOFT = 'cubic-bezier(.22,1,.36,1)', BOUNCE = 'cubic-bezier(.3,1.5,.5,1)', FALL = 'cubic-bezier(.55,0,.9,.5)', OUT = 'cubic-bezier(.2,.7,.3,1)', IO = 'ease-in-out', LIN = 'linear';
const kf = (name, frames) => `@keyframes ${name}{${frames.map(([p, s, e]) => `${p}{${s}${e ? `animation-timing-function:${e};` : ''}}`).join('')}}`;
const T = (s) => `transform:${s};`;
const O = (v) => `opacity:${v};`;
const nid = (id) => id.replace(/[^a-z0-9]/gi, '');

/** Wrap parts into a self-contained svg. `css` rules use the placeholders `&` (scope) and `@` (keyframe prefix). */
function svg({ id, D, loop = false, vb = '0 0 1024 1024', css, body, title, tile }) {
  const q = nid(id);
  const style = `.${q}{--d:${D}ms}.${q} .m{transform-box:fill-box;transform-origin:50% 50%}` + css.replaceAll('@keyframes', '§KF').replaceAll('&', `.${q}`).replaceAll('@', q).replaceAll('§KF', '@keyframes ');
  const clip = tile ? `<defs><clipPath id="${q}c"><rect width="1024" height="1024" rx="240"/></clipPath></defs><rect width="1024" height="1024" rx="240" fill="${tile}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" class="${q}"><title>${title.replaceAll("&", "&amp;")}</title><style>${style}</style>${clip}${body.replaceAll('@c', q + 'c')}</svg>`;
}
const run = (name, extra = '') => `animation:@${name} var(--d) linear both;${extra}`;

const A = { kakcal: [] };
const KK = PALETTE;
const pillR = (x1, x2, y1, y2, cls) => `<g class="m ${cls}"><rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="${(y2 - y1) / 2}"/></g>`;
const PS = 15.6, PT = `translate(${r(500 - 32 * PS)} ${r(505 - 30.5 * PS)}) scale(${PS})`;
/** The poop as animatable tiers (poop units, 1 unit = 13.1 px in the 1024 tile). */
function poopParts(fg, cut, withK = true) {
  const tiers = `<g class="m poop"><g class="m t3" ><rect x="5" y="38" width="54" height="21" rx="10.5"/></g><g class="m t2"><rect x="13" y="24" width="38" height="20" rx="10"/></g><g class="m t1"><rect x="21" y="11" width="22" height="18" rx="9"/></g><g class="m tip"><path d="${TIP}"/></g></g>`;
  return `<g class="m all"><g transform="${PT}" fill="${fg}">${tiers}</g>${withK ? `<g class="m kk">${kShape(500, 662, 318, cut)}</g>` : ''}</g>`;
}
const wrapK = (inner) => `<g clip-path="url(#@c)"><g transform="translate(512 512) scale(.84) translate(-500 -500)">${inner}</g></g>`;
const BASE_KAK = `& .t3,& .t2,& .t1,& .tip,& .poop{transform-origin:50% 100%}& .all{transform-origin:50% 50%}`;
const addP = (def) => A.kakcal.push(def);

addP({ id: 'soft-serve', name: 'Soft-serve', desc: 'New: the poop is swirled up like soft-serve (tier by tier, each growing out of the last), the tip flicks, and the K is pressed in.', D: 2200,
  css: `${BASE_KAK}
& .t3{${run('t3')}}& .t2{${run('t2')}}& .t1{${run('t1')}}& .tip{${run('tip')}}& .kk{${run('kk')}}& .poop{${run('press')}}
${kf('@t3', [['0%', O(0) + T('scale(.1,0)')], ['5.9%', O(0) + T('scale(.1,0)')], ['6%', O(1) + T('scale(.1,0)'), BOUNCE], ['24%', O(1) + T('scale(1,1)')], ['100%', O(1) + T('scale(1,1)')]])}
${kf('@t2', [['0%', O(0) + T('translateY(8px) scale(.2,.1)')], ['19.9%', O(0) + T('translateY(8px) scale(.2,.1)')], ['20%', O(1) + T('translateY(8px) scale(.2,.1)'), BOUNCE], ['40%', O(1) + T('translateY(0) scale(1,1)')], ['100%', O(1) + T('translateY(0) scale(1,1)')]])}
${kf('@t1', [['0%', O(0) + T('translateY(8px) scale(.2,.1)')], ['33.9%', O(0) + T('translateY(8px) scale(.2,.1)')], ['34%', O(1) + T('translateY(8px) scale(.2,.1)'), BOUNCE], ['54%', O(1) + T('translateY(0) scale(1,1)')], ['100%', O(1) + T('translateY(0) scale(1,1)')]])}
${kf('@tip', [['0%', T('scale(0) rotate(0deg)')], ['48%', T('scale(0) rotate(0deg)'), BOUNCE], ['62%', T('scale(1.15) rotate(24deg)'), IO], ['70%', T('scale(1) rotate(-10deg)'), IO], ['76%', T('scale(1) rotate(0deg)')], ['100%', T('scale(1) rotate(0deg)')]])}
${kf('@kk', [['0%', O(0) + T('scale(.3)')], ['64%', O(0) + T('scale(.3)')], ['65%', O(1) + T('scale(1.9)'), OUT], ['74%', O(1) + T('scale(.88)'), IO], ['80%', O(1) + T('scale(1.04)')], ['85%', O(1) + T('scale(1)')], ['100%', O(1) + T('scale(1)')]])}
${kf('@press', [['0%', T('scale(1,1)')], ['70%', T('scale(1,1)'), IO], ['75%', T('scale(1.05,.93)'), IO], ['83%', T('scale(.99,1.02)')], ['89%', T('scale(1,1)')], ['100%', T('scale(1,1)')]])}`,
});

addP({ id: 'stack-plop', name: 'Stack & plop', desc: 'Inspired by the old “modular-stack” and “sketch-and-plop”: the four parts plop down one after another with a squash, then the K slides in and presses.', D: 2000,
  css: `${BASE_KAK}
& .t3{${run('t3')}}& .t2{${run('t2')}}& .t1{${run('t1')}}& .tip{${run('tip')}}& .kk{${run('kk')}}
${kf('@t3', [['0%', O(0) + T('translateY(-60px) scale(1,1)')], ['6%', O(1) + T('translateY(-60px) scale(1,1)'), FALL], ['18%', O(1) + T('translateY(0) scale(1,1)'), OUT], ['22%', O(1) + T('translateY(0) scale(1.06,.9)'), IO], ['28%', O(1) + T('translateY(0) scale(.98,1.03)')], ['34%', O(1) + T('translateY(0) scale(1,1)')], ['100%', O(1) + T('translateY(0) scale(1,1)')]])}
${kf('@t2', [['0%', O(0) + T('translateY(-60px) scale(1,1)')], ['20%', O(1) + T('translateY(-60px) scale(1,1)'), FALL], ['32%', O(1) + T('translateY(0) scale(1,1)'), OUT], ['36%', O(1) + T('translateY(0) scale(1.07,.88)'), IO], ['42%', O(1) + T('translateY(0) scale(.98,1.03)')], ['48%', O(1) + T('translateY(0) scale(1,1)')], ['100%', O(1) + T('translateY(0) scale(1,1)')]])}
${kf('@t1', [['0%', O(0) + T('translateY(-60px) scale(1,1)')], ['34%', O(1) + T('translateY(-60px) scale(1,1)'), FALL], ['46%', O(1) + T('translateY(0) scale(1,1)'), OUT], ['50%', O(1) + T('translateY(0) scale(1.08,.86)'), IO], ['56%', O(1) + T('translateY(0) scale(.98,1.03)')], ['62%', O(1) + T('translateY(0) scale(1,1)')], ['100%', O(1) + T('translateY(0) scale(1,1)')]])}
${kf('@tip', [['0%', O(0) + T('translateY(-60px) scale(1,1)')], ['48%', O(1) + T('translateY(-60px) scale(1,1)'), FALL], ['58%', O(1) + T('translateY(0) scale(1,1)'), OUT], ['62%', O(1) + T('translateY(0) scale(1.12,.8)'), IO], ['68%', O(1) + T('translateY(0) scale(.97,1.06)')], ['74%', O(1) + T('translateY(0) scale(1,1)')], ['100%', O(1) + T('translateY(0) scale(1,1)')]])}
${kf('@kk', [['0%', O(0) + T('translateX(-190px)')], ['66%', O(0) + T('translateX(-190px)')], ['67%', O(1) + T('translateX(-190px) scale(1)'), SOFT], ['80%', O(1) + T('translateX(0) scale(1)'), IO], ['85%', O(1) + T('translateX(0) scale(.88)'), IO], ['91%', O(1) + T('translateX(0) scale(1.05)')], ['96%', O(1) + T('translateX(0) scale(1)')], ['100%', O(1) + T('translateX(0) scale(1)')]])}` });

addP({ id: 'jelly-press', name: 'Jelly key-press', desc: 'Inspired by the old “tactile-keypress”: the poop bounces in whole, the K drops onto it like a pressed key, and the tiers wobble like jelly one after the other.', D: 2000,
  css: `${BASE_KAK}
& .all{${run('in')}}& .kk{${run('kk')}}& .t3{${run('j3')}}& .t2{${run('j2')}}& .t1{${run('j1')}}& .tip{${run('jt')}}
${kf('@in', [['0%', O(0) + T('scale(.55)')], ['26%', O(1) + T('scale(1)'), BOUNCE], ['100%', O(1) + T('scale(1)')]])}
${kf('@kk', [['0%', O(0) + T('scale(1.9)')], ['32%', O(0) + T('scale(1.9)')], ['33%', O(1) + T('scale(1.9)'), OUT], ['43%', O(1) + T('scale(.86)'), IO], ['49%', O(1) + T('scale(1.05)')], ['55%', O(1) + T('scale(1)')], ['100%', O(1) + T('scale(1)')]])}
${[['j3', 40], ['j2', 44], ['j1', 48], ['jt', 52]].map(([n, s]) => kf('@' + n, [['0%', T('scale(1,1)')], [`${s}%`, T('scale(1,1)'), IO], [`${s + 5}%`, T('scale(1.08,.88)'), IO], [`${s + 12}%`, T('scale(.96,1.07)'), IO], [`${s + 20}%`, T('scale(1.02,.98)'), IO], [`${s + 28}%`, T('scale(1,1)')], ['100%', T('scale(1,1)')]])).join('\n')}` });

addP({ id: 'iris-flip', name: 'Iris flip', desc: 'Inspired by the old “polarity-iris-flip”: the logo starts inverted (cream poop on a dark tile) and a circular iris opens from the K to reveal the real colours.', D: 2100,
  css: `& .inv{${run('inv')}}& .iris{${run('iris')}}& .pulse{${run('pulse')}}
${kf('@inv', [['0%', O(0) + T('scale(.88)')], ['16%', O(1) + T('scale(1)'), SOFT], ['100%', O(1) + T('scale(1)')]])}
${kf('@iris', [['0%', 'clip-path:circle(0px at 512px 648px) view-box;'], ['38%', 'clip-path:circle(0px at 512px 648px) view-box;', SOFT], ['82%', 'clip-path:circle(1100px at 512px 648px) view-box;'], ['100%', 'clip-path:circle(1100px at 512px 648px) view-box;']])}
${kf('@pulse', [['0%', T('scale(1)')], ['24%', T('scale(1)'), IO], ['32%', T('scale(1.06)'), IO], ['40%', T('scale(1)')], ['100%', T('scale(1)')]])}`,
  custom: (theme) => {
    const { bg, ink } = KK[theme], q = 'kakcal-iris-flip-' + theme;
    const inv = `<rect width="1024" height="1024" rx="240" fill="${ink}"/>`;
    const poopInv = poopParts(bg, ink);
    const poopNorm = poopParts(ink, bg);
    const cx = 512, cyK = 512 + (662 - 500) * 0.84;
    const body = `<defs><clipPath id="${q}t"><rect width="1024" height="1024" rx="240"/></clipPath></defs>` +
      `<g clip-path="url(#${q}t)"><g class="m inv">${inv}<g class="m pulse"><g transform="translate(512 512) scale(.84) translate(-500 -500)">${poopInv}</g></g></g>` +
      `<g class="iris"><rect width="1024" height="1024" fill="${bg}"/><g transform="translate(512 512) scale(.84) translate(-500 -500)">${poopNorm}</g></g></g>`;
    return body;
  } });

addP({ id: 'swirl', name: 'Swirl & unfold', desc: 'Inspired by the old “swirl-and-unfold”: the tiers spiral in from the sides, spinning as they grow, and the tip spins up last before the K pops open.', D: 2300,
  css: `${BASE_KAK}
& .t3{${run('a3')}}& .t2{${run('a2')}}& .t1{${run('a1')}}& .tip{${run('at')}}& .kk{${run('kk')}}
${kf('@a3', [['0%', T('translate(-40px,6px) rotate(-300deg) scale(0)')], ['8%', T('translate(-40px,6px) rotate(-300deg) scale(0)'), BOUNCE], ['40%', T('translate(0,0) rotate(0deg) scale(1)')], ['100%', T('translate(0,0) rotate(0deg) scale(1)')]])}
${kf('@a2', [['0%', T('translate(38px,4px) rotate(300deg) scale(0)')], ['22%', T('translate(38px,4px) rotate(300deg) scale(0)'), BOUNCE], ['54%', T('translate(0,0) rotate(0deg) scale(1)')], ['100%', T('translate(0,0) rotate(0deg) scale(1)')]])}
${kf('@a1', [['0%', T('translate(-34px,2px) rotate(-300deg) scale(0)')], ['36%', T('translate(-34px,2px) rotate(-300deg) scale(0)'), BOUNCE], ['66%', T('translate(0,0) rotate(0deg) scale(1)')], ['100%', T('translate(0,0) rotate(0deg) scale(1)')]])}
${kf('@at', [['0%', T('translate(0,-16px) rotate(-720deg) scale(0)')], ['50%', T('translate(0,-16px) rotate(-720deg) scale(0)'), BOUNCE], ['78%', T('translate(0,0) rotate(0deg) scale(1)')], ['100%', T('translate(0,0) rotate(0deg) scale(1)')]])}
${kf('@kk', [['0%', O(0) + T('scale(0) rotate(180deg)')], ['70%', O(0) + T('scale(0) rotate(180deg)')], ['71%', O(1) + T('scale(0) rotate(180deg)'), BOUNCE], ['88%', O(1) + T('scale(1.12) rotate(-6deg)')], ['94%', O(1) + T('scale(.98) rotate(0deg)')], ['100%', O(1) + T('scale(1) rotate(0deg)')]])}` });

addP({ id: 'flush-return', name: 'Flush & return', desc: 'Inspired by the old “flush-vortex-spin”, with a twist: the poop is flushed down a spinning vortex and comes straight back with a bounce and a freshly pressed K.', D: 2400,
  css: `& .all{${run('all')}}& .vortex{${run('vortex')}}& .vortex2{${run('vortex2')}}
${kf('@all', [['0%', O(0) + T('scale(.9) rotate(0deg)')], ['12%', O(1) + T('scale(1) rotate(0deg)'), SOFT], ['22%', O(1) + T('scale(1) rotate(0deg)'), 'cubic-bezier(.5,0,.9,.4)'], ['52%', O(1) + T('scale(0) rotate(-720deg)')], ['62%', O(0) + T('scale(0) rotate(-720deg)')], ['63%', O(1) + T('scale(0) rotate(0deg)'), BOUNCE], ['82%', O(1) + T('scale(1.16) rotate(8deg)'), IO], ['90%', O(1) + T('scale(.97) rotate(-2deg)'), IO], ['96%', O(1) + T('scale(1) rotate(0deg)')], ['100%', O(1) + T('scale(1) rotate(0deg)')]])}
${kf('@vortex', [['0%', O(0) + T('scale(1.4) rotate(0deg)')], ['20%', O(0) + T('scale(1.4) rotate(0deg)')], ['30%', O(.55) + T('scale(1.2) rotate(-200deg)'), LIN], ['58%', O(0) + T('scale(.1) rotate(-720deg)')], ['100%', O(0) + T('scale(.1) rotate(-720deg)')]])}
${kf('@vortex2', [['0%', O(0) + T('scale(1.9) rotate(0deg)')], ['20%', O(0) + T('scale(1.9) rotate(0deg)')], ['32%', O(.35) + T('scale(1.6) rotate(240deg)'), LIN], ['60%', O(0) + T('scale(.1) rotate(720deg)')], ['100%', O(0) + T('scale(.1) rotate(720deg)')]])}`,
  custom: (theme) => {
    const { bg, ink } = KK[theme];
    const P = poopParts(ink, bg);
    const swirl = (cls, rr, w, dash) => `<circle class="m ${cls}" cx="512" cy="540" r="${rr}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${dash}" opacity="0"/>`;
    return `<defs><clipPath id="kakcal-flush-return-${theme}c"><rect width="1024" height="1024" rx="240"/></clipPath></defs><rect width="1024" height="1024" rx="240" fill="${bg}"/><g clip-path="url(#kakcal-flush-return-${theme}c)">${swirl('vortex', 300, 22, '140 90')}${swirl('vortex2', 380, 14, '60 140')}<g transform="translate(512 512) scale(.84) translate(-500 -500)">${P}</g></g>`;
  } });

/* -------------------------------------------------------------- WORDMARKS */
export const WORD_PLOP = ({ id: 'word-plop', name: 'Wordmark: plop', D: 2200, desc: 'The letters drop in one after another and the poop stacks up tier by tier as the “a”.',
  build: (theme) => {
    const w = kakWordmark(theme);
    const css = `& .l{animation:@l calc(var(--d)*.34) both;animation-delay:calc(var(--d)*var(--s))}& .t3,& .t2,& .t1,& .tip{animation:@t calc(var(--d)*.3) both;animation-delay:calc(var(--d)*var(--s));transform-origin:50% 100%}& .poop{animation:@jl calc(var(--d)*.3) linear both;animation-delay:calc(var(--d)*.62);transform-origin:50% 100%}
${kf('@l', [['0%', O(0) + T('translateY(-90px)'), FALL], ['62%', O(1) + T('translateY(0)'), OUT], ['76%', O(1) + T('translateY(0) scale(1.06,.9)'), IO], ['90%', O(1) + T('translateY(0) scale(.98,1.03)')], ['100%', O(1) + T('translateY(0) scale(1,1)')]])}
${kf('@t', [['0%', O(0) + T('translateY(-90px)'), FALL], ['62%', O(1) + T('translateY(0)'), OUT], ['76%', O(1) + T('translateY(0) scale(1.08,.86)'), IO], ['90%', O(1) + T('translateY(0) scale(.98,1.03)')], ['100%', O(1) + T('translateY(0) scale(1,1)')]])}
${kf('@jl', [['0%', T('scale(1,1)')], ['25%', T('scale(1.04,.94)'), IO], ['60%', T('scale(.99,1.02)'), IO], ['100%', T('scale(1,1)')]])}`;
    const L = (ls, d0, step) => ls.list.map((l, i) => `<path class="m l" style="--s:${(d0 + i * step).toFixed(2)}" d="${l.d}" fill="${w.ink}"/>`).join('');
    const poop = `<g transform="translate(${r(w.px - SILHOUETTE.x0 * w.s)} ${r(w.ty)}) scale(${r(w.s)})" fill="${w.ink}"><g class="m poop"><g class="m t3" style="--s:.18"><rect x="5" y="38" width="54" height="21" rx="10.5"/></g><g class="m t2" style="--s:.26"><rect x="13" y="24" width="38" height="20" rx="10"/></g><g class="m t1" style="--s:.34"><rect x="21" y="11" width="22" height="18" rx="9"/></g><g class="m tip" style="--s:.42"><path d="${TIP}"/></g></g></g>`;
    const body = L(w.t1, 0.02, 0) + poop + L(w.t2, 0.5, 0.06);
    return svg({ id: 'kakcal-word-plop-' + theme, D: 2200, vb: `0 0 ${w.W} 150`, css, body, title: `Kakcal wordmark animation (${theme})` });
  } });

/* ------------------------------------------------------- LOGO PRESS (tap the wordmark) */
// Played when the logo in the app header is pressed. Only the poop moves; the letters stay put.
// Five are ported from the previous poop-anim.css (plop, flush, jelly, flip, press), `stack` is new (it replaces "sketch").
const PAD = { l: 30, t: 90, r: 30, b: 30 };
const PRESS = { kakcal: [] };
function kakPressSvg(def, theme) {
  const w = kakWordmark(theme);
  const vb = `${-PAD.l} ${-PAD.t} ${w.W + PAD.l + PAD.r} ${150 + PAD.t + PAD.b}`;
  const lett = `<path d="${w.t1.list[0].d}" fill="${w.ink}"/>` + w.t2.list.map((l) => `<path d="${l.d}" fill="${w.ink}"/>`).join('');
  const ticks = def.ticks ? ['M17 9 L10.5 3', 'M32 -1.5 L32 -9', 'M47 9 L53.5 3'].map((d) => `<path class="m tick" pathLength="100" d="${d}" fill="none" stroke="${w.ink}" stroke-width="2.6" stroke-linecap="round" opacity="0"/>`).join('') : '';
  const tiers = `<g class="m t3"><rect x="5" y="38" width="54" height="21" rx="10.5"/></g><g class="m t2"><rect x="13" y="24" width="38" height="20" rx="10"/></g><g class="m t1"><rect x="21" y="11" width="22" height="18" rx="9"/></g><g class="m tip"><path d="${TIP}"/></g>`;
  const poop = `<g transform="translate(${r(w.px - SILHOUETTE.x0 * w.s)} ${r(w.ty)}) scale(${r(w.s)})" fill="${w.ink}"><g class="m poop">${tiers}</g>${ticks}</g>`;
  return svg({ id: 'kakcal-press-' + def.id + '-' + theme, D: def.D, vb, css: def.css, body: lett + poop, title: `Kakcal logo press: ${def.name} (${theme})` });
}
const pc = (id, name, desc, D, css, ticks = false) => PRESS.kakcal.push({ id, name, desc, D, css, svg: (t) => kakPressSvg({ id, name, D, css, ticks }, t) });
const KP = `& .poop{transform-origin:50% 100%}`;
pc('plop', 'Plop', 'From the old logo click: the poop falls from above, squashes on impact, bounces twice and settles.', 1150, `${KP}& .poop{${run('plop')}}
${kf('@plop', [['0%', O(0) + T('translateY(-64px) rotate(-14deg) scale(1,1)'), 'cubic-bezier(.55,0,1,.65)'], ['6%', O(1) + T('translateY(-52px) rotate(-12deg) scale(1,1)'), 'cubic-bezier(.55,0,1,.65)'], ['30%', O(1) + T('translateY(0) rotate(0deg) scale(1,1)'), LIN], ['32%', T('translateY(0) rotate(0deg) scale(1.3,.68)'), SOFT], ['48%', T('translateY(-16px) rotate(0deg) scale(.94,1.08)'), 'cubic-bezier(.55,0,1,.65)'], ['60%', T('translateY(0) rotate(0deg) scale(1.12,.86)'), SOFT], ['72%', T('translateY(-5px) rotate(0deg) scale(.98,1.03)'), 'cubic-bezier(.55,0,1,.65)'], ['82%', T('translateY(0) rotate(0deg) scale(1.04,.96)'), 'ease-out'], ['100%', O(1) + T('translateY(0) rotate(0deg) scale(1,1)')]])}`);
pc('flush', 'Flush', 'From the old logo click: the poop spins down a whirlpool and corkscrews back up with an overshoot.', 1250, `${KP}& .poop{transform-origin:50% 55%;${run('flush')}}
${kf('@flush', [['0%', O(1) + T('translateY(0) rotate(0deg) scale(1)'), 'cubic-bezier(.55,0,.9,.5)'], ['42%', O(1) + T('translateY(14px) rotate(640deg) scale(.04)'), LIN], ['43%', O(0) + T('translateY(14px) rotate(640deg) scale(.04)')], ['50%', O(0) + T('translateY(14px) rotate(-220deg) scale(.04)'), SOFT], ['51%', O(1) + T('translateY(14px) rotate(-220deg) scale(.04)'), SOFT], ['78%', O(1) + T('translateY(-9px) rotate(12deg) scale(1.16)'), IO], ['100%', O(1) + T('translateY(0) rotate(0deg) scale(1)')]])}`);
pc('jelly', 'Jelly', 'From the old logo click: squash and stretch wobble on the base, like jelly.', 1000, `${KP}& .poop{${run('jelly')}}
${kf('@jelly', [['0%', T('scale(1,1) skewX(0deg)'), SOFT], ['12%', T('scale(1.26,.76) skewX(-5deg)'), 'cubic-bezier(.34,1.2,.64,1)'], ['28%', T('scale(.82,1.26) skewX(6deg)'), IO], ['44%', T('scale(1.14,.88) skewX(-4deg)'), IO], ['60%', T('scale(.93,1.08) skewX(3deg)'), IO], ['76%', T('scale(1.04,.97) skewX(-1.5deg)'), 'ease-out'], ['100%', T('scale(1,1) skewX(0deg)')]])}`);
pc('flip', 'Flip', 'From the old logo click: it crouches, jumps, does a front flip and lands with a squash.', 1100, `${KP}& .poop{transform-origin:50% 58%;${run('flip')}}
${kf('@flip', [['0%', T('translateY(0) rotate(0deg) scale(1,1)'), 'ease-out'], ['14%', T('translateY(6px) rotate(0deg) scale(1.2,.78)'), OUT], ['48%', T('translateY(-30px) rotate(360deg) scale(.94,1.08)'), 'cubic-bezier(.6,0,.9,.7)'], ['64%', T('translateY(5px) rotate(360deg) scale(1.24,.74)'), 'cubic-bezier(.34,1.56,.64,1)'], ['80%', T('translateY(-3px) rotate(360deg) scale(.97,1.04)'), 'ease-out'], ['100%', T('translateY(0) rotate(360deg) scale(1,1)')]])}`);
pc('press', 'Press', 'From the old logo click (tactile keypress): pressed flat like a key, it pops up and three burst ticks fly out.', 950, `${KP}& .poop{${run('press')}}& .tick{stroke-dasharray:100 100;animation:@tick var(--d) ease-out both}& .tick:nth-of-type(2){animation-delay:calc(var(--d)*.03)}& .tick:nth-of-type(3){animation-delay:calc(var(--d)*.06)}
${kf('@press', [['0%', T('translateY(0) scale(1,1)'), 'cubic-bezier(.25,.8,.4,1)'], ['20%', T('translateY(8px) scale(1.2,.6)'), LIN], ['34%', T('translateY(8px) scale(1.2,.6)'), SOFT], ['54%', T('translateY(-14px) scale(.9,1.24)'), 'cubic-bezier(.55,0,1,.65)'], ['70%', T('translateY(0) scale(1.1,.9)'), 'ease-out'], ['86%', T('translateY(0) scale(.98,1.03)'), 'ease-out'], ['100%', T('translateY(0) scale(1,1)')]])}
${kf('@tick', [['0%', O(0) + 'stroke-dashoffset:100;'], ['34%', O(0) + 'stroke-dashoffset:100;'], ['42%', O(1) + 'stroke-dashoffset:0;'], ['90%', O(1) + 'stroke-dashoffset:-80;'], ['100%', O(0) + 'stroke-dashoffset:-100;']])}`, true);
pc('stack', 'Stack', 'New (replaces the old “sketch”, which drew an outline): the four tiers drop in one by one, bottom to top, and the whole poop pops at the end.', 1300, `${KP}& .t3,& .t2,& .t1,& .tip{transform-origin:50% 100%;animation:@t calc(var(--d)*.4) both;animation-delay:calc(var(--d)*var(--s))}& .t3{--s:0}& .t2{--s:.1}& .t1{--s:.2}& .tip{--s:.3}& .poop{animation:@pop calc(var(--d)*.34) both;animation-delay:calc(var(--d)*.66)}
${kf('@t', [['0%', O(0) + T('translateY(-70px) scale(1,1)'), FALL], ['55%', O(1) + T('translateY(0) scale(1,1)'), LIN], ['62%', O(1) + T('translateY(0) scale(1.1,.78)'), IO], ['82%', O(1) + T('translateY(0) scale(.97,1.05)'), IO], ['100%', O(1) + T('translateY(0) scale(1,1)')]])}
${kf('@pop', [['0%', T('scale(1,1)'), BOUNCE], ['30%', T('translateY(-9px) scale(.94,1.12)'), IO], ['60%', T('translateY(0) scale(1.08,.92)'), IO], ['100%', T('translateY(0) scale(1,1)')]])}`);

/* ------------------------------------------------------------------ BUILDERS */
/** The six launch animations, in the order the app numbers them (?intro=1 ... ?intro=6). */
export const LAUNCH = A.kakcal.map((d) => ({ ...d, kind: 'icon' }));

/**
 * One launch animation as an SVG string. `tokens` (default) paints it with the launch overlay's colour tokens
 * (`--kc-cream` is the tile / page background, `--kc-ink` the poop), so one file serves Light, Lite Dark and Dark;
 * with `theme` set it uses that palette's plain colours.
 */
export function launchSvg(def, { theme = 'light', tokens = true } = {}) {
  const { bg, ink } = KK[theme];
  const q = 'kc-' + def.id;
  const title = `Kakcal launch animation: ${def.name}`;
  let out;
  if (def.custom) out = svg({ id: q, D: def.D, css: def.css, body: def.custom(theme), title });
  else out = svg({ id: q, D: def.D, css: def.css, body: wrapK(poopParts(ink, bg)), tile: bg, title });
  if (!tokens) return out;
  const L = KK.light;
  return out.replaceAll(L.bg, 'var(--kc-cream, ' + L.bg + ')').replaceAll(L.ink, 'var(--kc-ink, ' + L.ink + ')');
}

/** The wordmark animation as an SVG string (same token colouring as `launchSvg`). */
export function wordmarkSvg({ theme = 'light', tokens = true } = {}) {
  const out = WORD_PLOP.build(theme);
  if (!tokens) return out;
  const L = KK.light;
  return out.replaceAll(L.ink, 'var(--kc-ink, ' + L.ink + ')');
}

/** The logo-press definitions: id, name, duration D (ms) and the CSS with `&` (scope) and `@` (keyframe prefix). */
export const PRESS_ANIMATIONS = PRESS.kakcal;
export const pressSvg = (def, theme = 'light') => def.svg(theme);
