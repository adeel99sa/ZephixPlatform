# Template Versioning and Scope - Validation Proofs

## 1. Build Status

### TypeScript Compilation
✅ **Template-related code compiles successfully**
- Remaining build errors are in unrelated files:
  - `project-dashboard.service.ts` (TaskStatus import issue - pre-existing)
  - `projects.service.ts` (save method issue - pre-existing)

### Template Files Status
- ✅ `templates-instantiate-v51.service.ts` - Uses `Template` entity
- ✅ `templates.controller.ts` - Updated with scope guards
- ✅ `templates.service.ts` - Added scope validation and publish
- ✅ `template.entity.ts` - Added templateScope, workspaceId, defaultEnabledKPIs

## 2. ProjectTemplate Usage Audit

### Files Still Referencing ProjectTemplate

**Service Files (Legacy/Unused):**
- `templates.service.ts` - Still has ProjectTemplate repository for legacy methods (not used by instantiate-v5_1)
- `templates-instantiate.service.ts` - Legacy instantiation service (not used by instantiate-v5_1)
- `templates-recommendation.service.ts` - May reference ProjectTemplate for recommendations
- `templates-preview-v51.service.ts` - May reference ProjectTemplate for previews

**Entity Files:**
- `project-template.entity.ts` - Marked as LEGACY/FROZEN

**Module Files:**
- `template.module.ts` - Still imports ProjectTemplate for backward compatibility

### ✅ Critical: instantiate-v5_1 Path

**Confirmed:** `TemplatesInstantiateV51Service` uses **only** `Template` entity:
```typescript
// Line 11: Import
import { Template } from '../entities/template.entity';

// Line 34-35: Repository injection
@InjectRepository(Template)
private templateRepository: Repository<Template>,

// Line 93: Repository usage in transaction
const templateRepo = manager.getRepository(Template);
```

**No ProjectTemplate references in instantiate-v5_1 path.**

## 3. Database Migration

### Migration File
- ✅ Created: `1790000000000-AddTemplateScopeAndWorkspaceId.ts`
- ✅ Adds `template_scope` column (enum: SYSTEM, ORG, WORKSPACE, default: ORG)
- ✅ Adds `workspace_id` column (uuid, nullable)
- ✅ Backfills existing templates:
  - SYSTEM: organizationId is null → templateScope = SYSTEM
  - ORG: organizationId is not null → templateScope = ORG
  - All existing templates get workspaceId = null

### SQL Verification Commands

```sql
-- Check columns exist
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'templates'
  AND column_name IN ('template_scope', 'workspace_id', 'default_enabled_kpis', 'version');

-- Check template_scope values
SELECT template_scope, COUNT(*) as count
FROM templates
GROUP BY template_scope;

-- Verify ORG templates have workspace_id null
SELECT COUNT(*) as org_with_workspace
FROM templates
WHERE template_scope = 'ORG' AND workspace_id IS NOT NULL;
-- Expected: 0

-- Verify WORKSPACE templates have workspace_id set
SELECT COUNT(*) as workspace_without_id
FROM templates
WHERE template_scope = 'WORKSPACE' AND workspace_id IS NULL;
-- Expected: 0

-- Verify SYSTEM templates
SELECT COUNT(*) as system_count
FROM templates
WHERE template_scope = 'SYSTEM' AND organization_id IS NULL AND workspace_id IS NULL;
```

## 4. Code Review - Critical Points

### ✅ 1. Template List Filtering

**Location:** `templates.service.ts` - `listV1()` method

**Implementation:**
```typescript
// Database-level filtering (not post-fetch)
const qb = this.templateRepo
  .createQueryBuilder('t')
  .where(
    '(t.templateScope = :systemScope AND t.organizationId IS NULL) OR ' +
    '(t.templateScope = :orgScope AND t.organizationId = :orgId) OR ' +
    (workspaceId
      ? '(t.templateScope = :workspaceScope AND t.organizationId = :orgId AND t.workspaceId = :workspaceId)'
      : '1=0'),
    {
      systemScope: 'SYSTEM',
      orgScope: 'ORG',
      workspaceScope: 'WORKSPACE',
      orgId,
      workspaceId,
    },
  );
```

**✅ Pass:** Filtering happens in database query, not after fetch
**✅ Pass:** ORG templates scoped by organizationId
**✅ Pass:** WORKSPACE templates require both organizationId and workspaceId match

### ✅ 2. Create Template Endpoint

**Location:** `templates.controller.ts` - `create()` method

**Implementation:**
```typescript
// For WORKSPACE scope, workspaceId comes from header, not body
const workspaceId = this.validateWorkspaceId(
  req.headers['x-workspace-id'] as string | undefined,
);

// Override workspaceId from header (security: don't trust body)
dto.workspaceId = workspaceId;
```

**✅ Pass:** WORKSPACE templates use x-workspace-id header, not body
**✅ Pass:** Workspace Owner access verified before create

### ✅ 3. Instantiate Service

**Location:** `templates-instantiate-v51.service.ts` - `instantiateV51()` method

**Scope Validation:**
```typescript
// Load template with scope filtering
const template = await templateRepo.findOne({
  where: [
    { id: templateId, templateScope: 'SYSTEM', organizationId: null },
    { id: templateId, templateScope: 'ORG', organizationId },
    { id: templateId, templateScope: 'WORKSPACE', organizationId, workspaceId },
  ],
});

// Enforce scope-specific rules
if (template.templateScope === 'WORKSPACE') {
  if (template.workspaceId !== workspaceId) {
    throw new ForbiddenException('Template belongs to a different workspace');
  }
}
```

