# Template Center v1 - Execution Sequence

## Status: Migrations Not Found

**Issue:** Template Center v1 migrations (A, B, C, D, E, E0, E1, F) have not been created yet.

**Required Actions Before Execution:**
1. Create migrations from `TEMPLATE_CENTER_V1_MIGRATION_PLAN_CORRECTED.md`
2. Migration files needed:
   - `XXXXXX-AddTemplateV1Columns.ts` (Migration A)
   - `XXXXXX-AddLegoBlockV1Columns.ts` (Migration B)
   - `XXXXXX-CreateTemplateBlocksV1.ts` (Migration C)
   - `XXXXXX-AddProjectSnapshotColumns.ts` (Migration D)
   - `XXXXXX-AddTemplateIdToProjectTemplates.ts` (Migration E0)
   - `XXXXXX-BackfillTemplatesFromProjectTemplates.ts` (Migration E1)
   - `XXXXXX-BackfillTemplateOrganizationId.ts` (Migration E)
   - `XXXXXX-BackfillTemplateBlocksV1.ts` (Migration F)

## Execution Sequence (Once Migrations Exist)

### 1. Fresh DB

```bash
# Drop schema
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Run migrations
cd zephix-backend
npm run migration:run

# Smoke test: List templates
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/templates

# Smoke test: List lego blocks
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/lego-blocks
```

**Expected Results:**
- Migrations run successfully
- Templates endpoint returns empty array or system templates
- Lego blocks endpoint returns available blocks

### 2. Seeded DB

```bash
# Restore seed data (if exists)
# Run migrations
npm run migration:run

# Verify template_blocks_legacy migrated
psql $DATABASE_URL -c "
  SELECT
    (SELECT COUNT(*) FROM template_blocks_legacy) as legacy_count,
    (SELECT COUNT(*) FROM template_blocks) as v1_count;
"
```

**Expected Results:**
- Migrations run successfully
- `template_blocks_legacy` rows migrated to `template_blocks`
- Row counts match (or v1_count >= legacy_count if new rows added)

### 3. E2E

```bash
npm run test:e2e
```

**Expected Results:**
- All E2E tests pass
- Template Center v1 endpoints work correctly

## Failure Capture

If anything fails, capture:
- Migration name
- SQL error
- Table name
- Row counts from:
  - `templates`
  - `project_templates`
  - `template_blocks_legacy`
  - `template_blocks`



