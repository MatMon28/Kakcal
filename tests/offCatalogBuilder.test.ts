import { act, cleanup, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppProvider, useApp } from '../src/context/AppContext';
import { STORAGE_KEYS } from '../src/context/appStorage';
import { parseOffCatalog } from '../src/data/offCatalog';
import { resetBootForTests } from '../src/storage/boot';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { flushWrites } from '../src/storage/writeQueue';
import type { FoodItem } from '../src/types';
import {
  buildKoffV2Buffer,
  dedupKey,
  isObsoleteRow,
  REGION_EU,
  REGION_IT,
  REGION_UK,
  REGION_US,
  regionInfoOf,
  selectBalancedFoods,
  type BuilderFoodRecord,
} from '../scripts/build-off-catalog.mjs';

const makeRecord = (over: Partial<BuilderFoodRecord> = {}): BuilderFoodRecord => ({
  code: '8000000000001',
  name: 'Classic Spaghetti',
  brand: 'Barilla',
  kcal: 359,
  fat: 2,
  carbs: 71,
  sugar: 3.5,
  protein: 12.5,
  fiber: 3,
  salt: 0.01,
  portion: 85,
  ml: false,
  cat: 2,
  regionMask: REGION_IT,
  score: 500,
  ...over,
});

describe('KOFF v2 builder filters, deduplication and encoding', () => {
  it('excludes obsolete and discontinued products', () => {
    expect(isObsoleteRow({ statesTags: 'en:to-be-completed,en:obsolete' })).toBe(true);
    expect(isObsoleteRow({ obsolete: '1' })).toBe(true);
    expect(isObsoleteRow({ obsolete: 'true' })).toBe(true);
    expect(isObsoleteRow({ obsoleteSince: '2022-05-01' })).toBe(true);
    expect(isObsoleteRow({ rawName: 'Yogurt (Discontinued)' })).toBe(true);
    expect(isObsoleteRow({ rawName: 'Biscotti fuori produzione' })).toBe(true);
    expect(isObsoleteRow({ statesTags: 'en:complete', rawName: 'Whole Milk' })).toBe(false);
  });

  it('deduplicates pack-size variants, repeated brand prefixes and rounded macros without merging distinct items', () => {
    const a = makeRecord({ name: 'Spaghetti 500g', brand: 'Barilla', kcal: 359 });
    const b = makeRecord({ name: 'Barilla Spaghetti 1 kg', brand: 'Barilla', kcal: 360 });
    const c = makeRecord({ name: 'Spaghetti 6 x 125g', brand: 'Barilla', kcal: 358 });
    expect(dedupKey(a)).toBe(dedupKey(b));
    expect(dedupKey(a)).toBe(dedupKey(c));

    // Token order matters: "Milk Chocolate" != "Chocolate Milk"
    const milkChoc = makeRecord({ name: 'Milk Chocolate', brand: 'Lindt', kcal: 540, fat: 32, carbs: 54, protein: 7 });
    const chocMilk = makeRecord({ name: 'Chocolate Milk', brand: 'Lindt', kcal: 540, fat: 32, carbs: 54, protein: 7 });
    expect(dedupKey(milkChoc)).not.toBe(dedupKey(chocMilk));

    // Distinct nutrition / variants stay separate
    const cola = makeRecord({ name: 'Cola Classic 330ml', brand: 'Kola', kcal: 42, fat: 0, carbs: 10.6, protein: 0 });
    const colaZero = makeRecord({ name: 'Cola Zero 330ml', brand: 'Kola', kcal: 0, fat: 0, carbs: 0, protein: 0 });
    expect(dedupKey(cola)).not.toBe(dedupKey(colaZero));
  });

  it('computes region bitmasks and balances regional quotas with spillover', () => {
    expect(regionInfoOf('en:italy,en:france')).toEqual({ mask: REGION_IT | REGION_EU, bucket: 'it' });
    expect(regionInfoOf('en:united-states')).toEqual({ mask: REGION_US, bucket: 'us' });
    expect(regionInfoOf('en:united-kingdom')).toEqual({ mask: REGION_UK, bucket: 'uk' });
    expect(regionInfoOf('en:japan')).toEqual({ mask: 0, bucket: null });

    const heaps = {
      it: {
        items: [
          makeRecord({ code: '8000000000011', name: 'Pasta A', score: 900, regionMask: REGION_IT }),
          makeRecord({ code: '8000000000012', name: 'Pasta B', score: 800, regionMask: REGION_IT }),
        ],
      },
      us: {
        items: [
          makeRecord({ code: '0000000000021', name: 'Peanut Butter', score: 950, regionMask: REGION_US }),
          makeRecord({ code: '0000000000022', name: 'Oatmeal', score: 700, regionMask: REGION_US }),
          // Duplicate barcode across buckets must only appear once
          makeRecord({ code: '8000000000011', name: 'Pasta A', score: 600, regionMask: REGION_US }),
        ],
      },
      uk: { items: [] },
    };
    const selected = selectBalancedFoods(heaps, { it: 1, us: 1, uk: 1 }, 3);
    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((f) => f.code)).size).toBe(3);
  });

  it('round-trips inverted index, hybrid search, language boost, binary barcode search and browse', () => {
    const records: BuilderFoodRecord[] = [];
    // Populate 600 common "milk" rows so a multi-word rare+common query hits the hybrid path
    for (let i = 0; i < 600; i++) {
      records.push(makeRecord({
        code: String(4000000000000 + i),
        name: i === 420 ? 'Organic Almond Milk Unsweetened' : `Fresh Milk ${i}`,
        brand: i % 2 === 0 ? 'DairyFarm' : '',
        kcal: 50 + (i % 20),
        regionMask: i % 3 === 0 ? REGION_IT : REGION_US,
        score: 1000 - i,
      }));
    }
    records.push(makeRecord({
      code: '012345678905',
      name: 'Yogurt Greek Plain',
      brand: 'Fage',
      kcal: 97,
      fat: 5,
      carbs: 4,
      protein: 9,
      sugar: 4,
      fiber: null,
      salt: 0.1,
      portion: 170,
      regionMask: REGION_US,
      score: 1200,
    }));
    records.push(makeRecord({
      code: '8013355501520',
      name: 'Yogurt Greco',
      brand: 'Fage',
      kcal: 97,
      fat: 5,
      carbs: 4,
      protein: 9,
      sugar: 4,
      fiber: null,
      salt: 0.1,
      portion: 150,
      regionMask: REGION_IT,
      score: 1150,
    }));
    records.sort((a, b) => b.score - a.score);

    const { buffer } = buildKoffV2Buffer(records);
    const catalog = parseOffCatalog(buffer);
    expect(catalog.count).toBe(records.length);

    // Language boost: Italian vs English
    const itYogurt = catalog.search('yogurt', 10, 'it');
    expect(itYogurt[0].id).toBe('off-8013355501520');
    const enYogurt = catalog.search('yogurt', 10, 'en');
    expect(enYogurt[0].id).toBe('off-012345678905');

    // Hybrid rare + common prefix intersection + zero-match
    const hybrid = catalog.search('alm milk', 10);
    expect(hybrid).toHaveLength(1);
    expect(hybrid[0].name_en).toBe('Organic Almond Milk Unsweetened');
    expect(catalog.search('nonexistentxyz', 10)).toEqual([]);

    // O(log N) barcode lookup + leading-zero UPC/EAN equivalence
    expect(catalog.findByBarcode('012345678905')?.id).toBe('off-012345678905');
    expect(catalog.findByBarcode('0012345678905')?.id).toBe('off-012345678905');
    expect(catalog.findByBarcode('8013355501520')?.sugar).toBe(4);
    expect(catalog.findByBarcode('8013355501520')?.fiber).toBeNull();
  });
});

