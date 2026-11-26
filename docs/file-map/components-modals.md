# File map: `src/components/modals/`

(Ingredient quantities round) `AddFoodModal.tsx`: the quick food shortcuts are drawn by `common/QuickFoodButtons.tsx`, shared with the ingredient picker of the meal and recipe builders (no visual change in Log food). See [ingredient-quantity-update.md](../ingredient-quantity-update.md).

(New features round) `AdvancedSettings.tsx`: protein basis switch (grams per day / per kg) and the *Intake / burned difference* row (deficit / surplus + kcal); `SettingsModal.tsx`: *Meal planner button* and *Photo diary button* switches. See [new-features-update.md](../new-features-update.md).

> **Scope:** All dialogs: add food, activity, water, weight, poop, settings, profile, notifications, period sheet.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/components/modals/NotificationSettings.tsx` | Settings > Notifications: water interval and hours, one switch + time per meal, custom buttons, weight and log reminders, permission banner and test button. Can be opened remotely by the tour (`requestOpenNotificationSettings`). |
| `src/components/modals/PdfExportModal.tsx` | Settings > Data Backup: week / month / custom range PDF report picker with toggles for the Daily log table and Detailed meal diary. |
| `src/components/modals/SaveOrShareModal.tsx` | "Save or share?" asked by `DataBackup.tsx` after an export file (JSON, PDF, Excel, pictures ZIP) is built, when sharing is possible: *Share…* (share sheet: WhatsApp, email, Drive) or *Save to device*. See [../backup-update.md](../backup-update.md#save-or-share-whatsapp-email-drive). |
| `src/components/modals/AddFoodModal.tsx`, `CustomFoodModal.tsx`, `BarcodeLookupModal.tsx` | Food logging (catalogue search rows with weight and macros, default weight), custom food creation, and barcode lookup (own foods, then the offline catalogue, then Open Food Facts online; keeps sugar and the classic portion). |
| `src/components/journal/MealDiary.tsx` | Meal-detail / note editor, complete meal-history filter dialog, and the optional note field shared with Add food. |
| (Plans round) `AddFoodModal.tsx` | Recent foods of the slot: 5 chips + a "..." chip for 10 more (`common/RecentChips.tsx`). |
| (Meal journal) `AddFoodModal.tsx`, `SettingsModal.tsx` | Planned-food suggestions join the existing batch; optional per-meal notes save on Log all. Today & pages adds opt-in Photo diary and Meal notes in Today switches. |
| `src/components/modals/LogActivityModal.tsx` | Activity dialog: Walk / Run / Other / Custom, duration step and live energy estimate for database activities. |
| `src/components/modals/ActivitySearch.tsx` | Activity → Other search page: saved custom activities first, fuzzy search, category chips (incl. My activities), favourites pinned first. |
| `src/components/modals/WaterModal.tsx`, `WeightModal.tsx`, `PoopModal.tsx` | Hydration, weight, and bowel logging. |
| `src/components/modals/CustomButtonModal.tsx`, `CustomPickerModal.tsx` | Individual quantity/toggle tracker dialog, entry history, and tracker selection. |
| `src/components/modals/PeriodSheet.tsx`, `UserProfileModal.tsx`, `SettingsModal.tsx` | Period Quick Log, Profile/BMR fields (with toggle between calculated BMR and personalised daily calorie burned), and app Settings including the Ultra Minimal toggle. |
| `src/components/modals/AdvancedSettings.tsx` | Settings > Advanced group: goals/limits switches (per item, objective/limit, value) and the Body measurements switch, plus the **Advanced layout** switch with the *Restore original layout* button (confirmation dialog). |
| `src/components/modals/BodyMeasuresProfile.tsx` | Profile section (only when Body measurements is on): choose tracked measures, add/remove custom ones. |
| (Save before closing) `src/components/modals/AddFoodModal.tsx` | `requestClose` asks through `SaveBeforeCloseDialog` when the batch has foods or a food is picked but not added; `handleLogNow` is the Save action. |

| (Round: Settings coherence; superseded by the settings restructure, see [settings-update.md](../settings-update.md)) `SettingsModal.tsx`, `AdvancedSettings.tsx` | Track poop / period / sugar switches, collapsible Quick add, greyed-out unavailable shortcuts, widget switch below custom buttons; Goal / Limit for nine items with a collapsible list. |
| (Round: left / right) `src/components/modals/BodyMeasuresProfile.tsx` | Tiles of paired measures carry a small L·R badge (tracking stays one switch per measure). |
| (Polish round) `SettingsModal.tsx` | Language is a collapsible group; the Foods database / browse button was removed; style presets show only their names; the quick-add food icon is `Utensils`. |
| (Polish round) `WaterModal.tsx`, `PoopModal.tsx`, `AdvancedSettings.tsx`, `AddFoodModal.tsx`, `ActivitySearch.tsx` | Water: stepper above the quick buttons, `250ml`, **Save water**; Poop: *(optional)* next to *Bristol type*; Goals & limits items indented under a guide line (`data-goals-subsections`); meal chips carry `data-slot-chip` (Angular chamfer) and the chip rows / result lists use `scrollFadeX` / `scrollFadeY`. |

SettingsModal delegates custom button icons to common/IconPicker.tsx. LayoutToolbar uses the same chooser for new and existing custom meal types.

(Search performance round) `AddFoodModal.tsx`, `SettingsModal.tsx`: local search through `searchFoods` / `searchMeals`, catalogue through `useCatalogueSearch` (worker), lists use `useDeferredValue`; Add food and the planner hold back "No results" while the catalogue answer is pending. `Modal.tsx` closes through `common/dialogExit.ts` (no cloned dialog). See [../search-and-animation-performance.md](../search-and-animation-performance.md).

## Settings restructure round

| File | Role |
| --- | --- |
| `src/components/modals/SettingsModal.tsx` | Settings modal: composes Language, Appearance, Today, Custom page, Pages, Advanced, Notifications, Backup, Install app and Delete data. See [settings-update.md](../settings-update.md). |
| `src/components/modals/settings/SettingsParts.tsx` | Shared Settings look: `TONE` badge colours, `SubSection`, `ToggleRow`, `ActionRow`, `SwitchVisual`. |
| `src/components/modals/settings/TodaySettings.tsx` | Today group: quick-add buttons, Log water / Log poop / Track sugar, Meal notes, quick food shortcuts (picker), Custom buttons. |
| `src/components/modals/settings/CustomButtonsSettings.tsx` | Custom buttons list, add / edit form and widget switch (inside Today). Moved unchanged from the old group. |
| `src/components/modals/settings/CustomPageSettings.tsx` | Custom page group: bottom-bar buttons and sections (including independent Photo diary button and section toggles). |
| `src/components/modals/settings/PagesSettings.tsx` | Pages group: show/hide and reorder pages (`pageOrder`), body profile shortcut. Reads the tab through `useNav()` and the setter through `useNavActions()` (not `useApp()`). |
| `src/components/modals/ExcelExportModal.tsx` | Excel export period (All time / 7d / 30d / 3m / 1y / Custom) and sheet selection dialog opened from `DataBackup.tsx`. |
| `src/components/modals/settings/DeleteDataSettings.tsx` | Delete data group: one confirmed row per kind of record, then *Delete all data*. |
| `src/components/modals/NotificationSettings.tsx` | Test notification button removed; group now has a bell icon and colour. |
| `src/components/modals/AdvancedSettings.tsx` | Body measurements switch moved to Pages; group has an icon. |

**Food workflow round:** `AddFoodModal.tsx` keeps the batch and picker mounted while scanner/custom food is open and uses a fixed footer. `BarcodeLookupModal.tsx` and `CustomFoodModal.tsx` work both standalone and as child selectors; `DeleteDataSettings.tsx` uses the bulk erasure countdown. See [food workflows](../food-workflows-update.md).
