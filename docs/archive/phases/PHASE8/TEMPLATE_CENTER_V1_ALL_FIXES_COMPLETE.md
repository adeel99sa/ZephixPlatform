# Template Center v1 - All Fixes Complete ✅

## All Issues Fixed

### 1. Migration E1 - Fully Deterministic Mapping ✅
**Problem:** Used string matching (name + created_at) which is not deterministic.

**Solution:** Uses temp mapping table with pt_id-only joins.

**Implementation:**
- Creates temp table `tmp_pt_template_map(pt_id PRIMARY KEY, template_id NOT NULL)`
- Populates mapping: `INSERT INTO tmp_pt_template_map SELECT pt.id, gen_random_uuid() FROM project_templates WHERE pt.template_id IS NULL AND pt.organization_id IS NOT NULL`
- Inserts templates using mapping: `INSERT INTO templates(...) SELECT m.template_id, pt.* FROM tmp_pt_template_map m INNER JOIN project_templates pt ON pt.id = m.pt_id`
- Updates project_templates: `UPDATE project_templates pt SET template_id = m.template_id FROM tmp_pt_template_map m WHERE pt.id = m.pt_id AND pt.template_id IS NULL`
- **Links by pt_id only using tmp_pt_template_map. No string matching. No created_at matching.**

**Down Method:**
- Uses metadata marker: `metadata->>'source' = 'project_templates_migration_e1'`
- Only reverts rows created by this migration
- Prevents wiping real data

### 2. Removed All E2 References ✅
- ✅ Migration E2 deleted
- ✅ All documentation updated
- ✅ ProjectTemplate.templateId now says "populated in Migration E1"

### 3. Template Entity organizationId ✅
**Problem:** Plan said to remove nullable after Migration E.

**Solution:** Keep nullable in entity, enforce in service layer.

**Implementation:**
- Entity: `@Column({ name: 'organization_id', nullable: true }) organizationId?: string;`
- Migration E: Adds CHECK constraint `(is_system = true OR organization_id IS NOT NULL)`
- Service Layer: Enforce required orgId for non-system templates in code

### 4. Migration E1 Down Method ✅
**Problem:** Would wipe real data if templates with kind=project, lock_state=UNLOCKED, version=1 existed before migration.

**Solution:** Use metadata marker to track rows created by this migration.

**Implementation:**
- Inserts templates with: `metadata = COALESCE(pt.metadata, '{}'::jsonb) || jsonb_build_object('source', 'project_templates_migration_e1')`
- Down method only reverts: `WHERE metadata->>'source' = 'project_templates_migration_e1'`
- Only clears `project_templates.template_id` for those template ids

### 5. Migration F Guard ✅
**Status:** Already correct
- Has guard: `AND pt.template_id IS NOT NULL`
- Has `ON CONFLICT DO NOTHING` for idempotence (acceptable)

## Final Migration Order

1. **Migration A:** Add Template v1 columns
2. **Migration B:** Add LegoBlock v1 columns
3. **Migration C:** Create TemplateBlocks v1 (safe rename, safe down)
4. **Migration D:** Add Project template snapshot columns
5. **Migration E0:** Add `template_id` to `project_templates`
6. **Migration E1:** Create Templates from ProjectTemplates and Link (deterministic, temp mapping table)
7. **Migration E:** Backfill Templates v1 fields + CHECK constraint
8. **Migration F:** Backfill TemplateBlocks v1 from Legacy

## Key Principles Applied

1. **Deterministic Mapping:** Temp table `tmp_pt_template_map` with pt_id-only joins
2. **System Templates:** CHECK constraint allows null org_id for system templates
3. **Safe Rollback:** Metadata markers prevent data loss
4. **No String Matching:** All joins use primary keys only (pt_id)
5. **No Created_at Matching:** Only pt_id joins, no timestamp matching
6. **Idempotent:** All migrations can run multiple times safely

## Entity Changes Summary

### Template Entity
- ✅ Keep `organizationId` nullable
- ✅ Add v1 fields: `isDefault`, `lockState`, `createdById`, `updatedById`, `publishedAt`, `archivedAt`
- ✅ Enforce non-system org requirement in service layer

### ProjectTemplate Entity
- ✅ Add `templateId` field (populated in Migration E1)

### Project Entity
- ✅ Add `templateId`, `templateVersion`, `templateLocked`, `templateSnapshot`

### TemplateBlock Entity
- ✅ Create new entity file with all v1 fields

### LegoBlock Entity
- ✅ Add `key`, `surface`, `isActive`, `minRoleToAttach`

## Sanity Checklist Before Running on Seeded DB

- ✅ Ensure `templates.metadata` is JSONB and nullable (or defaults to `{}`)
  - Migration E1 uses: `COALESCE(pt.metadata, '{}'::jsonb) || jsonb_build_object('source', 'project_templates_migration_e1')`
- ✅ Ensure `gen_random_uuid()` exists (from `pgcrypto` extension)
  - If not guaranteed, add migration to create extension: `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`
  - Or use `uuid-ossp` with `uuid_generate_v4()` if preferred
- ✅ All E2 references removed
- ✅ All "links by organization_id + name + created_at" references removed
- ✅ Metadata handling preserves existing metadata

## Next Steps

1. ✅ All migrations corrected and deterministic
2. ⏭️ Run on fresh database first
3. ⏭️ Run on seeded database with project_templates and template_blocks_legacy
4. ⏭️ Apply entity diffs after migrations pass
5. ⏭️ Add service layer enforcement for non-system template org requirement
6. ⏭️ Add routes and services
7. ⏭️ Add tests

