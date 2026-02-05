# Template Center v1 - Final Summary

## Migration E1 Shape (Final)

**Deterministic mapping using temp table:**

1. **Create temp table:** `tmp_pt_template_map(pt_id PRIMARY KEY, template_id NOT NULL)`
2. **Insert mapping rows:** For project_templates where `template_id IS NULL` and `organization_id IS NOT NULL`
3. **Insert templates:** Join project_templates to tmp map on pt_id
4. **Update project_templates:** Set `template_id` by joining tmp map on pt_id
5. **Down method:** Only touches templates with metadata source marker and clears matching `project_templates.template_id` values only for those template ids

**Key Points:**
- ✅ Links by pt_id only using tmp_pt_template_map
- ✅ No string matching
- ✅ No created_at matching
- ✅ Supports duplicate names within same org
- ✅ Metadata preserved: `COALESCE(pt.metadata, '{}'::jsonb) || jsonb_build_object('source', 'project_templates_migration_e1')`

## All Documentation Fixed

- ✅ Removed all "links by organization_id + name + created_at" references
- ✅ Updated to "Links by pt_id only using tmp_pt_template_map"
- ✅ Removed "Uses CTE pattern" → "Uses temp mapping table tmp_pt_template_map"
- ✅ Added "No created_at matching" everywhere
- ✅ All E2 references removed
- ✅ Metadata handling fixed to preserve existing metadata

## Prerequisites

- ✅ `templates.metadata` is JSONB and nullable (or defaults to `{}`)
- ✅ `pgcrypto` extension exists for `gen_random_uuid()` (or use `uuid-ossp` with `uuid_generate_v4()`)

## Migration Order

1. A: Add Template v1 columns
2. B: Add LegoBlock v1 columns
3. C: Create TemplateBlocks v1
4. D: Add Project template snapshot columns
5. E0: Add `template_id` to `project_templates`
6. E1: Create Templates from ProjectTemplates and Link (deterministic)
7. E: Backfill Templates v1 fields + CHECK constraint
8. F: Backfill TemplateBlocks v1 from Legacy

## Ready for Implementation ✅




