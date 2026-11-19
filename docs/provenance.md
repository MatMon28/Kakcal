# Project provenance and inert leftovers

> **Scope:** Where the Android shell came from and which Next.js-era files are unused.
>
> **Read when:** you wonder why `src/app/`, `src/db/` or `next.config.ts` exist, or hit `tsc` errors from them.
>
> **Related:** known-gaps.md

The Android shell, launcher assets, package ID and Gradle configuration were restored from [`MatMon28/Kakcalculator`, commit `81368cc`](https://github.com/MatMon28/Kakcalculator/tree/81368cc). The current web source was retained, not replaced with the older upstream UI. The missing wrapper JAR was restored from the pinned Capacitor template and checked against Gradle's published SHA-256. No Next.js wrapper, Postgres/Drizzle database, Firebase setup or remote server is part of this build.

Leftovers of that earlier Next.js scaffold (`next.config.ts`, `drizzle.config.json`, `eslint.config.mjs`, `src/app/`, `src/db/`, the unused `src/components/common/Toast.tsx`) are inert: nothing in `src/main.tsx` imports them and Vite does not bundle them, but they are the only files that make `npx tsc --noEmit` report errors. The stale `postcss.config.mjs` was removed because Vite auto-loaded it and it required `@tailwindcss/postcss`, which is not a dependency; Tailwind runs through `@tailwindcss/vite` in `vite.config.ts`.

**Other tracked files that are not part of the app:** `.idea/` (JetBrains settings, tracked although `.idea/` is in `.gitignore`), `src/assets/themes_insp.txt` (stand-alone HTML design exploration of 6 themes x 3 modes; reference only, not imported) and the template tests under `android/app/src/test` and `android/app/src/androidTest/java/com/getcapacitor/myapp/`.
