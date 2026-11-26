import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppProvider, useApp } from '../src/context/AppContext';
import { VERIFIED_FOODS } from '../src/data/verifiedFoods';
import { deleteDatabase, resetDbForTests } from '../src/storage/idb';
import { flushWrites } from '../src/storage/writeQueue';
import { resetBootForTests } from '../src/storage/boot';
import { addMealPhoto, exportMealJournal, importMealJournal, saveMealPlans, savePlanGroup, saveShoppingList } from '../src/utils/journalStore';
import { getPhotoBlob } from '../src/storage/photoStore';
import { savePlannerDraft, loadPlannerDraft } from '../src/utils/plannerDraft';
import { exportLastAmounts, setLastAmount } from '../src/utils/amountMemory';
import { addCustomPortion, getCustomPortions, resetCustomPortionsForTests } from '../src/utils/customPortions';
import {
  BACKUP_VERSION,
  backupMajorVersion,
  collectPreferences,
  getLastImportReport,
  isPreferenceKey,
  isSupportedBackup,
  mergePictureNotes,
} from '../src/utils/backupFormat';

const wrapper = ({ children }: { children: ReactNode }) => <StrictMode><AppProvider>{children}</AppProvider></StrictMode>;
const food = VERIFIED_FOODS[0];
const jpeg = () => new Blob(['fake-image-bytes'], { type: 'image/jpeg' });
const photoMeta = { id: 'pic1', date: '2026-02-03', slot: 'lunch' as const, note: 'pasta night', createdAt: '2026-02-03T12:00:00Z' };

const wipe = async () => {
  await deleteDatabase(); resetDbForTests(); resetBootForTests(); localStorage.clear();
  resetCustomPortionsForTests();
  importMealJournal({});
};
beforeEach(wipe);
afterEach(async () => { cleanup(); await flushWrites(); });

const makePlan = () => ({
  id: 'plan1', date: '2026-02-04', slot: 'dinner' as const, title: 'Soup', kind: 'food' as const,
  items: [{ food, amount: 200 }], note: 'cook early', read: false, groupId: 'g1',
});

describe('backup format helpers', () => {
  it('reads backup versions and refuses files from a newer app', () => {
    expect(backupMajorVersion({ version: '2.0' })).toBe(2);
    expect(backupMajorVersion({ version: '1.2' })).toBe(1);
    expect(backupMajorVersion({})).toBe(1);
    expect(isSupportedBackup({ version: '1.2' })).toBe(true);
    expect(isSupportedBackup({ version: BACKUP_VERSION })).toBe(true);
    expect(isSupportedBackup({ version: '3.0' })).toBe(false);
    expect(isSupportedBackup(null)).toBe(false);
    expect(isSupportedBackup([])).toBe(false);
  });

  it('only whitelists interface preference keys', () => {
    expect(isPreferenceKey('kcak_today_meals_open')).toBe(true);
    expect(isPreferenceKey('kcalsync_body_range')).toBe(true);
    expect(isPreferenceKey('kcalsync_settings')).toBe(false);
    expect(isPreferenceKey('kcalsync_intro_seen')).toBe(false);
    expect(isPreferenceKey('kcak_planner_draft')).toBe(false); // exported as `plannerDraft`
  });

  it('re-attaches picture notes to local pictures and never deletes a local picture', () => {
    const local = [
      { ...photoMeta, src: 'idb:pic1', note: 'old' },
      { ...photoMeta, id: 'other', src: 'idb:other' },
    ];
    const merged = mergePictureNotes(
      [{ ...photoMeta, note: 'new note' }, { ...photoMeta, id: 'gone' }],
      local,
    );
    expect(merged.matched).toBe(1);
    expect(merged.missing).toBe(1);
    expect(merged.photos.map((p) => p.id).sort()).toEqual(['other', 'pic1']);
    expect(merged.photos.find((p) => p.id === 'pic1')).toMatchObject({ note: 'new note', src: 'idb:pic1' });
  });
});

