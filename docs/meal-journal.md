# Meal planning and diaries

## Interaction Update

- Recipe and Foods headers no longer show descriptive text. Foods keeps a search shortcut while collapsed.
- See all meals uses a high-contrast surface. Log today targets the actual current date rather than the browsed day.
- Different for each remembers the last food/note mode for unfilled meals, without copying text or overriding existing entries.
- Review builds open Custom directly and enable photos/notes for missing settings. Normal builds retain their empty-journal defaults.

> **Scope:** meal plans, meal memories, photographs, and their Today / Custom integration.
>
> **Read when:** changing a planner or diary workflow.
>
> **Related:** journal-pages.md, storage-and-privacy.md, file-map/components-pages.md

## Meal planner

Use the share icon to share this week/all plans by self-contained link, or import a received link/text export after preview and optional start-date adjustment. Large bundles have a readable text fallback. No server or third-party API is involved; anyone with the link can read the included meals/notes. Details: interaction-update.md.

- Custom contains a blue planner immediately below Recipes. It uses the same blue as Today's carbs in Classic; other styles inherit their existing shapes, ink, borders and surfaces.
- The section header is the shared `LibrarySectionHeader` (icon circle, title + count, search, +, chevron), exactly like Meals / Recipes / Foods. Its search icon filters all planned meals by name, note, food or meal (results list the date); the open/closed state is remembered (`kcak_journal_blue_open`).
- Select a starting date, 1-90 days, and only the meal slots to plan (3-column meal chips, as in Foods > Log). Both built-in and advanced-layout meal slots are supported.
- **Same meal for all / Different for each:** as soon as more than one day/meal is selected a two-option switch appears. *Same for all* shows one food/note editor applied to every selected day and meal. *Different for each* lists every day + meal as a row (`Tue 24 Nov · Lunch`, with the chosen meal or *Choose a meal*): tap a row, pick a meal below with the same search/amount editor, tap the next row (or **Next meal**, which jumps to the next empty one). Switching to *Different for each* pre-fills every row with the meal already chosen for all, so only the exceptions need changing. A counter shows *n of N meals chosen*; Save is enabled once every row has a meal, and saves one independent plan per row. Editing an existing plan works the same way.
- Choose saved meals, recipes or individual foods with editable gram/ml amounts, or write a free-form food note. Planning never logs calories.
- The week strip selects a date; a plan can be reopened, edited or deleted. Each repeated date/slot gets an independent plan.
- Week dates have full localized accessible labels and a selected state, not just ambiguous single-letter weekday labels.
- Expanded Today meals show unread plan notes first, with a reversible read acknowledgement. Specific foods can be logged in one action.
- Log food offers plans for its selected date and slot. Plans join the existing food batch and are marked logged only after the batch is committed.
- Food snapshots keep a plan usable if the source food or recipe is later removed.

## Meal diary

- The yellow Meal diary is the first Custom field. Its icon is a notebook-with-pen (the same icon marks diary notes in Today and in Settings; the open book stays reserved for Foods). The header has the shared Search and + style icon buttons plus a Filter icon, and an All / Favorites chip row (same chips as the Foods categories) sits under it. It derives meals from existing day logs rather than copying nutrition data.
- The header search icon opens the same inline search field as Meals / Recipes; **See all meals** opens the full browser with every filter.
- Search matches the meal-slot name, ingredient names and saved notes. Filters cover date range, weekday, meal slot, favourites, calorie range, and a selected nutrient's gram range (carbs, protein, fat, fibre, salt or sugar).
- Ingredient searches also follow the stored recipe ingredient links, including nested recipes, with cycle protection. If a source recipe has been removed, the original logged food name and nutrition still remain searchable/usable.
- Stars are per date/meal, independent of food favourites. Open a meal to inspect ingredients, save a note, or log its food again on the actual current date.
- Settings > Today & pages > Meal notes in Today enables a diary icon in meal fields and a note input while logging. Turning it off keeps saved notes and favourites intact.
- Empty meals with saved notes remain discoverable. Long result lists have a Show more action.

## Photo diary (opt-in)

- The Photo diary header is the shared one too: search icon (inline note search over the previews), + (add a photo) and count; **See all photos** opens the full gallery.
- Enable Photo diary in Settings > Today & pages. When off, every photo field, attachment and camera action is hidden without deleting stored photos.
- A meal's camera action opens the device camera on mobile, or a permission-based live camera on desktop. Choosing an existing image works as a fallback. Camera tracks stop when closing or capturing.
- A blank note becomes `Meal, date`. Photos appear above logged foods in their matching Today meal. The red Custom field opens a searchable full gallery, with meal/date filters, full-size viewing, editable notes and confirmed deletion.
- Meals and recipes have an Add a photo action; attachments are linked by their stable record id and are also available in the gallery.
- Saved-meal and recipe attachments prefill `Meal/recipe name, date`; clearing that note uses the same meal-slot/date fallback as other photos.
- The attachment action lives inside each saved meal/recipe's expanded details to keep the collapsed library uncluttered.
- Imported photos are decoded and resized to at most 1200 px, re-encoded as JPEG (also strips EXIF/location metadata), and saved locally. Inputs are limited to 25 MB. Unsupported images and storage quota errors have explicit messages.
- Photos share the browser's localStorage quota with the journal. Export backups regularly; the gallery allows deleting older photos. No photo is uploaded or sent to a server.

