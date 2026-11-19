# Bundled nutrition data (USDA and curated)

> **Scope:** USDA SR Legacy entries, the Van Hecke rice pie, how the bundled foods are regenerated.
>
> **Read when:** you touch `verifiedFoods.ts`, `extraFoods.ts`, `referenceFoods.ts`, `usdaFoodRows.ts` or `scripts/generate-usda-foods.py`.
>
> **Related:** data-off-catalogue.md, file-map/data.md

- **84 new reference entries** come from the [USDA FoodData Central SR Legacy release (April 2018)](https://fdc.nal.usda.gov/download-datasets/), including whole-milk and part-skim ricotta, legumes, grains, snacks, and prepared dishes. Each new entry links to its source. Carbohydrates follow the dataset's carbohydrate-by-difference value (including fiber); salt is calculated as sodium × 2.5, converted from mg to g.
- The [Bakkerij Van Hecke rice pie](https://bakkersonline.be/be-nl/vanhecke-ferrerlaan/product/92214/rijsttaart) uses the bakery's per-100-g product label. Values are specific to that product, not a universal estimate for homemade rice pie.
- The source-backed data is bundled with the app and is separate from the original catalog (whose generated "boiled / grilled / oven-baked / pan-fried …" variants were removed; the USDA entries that carry a cooking method in their name are real source data and stay). To regenerate the USDA selection, download the [official SR Legacy CSV zip](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip) and run `python3 scripts/generate-usda-foods.py <path-to-zip>`.
