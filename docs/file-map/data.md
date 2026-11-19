# File map: `src/data/` and `src/config/`

> **Scope:** Food, activity and demo data, the OFF catalogue reader, demo switch.
>
> **Read when:** you need to know which file implements something in this area (open only this file, not the others).
>
> **Related:** [file map index](README.md)

| File or directory | Role |
| --- | --- |
| `src/data/verifiedFoods.ts`, `extraFoods.ts` | Curated products and the additional multilingual food catalog. |
| `src/data/referenceFoods.ts`, `usdaFoodRows.ts`, `foodCategories.ts` | Source-linked additions (recipes also keep `recipeIngredients`), generated USDA nutrient rows, and shared food categories. |
| `src/data/offCatalog.ts`, `src/utils/useOffCatalog.ts` | Zero-copy reader, word-prefix search, barcode lookup, `catalogueScore` ranking and lazy loading; the React hook that loads it while a food search is open. |
| `src/data/activities.ts` | **Activities database** (181 entries from the 2024 Compendium of Physical Activities): MET, Compendium code, EN/IT names, categories and lookup helpers. |
| `src/data/samplePreBuiltMeals.ts` | Empty production saved-meal list used when demo mode is disabled. |
| `src/config/demo.ts`, `src/data/demoData.ts` | Single demo-mode switch (on only inside the tour's storage sandbox or with `VITE_DEMO_DATA=true`; normal use starts empty) and removable sample journal, period logs, custom trackers, meals and recipes. |
| `src/config/install.ts` | `APK_URL` (default: latest GitHub release asset `Kakcalculator.apk`, override `VITE_APK_URL`) and `RELEASES_URL` for the install guide. |
