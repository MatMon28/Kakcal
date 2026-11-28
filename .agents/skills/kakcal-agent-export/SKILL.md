---
name: kakcal-agent-export
description: >-
  Use whenever creating or deleting code/doc files that help explain how Kakcal
  works (to keep scripts/export-agent-context.mjs updated), or when the user
  asks to export/regenerate the aggregated .txt context files for another agent.
---

# Kakcal Agent Context Export

## 1. Keeping the export manifest up to date

Whenever you **create, rename, or delete** a file under `src/`, `docs/`, `android/app/src/main/java/`, or `scripts/` that is useful for understanding how Kakcal works:

1. Open [scripts/export-agent-context.mjs](../../../scripts/export-agent-context.mjs).
2. Add the new file path (or update/remove the old path) in the matching category inside `EXPORT_GROUPS` (for example `05-utils-and-data-logic`, `07-components-pages-and-dashboard`, `13-docs-architecture-and-guides`, etc.).
3. If the new file is raw data, a demo seed, a generated asset, or historical changelog noise that should *not* be exported, add its path to `EXCLUDED_FILES` instead.
4. Verify no files are left uncategorized by running:
   ```bash
   node scripts/export-agent-context.mjs --check
   ```

## 2. Running the export when requested

When the user asks to export or regenerate the aggregated `.txt` files for another agent:

1. Run:
   ```bash
   node scripts/export-agent-context.mjs
   ```
2. This deletes all previous files in `exports/agent-context/` (gitignored) and writes fresh category-named `.txt` files (each strictly `<= 250 KB`) plus `exports/agent-context/README.md` mapping each `.txt` file to its contents.
3. If the script warns about any uncategorized files, add them to `scripts/export-agent-context.mjs` and re-run so the export is complete.
4. Report the output folder (`exports/agent-context/`), `README.md`, and the generated file count/sizes to the user.
