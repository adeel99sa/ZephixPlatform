---
name: reference-gating-floor
description: vitest.gating.config.ts rules — never remove gating tests without same-commit replacements.
metadata:
  type: reference
---

# Gating test floor (Zephix frontend)

CI **C1 Gates** runs `npm run test:gating`, which loads `zephix-frontend/vitest.gating.config.ts`.

## Rules (enforced at config load time)

1. **`GATING_INCLUDES`** — explicit list of stable test files. **Only add; never remove** without replacement coverage.
2. **`GATING_FILE_FLOOR`** — minimum `GATING_INCLUDES.length`. If length drops below floor, Vitest **startup fails** with `GATING VIOLATION`.
3. **Floor only increases** when adding new gating files (update `GATING_FILE_FLOOR` to match new count).

## When deleting source or test files

If a sprint removes a component and its gating test file:

- Plan **replacement** gating tests in recon (same commit as deletion).
- Do **not** rely on CI failure to discover the floor violation.

Example (Sprint 5.2a): removing `ProjectDocumentsTab.test.tsx` and `ProjectRisksTab.test.tsx` required adding `mapArtifactApiError`, `project-artifacts.mappers`, and `projectVisibleTabs.sprint52a` gating suites; floor 44 → 45.

## Pre-push (frontend)

```bash
cd zephix-frontend && npm run test:gating
```

Pair with `npm run typecheck` (see `reference_typescript_pitfalls.md`).

## Related

- `vitest.gating.config.ts` header comments
- Sprint 5.2b: any Template Center file deletion must include replacement gating in the deletion commit
