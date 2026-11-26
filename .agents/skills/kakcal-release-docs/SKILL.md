---
name: kakcal-release-docs
description: >-
  Use when finishing a feature round, updating Kakcal documentation and file maps,
  archiving changelog rounds, or generating/verifying changes.patch.
---

# Kakcal Release & Docs Workflow

1. Check `docs/README.md#keeping-the-docs-current` and update only the matching `docs/*.md` and `docs/file-map/*.md` rows for files/features you changed.
2. Keep individual doc files concise (under ~120 lines); split and link if one grows.
3. Archive superseded round summaries:
   - Move old rounds out of `README.md` into `docs/changelog/` (e.g. `docs/changelog/rounds-recent.md`).
   - Move old patch notes out of `docs/changes-patch.md` into `docs/changes-patch-history.md`.
4. Run full verification once: `npm run check`.
5. Follow `docs/changes-patch.md` to regenerate `changes.patch` and dry-run it with `git apply --check --whitespace=error`.
