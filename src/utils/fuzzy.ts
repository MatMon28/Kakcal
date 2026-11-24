// Fuzzy food search tolerant to typos: "skir" finds "Skyr", "chiken" finds "Chicken".
// Normalizes diacritics (ä→a, ß→ss), tokenizes names and compares the query
// token-by-token with a length-aware Levenshtein threshold.
//
// Performance round (docs/search-and-animation-performance.md): the maths is unchanged, but
// - `tokenize` is exported so callers can tokenize a food name ONCE (see utils/foodSearchIndex.ts) instead of on
//   every keystroke for every food,
// - the `...Tokens` variants work on already tokenized text,
// - the edit distance reuses two typed arrays (no allocation per call) and gives up as soon as a row can no longer
//   stay within the allowed distance (`withinDistance`, used by the yes/no match test).

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss');

/** Lower-case, accent-free words of a text. Tokenize a name once and keep the result. */
export const tokenize = (s: string): string[] => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

let rowA = new Int32Array(64);
let rowB = new Int32Array(64);

/**
 * Levenshtein distance between `a` and `b.substr(bStart, bLen)`. When the distance is larger than `limit` the
 * function may stop early and returns any value greater than `limit` (pass Infinity for the exact distance).
 */
function distance(a: string, b: string, bStart: number, bLen: number, limit: number): number {
  const m = a.length;
  const n = bLen;
  if (m === 0) return n;
  if (n === 0) return m;
  if (Math.abs(m - n) > limit) return limit + 1;
  if (n + 1 > rowA.length) {
    rowA = new Int32Array(n + 33);
    rowB = new Int32Array(n + 33);
  }
  let prev = rowA;
  let curr = rowB;
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = i;
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ac === b.charCodeAt(bStart + j - 1) ? 0 : 1;
      let v = prev[j] + 1;
      const left = curr[j - 1] + 1;
      if (left < v) v = left;
      const diag = prev[j - 1] + cost;
      if (diag < v) v = diag;
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return limit + 1;
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[n];
}

// Best edit distance between a query token and a target token, also trying
// same-length windows inside longer words ("skir" vs "skyrr" etc.).
function tokenDistance(q: string, w: string): number {
  if (w.length <= q.length + 1) return distance(q, w, 0, w.length, Infinity);
  let best = distance(q, w, 0, w.length, Infinity);
  for (let i = 0; i + q.length <= w.length && best > 0; i++) {
    best = Math.min(best, distance(q, w, i, q.length, Infinity));
  }
  return best;
}

/** `tokenDistance(q, w) <= max`, without computing distances that are already too large. */
function withinDistance(q: string, w: string, max: number): boolean {
  if (distance(q, w, 0, w.length, max) <= max) return true;
  if (w.length <= q.length + 1) return false;
  for (let i = 0; i + q.length <= w.length; i++) {
    if (distance(q, w, i, q.length, max) <= max) return true;
  }
  return false;
}

const maxDist = (q: string) => (q.length <= 3 ? 1 : q.length <= 6 ? 2 : 3);

/** Score of an already tokenized query against an already tokenized target. Lower is better. */
export function fuzzyScoreTokens(qs: readonly string[], ts: readonly string[]): number {
  if (!qs.length || !ts.length) return 999;
  let total = 0;
  for (const q of qs) {
    let best = Infinity;
    for (const w of ts) {
      if (w === q) {
        best = 0;
        break;
      }
      if (w.startsWith(q)) best = Math.min(best, 0.5);
      else if (w.includes(q)) best = Math.min(best, 1);
      else best = Math.min(best, 2 + tokenDistance(q, w));
    }
    total += best;
  }
  return total;
}

/** True when every query word matches some word of `ts` (typos allowed). Same rule as `fuzzyMatch`. */
export function fuzzyMatchTokens(qs: readonly string[], ts: readonly string[]): boolean {
  if (!qs.length || !ts.length) return false;
  return qs.every((q) => ts.some((w) => w.includes(q)) || ts.some((w) => withinDistance(q, w, maxDist(q))));
}

/** Score for ranking: 0 = exact token, small = prefix/substring, then typo distance. Lower is better. */
export function fuzzyScore(query: string, target: string): number {
  return fuzzyScoreTokens(tokenize(query), tokenize(target));
}

/** True when every query word matches some word of the target names (typos allowed). */
export function fuzzyMatch(query: string, targets: string[]): boolean {
  return fuzzyMatchTokens(tokenize(query), targets.flatMap((t) => tokenize(t)));
}
