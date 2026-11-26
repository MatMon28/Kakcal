export const REGION_IT: number;
export const REGION_EU: number;
export const REGION_US: number;
export const REGION_UK: number;

export interface BuilderFoodRecord {
  code: string;
  name: string;
  brand: string;
  kcal: number;
  fat: number;
  carbs: number;
  sugar: number | null;
  protein: number;
  fiber: number | null;
  salt: number | null;
  portion: number;
  ml: boolean;
  cat: number;
  regionMask: number;
  score: number;
}

export function categoryOf(tags: string): number;
export function normalize(s: string): string;
export function isObsoleteRow(row: {
  statesTags?: string;
  obsolete?: string;
  obsoleteSince?: string;
  rawName?: string;
}): boolean;
export function regionInfoOf(countriesTags?: string): { mask: number; bucket: string | null };
export function dedupKey(f: Pick<BuilderFoodRecord, 'name' | 'brand' | 'kcal' | 'fat' | 'carbs' | 'protein'>): string;
export function selectBalancedFoods(
  heaps: Record<string, { items: BuilderFoodRecord[] }>,
  quotas: Record<string, number>,
  limit: number,
): BuilderFoodRecord[];
export function buildKoffV2Buffer(
  foods: BuilderFoodRecord[],
  builtAtDays?: number,
): { buffer: ArrayBuffer; brandCount: number; vocabCount: number };
