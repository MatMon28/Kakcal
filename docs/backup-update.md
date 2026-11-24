# Full JSON backup without pictures (backup version 2)

> **Scope:** what Settings > Data Backup > Export / Import now saves and restores, how pictures are treated, the file format (`version: "2.0"`) and the warnings the user sees.
>
> **Read when:** you change the backup file, add a persisted key (it must be added to the backup too), or change the Backup group in Settings.
>
> **Related:** [storage-and-privacy.md](storage-and-privacy.md), [meal-journal.md](meal-journal.md), [file-map/utils.md](file-map/utils.md), [verification.md](verification.md)

## What changed

- **Export JSON** now contains **everything the user saved except the picture files**. Before (version `1.2`) it contained most data and embedded the pictures as base64 (huge files); several things were missing (language, remembered portions, the unfinished planner draft, interface preferences).
- **Pictures are never in the backup.** The user is told in three places: a permanent amber notice in Settings > Data Backup, a confirmation ("Pictures are not included" > *Export without pictures* / *Cancel*) when the device holds at least one picture, and a message after the export. The notice points to **Export meal pictures** (the separate ZIP).
- **Import JSON** reads both formats: version `2.x` (this round) and the old `1.x` files (pictures embedded, restored exactly as before). A file with a major version above `2` (made by a newer app) is refused and nothing changes.
- The import message explains what happened with the picture notes (see below).

## What the version 2 file contains

| Section | Content |
| --- | --- |
| `format`, `version`, `exportedAt`, `picturesIncluded` | `"kakcal-backup"`, `"2.0"`, ISO time, always `false` |
| `language` | `en` / `it` |
| `userProfile` | profile, body section |
| `dayLogs` | every day: meals, activities, water, weight, poop, custom trackers |
| `customFoods`, `usedFoods` | own foods, catalogue foods you picked or starred |
| `preBuiltMeals` | saved meals and recipes (portion, ingredients) |
| `customActivities` | own activities |
| `settings` | all settings: favourites (`favoriteFoods`, `favoriteActivities`), quick foods, custom buttons, notifications, theme, switches |
| `periodData` | cycle settings and logs, tags |
| `advanced` | goals / limits and body measurements |
| `layout` | advanced layout and added meal types |
| `mealJournal` | `plans`, `planGroups` (plan names), `shoppingLists`, `memories` (meal notes and favourites per meal), `photos: []` (always empty) and **`photoNotes`** |
| `lastAmounts` | remembered portions |
| `plannerDraft` | the unfinished meal plan, or `null` |
| `preferences` | interface preferences: open / closed cards and sections, Custom Foods tab, Today layout, Body range, Statistics sections |

The top-level keys of `1.2` are unchanged; version 2 only adds keys.

**Not in the backup (on purpose):** the picture files (IndexedDB `photos`), the launch-animation keys `kcalsync_intro_last` / `kcalsync_intro_seen`, and the IndexedDB internals (schema meta). The 130,000-product catalogue is part of the app, not user data.

## Pictures and their notes

`mealJournal.photoNotes` keeps `id`, `date`, `slot`, `note`, `createdAt` and `linkedId` of every picture, never the image. On import:

1. a note whose picture **is on this device** (same `id`, for example restoring on the same phone) is re-attached: the picture is untouched, its note / date / meal / link come from the backup;
2. a note whose picture **is not on this device** cannot be shown and is skipped; the import message says how many;
3. pictures on the device that the backup does not mention are **kept**: an import never deletes a picture.

Importing an old `1.x` file restores its embedded pictures, as before.

## Interface preferences

