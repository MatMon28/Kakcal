/**
 * Recipe import from a link, entirely on the device: no server, no API key, no paid service.
 *
 *   1. `fetchPageHtmlDetailed` — download the page. On Android the native HTTP layer is used (no CORS
 *                               at all); in the browser/PWA a direct fetch is tried first and then a
 *                               public CORS proxy. Both paths are free.
 *   2. `parseRecipePage`       — read the schema.org `Recipe` data almost every recipe site already
 *                               embeds for Google (name, yield, ingredients, steps, nutrition), with
 *                               `<title>`/OpenGraph fallbacks for the name.
 *   3. `matchIngredients`      — find the best fitting FoodItem for every ingredient
 *                               (utils/ingredientMatch.ts).
 *   4. `buildImportedRecipe`   — assemble the draft: matched ingredients, seasonings ("sale q.b."),
 *                               the lines nobody matched, warnings and the standard portion.
 *
 * The draft is never saved directly: the recipe builder opens with the values pre-filled so the user
 * checks and edits them, then saves with the normal `addCustomFood` flow.
 *
 * Everything that can go wrong has a code, a readable message and a suggested next step
 * (`RecipeImportError`), so the UI never shows a dead end.
 */

import type { FoodItem, FoodSource, PreBuiltMealIngredient } from '../types';
import { parseIngredientLines, type ParsedIngredient } from './ingredientParse';
import { matchIngredients, type IngredientMatch, type MatchDeps } from './ingredientMatch';

/* ------------------------------------------------------------------ errors */

export type RecipeImportErrorCode =
  | 'invalid-url'
  | 'unsupported-link'
  | 'network'
  | 'timeout'
  | 'blocked'
  | 'login-wall'
  | 'not-html'
  | 'too-large'
  | 'no-recipe'
  | 'empty'
  | 'unknown';

/**
 * A failed import. `code` is what the UI translates; `message` is an English fallback (logs, tests).
 * `hint` is what the user can do about it — never leave them with only "something went wrong".
 */
export class RecipeImportError extends Error {
  readonly code: RecipeImportErrorCode;
  readonly hint: string;
  constructor(code: RecipeImportErrorCode, message: string, hint = '') {
    super(message);
    this.name = 'RecipeImportError';
    this.code = code;
    this.hint = hint;
  }
}

/* --------------------------------------------------------------- fetching */

export type ImportStage = 'fetching' | 'parsing' | 'matching' | 'done';

/** Where the HTML came from: shown in the UI and useful in bug reports. */
export type FetchVia = 'direct' | 'native' | 'proxy';

