# Template Versioning and Scope Implementation

## Summary

Successfully migrated template system to use `Template` as the single authoritative entity, added deterministic versioning, and implemented template scope (SYSTEM, ORG, WORKSPACE) with proper role-based access control.

## Changes Made

### Step 1-2: Switched instantiate-v5_1 to Template Entity
- ✅ Replaced `ProjectTemplate` with `Template` in `TemplatesInstantiateV51Service`
- ✅ Added `defaultEnabledKPIs` field to `Template` entity
- ✅ Updated template structure extraction to work with `Template.structure`
- ✅ Fixed version to use `Template.version` instead of `updatedAt` timestamp

### Step 3: Deterministic Versioning
- ✅ Template version increments only on publish (not on every edit)
- ✅ Added `POST /api/templates/:id/publish` endpoint
- ✅ Publish endpoint increments `Template.version` and sets `publishedAt`

### Step 4: Template Scope and Workspace ID
- ✅ Added `templateScope` enum field: SYSTEM, ORG, WORKSPACE
- ✅ Added `workspaceId` nullable field to Template entity
- ✅ Created migration `1790000000000-AddTemplateScopeAndWorkspaceId.ts`
- ✅ Migration backfills existing templates:
  - SYSTEM: organizationId is null → templateScope = SYSTEM
  - ORG: organizationId is not null → templateScope = ORG
  - All existing templates get workspaceId = null

### Step 5: Scope Rules Enforcement
- ✅ Added `validateTemplateScope()` method in TemplatesService
- ✅ Rules enforced:
  - SYSTEM: organizationId = null, workspaceId = null
  - ORG: organizationId required, workspaceId = null
  - WORKSPACE: organizationId required, workspaceId required

### Step 6: Template List Filtering
- ✅ Updated `listV1()` to filter by scope:
  - SYSTEM templates: always visible
  - ORG templates: visible to same organization
  - WORKSPACE templates: only visible when x-workspace-id header matches

### Step 7: Creation Guards and DTO
- ✅ Updated `CreateV1Dto` to include `templateScope` and `workspaceId`
- ✅ Updated `POST /api/templates` endpoint:
  - Admin can create ORG and WORKSPACE templates
  - Workspace Owner can create WORKSPACE templates only (for their workspace)
  - Member cannot create templates
  - WORKSPACE templates use x-workspace-id header (not body)

### Step 8: Instantiation Scope Rules
- ✅ Updated `instantiateV51()` to enforce scope:
  - WORKSPACE templates: must match x-workspace-id
  - ORG templates: can be instantiated in any workspace within org
  - SYSTEM templates: can be instantiated in any workspace

### Step 9: Project Snapshot
- ✅ Project snapshot now includes:
  - `templateId` = template.id
  - `templateVersion` = template.version
  - `blocks` = template structure phases
  - `defaultEnabledKPIs` = template.defaultEnabledKPIs
- ✅ `activeKpiIds` set from template defaults on instantiation

### Step 10: Freeze ProjectTemplate
- ✅ Added legacy comment to `ProjectTemplate` entity
- ✅ Stopped using `ProjectTemplate` in instantiate-v5_1
- ✅ Table remains for backward compatibility

## Files Modified

### Backend
- `zephix-backend/src/modules/templates/entities/template.entity.ts` - Added templateScope, workspaceId, defaultEnabledKPIs
- `zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts` - Switched to Template entity
- `zephix-backend/src/modules/templates/services/templates.service.ts` - Added scope validation, publish endpoint, updated list filtering
- `zephix-backend/src/modules/templates/controllers/templates.controller.ts` - Updated creation guards, added publish endpoint
- `zephix-backend/src/modules/templates/entities/project-template.entity.ts` - Added legacy comment
- `zephix-backend/src/migrations/1790000000000-AddTemplateScopeAndWorkspaceId.ts` - New migration

## Verification Commands

### 1. Admin creates ORG template
```bash
curl -X POST http://localhost:3000/api/templates \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test ORG Template",
    "templateScope": "ORG"
  }'
# Expected: 201
```

### 2. Workspace Owner creates WORKSPACE template
```bash
curl -X POST http://localhost:3000/api/templates \
  -H "Authorization: Bearer $WORKSPACE_OWNER_TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test WORKSPACE Template",
    "templateScope": "WORKSPACE"
  }'
# Expected: 201
```

### 3. Workspace Owner creates ORG template (should fail)
```bash
curl -X POST http://localhost:3000/api/templates \
  -H "Authorization: Bearer $WORKSPACE_OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test ORG Template",
    "templateScope": "ORG"
  }'
# Expected: 403
```

### 4. List templates without x-workspace-id
```bash
curl -X GET http://localhost:3000/api/templates \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200, returns SYSTEM + ORG templates only
```

### 5. List templates with x-workspace-id
```bash
curl -X GET http://localhost:3000/api/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID"
# Expected: 200, returns SYSTEM + ORG + WORKSPACE templates for that workspace
```

### 6. Instantiate WORKSPACE template from wrong workspace (should fail)
```bash
curl -X POST http://localhost:3000/api/templates/$WORKSPACE_TEMPLATE_ID/instantiate-v5_1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $DIFFERENT_WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Test Project"
  }'
# Expected: 403
```

### 7. Instantiate WORKSPACE template from correct workspace
```bash
curl -X POST http://localhost:3000/api/templates/$WORKSPACE_TEMPLATE_ID/instantiate-v5_1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Test Project"
  }'
# Expected: 201
# Verify: project.templateVersion equals template.version
```

### 8. Publish template (increments version)
```bash
curl -X POST http://localhost:3000/api/templates/$TEMPLATE_ID/publish \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Expected: 200
# Verify: template.version increments, publishedAt is set
```

## Next Steps

1. Run migration: `npm run migration:run` in zephix-backend
2. Test all verification commands above
3. Update frontend to use new template scope fields
4. Add API client consolidation (separate task)

## Notes

- ProjectTemplate entity is frozen but table remains for backward compatibility
- Template.version is now deterministic (only increments on publish)
- All template operations now use Template entity as single source of truth
- Scope rules are enforced at service layer, not just controller
