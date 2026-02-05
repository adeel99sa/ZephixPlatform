# Template Center v1 - All Fixes Applied

## ✅ All 5 Issues Fixed

### 1. Migration E1 - Deterministic Mapping ✅
- **Fixed:** Uses temp mapping table for fully deterministic linking
- **Deleted:** Migration E2 (all references removed)
- **Approach:**
  - Temp table stores pt_id -> template_id mapping
  - Templates created with exact UUIDs from mapping
  - Linking uses ONLY pt_id join (no string matching, no created_at matching)
  - Supports duplicate names within same org
  - Down method uses metadata marker to only revert rows created by this migration

### 2. Migration E - System Templates Support ✅
- **Fixed:** Changed from `NOT NULL` constraint to `CHECK` constraint
- **Constraint:** `CHECK (is_system = true OR organization_id IS NOT NULL)`
- **Allows:** System templates to have null organization_id (like system lego_blocks)
- **Enforces:** Non-system templates must have organization_id
- **Entity:** Template.organizationId remains nullable in TypeORM
- **Service Layer:** Enforce required orgId for non-system templates in code

### 3. Migration E1 - Removed ON CONFLICT ✅
- **Fixed:** Removed `ON CONFLICT DO NOTHING` clause
- **Reason:** No unique constraint exists that would trigger conflict
- **Result:** Migration will fail fast on real errors

### 4. Migration C - Safe Down Path ✅
- **Fixed:** Added existence check before renaming in `down()` method
- **Pattern:** Same as `up()` - checks `information_schema.tables` first
- **Prevents:** Failure if legacy table doesn't exist

### 5. Project Entity templateId ✅
- **Verified:** Project entity does NOT have templateId field
- **Action:** Add templateId field (safe to add)
- **Migration D:** Already checks existence before adding

## Updated Migration Order

1. **Migration A:** Add Template v1 columns
2. **Migration B:** Add LegoBlock v1 columns
3. **Migration C:** Create TemplateBlocks v1 (safe rename, safe down)
4. **Migration D:** Add Project template snapshot columns
5. **Migration E0:** Add `template_id` to `project_templates`
6. **Migration E1:** Create Templates from ProjectTemplates and Link (deterministic, uses temp mapping table, replaces old E1+E2)
7. **Migration E:** Backfill Templates v1 fields + CHECK constraint (not NOT NULL)
8. **Migration F:** Backfill TemplateBlocks v1 from Legacy

## Key Changes Summary

### Migration E1 (Deterministic)
- Single migration replaces E1 + E2
- Uses temp mapping table `tmp_pt_template_map` for UUID assignment
- Links by pt_id only using tmp_pt_template_map (fully deterministic)
- No name matching fallback needed
- No created_at matching

### Migration E (System Templates)
- Uses CHECK constraint instead of NOT NULL
- Allows system templates with null organization_id
- Enforces non-system templates must have organization_id

### Migration C (Safe Down)
- Checks existence before renaming in down path
- Prevents errors on rollback

## Next Steps

1. ✅ All migrations corrected
2. ⏭️ Run on fresh database first
3. ⏭️ Run on seeded database with project_templates and template_blocks_legacy
4. ⏭️ Apply entity diffs after migrations pass
5. ⏭️ Add routes and services
6. ⏭️ Add tests