const PROXIES: Array<{ name: string; url: (target: string) => string }> = [
  { name: 'allorigins', url: (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` },
  { name: 'corsproxy', url: (target) => `https://corsproxy.io/?url=${encodeURIComponent(target)}` },
  { name: 'codetabs', url: (target) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(target)}` },
];

const DIRECT_TIMEOUT_MS = 12000;
const PROXY_TIMEOUT_MS = 20000;
/** A recipe page is a few hundred kB; anything past this is not a recipe and would choke a phone. */
const MAX_BYTES = 8 * 1024 * 1024;

/** A download problem, classified so `fetchPageHtmlDetailed` can report it properly. */
class FetchFailure extends Error {
  readonly kind: 'blocked' | 'timeout' | 'http' | 'too-large' | 'not-html' | 'network';
  readonly status?: number;
  constructor(kind: FetchFailure['kind'], message: string, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

const BINARY_TYPES = /^(application\/(pdf|zip|x-zip-compressed|octet-stream)|image\/|video\/|audio\/)/i;

/**
 * A proxy answering with an error page or an empty body must not be taken for the recipe: the HTML
 * has to look like HTML. Small pages are fine (a recipe page is rarely under 3 kB), so this only
 * rejects obvious junk.
 */
const looksLikeHtml = (body: string): boolean => body.length > 100 && /<html|<!doctype|<script|<\s*body/i.test(body);

/** Pages that ask a human for something. Checked only when the page has no Recipe data. */
const BOT_WALL = /just a moment|cf-browser-verification|attention required|checking your browser|verify you are (a )?human|unusual traffic|are you a robot|access denied|captcha-delivery|enable cookies and javascript/i;
const LOGIN_WALL = /sign in to (continue|read|view)|log ?in to (continue|read|view)|members[- ]only|subscribers[- ]only|create a free account to (read|continue)/i;

/** Decode the body with the charset the page declares (old Italian/German sites are ISO-8859-1). */
function decodeBody(buffer: ArrayBuffer, contentType: string | null): string {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder('utf-8').decode(bytes.subarray(3));
  const headerCharset = /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1];
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 2048));
  const metaCharset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  const label = (headerCharset ?? metaCharset ?? 'utf-8').toLowerCase();
  if (label === 'utf-8' || label === 'utf8') return new TextDecoder('utf-8').decode(bytes);
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/** Read the body with a size limit, so a 200 MB video page cannot freeze the phone. */
async function readBodyWithLimit(response: Response): Promise<ArrayBuffer> {
  const declared = Number(response.headers.get('content-length') ?? '0');
  if (declared > MAX_BYTES) throw new FetchFailure('too-large', 'Page too large');
  const body = response.body;
  if (!body) return response.arrayBuffer();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new FetchFailure('too-large', 'Page too large');
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

async function timedFetch(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        credentials: 'omit',
        headers: { Accept: 'text/html,application/xhtml+xml' },
      });
    } catch (error) {
      throw new FetchFailure((error as Error)?.name === 'AbortError' ? 'timeout' : 'network', String(error));
    }

    const contentType = response.headers.get('content-type');
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      throw new FetchFailure('blocked', `HTTP ${response.status}`, response.status);
    }
    if (!response.ok) throw new FetchFailure('http', `HTTP ${response.status}`, response.status);

    const buffer = await readBodyWithLimit(response);
    const text = decodeBody(buffer, contentType);
    if (BINARY_TYPES.test(contentType ?? '') && !looksLikeHtml(text)) {
      throw new FetchFailure('not-html', `Not HTML: ${contentType}`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Android/iOS native HTTP. `CapacitorHttp` ships with @capacitor/core, so nothing to install, and
 * requests made through it are not subject to CORS: it is the reliable path in the app.
 */
async function nativeFetch(url: string): Promise<string | null> {
  try {
    const core = await import('@capacitor/core');
    if (!core.Capacitor?.isNativePlatform?.()) return null;
    const response = await core.CapacitorHttp.request({
      url,
      method: 'GET',
      responseType: 'text',
      connectTimeout: DIRECT_TIMEOUT_MS,
      readTimeout: DIRECT_TIMEOUT_MS,
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    const status = Number(response.status ?? 0);
    if (status === 401 || status === 403 || status === 429) throw new FetchFailure('blocked', `HTTP ${status}`, status);
    if (status < 200 || status >= 300) throw new FetchFailure('http', `HTTP ${status}`, status);
    const data = response.data;
    if (typeof data !== 'string') return null;
    if (data.length > MAX_BYTES) throw new FetchFailure('too-large', 'Page too large');
    return data;
  } catch (error) {
    if (error instanceof FetchFailure) throw error;
    return null; // plugin unavailable (plain PWA build): use the browser path
  }
}

export interface FetchOptions {
  onStage?: (stage: ImportStage, detail?: string) => void;
}

export interface FetchedPage {
  html: string;
  via: FetchVia;
  /** Where the page ended up (redirects included), used for the source label. */
  url: string;
}

/**
 * Download a recipe page as HTML.
 *
 * Order: native HTTP (in the app) → plain browser fetch (works when the site sends CORS headers)
 * → the free CORS proxies in turn. A proxy is a last resort: it is slower, rate-limited and it sees
 * the page you are reading, which is why the native path comes first.
 */
export async function fetchPageHtmlDetailed(rawUrl: string, options: FetchOptions = {}): Promise<FetchedPage> {
  const url = rawUrl;
  const failures: FetchFailure[] = [];

  options.onStage?.('fetching', 'native');
  try {
    const native = await nativeFetch(url);
    if (native && looksLikeHtml(native)) return { html: native, via: 'native', url };
    if (native) failures.push(new FetchFailure('not-html', 'Empty or non-HTML response'));
  } catch (error) {
    if (error instanceof FetchFailure) failures.push(error);
  }

  try {
    const html = await timedFetch(url, DIRECT_TIMEOUT_MS);
    if (looksLikeHtml(html)) return { html, via: 'direct', url };
    failures.push(new FetchFailure('not-html', 'Not HTML'));
  } catch (error) {
    if (error instanceof FetchFailure) failures.push(error);
  }

  for (const proxy of PROXIES) {
    options.onStage?.('fetching', proxy.name);
    try {
      const html = await timedFetch(proxy.url(url), PROXY_TIMEOUT_MS);
      if (looksLikeHtml(html)) return { html, via: 'proxy', url };
      failures.push(new FetchFailure('not-html', `${proxy.name}: not HTML`));
    } catch (error) {
      if (error instanceof FetchFailure) failures.push(error);
    }
  }

  // Nothing worked: report the most useful reason rather than a generic failure.
  if (failures.some((failure) => failure.kind === 'too-large')) {
    throw new RecipeImportError(
      'too-large',
      'This page is too large to read.',
      'Check that the link points to a recipe page and not to a photo, a video or a download.',
    );
  }
  if (failures.some((failure) => failure.kind === 'blocked')) {
    throw new RecipeImportError(
      'blocked',
      'This site refused to let Kakcal read the page.',
      'Some sites block automatic reading. You can still add the recipe by hand with the recipe builder.',
    );
  }
  if (failures.length > 0 && failures.every((failure) => failure.kind === 'not-html')) {
    throw new RecipeImportError(
      'not-html',
      'That link is not a web page.',
      'It may point to a PDF, an image or a file. Open the recipe in your browser and copy the page address.',
    );
  }
  if (failures.some((failure) => failure.kind === 'timeout')) {
    throw new RecipeImportError(
      'timeout',
      'The page took too long to answer.',
      'Check your connection and try again — the site may be slow or temporarily unreachable.',
    );
  }
  throw new RecipeImportError(
    'network',
    'Could not download this page.',
    'Check the link and your connection. Recipe pages behind a login or a paywall cannot be read.',
  );
}

/** The HTML of a recipe page. Throws `RecipeImportError` when every free route failed. */
export const fetchPageHtml = async (url: string, options: FetchOptions = {}): Promise<string> =>
  (await fetchPageHtmlDetailed(normalizeUrl(url), options)).html;

/** Accepts "example.com/recipe", "//example.com", "https://…"; rejects anything that is not http(s). */
export function normalizeUrl(input: string): string {
  const text = String(input ?? '').trim();
  if (!text) {
    throw new RecipeImportError('invalid-url', 'No link given.', 'Paste the address of the recipe page.');
  }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(text)?.[1]?.toLowerCase();
  if (scheme && scheme !== 'http' && scheme !== 'https') {
    throw new RecipeImportError(
      'unsupported-link',
      `Only web links can be read (got ${scheme}).`,
      'Paste the http or https address of the recipe page.',
    );
  }
  let candidate = text;
  if (candidate.startsWith('//')) candidate = `https:${candidate}`;
  else if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new RecipeImportError(
      'invalid-url',
      'That does not look like a link.',
      'Paste the full address from the browser, for example https://www.example.com/recipe.',
    );
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new RecipeImportError(
      'unsupported-link',
      `Only web links can be read (got ${parsed.protocol.replace(':', '')}).`,
      'Paste the http or https address of the recipe page.',
    );
  }
  if (!parsed.hostname.includes('.')) {
    throw new RecipeImportError(
      'invalid-url',
      'That does not look like a link.',
      'Paste the full address from the browser, for example https://www.example.com/recipe.',
    );
  }
  parsed.hash = ''; // the fragment never changes what the server returns
  return parsed.href;
}

/* ----------------------------------------------------------- JSON-LD read */

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = <T>(value: T | T[] | undefined | null): T[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];

const hasRecipeType = (value: unknown): boolean => {
  if (!isObject(value)) return false;
  const type = value['@type'];
  return asArray(type as string | string[]).some((entry) => String(entry).toLowerCase().endsWith('recipe'));
};

/** Every `Recipe` node under a node, including those nested in `@graph`, arrays and `mainEntity`. */
function findRecipeNodes(node: unknown, depth = 0): Json[] {
  if (depth > 8 || node === null || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap((entry) => findRecipeNodes(entry, depth + 1));
  if (hasRecipeType(node)) return [node as Json];
  const graph = (node as Json)['@graph'];
  if (graph) return findRecipeNodes(graph, depth + 1);
  if (isObject(node)) return Object.values(node).flatMap((value) => findRecipeNodes(value, depth + 1));
  return [];
}

export interface JsonLdRecipes {
  /** The first recipe on the page. */
  recipe: Json | null;
  /** How many recipes the page declares (a roundup article lists several). */
  count: number;
}

/** Every `Recipe` object on a page. Malformed blocks are skipped, not fatal. */
export function extractRecipeJsonLdAll(html: string): JsonLdRecipes {
  const blocks = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const found: Json[] = [];
  let match: RegExpExecArray | null;
  while ((match = blocks.exec(html)) !== null) {
    const text = match[1].replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim();
    if (!text) continue;
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      continue;
    }
    found.push(...findRecipeNodes(data));
  }
  return { recipe: found[0] ?? null, count: found.length };
}

/** The first `Recipe` object of a page, or null. */
export const extractRecipeJsonLd = (html: string): Json | null => extractRecipeJsonLdAll(html).recipe;

/* --------------------------------------------------------------- normalise */

const entities: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
  '&frac12;': '½', '&frac14;': '¼', '&frac34;': '¾', '&deg;': '°', '&eacute;': 'é', '&egrave;': 'è',
  '&agrave;': 'à', '&ograve;': 'ò', '&uuml;': 'ü', '&ouml;': 'ö', '&auml;': 'ä', '&szlig;': 'ß',
  '&rsquo;': "'", '&lsquo;': "'", '&ldquo;': '"', '&rdquo;': '"', '&ndash;': '–', '&mdash;': '—',
};

/** JSON-LD often contains HTML ("<p>Step 1</p>"); this strips it to plain text. */
export function toPlainText(value: unknown): string {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return '';
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|div|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;|&#39;/gi, (entity) => entities[entity.toLowerCase()] ?? entity)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** Instruction text from any of the shapes sites use: strings, HowToStep, HowToSection. */
export function readInstructions(value: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    for (const entry of asArray(node)) {
      if (typeof entry === 'string') {
        const text = toPlainText(entry);
        if (text) out.push(text);
      } else if (isObject(entry)) {
        if (entry.itemListElement) {
          walk(entry.itemListElement);
          continue;
        }
        const text = toPlainText(entry.text ?? entry.name ?? entry.description);
        if (text) out.push(text);
      }
    }
  };
  walk(value);
  return out;
}

/** Ingredient lines from any shape: strings, arrays, `HowToIngredient` objects, one big string. */
export function readIngredientLines(value: unknown): string[] {
  const out: string[] = [];
  for (const entry of asArray(value)) {
    const text = isObject(entry) ? toPlainText(entry.name ?? entry.text ?? entry.description) : toPlainText(entry);
    if (!text) continue;
    // Some plugins put the whole list in one string, separated by newlines or bullets.
    for (const line of text.split(/\n|•|·/) ) {
      const cleaned = line.replace(/\s+/g, ' ').trim();
      if (cleaned) out.push(cleaned);
    }
  }
  return out;
}

export function readImageUrl(value: unknown): string | undefined {
  for (const entry of asArray(value)) {
    if (typeof entry === 'string' && entry.startsWith('http')) return entry;
    if (isObject(entry)) {
      const url = entry.url;
      if (typeof url === 'string' && url.startsWith('http')) return url;
    }
  }
  return undefined;
}

/** "PT1H20M" → 80. */
export function parseDuration(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i.exec(value.trim());
  if (!match) return null;
  const minutes = Number(match[1] ?? 0) * 1440 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return minutes > 0 ? minutes : null;
}

/**
 * Servings from `recipeYield`: "2", 4, "4 servings", "Serves 6", "4-6 people" → 5, "8 pieces" → 8.
 * Null when the page does not say, in which case the standard portion falls back to 100 g.
 */
export function parseServings(yieldValue: unknown): number | null {
  const first = asArray(yieldValue)[0];
  if (typeof first === 'number' && Number.isFinite(first) && first > 0) return Math.round(first);
  if (typeof first !== 'string') return null;
  const numbers = (first.match(/\d+(?:[.,]\d+)?/g) ?? []).map((entry) => Number(entry.replace(',', '.'))).filter((n) => n > 0);
  if (numbers.length === 0) return null;
  const value = numbers.length >= 2 && numbers[1] <= numbers[0] * 3 ? (numbers[0] + numbers[1]) / 2 : numbers[0];
  return value > 0 ? Math.round(value * 10) / 10 : null;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const match = /-?\d+(?:[.,]\d+)?/.exec(value.replace(/(\d),(?=\d{3}\b)/g, '$1'));
  if (!match) return null;
  const number = Number(match[0].replace(',', '.'));
  return Number.isFinite(number) ? number : null;
};

export interface Nutrients {
  calories: number;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  fiber: number | null;
  salt: number | null;
  sugar: number | null;
}

/** The page's own nutrition panel, useful as a cross-check of the matched ingredients. */
export function readNutrition(value: unknown): Nutrients | null {
  if (!isObject(value)) return null;
  const calories = toNumber(value.calories);
  if (calories === null || calories <= 0) return null;
  const sodiumGrams = toNumber(value.sodiumContent);
  return {
    calories,
    carbs: toNumber(value.carbohydrateContent),
    protein: toNumber(value.proteinContent),
    fat: toNumber(value.fatContent),
    fiber: toNumber(value.fiberContent),
    // schema.org sodium is usually mg; Kakcal stores salt (g) = sodium × 2.5 / 1000.
    salt: sodiumGrams === null ? null : Math.round(((sodiumGrams * 2.5) / 1000) * 100) / 100,
    sugar: toNumber(value.sugarContent),
  };
}

/* ------------------------------------------------------------------- name */

const TITLE_SEPARATORS = /\s+[|·•»«]\s+|\s+[–—-]\s+(?=[^–—-]{1,40}$)/;

/**
 * Clean a page title into a recipe name: "Pasta al pomodoro | Cucina Facile" → "Pasta al pomodoro",
 * "Pasta al pomodoro - Ricette della Nonna" → "Pasta al pomodoro". The trailing segment is dropped
 * only when it looks like a site name (a few words, on a separator), never for something like
 * "Pasta - 4 ways", which is a real difference.
 */
export function cleanRecipeName(raw: string): string {
  let name = toPlainText(raw).replace(/\s+/g, ' ').trim();
  if (!name) return '';
  name = name.replace(/^["'«“]+|["'»”]+$/g, '').trim();
  const parts = name.split(TITLE_SEPARATORS).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    // "|", "·", "»" are site separators on their own ("Carbonara | Cucina Facile"); a dash only
    // when the recipe name is more than one word, so "Pasta - 4 ways to cook it" survives.
    const strongSeparator = /\s[|·•»«]\s/.test(name);
    const siteLike = last.split(/\s+/).length <= 4;
    if (siteLike && (strongSeparator || first.split(/\s+/).length >= 2)) name = first;
  }
  if (name.length > 120) name = `${name.slice(0, 117).trimEnd()}…`;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const metaContent = (html: string, property: string): string => {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const hit = pattern.exec(html);
    if (hit?.[1]) return hit[1];
  }
  return '';
};

/**
 * The recipe name. The JSON-LD `name` wins; when a site omits it the page title, the OpenGraph title
 * or the first heading are used, so an import never lands in the builder unnamed.
 */
export function readRecipeName(html: string, node: Json | null): string {
  const candidates = [
    toPlainText(node?.name),
    toPlainText(node?.headline),
    metaContent(html, 'og:title'),
    metaContent(html, 'twitter:title'),
    /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '',
    /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? '',
  ];
  for (const candidate of candidates) {
    const name = cleanRecipeName(candidate);
    if (name.length >= 2) return name;
  }
  return 'Imported recipe';
}

/* --------------------------------------------------------------- normalise */

export interface ParsedRecipePage {
  name: string;
  description?: string;
  imageUrl?: string;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  author?: string;
  sourceUrl: string;
  /** Host of the page, shown in the UI ("example.com"). */
  sourceLabel: string;
  ingredients: string[];
  instructions: string[];
  /** Per serving, as published by the page. */
  nutritionPerServing: Nutrients | null;
  /** How many recipes the page declares (a roundup article lists several). */
  recipeCount: number;
  /** Ingredient lines the page listed twice (dropped). */
  duplicateIngredients: number;
}

/** Read a recipe page's HTML. Throws a `RecipeImportError` with a readable message. */
export function parseRecipePage(html: string, pageUrl: string): ParsedRecipePage {
  const url = /^https?:\/\//i.test(pageUrl) ? pageUrl : `https://${pageUrl}`;
  const { recipe: node, count } = extractRecipeJsonLdAll(html);

  if (!node) {
    // Say *why* there is no recipe: a bot wall, a login wall, or simply a page without one.
    if (BOT_WALL.test(html)) {
      throw new RecipeImportError(
        'blocked',
        'This site is checking that you are human, so the page could not be read.',
        'Open the recipe in your browser, then copy the link again — or add the recipe by hand.',
      );
    }
    if (LOGIN_WALL.test(html)) {
      throw new RecipeImportError(
        'login-wall',
        'This recipe is behind a login or a subscription.',
        'Kakcal cannot sign in to websites. Log in with the browser and copy the recipe by hand.',
      );
    }
    throw new RecipeImportError(
      'no-recipe',
      'No recipe found on this page.',
      'The link may open an article, a video or the home page of the site. Open the recipe itself and copy that address.',
    );
  }

  const ingredients = readIngredientLines(node.recipeIngredient ?? node.ingredients);
  if (ingredients.length === 0) {
    throw new RecipeImportError(
      'empty',
      'This page declares a recipe but lists no ingredients.',
      'Some sites load the ingredients only for people. Add the recipe by hand with the recipe builder.',
    );
  }
  const parsedLines = parseIngredientLines(ingredients);
  if (parsedLines.length === 0) {
    throw new RecipeImportError(
      'empty',
      'This page declares a recipe but lists no usable ingredients.',
      'Some sites load the ingredients only for people. Add the recipe by hand with the recipe builder.',
    );
  }

  const authorValue = asArray(node.author)[0];
  const author = typeof authorValue === 'string' ? authorValue : isObject(authorValue) ? toPlainText(authorValue.name) : '';

  return {
    name: readRecipeName(html, node),
    description: toPlainText(node.description) || undefined,
    imageUrl: readImageUrl(node.image),
    servings: parseServings(node.recipeYield ?? node.yield),
    prepMinutes: parseDuration(node.prepTime),
    cookMinutes: parseDuration(node.cookTime),
    totalMinutes: parseDuration(node.totalTime),
    author: author || undefined,
    sourceUrl: url,
    sourceLabel: safeHostname(url),
    ingredients,
    instructions: readInstructions(node.recipeInstruction ?? node.recipeInstructions),
    nutritionPerServing: readNutrition(node.nutrition),
    recipeCount: count,
    duplicateIngredients: Math.max(0, ingredients.length - parsedLines.length),
  };
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'recipe';
  }
}

/* ------------------------------------------------------------------ draft */

/** Things the user should know about a successful import. The UI turns these into sentences. */
export type ImportWarning = 'no-matches' | 'few-matches' | 'no-servings' | 'seasonings' | 'multiple-recipes' | 'duplicates';

export interface ImportedRecipeDraft {
  name: string;
  imageUrl?: string;
  source?: FoodSource;
  instructions: string[];
  /** From `recipeYield`; null when the page does not say. */
  servings: number | null;
  /** Standard portion in g, ready for `FoodItem.portion`. */
  portion: number;
  portionSource: 'servings' | 'default';
  /** Matched ingredients, ready for `recipeIngredients`. */
  items: Array<{ food: FoodItem; amount: number; raw: string; confidence: IngredientMatch['confidence'] }>;
  /** Lines with no product in the database: shown to the user to search manually. */
  unmatched: Array<{ raw: string; query: string; grams: number | null; food: FoodItem | null }>;
  /** "Sale q.b.", "a pinch of salt": not counted in the totals, offered to the user to add. */
  seasonings: Array<{ raw: string; query: string; food: FoodItem | null; grams: number | null }>;
  /** Everything the recipe weighs, matched or not. */
  totalGrams: number;
  /** Weight of the matched ingredients only. */
  matchedGrams: number;
  /** matchedGrams / totalGrams, 0…1: the confidence of the computed nutrition. */
  coverage: number;
  /** Computed from the matched ingredients, per 100 g of *matched* mass. */
  nutritionPer100: Nutrients;
  /** The page's panel, per serving: a cross-check, never saved automatically. */
  pageNutritionPerServing: Nutrients | null;
  warnings: ImportWarning[];
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Assemble the draft from the page and the matches. Pure: no saving, no network. */
export function buildImportedRecipe(page: ParsedRecipePage, matches: readonly IngredientMatch[]): ImportedRecipeDraft {
  const items: ImportedRecipeDraft['items'] = [];
  const unmatched: ImportedRecipeDraft['unmatched'] = [];
  const seasonings: ImportedRecipeDraft['seasonings'] = [];
  let totalGrams = 0;
  let matchedGrams = 0;

  for (const match of matches) {
    const { parsed } = match;
    // "Sale quanto basta" is not an ingredient with a weight: it is a seasoning. Counting a pinch as
    // 0.5 g would not hurt, but inventing 100 g would, and either way it is noise in the totals.
    if (parsed.amountKind === 'vague') {
      seasonings.push({ raw: parsed.raw, query: parsed.query, food: match.food, grams: parsed.grams });
      continue;
    }
    if (match.food && match.amount !== null && match.amount > 0 && parsed.amountKind !== 'none') {
      items.push({ food: match.food, amount: round1(match.amount), raw: parsed.raw, confidence: match.confidence });
      matchedGrams += match.amount;
      totalGrams += match.amount;
      continue;
    }
    unmatched.push({ raw: parsed.raw, query: parsed.query, grams: parsed.grams, food: match.food });
    if (parsed.grams) totalGrams += parsed.grams;
  }

  // Per 100 g, exactly like the recipe builder computes it from its ingredient list.
  let kcal = 0, carbs = 0, protein = 0, fat = 0, fiber = 0, salt = 0, sugar = 0;
  for (const item of items) {
    kcal += (item.food.calories * item.amount) / 100;
    carbs += ((item.food.carbs ?? 0) * item.amount) / 100;
    protein += ((item.food.protein ?? 0) * item.amount) / 100;
    fat += ((item.food.fat ?? 0) * item.amount) / 100;
    fiber += ((item.food.fiber ?? 0) * item.amount) / 100;
    salt += ((item.food.salt ?? 0) * item.amount) / 100;
    sugar += ((item.food.sugar ?? 0) * item.amount) / 100;
  }
  const factor = matchedGrams > 0 ? 100 / matchedGrams : 0;

  // The portion rule: the servings on the page divide the dish; without them, 100 g.
  const servings = page.servings && page.servings > 0 ? page.servings : null;
  const portion = servings && totalGrams > 0 ? Math.max(1, Math.round(totalGrams / servings)) : 100;
  const coverage = totalGrams > 0 ? Math.round((matchedGrams / totalGrams) * 100) / 100 : 0;

  const warnings: ImportWarning[] = [];
  if (items.length === 0) warnings.push('no-matches');
  else if (coverage < 0.5) warnings.push('few-matches');
  if (!servings) warnings.push('no-servings');
  if (seasonings.length > 0) warnings.push('seasonings');
  if (page.recipeCount > 1) warnings.push('multiple-recipes');
  if (page.duplicateIngredients > 0) warnings.push('duplicates');

  return {
    name: page.name,
    imageUrl: page.imageUrl,
    source: page.sourceUrl.startsWith('https://')
      ? { label: page.sourceLabel, url: page.sourceUrl as `https://${string}` }
      : undefined,
    instructions: page.instructions,
    servings,
    portion,
    portionSource: servings && totalGrams > 0 ? 'servings' : 'default',
    items,
    unmatched,
    seasonings,
    totalGrams: Math.round(totalGrams),
    matchedGrams: Math.round(matchedGrams),
    coverage,
    nutritionPer100: {
      calories: Math.round(kcal * factor),
      carbs: round1(carbs * factor),
      protein: round1(protein * factor),
      fat: round1(fat * factor),
      fiber: round1(fiber * factor),
      salt: Math.round(salt * factor * 100) / 100,
      sugar: round1(sugar * factor),
    },
    pageNutritionPerServing: page.nutritionPerServing,
    warnings,
  };
}

/** What the recipe builder needs to show the import. */
export const draftToRecipeIngredients = (draft: ImportedRecipeDraft): PreBuiltMealIngredient[] =>
  draft.items.map((item) => ({ foodId: item.food.id, amount: item.amount }));

/* ------------------------------------------------------------- the entry point */

export interface ImportOptions extends MatchDeps, FetchOptions {}

export interface ImportResult {
  draft: ImportedRecipeDraft;
  page: ParsedRecipePage;
  matches: IngredientMatch[];
  via: FetchVia;
}

/**
 * Link → reviewable recipe draft. Nothing is saved here: the caller opens the recipe builder with
 * the draft, the user fixes what looks wrong and saves.
 */
export async function importRecipeFromUrl(inputUrl: string, options: ImportOptions = {}): Promise<ImportResult> {
  const url = normalizeUrl(inputUrl);
  const fetched = await fetchPageHtmlDetailed(url, options);

  options.onStage?.('parsing');
  const page = parseRecipePage(fetched.html, url);
  const parsed: ParsedIngredient[] = parseIngredientLines(page.ingredients);

  options.onStage?.('matching');
  const matches = await matchIngredients(parsed, options);

  options.onStage?.('done');
  return { draft: buildImportedRecipe(page, matches), page, matches, via: fetched.via };
}
