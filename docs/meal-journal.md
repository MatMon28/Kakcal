# Meal planning and diaries

> **Scope:** meal plans, meal memories, photographs, and their Today / Custom integration.
>
> **Read when:** changing a planner or diary workflow.
>
> **Related:** journal-pages.md, storage-and-privacy.md, file-map/components-pages.md

## Meal planner

- Custom contains a blue planner immediately below Recipes. It uses the same blue as Today's carbs in Classic; other styles inherit their existing shapes, ink, borders and surfaces.
- Select a starting date, 1-90 days, and only the meal slots to plan. Both built-in and advanced-layout meal slots are supported.
- Choose saved meals, recipes or individual foods with editable gram/ml amounts, or write a free-form food note. Planning never logs calories.
- The week strip selects a date; a plan can be reopened, edited or deleted. Each repeated date/slot gets an independent plan.
- Week dates have full localized accessible labels and a selected state, not just ambiguous single-letter weekday labels.
- Expanded Today meals show unread plan notes first, with a reversible read acknowledgement. Specific foods can be logged in one action.
- Log food offers plans for its selected date and slot. Plans join the existing food batch and are marked logged only after the batch is committed.
- Food snapshots keep a plan usable if the source food or recipe is later removed.

## Meal diary

- The yellow Meal diary is the first Custom field, with Search and Filter icons. It derives meals from existing day logs rather than copying nutrition data.
- Search matches the meal-slot name, ingredient names and saved notes. Filters cover date range, weekday, meal slot, favourites, calorie range, and a selected nutrient's gram range (carbs, protein, fat, fibre, salt or sugar).
- Ingredient searches also follow the stored recipe ingredient links, including nested recipes, with cycle protection. If a source recipe has been removed, the original logged food name and nutrition still remain searchable/usable.
- Stars are per date/meal, independent of food favourites. Open a meal to inspect ingredients, save a note, or log its food again on the selected Today date.
- Settings > Today & pages > Meal notes in Today enables a diary icon in meal fields and a note input while logging. Turning it off keeps saved notes and favourites intact.
- Empty meals with saved notes remain discoverable. Long result lists have a Show more action.

## Photo diary (opt-in)

- Enable Photo diary in Settings > Today & pages. When off, every photo field, attachment and camera action is hidden without deleting stored photos.
- A meal's camera action opens the device camera on mobile, or a permission-based live camera on desktop. Choosing an existing image works as a fallback. Camera tracks stop when closing or capturing.
- A blank note becomes `Meal, date`. Photos appear above logged foods in their matching Today meal. The red Custom field opens a searchable full gallery, with meal/date filters, full-size viewing, editable notes and confirmed deletion.
- Meals and recipes have an Add a photo action; attachments are linked by their stable record id and are also available in the gallery.
- Saved-meal and recipe attachments prefill `Meal/recipe name, date`; clearing that note uses the same meal-slot/date fallback as other photos.
- The attachment action lives inside each saved meal/recipe's expanded details to keep the collapsed library uncluttered.
- Imported photos are decoded and resized to at most 1200 px, re-encoded as JPEG (also strips EXIF/location metadata), and saved locally. Inputs are limited to 25 MB. Unsupported images and storage quota errors have explicit messages.
- Photos share the browser's localStorage quota with the journal. Export backups regularly; the gallery allows deleting older photos. No photo is uploaded or sent to a server.

## Implementation files

The existing mobile header, swipe navigation and creation dock are retained. At 1100 px and wider, a quiet sidebar / breadcrumb header replaces the mobile header; Custom uses two columns with the diary first, Meals / Recipes next, and Planner / Photo diary beneath. A Create new menu opens the existing editors. Theme colours, fonts, geometry and reduced-motion preferences are respected.

The Custom creation dock is hidden on desktop only (including its portal); Today and the mobile dock are unaffected. Classic's two dark appearances use dark neutral inner diary/search rows, while keeping the established pastel section headers.

Desktop fields align at their own content height rather than stretching a short saved-meal field into an empty panel when a neighboring recipe is expanded. Journal text uses the existing app's compact type scale, with readable labels in light and dark appearances.

| File | Role |
| --- | --- |
| `src/types/journal.ts` | Versioned plan, photo and meal-memory contracts. |
| `src/utils/journalStore.ts` | Reactive local-first persistence, normalization, cross-tab updates and backup helpers. |
| `src/i18n/journal.ts` | English/Italian copy selector for the journal additions. |
| `src/components/journal/JournalUI.tsx` | Shared accessible themed section, search, empty state and date formatter. |
| `src/components/journal/MealPlanner.tsx` | Week browser, repeat-range editor and Today / food-batch suggestions. |
| `src/components/journal/MealDiary.tsx` | Searchable/filterable meal history, favourites, notes, detail dialog and inline Today/logging controls. |
| `src/components/journal/PhotoDiary.tsx` | Camera/import composer, searchable gallery, lightbox, saved-meal/recipe attachments and Today photos. |
| `src/components/journal/JournalChrome.tsx` | Responsive desktop navigation, help, existing Settings/Profile entry points and Custom heading/create menu. |
| `src/components/journal/journal.css` | Responsive journal additions, theme-token overrides, accessible interaction states and reduced-motion-aware entrances/accordions/photo hover. |

The store persists before publishing; storage errors are not reported as successful saves. The new key is `kcalsync_meal_journal`. No backend or account is involved.

## Verification and limits

- Verified with `npm run build`, strict `npx tsc --noEmit`, and 19 browser interaction checks covering multi-day/partial-slot plans, read acknowledgements, direct and batch logging, diary search/filter/favourites/notes, linked recipe photos, photo import/default naming/edit/delete, fake-camera capture, opt-in visibility, JSON export/import round-trip and legacy-backup preservation, reload persistence, empty-install defaults and quota/unsupported-file errors.
- All seven styles were exercised across Light, Lite Dark and Dark using persisted Settings and full reloads (21 combinations), with mobile viewport and overflow checks. English and Italian / Ultra minimal were checked down to 320 px. Existing mobile navigation remains available. Long localized page headings wrap rather than squeezing the creation action off a small screen.
- Desktop camera capture was tested with Chromium's fake camera, not physical hardware. Android builds, physical Android/iOS camera/file pickers and native permissions were not tested in this environment; verify those on your devices before releasing an APK.
- Photos are subject to localStorage capacity and included in unencrypted JSON backups. Export before clearing browser data or uninstalling. Imported backup data is normalized; old backups without the new section do not wipe it.