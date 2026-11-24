# Project provenance and inert leftovers

> **Scope:** Where the Android shell came from, and which Next.js-era files were removed.
>
> **Read when:** you wonder what happened to `src/app/`, `src/db/`, `next.config.ts` or `drizzle.config.json`, or still see `tsc` errors.
>
> **Related:** known-gaps.md

The Android shell, launcher assets, package ID and Gradle configuration were restored from [`MatMon28/Kakcalculator`, commit `81368cc`](https://github.com/MatMon28/Kakcalculator/tree/81368cc). The current web source was retained, not replaced with the older upstream UI. The missing wrapper JAR was restored from the pinned Capacitor template and checked against Gradle's published SHA-256. No Next.js wrapper, Postgres/Drizzle database, Firebase setup or remote server is part of this build.

**Removed leftovers (planner / dock round):** `next.config.ts`, `drizzle.config.json` (it contained a Postgres URL with credentials), `src/app/` (including `KakApp.tsx`, `layout.tsx`, `page.tsx`, `globals.css`, `api/health/route.ts`) and `src/db/` were deleted. They were never part of the Vite build: `index.html` loads `src/main.tsx`, which imports `src/App.tsx`; nothing imported `src/app`, `src/db`, `next` or `drizzle-orm`, and no script, workflow or test referenced them. The built `dist/index.html` is byte-for-byte the same size before and after. Still present and still inert: `eslint.config.mjs` (it imports the uninstalled `eslint-config-next`; no script runs ESLint) and the unused `src/components/common/Toast.tsx` (the only source of the remaining `npx tsc --noEmit` errors). The stale `postcss.config.mjs` was removed earlier because Vite auto-loaded it and it required `@tailwindcss/postcss`, which is not a dependency; Tailwind runs through `@tailwindcss/vite` in `vite.config.ts`.

**Other tracked files that are not part of the app:** `.idea/` (JetBrains settings, tracked although `.idea/` is in `.gitignore`), `src/assets/themes_insp.txt` (stand-alone HTML design exploration of 6 themes x 3 modes; reference only, not imported) and the template tests under `android/app/src/test` and `android/app/src/androidTest/java/com/getcapacitor/myapp/`.
