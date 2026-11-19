# Activities database (2024 Compendium)

> **Scope:** 181 activities with MET values, how to add one, caveats.
>
> **Read when:** you touch `src/data/activities.ts` or activity calorie estimates.
>
> **Related:** calculations-colors.md, file-map/data.md

- [`src/data/activities.ts`](../src/data/activities.ts) holds **181 activities** with MET values copied from the [2024 Adult Compendium of Physical Activities](https://pacompendium.com/) (Herrmann SD, Willis EA, Ainsworth BE, et al., *J Sport Health Sci* 2024;13(1):6-12, [doi:10.1016/j.jshs.2023.10.010](https://doi.org/10.1016/j.jshs.2023.10.010)). Each row keeps its Compendium **specific-activity code** (e.g. `17200` = walking 3.5–3.9 mph, 4.8 MET), English and Italian names and a category. Every code and MET value was cross-checked against the official category tables.
- The 2024 edition changed many values compared with the 2011 edition used by most calculators (e.g. running 6.0–6.3 mph is now **9.3** MET instead of 9.8, 7 mph is 11.0, brisk walking 3.5–3.9 mph is 4.8). Values here follow 2024.
- **Adding an activity:** append a row `[code, id, category, met, name_en, name_it]` to `ACTIVITY_ROWS`. The `id` is saved in logs and favourites, so never rename an existing one.
- MET values are population averages for adults and a good estimate, not a measurement; individual cost varies with fitness, terrain, technique and conditions.