describe('existing users saved foods are never lost when the catalogue updates', () => {
  const wrapper = ({ children }: { children: ReactNode }) => createElement(AppProvider, null, children);

  beforeEach(async () => {
    await deleteDatabase();
    resetDbForTests();
    resetBootForTests();
    localStorage.clear();
  });
  afterEach(async () => {
    cleanup();
    await flushWrites();
  });

  it('keeps previously saved off-* foods in allFoods even if removed from off-foods.bin and protects starred foods from eviction', async () => {
    const discontinuedSaved: FoodItem = {
      id: 'off-9999999999991',
      name_de: 'Old Discontinued Snack',
      name_it: 'Vecchio Snack Fuori Produzione',
      name_en: 'Old Discontinued Snack',
      store: 'Open Food Facts',
      category: 'snacks_sweets',
      unit: 'g',
      calories: 420,
      carbs: 50,
      protein: 6,
      fat: 20,
      fiber: 2,
      salt: 0.5,
      barcode: '9999999999991',
    };

    // Simulate an existing user with 3000 remembered foods where the oldest one is favourited
    const existingUsed: FoodItem[] = Array.from({ length: 3000 }, (_, i) =>
      i === 2999
        ? discontinuedSaved
        : {
          ...discontinuedSaved,
          id: `off-${8000000000000 + i}`,
          name_en: `Food ${i}`,
          name_it: `Food ${i}`,
          name_de: `Food ${i}`,
          barcode: String(8000000000000 + i),
        },
    );
    localStorage.setItem(STORAGE_KEYS.USED_FOODS, JSON.stringify(existingUsed));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ favoriteFoods: [discontinuedSaved.id] }));

    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.allFoods.some((f) => f.id === discontinuedSaved.id)).toBe(true);

    // Remembering another new product must not evict the favourited off-* product
    const brandNew: FoodItem = {
      ...discontinuedSaved,
      id: 'off-7777777777777',
      name_en: 'Brand New Product',
      name_it: 'Nuovo Prodotto',
      name_de: 'Brand New Product',
      barcode: '7777777777777',
    };
    act(() => result.current.rememberFood(brandNew));

    expect(result.current.allFoods.some((f) => f.id === brandNew.id)).toBe(true);
    expect(result.current.allFoods.some((f) => f.id === discontinuedSaved.id)).toBe(true);
  });
});
