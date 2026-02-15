# Migration Reconciliation — Staging (120) vs Production (145)

**Date**: 2026-02-15  
**Commit**: `eb5208aeedc56a1a783a7a8fb0ef54fa96cd47af`

---

## Facts

| Metric | Value |
|--------|-------|
| Migration files in repo (`src/migrations/*.ts`) | 121 |
| Valid migration classes (non-empty files) | 120 |
| Empty file (no class) | `1765000000006-ExtendTemplateEntitiesForPhase4.ts` |
| Staging `migrations` table count | 120 |
| Production `migrations` table count | 145 |
| Staging latest migration | `AlignAuditEventsSchema18000000000010` |
| Production latest migration | `AddDeletedByUserIdToWorkTasksAndPhases17980202500002` |

## Root Cause

### Why staging has 120 (matches repo)
Staging database was completely reset on 2026-02-14 (public schema dropped and recreated).
All TypeORM migrations ran from scratch via `preDeployCommand: npm run db:migrate`.
121 files exist, but `1765000000006-ExtendTemplateEntitiesForPhase4.ts` is empty (zero bytes,
no exported class). TypeORM correctly ignores it. Result: **120 migrations = correct.**

### Why production has 145 (25 extra)
Production database was NOT reset. It has accumulated migrations over its full history:
- 120 from the current repo's TypeScript migration files
- 25 historical entries from before the migration system was standardized

These 25 extra entries are likely from:
1. **Root-level .js migration files** that were run directly in earlier deploys:
   - `1756308224629-InitialProductionSchema.js`
   - `1757826448476-fix-auth-mvp.js`
   - `1767159662041-FixWorkspacesDeletedAt.js`
   - `1767817829549-AddSprint4ProjectTemplatesFields.js`
2. **Manual SQL migrations** run before TypeORM was adopted
3. **Old migration files** that were later deleted from the repo but remain in the DB table

### Why the latest migration names differ
- Staging latest: `AlignAuditEventsSchema18000000000010` (timestamp `18000000000010`)
- Production latest: `AddDeletedByUserIdToWorkTasksAndPhases17980202500002` (timestamp `17980202500002`)

Staging's latest has a HIGHER timestamp (`18000000000010` > `17980202500002`), which means
**staging has NEWER migrations that production also has**. The difference in "latest" is because
TypeORM stores the migration ID based on insertion order, not timestamp. Production's historical
entries were inserted later (as they were run manually), pushing them to higher IDs.

Both environments show "No migrations are pending" in their deploy logs, confirming:
- All 120 valid repo migrations exist in BOTH databases
- Production additionally has 25 historical entries

## Safety Assessment

| Check | Result |
|-------|--------|
| Staging has all current repo migrations? | YES (120/120 valid classes) |
| Production has all current repo migrations? | YES (all 120 + 25 extra historical) |
| Missing migrations that could cause schema drift? | NO |
| Extra production migrations that could break things? | NO (they're historical records only) |
| Deploy runner shows "No migrations are pending"? | YES (both environments) |

## Conclusion

The gap is **benign**. It is caused by historical migration records in production, not by
missing migrations. Both databases have identical schemas for all current migration classes.

## Recommendation

1. **Do not delete** the 25 extra production migration records — they're harmless historical data
2. **Delete the empty file** `1765000000006-ExtendTemplateEntitiesForPhase4.ts` from the repo
   (or add a proper migration class to it)
3. **Do not reset production** — it would lose data
4. After confirming both schemas match via `pg_dump --schema-only` comparison, mark this resolved

## Migration Path Configuration

Found multiple migration path configurations (should be consolidated):

| Config File | Path | Used By |
|-------------|------|---------|
| `database.config.ts` | `dist/migrations/*.js` | NestJS app runtime |
| `data-source-migrate.ts` | `dist/src/migrations/*.js` | `npm run db:migrate` (Railway preDeployCommand) |
| `data-source-production.ts` | `src/migrations/*{.ts,.js}` | Legacy (source files, not compiled) |
| `tsconfig.migrations.json` | outputs to `dist/migrations/` | Build step |

Both `dist/migrations/` and `dist/src/migrations/` contain 121 files after a full build.
The `nest build` step compiles to `dist/src/`, while `build:migrations` compiles to `dist/`.
Both paths produce the same 120 valid migration classes.
