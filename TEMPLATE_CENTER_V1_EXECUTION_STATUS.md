# Template Center v1 - Execution Sequence Status

## Current Status

**Issue:** Template Center v1 migrations (A, B, C, D, E0, E1, E, F) have not been created yet.

**Database:** Railway database detected (`DATABASE_URL` is set)

**Next Steps:**
1. Create Template Center v1 migrations from `TEMPLATE_CENTER_V1_MIGRATION_PLAN_CORRECTED.md`
2. Run execution sequence:
   - Fresh DB test
   - Seeded DB test
   - E2E tests

## Required Migrations

Based on the migration plan, these migrations need to be created:

1. **Migration A:** `AddTemplateV1Columns` - Add v1 columns to templates table
2. **Migration B:** `AddLegoBlockV1Columns` - Add v1 columns to lego_blocks table
3. **Migration C:** `CreateTemplateBlocksV1` - Create template_blocks v1 table (rename legacy)
4. **Migration D:** `AddProjectTemplateSnapshot` - Add snapshot columns to projects table
5. **Migration E0:** `AddTemplateIdToProjectTemplates` - Add template_id to project_templates
6. **Migration E1:** `CreateAndLinkTemplatesFromProjectTemplates` - Create templates from project_templates
7. **Migration E:** `BackfillTemplatesV1Fields` - Backfill organization_id and defaults
8. **Migration F:** `BackfillTemplateBlocksV1` - Migrate template_blocks_legacy to template_blocks

## Execution Sequence (Once Migrations Created)

### 1. Fresh DB
```bash
# Drop schema (if needed)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Run migrations
cd zephix-backend
npm run migration:run

# Smoke test
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/templates
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/lego-blocks
```

### 2. Seeded DB
```bash
# Restore seed (if exists)
# Run migrations
npm run migration:run

# Verify migration
psql $DATABASE_URL -c "
  SELECT
    (SELECT COUNT(*) FROM template_blocks_legacy) as legacy_count,
    (SELECT COUNT(*) FROM template_blocks) as v1_count;
"
```

### 3. E2E
```bash
npm run test:e2e
```

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



