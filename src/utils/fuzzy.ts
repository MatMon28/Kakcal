// Fuzzy food search tolerant to typos: "skir" finds "Skyr", "chiken" finds "Chicken".
// Normalizes diacritics (ä→a, ß→ss), tokenizes names and compares the query
// token-by-token with a length-aware Levenshtein threshold.

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[n];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss');

const tokens = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

// Best edit distance between a query token and a target token, also trying
// same-length windows inside longer words ("skir" vs "skyrr" etc.).
function tokenDistance(q: string, w: string): number {
  if (w.length <= q.length + 1) return levenshtein(q, w);
  let best = levenshtein(q, w);
  for (let i = 0; i + q.length <= w.length; i++) {
    best = Math.min(best, levenshtein(q, w.slice(i, i + q.length)));
  }
  return best;
}

const maxDist = (q: string) => (q.length <= 3 ? 1 : q.length <= 6 ? 2 : 3);

/** Score for ranking: 0 = exact token, small = prefix/substring, then typo distance. Lower is better. */
export function fuzzyScore(query: string, target: string): number {
  const qs = tokens(query);
  const ts = tokens(target);
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

/** True when every query word matches some word of the target names (typos allowed). */
export function fuzzyMatch(query: string, targets: string[]): boolean {
  const qs = tokens(query);
  if (!qs.length) return false;
  const ts = targets.flatMap((t) => tokens(t));
  if (!ts.length) return false;
  return qs.every(
    (q) =>
      ts.some((w) => w.startsWith(q) || w.includes(q)) ||
      ts.some((w) => tokenDistance(q, w) <= maxDist(q))
  );
}