`collectPreferences()` saves every localStorage key that matches `kcak_*`, `kcalsync_body_range`, `kcalsync_stats_daily_open` or `kcalsync_stats_weight_open`, except `kcak_planner_draft` (exported as `plannerDraft`). `applyPreferences()` accepts only the same whitelist (max 100 keys, 20,000 characters each). **A new interface-preference key named `kcak_*` is saved automatically**; any other new key must be added to `exportDataJson` / `importDataJson` in `AppContext.tsx` (see the table in [README.md](README.md#keeping-the-docs-current)). Open / closed states are read when a page mounts, so they show after the app is reopened.

## Saving the file on Android (the APK): the 0 B file fix

**Symptom:** *Export JSON* from the Android APK created a `.json` file of **0 B**; the PWA was fine (the browser downloads a Blob, the APK cannot).

**Path in the APK:** `DataBackup.tsx` > `JournalDevice.exportBackup({ json, filename })` > `JournalDevicePlugin.exportBackup` stages the bytes in a private cache file > the system *create document* picker opens (this is the moment the 0 B document is created by Android) > `backupDestination` copies the staged file into it.

**What could leave the document empty (all closed in `JournalDevicePlugin.java`):**

| Cause | Fix |
| --- | --- |
| The copy callback received `call == null` (Capacitor no longer had the call, e.g. the activity was re-created while the picker was open) and silently returned, after Android had already created the empty document | the staged file name is also stored in SharedPreferences (`journal_export` / `pendingFile`); the callback copies the file anyway (only the answer to JS is missing) |
| The temp-file name check accepted `json`, `zip`, `txt` but not `xlsx`: *Export to Excel* was rejected ("Backup expired") after the empty document existed | `xlsx` is accepted |
| The provider failed with the `"wt"` (truncate) open mode and the error left the empty document | the copy retries with `"w"`; the byte count is checked; the file descriptor is synced |
| Any failure left the empty document behind and an exception inside the callback was swallowed by Capacitor (JS waited forever) | the empty document is deleted (`DocumentsContract.deleteDocument`), the callback body is wrapped so JS always gets a rejection, the staged file is always removed |
| An empty payload would have produced a 0 B file | empty / blank JSON and empty base64 are rejected before the picker opens |

**Visible behaviour:** *Export JSON* in the APK now shows `Backup saved. (12.4 KB) Pictures are not included...` (the size actually written). Closing the picker without saving shows **no** success message (before it said the backup was saved). A real write failure shows the existing red error and leaves no 0 B file. The file name is `kakcal_backup_<date>.json`, like the browser.

**Bridge contract (`src/utils/android.ts`):** `exportBackup({ json, filename? })` and `exportFile({ base64, filename, kind })` resolve `{ cancelled?: boolean; bytes?: number }`.

**Rebuild the APK** (`node scripts/prepare-android.mjs && npx cap open android`) to get the fixed native plugin; the web part alone does not fix it. No new permission, package or storage key.

**Tests:** `tests/backup-android.test.tsx` (the APK path with the plugin mocked: non-empty version 2 payload, file name, size shown, no Blob download, cancel shows nothing, failure shows the error). The Java part cannot run in CI: check it on a device (see [verification.md](verification.md)).

## Code

- `src/utils/backupFormat.ts`: version constants, `isSupportedBackup`, picture notes (`journalWithoutPictures`, `readPhotoNotes`, `mergePictureNotes`), preferences, `ImportReport` (`getLastImportReport`).
- `src/utils/journalStore.ts`: `exportMealJournalForBackup()` (now synchronous, no pictures), `prepareMealJournalImport()` (old pictures to blobs first; version 2 notes merged).
- `src/context/AppContext.tsx`: `exportDataJson`, `importDataJson` (the `Promise` types are unchanged).
- `src/utils/amountMemory.ts`: `exportLastAmounts`, `importLastAmounts`. `src/utils/plannerDraft.ts`: `parsePlannerDraft` (validation shared by the stored draft and the backup).
- `src/components/common/DataBackup.tsx`: the notice, the confirmation, the messages; the Android branch (native save, cancel, size).
- `android/app/src/main/java/com/kcalsync/app/JournalDevicePlugin.java`: `exportBackup`, `exportFile`, `backupDestination` (see the section above). `src/utils/android.ts`: the typed bridge.
- `tests/backup-ui.test.tsx`: the notice, the confirmation (nothing exported before the user confirms) and that the downloaded file has no picture data.
- `tests/backup-android.test.tsx`: the Android export path.
- `tests/backup.test.tsx`: contents, no picture data in the file, round trip to an empty device and onto a device that still has the picture, old `1.2` import, refusal of a newer file.

No new package, permission, storage key or remote API (the Android native export code was hardened, see above).

## Verifying by hand

1. Settings > Data Backup shows the amber notice. With a saved picture, *Export* asks for confirmation first.
2. Open the downloaded `kakcal_backup_<date>.json`: `"version": "2.0"`, `"picturesIncluded": false`, no `data:image` text, `mealJournal.photos` is `[]`.
3. Delete all data, import the file: meals, recipes, plans, shopping lists, favourites and settings are back; the message mentions the pictures.