describe('full JSON backup without pictures', () => {
  it('exports every kind of saved data and no picture data', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.logFoodItem('dinner', food, 100));
    act(() => result.current.toggleFavoriteFood(food.id));
    act(() => result.current.setLanguage('it'));
    act(() => result.current.addPreBuiltMeal({ name: 'My meal', items: [], isRecipe: false } as never));
    savePlanGroup({ id: 'g1', name: 'Week 1', createdAt: '2026-02-01' }, [makePlan()]);
    saveShoppingList({ planId: 'g1', updatedAt: '', dismissed: [], items: [{ id: 'i1', name: 'Rice', amount: 500, unit: 'g', checked: true }] });
    await addMealPhoto(photoMeta, jpeg());
    setLastAmount('food-x', 175);
    addCustomPortion('food-x', 180, 'My bowl');
    localStorage.setItem('kcak_today_meals_open', JSON.stringify(['lunch']));
    localStorage.setItem('kcalsync_intro_seen', '1');
    savePlannerDraft({ step: 'plan', name: 'Draft', startDate: '2026-03-01', endDate: '2026-03-02', skippedWeekdays: [], overrides: {}, selectedSlots: ['lunch'], entries: {}, preferredKind: 'food', activeKey: null });

    let json = '';
    await act(async () => { json = await result.current.exportDataJson(); });
    const data = JSON.parse(json);

    expect(data.format).toBe('kakcal-backup');
    expect(data.version).toBe(BACKUP_VERSION);
    expect(data.picturesIncluded).toBe(false);
    expect(data.language).toBe('it');
    for (const key of ['userProfile', 'customFoods', 'usedFoods', 'dayLogs', 'preBuiltMeals', 'settings', 'periodData', 'customActivities', 'advanced', 'layout', 'mealJournal', 'lastAmounts', 'plannerDraft', 'preferences'])
      expect(data, key).toHaveProperty(key);
    expect(data.settings.favoriteFoods).toContain(food.id);
    expect(data.preBuiltMeals.some((m: { name: string }) => m.name === 'My meal')).toBe(true);
    expect(data.mealJournal.plans).toHaveLength(1);
    expect(data.mealJournal.planGroups[0].name).toBe('Week 1');
    expect(data.mealJournal.shoppingLists[0].items[0].checked).toBe(true);
    expect(data.lastAmounts['food-x']).toBe(175);
    expect(data.customPortions['food-x'][0]).toMatchObject({ grams: 180, label: 'My bowl' });
    expect(data.plannerDraft.name).toBe('Draft');
    expect(data.preferences.kcak_today_meals_open).toEqual(['lunch']);
    expect(data.preferences).not.toHaveProperty('kcalsync_intro_seen');
    // pictures: no image data anywhere, only the note
    expect(data.mealJournal.photos).toEqual([]);
    expect(data.mealJournal.photoNotes).toEqual([photoMeta]);
    expect(json).not.toMatch(/data:image/);
    expect(json).not.toMatch(/idb:pic1/);
  });

  it('round-trips everything to a clean device and keeps pictures that are already there', async () => {
    const first = renderHook(() => useApp(), { wrapper });
    act(() => first.result.current.logFoodItem('dinner', food, 100));
    act(() => first.result.current.toggleFavoriteFood(food.id));
    act(() => first.result.current.setLanguage('it'));
    savePlanGroup({ id: 'g1', name: 'Week 1', createdAt: '2026-02-01' }, [makePlan()]);
    saveMealPlans([]);
    saveShoppingList({ planId: 'g1', updatedAt: '', dismissed: [], items: [{ id: 'i1', name: 'Rice', amount: 500, unit: 'g', checked: false }] });
    await addMealPhoto(photoMeta, jpeg());
    setLastAmount('food-x', 175);
    addCustomPortion('food-x', 180, 'My bowl');
    localStorage.setItem('kcak_today_meals_open', JSON.stringify(['lunch']));
    savePlannerDraft({ step: 'plan', name: 'Draft', startDate: '2026-03-01', endDate: '2026-03-02', skippedWeekdays: [], overrides: {}, selectedSlots: ['lunch'], entries: {}, preferredKind: 'food', activeKey: null });
    let json = '';
    await act(async () => { json = await first.result.current.exportDataJson(); });
    first.unmount();
    await flushWrites();

    // a different device: nothing there, in particular no pictures
    await wipe();
    const second = renderHook(() => useApp(), { wrapper });
    let ok = false;
    await act(async () => { ok = await second.result.current.importDataJson(json); });
    expect(ok).toBe(true);
    expect(Object.values(second.result.current.allDayLogs).some((d) => d.meals.dinner.length === 1)).toBe(true);
    expect(second.result.current.settings.favoriteFoods).toContain(food.id);
    expect(second.result.current.language).toBe('it');
    expect(exportMealJournal().plans).toHaveLength(1);
    expect(exportMealJournal().planGroups[0].name).toBe('Week 1');
    expect(exportMealJournal().shoppingLists[0].items[0].name).toBe('Rice');
    expect(exportLastAmounts()['food-x']).toBe(175);
    expect(getCustomPortions('food-x')[0]).toMatchObject({ grams: 180, label: 'My bowl' });
    expect(loadPlannerDraft()?.name).toBe('Draft');
    expect(collectPreferences().kcak_today_meals_open).toEqual(['lunch']);
    // the note of the missing picture cannot be shown: it is reported, not invented
    expect(exportMealJournal().photos).toHaveLength(0);
    expect(getLastImportReport()).toMatchObject({ version: 2, picturesInFile: false, notesRestored: 0, notesWithoutPicture: 1 });
    second.unmount();

    // same device with the picture still there: the note is restored and the picture is untouched
    await wipe();
    await addMealPhoto({ ...photoMeta, note: 'edited later' }, jpeg());
    const third = renderHook(() => useApp(), { wrapper });
    await act(async () => { ok = await third.result.current.importDataJson(json); });
    expect(ok).toBe(true);
    expect(exportMealJournal().photos).toHaveLength(1);
    expect(exportMealJournal().photos[0]).toMatchObject({ id: 'pic1', note: 'pasta night', src: 'idb:pic1' });
    expect(await getPhotoBlob('pic1')).not.toBeNull();
    expect(getLastImportReport()).toMatchObject({ notesRestored: 1, notesWithoutPicture: 0 });
  });

  it('still imports an old 1.2 backup with embedded pictures', async () => {
    const old = {
      version: '1.2',
      dayLogs: {},
      settings: { trackSugar: true },
      mealJournal: { version: 1, plans: [], memories: {}, photos: [{ ...photoMeta, src: 'data:image/jpeg;base64,AAAA' }] },
    };
    const { result } = renderHook(() => useApp(), { wrapper });
    let ok = false;
    await act(async () => { ok = await result.current.importDataJson(JSON.stringify(old)); });
    expect(ok).toBe(true);
    expect(result.current.settings.trackSugar).toBe(true);
    expect(exportMealJournal().photos[0]).toMatchObject({ id: 'pic1', src: 'idb:pic1' });
    expect(await getPhotoBlob('pic1')).not.toBeNull();
    expect(getLastImportReport()?.picturesInFile).toBe(true);
  });

  it('refuses a backup made by a newer app and keeps the current data', async () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.logFoodItem('lunch', food, 100));
    let ok = true;
    await act(async () => { ok = await result.current.importDataJson(JSON.stringify({ version: '9.0', dayLogs: {} })); });
    expect(ok).toBe(false);
    expect(result.current.currentDayLog.meals.lunch).toHaveLength(1);
    await act(async () => { ok = await result.current.importDataJson('null'); });
    expect(ok).toBe(false);
  });
});