## Consistency with the rest of Custom

- All three journal sections render through `JournalSection` -> `LibrarySectionHeader` (`src/components/common/LibrarySectionHeader.tsx`, extracted from `PreBuiltMealsView.tsx`), with the same radius (24 px), padding, title/count/summary, transparent circle buttons, inline search and ultra-minimal behaviour as Meals, Recipes and Foods. The old footers ("A journal, not a judgement", "n planned this week") were removed; the only footer left is a full-width *See all* secondary button.
- Search fields (`.journal-search`), chips (`JournalChip`), meal chips, segmented switch, secondary and primary buttons copy the app's `rounded-2xl` fields, Foods category chips, Foods > Log meal chips and `kc-primary-btn` styling (green in Classic, theme intake colours in the other styles).

## Today-style meals (match round)

- **One meal look.** The colourless slot icon of Today (`mealSlotIcon` in `common/mealSlotIcon.tsx`: coffee, apple, utensils, sun, crossed utensils, moon, soup for added meal types) is used by Today, the Meal diary and the Meal planner. The old tinted diary icon squares are gone.
- **Previews.** A diary preview or planner row shows date, meal name and, *only if a note was written*, the note underneath (no food list; nothing otherwise). Plan rows show the plan's note the same way.
- **Detail views.** Pressing a diary meal or a planned meal opens the shared read-only `MealSummaryCard` (`journal/MealSummaryCard.tsx`): the Today meal field expanded, with icon, name, kcal, carbs / protein / fat pills, fibre / salt / sugar and every food with its own macros. The diary detail adds the note editor, favourite star, *Log today* and *Save note*; the plan detail adds the plan note, a delete icon, *Edit* (opens the editor) and *Add to this meal*.
- **Filters.** The Reset control of the diary filter interface is an icon (`RotateCcw`, label *Reset filters*).
- **Today.** The *+ Log Food* row at the bottom of an empty meal is removed (the header **+**, the dock and Foods already log). In Compact, the note and photo icons are part of the header bar: shown next to **+** when they fit, otherwise only once the meal is expanded (no separate row inside the field). The fit is measured by `useExtrasFit` in `MealSlotCard.tsx`.

## Implementation files

The existing mobile header, swipe navigation and creation dock are retained. At 1100 px and wider, a quiet sidebar / breadcrumb header replaces the mobile header; Custom uses two columns with the diary first, Meals / Recipes next, and Planner / Photo diary beneath. The Custom page has no title block, tagline or *Create new* menu any more: it starts directly with the Meal diary, and every field creates through its own **+** (and the mobile dock). Theme colours, fonts, geometry and reduced-motion preferences are respected.

The Custom creation dock is hidden on desktop only (including its portal); Today and the mobile dock are unaffected. Classic's two dark appearances use dark neutral inner diary/search rows, while keeping the established pastel section headers.

Desktop fields align at their own content height rather than stretching a short saved-meal field into an empty panel when a neighboring recipe is expanded. Journal text uses the existing app's compact type scale, with readable labels in light and dark appearances.

| File | Role |
| --- | --- |
| `src/types/journal.ts` | Versioned plan, photo and meal-memory contracts. |
| `src/utils/journalStore.ts` | Reactive local-first persistence, normalization, cross-tab updates and backup helpers. |
| `src/i18n/journal.ts` | English/Italian copy selector for the journal additions. |
| `src/components/journal/JournalUI.tsx` | Shared themed section (built on `LibrarySectionHeader`), header icon button, filter chip, search field, empty state and date formatter. |
| `src/components/journal/MealSummaryCard.tsx` | Read-only Today-style meal card shared by the diary and planner detail views. |
| `src/components/journal/MealPlanner.tsx` | Week browser with plan search, the plan editor (same-for-all / different-for-each, `EntryEditor`) and Today / food-batch suggestions. |
| `src/components/common/LibrarySectionHeader.tsx` | The collapsible section header shared by Meals, Recipes, Foods and the journal sections. |
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
Photo composer: clickable calendar icon with the date below it, next to a meal select that shows only the chosen meal; Save photo sits in the pop-up footer. The gallery has full-width search and date fields, no Add photo button, and the viewer has a Go to the meal button. See [custom-photo-share-update.md](custom-photo-share-update.md).
