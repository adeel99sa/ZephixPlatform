# rc.25 Fix Summary

## Blockers Addressed

### Blocker 1 — kpi_definitions.rollup_method NOT NULL (Severity: High)

**Root cause**: Migration `17980202000000-TemplateCenterFoundation` created `kpi_definitions` with `rollup_method TEXT NOT NULL`. The TypeORM entity declared `nullable: true`, causing schema sync to relax the constraint. Rows inserted without `rollup_method` now have NULLs, breaking all KPI read/write paths.

**Fix**: Forward-only backfill migration `18000000000011-BackfillKpiDefinitionsRollupMethod`:
- Backfills NULL `rollup_method` with category-aware defaults (efficiency/quality -> avg, financial/delivery -> sum)
- Backfills NULL `time_window` with 'current'
- Backfills NULL `direction` with 'higher_is_better'
- Re-enforces NOT NULL with server defaults
- Verification query throws if any NULLs survive

**Entity fix**: `KpiDefinitionEntity` columns changed from `nullable: true` to non-nullable with defaults.

**Impact**: Unblocks Waves 4A, 4B, 4C, 4D.

### Blocker 3 — RequireWorkspaceAccessGuard 'read' mode (Severity: High)

**Root cause**: Portfolio and program controllers use `@SetMetadata('workspaceAccessMode', 'read')`, but the guard only handled `viewer`, `member`, and `ownerOrAdmin`. The `read` mode fell through to `throw new ForbiddenException`, returning 403 for all portfolio/program reads.

**Fix**: Added `WorkspaceAccessMode` type with explicit `read` and `write` aliases. Refactored guard from if/else to switch statement:
- `read` falls through to `viewer` (any non-suspended workspace member)
- `write` falls through to `member` (owner or member only)
- Unknown modes throw `ForbiddenException`

**Tests**: 19 unit tests covering all 5 modes plus edge cases (cross-org, suspended, unknown mode, no user).

**Impact**: Unblocks Wave 8 (portfolio and program endpoints).

### Blocker 2 — System template seed (Severity: Medium)

**Status**: Not a code fix. Requires running `seed-system-templates.ts` on staging after deploy.

**Impact**: Unblocks Waves 5, 6, 7 (template library and authoring).

## Files Changed

| File | Type | Lines |
|------|------|-------|
| `migrations/18000000000011-BackfillKpiDefinitionsRollupMethod.ts` | New | ~100 |
| `kpis/entities/kpi-definition.entity.ts` | Modified | 6 lines changed |
| `workspaces/guards/require-workspace-access.guard.ts` | Modified | ~30 lines changed |
| `workspaces/guards/require-workspace-access.guard.spec.ts` | New | ~250 |

## Verification Results (pre-deploy)

- tsc: 0 errors
- Guard tests: 19 passed
- KPI tests: 211 passed (19 suites)
- Portfolio/program tests: 77 passed (7 suites)
- Linter: 0 errors

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Backfill defaults may not match intended values for all KPI definitions | Category-aware defaults based on seed data patterns; manual review of staging data post-migration recommended |
| `read`/`write` mode aliases might be used inconsistently in future controllers | Type system enforces valid modes at compile time via `WorkspaceAccessMode` |
| Migration down path reverses NOT NULL constraint | Acceptable — down is rollback-only, not for production use |
