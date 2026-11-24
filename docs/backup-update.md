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

## Code

- `src/utils/backupFormat.ts`: version constants, `isSupportedBackup`, picture notes (`journalWithoutPictures`, `readPhotoNotes`, `mergePictureNotes`), preferences, `ImportReport` (`getLastImportReport`).
- `src/utils/journalStore.ts`: `exportMealJournalForBackup()` (now synchronous, no pictures), `prepareMealJournalImport()` (old pictures to blobs first; version 2 notes merged).
- `src/context/AppContext.tsx`: `exportDataJson`, `importDataJson` (the `Promise` types are unchanged).
- `src/utils/amountMemory.ts`: `exportLastAmounts`, `importLastAmounts`. `src/utils/plannerDraft.ts`: `parsePlannerDraft` (validation shared by the stored draft and the backup).
- `src/components/common/DataBackup.tsx`: the notice, the confirmation, the messages.
- `tests/backup-ui.test.tsx`: the notice, the confirmation (nothing exported before the user confirms) and that the downloaded file has no picture data.
- `tests/backup.test.tsx`: contents, no picture data in the file, round trip to an empty device and onto a device that still has the picture, old `1.2` import, refusal of a newer file.

No new package, permission, storage key, Android native code or remote API.

## Verifying by hand

1. Settings > Data Backup shows the amber notice. With a saved picture, *Export* asks for confirmation first.
2. Open the downloaded `kakcal_backup_<date>.json`: `"version": "2.0"`, `"picturesIncluded": false`, no `data:image` text, `mealJournal.photos` is `[]`.
3. Delete all data, import the file: meals, recipes, plans, shopping lists, favourites and settings are back; the message mentions the pictures.