**Snapshot Setting:**
```typescript
// All set in one transaction
project.templateId = template.id;
project.templateVersion = templateVersion;
project.activeKpiIds = template.defaultEnabledKPIs && template.defaultEnabledKPIs.length > 0
  ? [...template.defaultEnabledKPIs]
  : [];
project.templateSnapshot = {
  templateId: template.id,
  templateVersion: templateVersion,
  blocks: templateStructureForSnapshot ? templateStructureForSnapshot.phases : [],
  defaultEnabledKPIs: template.defaultEnabledKPIs || [],
};
```

**✅ Pass:** Scope rules validated before any writes
**✅ Pass:** Target workspace belongs to org (checked separately)
**✅ Pass:** All project fields set in one transaction

### ✅ 4. defaultEnabledKPIs Safety

**Location:** `template.entity.ts` and `templates-instantiate-v51.service.ts`

**Entity:**
```typescript
@Column({
  name: 'default_enabled_kpis',
  type: 'text',
  array: true,
  default: [],
})
defaultEnabledKPIs: string[];
```

**Usage:**
```typescript
project.activeKpiIds = template.defaultEnabledKPIs && template.defaultEnabledKPIs.length > 0
  ? [...template.defaultEnabledKPIs]
  : [];
```

**✅ Pass:** Safe default empty array
**✅ Pass:** Handles missing field without crashing

### ✅ 5. Publish Versioning

**Location:** `templates.service.ts` - `publishV1()` method

**Implementation:**
```typescript
// Increment version atomically
template.version = (template.version || 1) + 1;
template.publishedAt = new Date();
template.updatedById = userId;

return await manager.getRepository(Template).save(template);
```

**⚠️ Note:** Currently uses read-then-write. For production, consider:
```typescript
await manager
  .getRepository(Template)
  .createQueryBuilder()
  .update(Template)
  .set({ version: () => 'version + 1', publishedAt: new Date() })
  .where('id = :id', { id: templateId })
  .execute();
```

**✅ Pass:** Version increments on publish
**⚠️ Improvement:** Could use atomic update query for better concurrency

## 5. API Behavior Proofs (To Be Captured)

### Required Test Cases

**A. Create ORG template as Admin**
- POST /api/templates
- Body: `{ "name": "Test ORG", "templateScope": "ORG" }`
- Expected: 201, templateScope: ORG, workspaceId: null

**B. Create WORKSPACE template as Workspace Owner**
- POST /api/templates
- Header: x-workspace-id: <workspace-uuid>
- Body: `{ "name": "Test WORKSPACE", "templateScope": "WORKSPACE" }`
- Expected: 201, templateScope: WORKSPACE, workspaceId: <header-value>

**C. Workspace Owner tries ORG template**
- POST /api/templates
- Body: `{ "name": "Test", "templateScope": "ORG" }`
- Expected: 403

**D. Member tries to create template**
- POST /api/templates
- Expected: 403

**E. List without x-workspace-id**
- GET /api/templates
- Expected: SYSTEM + ORG only, no WORKSPACE

**F. List with x-workspace-id**
- GET /api/templates
- Header: x-workspace-id: <workspace-uuid>
- Expected: SYSTEM + ORG + WORKSPACE (for that workspace only)

**G. Publish endpoint**
- POST /api/templates/:id/publish
- Expected: version increments, publishedAt set

**H. Instantiate WORKSPACE from wrong workspace**
- POST /api/templates/:id/instantiate-v5_1
- Header: x-workspace-id: <different-workspace>
- Expected: 403 or 404

**I. Instantiate WORKSPACE from correct workspace**
- POST /api/templates/:id/instantiate-v5_1
- Header: x-workspace-id: <correct-workspace>
- Expected: 201, project has templateId, templateVersion, templateSnapshot, activeKpiIds

## 6. Files Changed Summary

### Modified Files
1. `zephix-backend/src/modules/templates/entities/template.entity.ts`
   - Added: templateScope, workspaceId, defaultEnabledKPIs

2. `zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts`
   - Changed: ProjectTemplate → Template
   - Updated: Scope validation, snapshot structure

3. `zephix-backend/src/modules/templates/services/templates.service.ts`
   - Added: validateTemplateScope(), publishV1()
   - Updated: createV1() with scope logic, listV1() with scope filtering

4. `zephix-backend/src/modules/templates/controllers/templates.controller.ts`
   - Updated: create() with role guards, added publish() endpoint

5. `zephix-backend/src/modules/templates/dto/template.dto.ts`
   - Added: templateScope, workspaceId to CreateTemplateDto

6. `zephix-backend/src/modules/templates/entities/project-template.entity.ts`
   - Added: Legacy comment marking as frozen

### New Files
1. `zephix-backend/src/migrations/1790000000000-AddTemplateScopeAndWorkspaceId.ts`
   - Migration for templateScope and workspaceId

## Next Steps

1. ✅ Run migration on dev DB
2. ✅ Verify database columns
3. ⏳ Capture API proofs (curl/Postman)
4. ⏳ Test all 9 API scenarios
5. ⏳ Review diffs line-by-line
