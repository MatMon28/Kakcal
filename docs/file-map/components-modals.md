# File map: `src/components/modals/`

> **Scope:** All dialogs: add food, activity, water, weight, poop, settings, profile, notifications, period sheet.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/components/modals/NotificationSettings.tsx` | Settings > Notifications: water interval and hours, one switch + time per meal, custom buttons, weight and log reminders, permission banner and test button. Can be opened remotely by the tour (`requestOpenNotificationSettings`). |
| `src/components/modals/AddFoodModal.tsx`, `CustomFoodModal.tsx`, `BarcodeLookupModal.tsx` | Food logging (catalogue search rows with weight and macros, default weight), custom food creation, and barcode lookup (own foods, then the offline catalogue, then Open Food Facts online; keeps sugar and the classic portion). |
| `src/components/modals/LogActivityModal.tsx` | Activity dialog: Walk / Run / Other / Custom, duration step and live energy estimate for database activities. |
| `src/components/modals/ActivitySearch.tsx` | Activity → Other search page: saved custom activities first, fuzzy search, category chips (incl. My activities), favourites pinned first. |
| `src/components/modals/WaterModal.tsx`, `WeightModal.tsx`, `PoopModal.tsx` | Hydration, weight, and bowel logging. |
| `src/components/modals/CustomButtonModal.tsx`, `CustomPickerModal.tsx` | Individual quantity/toggle tracker dialog, entry history, and tracker selection. |
| `src/components/modals/PeriodSheet.tsx`, `UserProfileModal.tsx`, `SettingsModal.tsx` | Period Quick Log, Profile/BMR fields, and app Settings including the Ultra Minimal toggle. |
| `src/components/modals/AdvancedSettings.tsx` | Settings > Advanced group: goals/limits switches (per item, objective/limit, value) and the Body measurements switch, plus the **Advanced layout** switch with the *Restore original layout* button (confirmation dialog). |
| `src/components/modals/BodyMeasuresProfile.tsx` | Profile section (only when Body measurements is on): choose tracked measures, add/remove custom ones. |
