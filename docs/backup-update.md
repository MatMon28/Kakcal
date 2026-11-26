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

## Saving the file on Android (the APK): the 0 B file fix, round 2

> **Round 3 (below, [the false failure on Downloads](#round-3-the-false-failure-on-downloads-and-the-deleted-good-file)) replaced the size verification, the cleanup rule and the "no open-mode retry" statement of this section.** Where the two disagree, round 3 is current.

**Symptom:** *Export JSON*, *Export to Excel* and *Export meal pictures* from the APK left a **0 B** file in Downloads; the PWA was fine (the browser downloads a Blob, the APK cannot). Round 1 (`88141ed`) did not fix it.

**Why round 1 was wrong.** It retried the copy with `"wt"` and then `"w"`. For Storage Access Framework providers both map to `ContentResolver.MODE_WRITE` (create + truncate + write): the same call, so a provider that fails one fails the other and the retry only truncates again. **That loop was removed and is not a rationale for anything.** It also assumed the 0 B file was left by a failed copy, but after round 1 every copy failure deleted the document and rejected (a red error, never a silent 0 B file). A silent 0 B file therefore means *the copy never ran*.

**The structural fact.** `ACTION_CREATE_DOCUMENT` makes Android create the empty document when the user taps Save; the app writes into it afterwards, in the result callback. Anything that interrupts the app in between leaves 0 B. That window cannot be removed, only narrowed, and a record must always be left that can be resolved.

**Real causes and what closes them** (`ExportStore.java`, `JournalDevicePlugin.java`, `MainActivity.java`):

| Cause | Fix |
| --- | --- |
| The bytes were staged in `getCacheDir()`, the first thing Android evicts (low memory, Doze, cleaner apps, *Clear cache*): the staged file could vanish while the picker was open, so the copy wrote nothing into the already created document | staged in `getFilesDir()/exports` (app-private, removed only on uninstall / clear data), fsync + size check before the picker opens |
| Process / WebView death while the picker is open: the `PluginCall` and the bridge are gone, the old `@ActivityCallback` was not (reliably) re-invoked, DocumentsUI still created the 0 B file and nobody wrote into it. Round 1's SharedPreferences fallback only covered activity re-creation with a live bridge | the picker is launched by **`MainActivity`** (`getActivityResultRegistry().register("kakcal-export-picker", this, ...)` on every start), so a result that arrives after the activity or the whole process was re-created is still delivered and the copy still runs; **every start also calls `ExportStore.recover()`** (below) |
| One pending slot (`PENDING_KEY = "pendingFile"`) and every new staging deleted the previous staged file: two exports in a row (JSON then Excel) could delete each other's payload | every export has an id; SharedPreferences `journal_export` holds one record per id (`pending.<id>` = absolute path, kind, file name, size, created time, target document). Records and files are independent per id |
| The failure was swallowed (`catch (Throwable ignored)`, `reject("Could not write the selected file")`): nothing could be diagnosed from a device report | `Log.e("KakcalExport", ...)` with the exception, and the reject message is `Could not write the selected file: mode=wt <ExceptionClass>: <message> (provider=<authority>) [the empty document was removed]` (or `[... could not be removed: delete it manually]`); the app shows it in the red error |
| Excel and pictures went through `saveLocalFile()` which returned a bare boolean and dropped `{ bytes }`; only the JSON button had the size / cancel contract | one JS helper for all three (below) |

**Write path (`ExportStore.complete`)**, in this order: record the target document **before** anything is written (a crash from here on is resumable) > read the staged bytes into memory (the target is **not opened before the bytes exist**) > `openOutputStream(target, "wt")` once > write in one pass > `flush()` > `sync()` (when the stream is a file) > `close()` (close errors are raised) > read the document back and compare the bytes (round 3; round 2 compared the provider's `_size`, which is wrong on Downloads) > only then resolve `{ bytes }`. On a failure before any byte reached the document: `deleteDocument` as **best effort**, but only when the document is provably empty (round 3) (the grant that came with the picker result may be revoked or insufficient, and not every provider can delete), then `ContentResolver.delete`, and the message says which one happened. A document that could not be removed is remembered and retried on the next start (24 h).

**Resume on create (`MainActivity.onCreate` > `ExportStore.recover()`, on a background thread):**

- a record **with a target** is an export whose picker returned but whose write never finished (process killed, crash): the copy is finished from the staged bytes, or, if that is impossible, the empty document is removed;
- a record **without a target** is a picker that may still be open: kept for 24 h, then dropped together with its staged bytes;
- staged files nobody refers to, and the cache files of the round 1 implementation (`journal-backup-*`), are removed.

**Telling the web layer.** When the `PluginCall` is still alive (normal case) the call is resolved / rejected. When it is gone (activity re-created, process restarted) the outcome is stored (`lastExport`, at most 5), a toast is shown (English / Italian), the `exportFinished` plugin event fires, and `JournalDevice.takeLastExport()` returns and clears the list. `DataBackup` reads it on mount (Android only) and shows `Saved after the app restarted: <name>. (12.4 KB)` or the red error with the real cause. A result that arrives while Settings is closed is shown the next time Settings > Data Backup opens.

**One JS helper, one message grammar (`src/utils/planSharing.ts`).** `saveLocalFile(content: Blob | string, name)` returns `{ cancelled?, bytes? }` for **all three** exports (a string is the JSON backup and goes through `exportBackup` without base64; the browser path returns the Blob size). `DataBackup.runExport` shows: success `<text> (12.4 KB)` (JSON: `Backup saved. (12.4 KB) Pictures are not included...`); nothing on cancel; the red error on failure, with the native detail appended on the APK. **A success without a byte count is a bug:** `saveLocalFile` throws `The export finished without a byte count.` and the red error is shown. An empty file is refused before anything is sent.

**Narrowing the window.** The bytes are staged before the picker opens, so nothing has to be computed after Android created the document; the native write runs on a dedicated background thread, reads the staged file into memory and writes once. **Not changed:** `exportDataJson()` still serialises the whole journal on the WebView main thread (it lives in `AppContext.tsx`); only the JSON text is handed over, no base64 is made for it.

**Visible behaviour:** saved: `Backup saved. (12.4 KB) ...`; cancel: nothing; forced failure: red error and no 0 B file (or the red error says the empty file could not be removed); killed or restarted mid-picker: the file is finished on the next start (toast, then the message in Settings).

**Bridge contract (`src/utils/android.ts`):** `exportBackup({ json, filename? })` and `exportFile({ base64, filename, kind: 'json' | 'zip' | 'txt' | 'xlsx' | 'pdf' })` resolve `{ cancelled?, bytes? }`; `takeLastExport()` resolves `{ exports?: NativeExportRecord[] }` (`{ id, status: 'saved' | 'failed', filename?, bytes?, detail? }`); the `exportFinished` event has no payload. `src/utils/nativeExport.ts` wraps both so they never reject (an APK built before this round has neither).

**Rebuild the APK** (`node scripts/prepare-android.mjs && npx cap open android`); the web part alone does not fix it. No new permission or package; new private data: `filesDir/exports/` and the SharedPreferences keys of `journal_export` (see [storage-and-privacy.md](storage-and-privacy.md)).

**Tests:**

- `android/app/src/test/java/com/kcalsync/app/ExportStoreTest.java` (+ `StubDocumentsProvider.java`): **Robolectric** test of the real copy loop through the real `ContentResolver` against a stub `ContentProvider`: staging in `filesDir`; one write open in mode `wt` plus one read-back (round 3: `wt` refused > `w` fallback); the first open fails with the document deleted and a second fresh document succeeds with the exact byte count; `deleteDocument` denied is reported and retried on the next start; a provider that serves fewer bytes than written is a failure (round 3: the document is kept, not deleted); two exports in a row do not delete each other; process death between picker and write is finished by `recover()`; a staged file that vanished is reported and the target is never opened; an open picker is kept until stale; legacy cache files are removed. Run: `cd android && ./gradlew :app:testDebugUnitTest` (after `npx cap sync android`; needs JDK 21 and about 1.5 GB of free memory).
- `tests/backup-android.test.tsx`: the APK path with the plugin mocked. This file alone can not prove the Java, that is what `ExportStoreTest` is for. It now covers JSON, **Excel and pictures** (file name, kind, non-empty payload, size shown, nothing on cancel, red error with the native detail, a success without bytes is an error) and the recovered-export messages.

**Device acceptance** (see [verification.md](verification.md)): export JSON, Excel and pictures to Downloads and to Drive: each file non-zero and `Backup saved. (<size>)` shown; cancel shows nothing; a forced failure shows the red error and leaves no 0 B file; repeat with the app backgrounded while the picker is open, and after killing the app mid-picker: the orphaned 0 B document must not survive.

## Round 3: the false failure on Downloads and the deleted good file

**Symptom:** exporting to **Downloads** showed an error and left no file. The write had succeeded (`written == data.length`, stream closed cleanly); then verification failed and cleanup deleted the complete document **and** its staged copy: two copies lost.

**Cause (`ExportStore.java`).** `verifySize()` asked `OpenableColumns.SIZE`, got `0`, retried twice (2 x 60 ms) and threw; `complete()` then called `discard(target)` (deleted the complete file) and `forget(id)` (deleted the staged copy). `com.android.providers.downloads.documents` is MediaStore-backed: `SIZE` is cached metadata, not a measure of a descriptor that was written through, and it reports `0` for complete files. **It is never proof of a write.**

**Fix (three edits, `ExportStore.java` only):**

| Edit | Before | Now |
| --- | --- | --- |
| Verification (`write`, `readBack`) | `verifySize()` + `querySize()` compared the provider's `SIZE` | `readBack()` opens the document with `openInputStream`, compares **every byte** with the staged bytes and rejects a shorter, longer or different document. If the read-back stream cannot be opened (write-only grant, provider that cannot be read) it is logged and the write is accepted; `SIZE` is never a fallback |
| Cleanup (`complete`) | any failure deleted the document | a failure **after bytes reached the document** (`ExportException.wroteBytes`) leaves it in place. Otherwise `documentIsEmpty()` must find an explicit `SIZE == 0` before `discard()`; a non-empty or unknown document is left (`[the document was left in place: it is not empty]`). The decision never relies on `SIZE` for a document that was written to |
| Staged copy (`keepStaged`) | `forget(id)` on every failure | a failure after bytes were written **keeps** the staged file and record so a retry is possible; the picker target is cleared from the record so `recover()` does not rewrite the same document on every start, and the record is dropped as stale after 24 h like any unfinished export. Failures before any byte was written still `forget(id)` (the empty document is removed, as in round 2) |

**Open-mode fallback (back, narrowly).** `openForWrite()` opens with `"wt"`; on a `FileNotFoundException` at the open it retries once with `"w"` (some cloud providers refuse `"wt"`). This is safe because a failed open truncates nothing. Round 2 removed a *write-loop* retry that retried after partial writes; this one only covers the open. `WRITE_MODE` (`"wt"`) is unchanged.

**Not touched:** staging (`filesDir/exports`, records, `recover()`), `WRITE_MODE`, delivery / `takeLastExport` / toast, and everything in `src/`.

**Tests (`ExportStoreTest`, `StubDocumentsProvider`, Robolectric; 20 tests):** (a) the provider accepts `wt`, serves the bytes back and reports `SIZE = 0` > `SAVED`, nothing deleted, staged file gone; (b) the provider serves only half the bytes > `FAILED`, the document is **not** deleted, the staged file and record are kept, `recover()` neither rewrites nor deletes; (c) `wt` is refused, `w` works > `SAVED` (opens: `wt`, `w`, `r`); also a non-empty document is never deleted when the open fails, and a document that cannot be read back is accepted without using `SIZE`. The stub gained `failModes` (modes whose open throws) and `serveOnlyFirst` (a provider that lost data). The two tests that forced a failed open now use `failOpens = 2` because there is a second open attempt. `tests/backup-android.test.tsx` mocks the plugin and cannot catch this.

**Device acceptance:** export JSON, Excel and pictures to **Downloads**, **Google Drive** and a **custom folder**: each file non-zero, the size shown, no leftover 0 B file or duplicate. `adb logcat -s KakcalExport` shows `saved <n> bytes` (and `trying mode w` when a provider refused `wt`). **Rebuild the APK**; no web, permission or package change.

## Save or share? (WhatsApp, email, Drive...)

Every export of Settings > Data Backup (*Export JSON*, *Export PDF report*, *Export to Excel*, *Export meal pictures*) first **builds the file**, then asks **Save or share?** (`SaveOrShareModal`, file name + size): *Share…* hands it to the system share sheet, *Save to device* is the unchanged save path above. Closing the question does nothing. The question is only asked when sharing is possible; otherwise the file is saved directly as before.

- **APK:** always offered. `JournalDevice.shareFile({ text | base64, filename, kind })` writes `cacheDir/shared/<filename>` (verified length; copies older than an hour are removed on the next share), exposes it through the existing `${applicationId}.fileprovider` (`cache-path` in `res/xml/file_paths.xml`), and starts `Intent.createChooser(ACTION_SEND)` with `EXTRA_STREAM`, `ClipData` and a read grant. It resolves `{ bytes }` once the chooser is open (Android does not report which app was picked). The JSON backup goes as `text` (no base64). An APK built before this change rejects (`not implemented`): the red error says to update the app. No new permission.
- **Browser / PWA:** offered when `navigator.canShare({ files: [file] })` accepts the typed `File`. Safari (iPhone, Mac) accepts every type; Chrome / Edge accept `.pdf` but refuse `.xlsx`, `.zip` and `.json`, which are then saved directly. `navigator.share` is reached from the *Share…* tap without an earlier `await` (the file already exists), so the user gesture is kept. Closing the sheet (`AbortError`) shows nothing.
- **Messages:** success `Sent to the share menu: <name>. (12.4 KB)`; failure is the red error with the detail. Same `runExport` grammar as saving.
- **Code:** `planSharing.ts` `canShareFile`, `shareLocalFile` (next to `saveLocalFile`); `DataBackup.tsx` `offerFile` / `savePending` / `sharePending`; `modals/SaveOrShareModal.tsx`; `JournalDevicePlugin.java` `shareFile`. **Tests:** `tests/share-export.test.ts` (browser path), `tests/backup-android.test.tsx` (APK share + "Save to device" in every export test).
- **By hand (APK):** each of the four exports > *Share…* > WhatsApp: the file arrives with its name and opens. Repeat with Gmail and Drive. *Save to device* still writes a non-zero file.

## Code

- `src/utils/backupFormat.ts`: version constants, `isSupportedBackup`, picture notes (`journalWithoutPictures`, `readPhotoNotes`, `mergePictureNotes`), preferences, `ImportReport` (`getLastImportReport`).
- `src/utils/journalStore.ts`: `exportMealJournalForBackup()` (now synchronous, no pictures), `prepareMealJournalImport()` (old pictures to blobs first; version 2 notes merged).
- `src/context/AppContext.tsx`: `exportDataJson`, `importDataJson` (the `Promise` types are unchanged).
- `src/utils/amountMemory.ts`: `exportLastAmounts`, `importLastAmounts`. `src/utils/plannerDraft.ts`: `parsePlannerDraft` (validation shared by the stored draft and the backup).
- `src/components/common/DataBackup.tsx`: the notice, the confirmation, the messages; `runExport` (one path and one grammar for the three exports), the recovered-export message.
- `android/app/src/main/java/com/kcalsync/app/ExportStore.java`: staging, records, write + verify, cleanup, recovery. `JournalDevicePlugin.java`: `exportBackup`, `exportFile`, `takeLastExport`, `deliver`. `MainActivity.java`: the picker launcher, the result handler and `recover()` on every start. `src/utils/android.ts`: the typed bridge; `src/utils/nativeExport.ts`: `takeNativeExports`, `onNativeExportFinished`; `src/utils/planSharing.ts`: `saveLocalFile`, `withSize`.
- `tests/backup-ui.test.tsx`: the notice, the confirmation (nothing exported before the user confirms) and that the downloaded file has no picture data.
- `tests/backup-android.test.tsx`: the Android export path (JSON, Excel, pictures, recovered exports). `ExportStoreTest.java`: the native copy loop (Robolectric).
- `tests/backup.test.tsx`: contents, no picture data in the file, round trip to an empty device and onto a device that still has the picture, old `1.2` import, refusal of a newer file.

No new permission or remote API. Android adds private export staging (`filesDir/exports`) and the `journal_export` SharedPreferences records; `android/app/build.gradle` gets Robolectric test dependencies only.

## Verifying by hand

1. Settings > Data Backup shows the amber notice. With a saved picture, *Export* asks for confirmation first.
2. Open the downloaded `kakcal_backup_<date>.json`: `"version": "2.0"`, `"picturesIncluded": false`, no `data:image` text, `mealJournal.photos` is `[]`.
3. Delete all data, import the file: meals, recipes, plans, shopping lists, favourites and settings are back; the message mentions the pictures.
