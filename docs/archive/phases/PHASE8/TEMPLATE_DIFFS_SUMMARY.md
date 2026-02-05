# Template Implementation - Diffs Summary

## Key Changes by File

### 1. Template Entity (`template.entity.ts`)

**Added Fields:**
```typescript
// Template scope: SYSTEM, ORG, WORKSPACE
@Column({
  name: 'template_scope',
  type: 'enum',
  enum: ['SYSTEM', 'ORG', 'WORKSPACE'],
  default: 'ORG',
})
templateScope: 'SYSTEM' | 'ORG' | 'WORKSPACE';

// Workspace ID - required only for WORKSPACE scope
@Column({ name: 'workspace_id', type: 'uuid', nullable: true })
workspaceId: string | null;

// KPI defaults for template instantiation
@Column({
  name: 'default_enabled_kpis',
  type: 'text',
  array: true,
  default: [],
})
defaultEnabledKPIs: string[];
```

### 2. Templates Instantiate V51 Service (`templates-instantiate-v51.service.ts`)

**Changed:**
- Line 11: `import { Template }` (was ProjectTemplate)
- Line 34-35: Repository injection uses Template
- Line 93: Repository usage in transaction uses Template
- Line 93-98: Query filters by templateScope
- Line 107-125: Added scope validation logic
- Line 351: Uses `template.version` instead of `updatedAt` timestamp
- Line 357-359: Sets activeKpiIds from template.defaultEnabledKPIs
- Line 380-391: Sets templateSnapshot with blocks and defaultEnabledKPIs

**Removed:**
- All ProjectTemplate references
- Legacy taskTemplates fallback code

### 3. Templates Service (`templates.service.ts`)

**Added:**
- `validateTemplateScope()` method (lines ~61-100)
- `publishV1()` method (lines ~724-750)

**Changed:**
- `createV1()`: Added templateScope and workspaceId handling (lines ~690-720)
- `listV1()`: Added scope-based filtering (lines ~561-580)

### 4. Templates Controller (`templates.controller.ts`)

**Changed:**
- `create()`: Added role-based guards for templateScope (lines ~105-160)
- Added `publish()` endpoint (lines ~365-375)

**Key Logic:**
- Admin can create ORG and WORKSPACE templates
- Workspace Owner can create WORKSPACE templates only
- workspaceId forced from x-workspace-id header (not body)

### 5. Create Template DTO (`template.dto.ts`)

**Added:**
```typescript
templateScope?: 'SYSTEM' | 'ORG' | 'WORKSPACE';
workspaceId?: string;
```

### 6. Migration (`1790000000000-AddTemplateScopeAndWorkspaceId.ts`)

**New File:**
- Adds template_scope column (enum, default 'ORG')
- Adds workspace_id column (uuid, nullable)
- Backfills existing templates
- Creates indexes

## Verification Checklist

- [x] instantiate-v5_1 uses Template only
- [x] No ProjectTemplate in instantiate-v5_1 path
- [x] templateScope and workspaceId added to entity
- [x] Migration created
- [x] Scope validation added
- [x] List filtering by scope
- [x] Creation guards by role
- [x] Publish endpoint increments version
- [x] Snapshot includes templateId, templateVersion, blocks, defaultEnabledKPIs
- [x] activeKpiIds set from template defaults

## Remaining Work

- [ ] Run migration on dev DB
- [ ] Verify database columns
- [ ] Test API endpoints (9 scenarios)
- [ ] Capture API proofs (curl/Postman responses)
