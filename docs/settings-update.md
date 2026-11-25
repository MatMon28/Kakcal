# Settings restructure round (Today, Custom page, Pages, Delete data)

> **Scope:** the Settings modal: how it is split into groups, which switch lives where, the hidden-page and hidden-field settings, the per-category delete rows, and the removal of the test notification.
>
> **Read when:** you change a Settings group, add a switch, hide or show a page / Custom section / Custom button, or add a delete row.
>
> **Related:** [journal-pages.md](journal-pages.md), [storage-and-privacy.md](storage-and-privacy.md), [backup-update.md](backup-update.md), [notifications.md](notifications.md), [file-map/components-modals.md](file-map/components-modals.md)

## What changed (user view)

Settings has one collapsible group per area. Every group has its own colour badge and icon, and every sub-section uses the same heading and the same switch / action rows.

| Group (order) | Badge | Contents |
| --- | --- | --- |
| Language | sky | English / Italiano |
| Appearance | lilac | Theme, widget style, style presets (+ Mono hue), Ultra minimal |
| **Today** | butter | **Quick-add buttons** (Food, Movement, Weight, Custom) -> **Tracking** (Log water, Log poop, Track sugar) -> **Meal notes** (Meal notes in Today) -> **Quick food shortcuts** -> **Custom buttons** (list, add / edit, widget switch; moved here from the old group) |
| **Custom page** | mint | **Features** (Photo diary) -> **Quick buttons** (New meal, New recipe, New food, Plan meals, Photo diary button) -> **Sections** (Meal diary, Meals, Recipes, Meal planner, Shopping lists, Photo diary, Foods) |
| **Pages** | peach | **Pages**: Today (always shown), Custom, Statistics, Track period, Body measurements. Body on = a *body profile* shortcut appears under the list |
| Advanced | sand | Goals & limits, Advanced layout (body measurements moved to Pages) |
| Notifications | rose | Reminders as before; **the *Send a test notification* button is removed** |
| Data backup | slate | unchanged |
| Install app | teal | unchanged (browser only) |
| **Delete data** | red | One row per kind of record (13 rows in 4 sub-sections), each with a confirmation; **Delete all data** stays at the bottom with its two confirmations |

Rules that matter:

- Every switch in Custom page and Pages reads **on = shown**. Stored values are inverted where the key is a "hide" flag (`hideCustomButtons`, `hideCustomFields`, `hideCustomPage`, `hideStatisticsPage`; `hidePeriod` and `hidePoop` already were).
- A page that is hidden (or switched off) while it is open sends the user back to Today. Hidden pages leave the bottom bar, and the swipe order (`src/App.tsx` `visibleTabs`).
- **Log water** is the existing `quickAdd.water` flag (it drives the water card and the dock button). **Log poop** sets `hidePoop` and `quickAdd.poop` together, so turning it on restores the dock button.
- Hiding a Custom section or button only hides it. No data is deleted.
- **Delete data** never touches settings (custom buttons, quick foods, reminder times, theme, goals). After a deletion the page reloads so every screen reads the stored data again.

## New settings keys (`kcalsync_settings`)

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `hideCustomPage` | boolean | `false` | Custom page hidden (Settings > Pages) |
| `hideStatisticsPage` | boolean | `false` | Statistics page hidden (Settings > Pages) |
| `hideCustomButtons` | `{ meal?, recipe?, food? }` | `{}` | Hidden creation buttons of the Custom bottom bar |
| `hideCustomFields` | `Partial<Record<CustomFieldId, boolean>>` | `{}` | Hidden Custom sections: `diary`, `meals`, `recipes`, `planner`, `shopping`, `photos`, `foods` |

Existing keys are unchanged (`quickAdd`, `hidePoop`, `trackSugar`, `inlineMealNotes`, `photoDiary`, `showPlannerButton`, `showPhotoButton`, `hidePeriod`, `customButtons`, `widgetCustomButton`). The advanced body switch is still `kcalsync_advanced` > `body.enabled`; only its switch moved to Pages. The four new keys are part of the settings object, so the JSON backup already carries them (settings are exported whole); a backup without them loads with the defaults above.

## Delete rows (`src/utils/deleteData.ts`)

`deleteCategory(category, allDayLogs)` flushes the write queue, changes only the records of that category, and resolves. The UI (`DeleteDataSettings.tsx`) asks with `ConfirmDialog` first, then reloads.

| Row | What is removed |
| --- | --- |
| All meal plans | `plans`, `planGroups`, `shoppingLists` in `kcalsync_meal_journal`; `kcak_planner_draft` |
| All saved meals | `kcalsync_prebuilt_meals` (logged food is kept) |
| All recipes | foods with `isRecipe` in `kcalsync_custom_foods` (ordinary own foods stay) |
| All photos | `photos` in the meal journal and every blob in the IndexedDB `photos` store |
| All meal notes | the `note` of each meal memory (other fields of the memory are kept) |
| All logged food | every meal slot of every day (`replaceAllDays`) |
| All activities | `activities` of every day |
| All water | `waterEntries` and legacy `waterMl` of every day |
| All weight | `weightKg` of every day |
| All poop records | `poops` of every day |
| All custom tracker entries | `custom` and `customEntries` of every day (the buttons stay) |
| All body measurements | `kcalsync_body` |
| All period records | `logs` of `kf_period_data` (cycle settings stay) |

Delete all data is unchanged: `src/components/common/DeleteAllData.tsx` and `src/utils/deleteAllData.ts`.

## Removed

- The **Send a test notification** button, `sendTestNotification()` in `src/utils/notifications.ts`, and its strings (`test`, `testTitle`, `testBody`) in both translation files. The tour text no longer mentions it.
- The `Today & pages` group and its strings (`todayAndPages`).
- The body-measurements switch and profile shortcut inside Advanced (moved to Pages).

## File roles

| File | Role |
| --- | --- |
| `src/components/modals/SettingsModal.tsx` | Composes the groups in the order above; keeps Language and Appearance inline |
| `src/components/modals/settings/SettingsParts.tsx` | `TONE` badge colours, `SubSection`, `ToggleRow`, `ActionRow`, `SwitchVisual` |
| `src/components/modals/settings/TodaySettings.tsx` | Today group, including the quick-food picker |
| `src/components/modals/settings/CustomButtonsSettings.tsx` | Custom buttons list / form / widget switch (inside Today) |
| `src/components/modals/settings/CustomPageSettings.tsx` | Custom page group |
| `src/components/modals/settings/PagesSettings.tsx` | Pages group (hide switches, body profile shortcut) |
| `src/components/modals/settings/DeleteDataSettings.tsx` | Delete data group |
| `src/components/common/Collapsible.tsx` | Group header now takes an `icon` and a `tone` (badge) |
| `src/utils/pageVisibility.ts` | `isPageHiddenBySettings(tab, settings)` |
| `src/utils/deleteData.ts` | The per-category deletes |
| `src/components/prebuilt/PreBuiltMealsView.tsx` | Hides Custom sections and creation buttons from the settings |
| `src/App.tsx`, `src/components/common/Tabs.tsx`, `src/context/AppContext.tsx` | Hidden pages in navigation, fallback to Today, defaults and loading of the new keys |

## Verification

`npm run typecheck`, `npm run lint` (0 errors; the 10 warnings were already there), `npm test` (86 passed), `npm run build` all pass. `scripts/verify-interaction-update.mjs` now opens the **Today** group instead of a *Custom buttons* button.

**Not verified in a browser in this round:** the visual result on a phone, every theme, the delete flows on Android (IndexedDB photo clear and the reload). Check these by hand before a release.
