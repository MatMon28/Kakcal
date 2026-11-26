---
name: kakcal-perf
description: >-
  Use when investigating or optimizing page-change lag, Today/Custom mount cost,
  food search latency, dialog exit animations, or running performance benchmarks.
---

# Kakcal Performance Workflow

1. Read only the matching performance doc:
   - Page-change / Today / Custom mount cost: `docs/performance.md`
   - Food search / catalogue worker / dialog exit: `docs/search-and-animation-performance.md`
   - App startup: `docs/startup-performance.md`
2. Follow established patterns:
   - Keep collapsed card and section bodies lazy (`LazyBody` / `DeferredBody`).
   - Avoid forced synchronous layout reads inside `useLayoutEffect`.
   - Use narrow context subscriptions (`useNav`, `useNavActions`, `useSettings`) to avoid unnecessary re-renders.
   - Prefer CSS `@container` queries and `content-visibility` over JS DOM measurement.
3. Verify with `npx vitest run tests/today-performance.test.tsx tests/page-change.test.tsx`, and run `node scripts/bench-page-change.mjs` when Chromium is available.
