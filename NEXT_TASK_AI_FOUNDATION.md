# Next Task: AI Foundation Scaffolding

**Status:** Ready to start
**Priority:** First task in next development block

---

## Task

**Goal:**
Build scaffolding for AI assistant features. No UI chat, no model calls. Only infrastructure for context building, policy validation, and action registry.

**Non-goals:**
- UI chat interface
- LLM model integration
- AI-generated responses
- Real-time AI interactions

**User roles impacted:**
- [x] Admin (full access)
- [x] Workspace Owner (workspace-scoped)
- [x] Member (workspace-scoped)
- [x] Viewer (read-only)

**Pages impacted:**
- None (backend-only scaffolding)

**APIs impacted:**
- `POST /api/ai/context` - Build context from route + entity (future)
- `GET /api/ai/policy/:action` - Check if action allowed (future)
- `POST /api/ai/actions/:action/preview` - Preview action (future)

**Data model changes:**
- [ ] New entity: `AIActionLog` (for audit trail)
- [ ] New field: None
- [ ] Migration: `XXXX-AddAIActionLog` (if entity created)

**Acceptance checks:**
1. Context builder service creates context object from route + entity
2. Policy matrix service validates permissions by role + page
3. Action registry service registers actions and supports dry-run
4. All services are testable with unit tests
5. No UI or model calls yet

---

## Constraints

- ✅ Enforce workspace and org scoping
- ✅ Reuse existing guards, repositories, response wrapper
- ✅ No new libraries
- ✅ Small commits only
- ✅ Follow existing patterns in codebase

---

## Deliverables

- [ ] `context-builder.service.ts` - Build context from route + entity
- [ ] `policy-matrix.service.ts` - Permission matrix by role + page
- [ ] `action-registry.service.ts` - Action registry with dry-run
- [ ] Unit tests for each service
- [ ] Proof note with service usage examples

---

## Implementation Plan

### Step 1: AI Context Builder

**File:** `zephix-backend/src/modules/ai/context/context-builder.service.ts`

**Purpose:**
Build structured context object from current route and selected entity.

**Input:**
- Route path (e.g., `/projects/:id`)
- Selected entity (e.g., `Project` object)
- User context (from auth)

**Output:**
```typescript
{
  route: string;
  entityType: 'project' | 'task' | 'workspace' | ...;
  entityId: string;
  workspaceId: string;
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  entityData: any; // Selected entity
}
```

**Methods:**
- `buildFromRoute(route: string, entity: any, user: AuthContext): AIContext`

### Step 2: AI Policy Matrix

**File:** `zephix-backend/src/modules/ai/policy/policy-matrix.service.ts`

**Purpose:**
Validate if user can perform action based on role + page.

**Input:**
- Action name (e.g., `create_task`, `update_project`)
- User role
- Page/route context

**Output:**
```typescript
{
  allowed: boolean;
  reason?: string;
  requiredRole?: string;
}
```

**Methods:**
- `canPerformAction(action: string, role: string, context: AIContext): PolicyResult`
- `getAllowedActions(role: string, context: AIContext): string[]`

**Policy Matrix:**
```typescript
const POLICY_MATRIX = {
  'admin': {
    '*': ['*'], // All actions on all pages
  },
  'workspace_owner': {
    '/workspaces/:id': ['create_project', 'update_workspace', ...],
    '/projects/:id': ['update_project', 'create_task', ...],
  },
  'workspace_member': {
    '/projects/:id': ['create_task', 'update_task', 'comment', ...],
  },
  'workspace_viewer': {
    '/projects/:id': ['read'], // Read-only
  },
};
```

### Step 3: AI Action Registry

**File:** `zephix-backend/src/modules/ai/actions/action-registry.service.ts`

**Purpose:**
Register available actions and support dry-run preview.

**Input:**
- Action name
- Action parameters
- Context

**Output:**
```typescript
{
  action: string;
  preview: {
    description: string;
    changes: string[];
    affectedEntities: string[];
  };
  confirmed: boolean;
}
```

**Methods:**
- `registerAction(name: string, handler: ActionHandler): void`
- `previewAction(action: string, params: any, context: AIContext): ActionPreview`
- `executeAction(action: string, params: any, context: AIContext, confirmed: boolean): ActionResult`

**Action Registry:**
```typescript
const ACTIONS = {
  'create_task': {
    handler: async (params, context) => {
      // Preview: Show what will be created
      // Execute: Create task
    },
  },
  'update_project': {
    handler: async (params, context) => {
      // Preview: Show changes
      // Execute: Update project
    },
  },
};
```

### Step 4: AI Module Setup

**File:** `zephix-backend/src/modules/ai/ai.module.ts`

**Purpose:**
Wire up AI services.

**Providers:**
- `AIContextBuilderService`
- `AIPolicyMatrixService`
- `AIActionRegistryService`

**Exports:**
- All services for use in other modules

---

## Proof Note Template

**Task:** AI Foundation Scaffolding

**What Changed:**
- `zephix-backend/src/modules/ai/context/context-builder.service.ts` - Build context from route + entity
- `zephix-backend/src/modules/ai/policy/policy-matrix.service.ts` - Permission validation
- `zephix-backend/src/modules/ai/actions/action-registry.service.ts` - Action registry with dry-run
- `zephix-backend/src/modules/ai/ai.module.ts` - Module wiring

**Endpoints:**
- None yet (scaffolding only)

**Sample Usage:**
```typescript
// Context builder
const context = await contextBuilder.buildFromRoute(
  '/projects/123',
  projectEntity,
  authContext
);

// Policy check
const canCreate = await policyMatrix.canPerformAction(
  'create_task',
  'workspace_member',
  context
);

// Action preview
const preview = await actionRegistry.previewAction(
  'create_task',
  { title: 'New Task' },
  context
);
```

**Tests:**
- Unit tests for each service
- Test context building
- Test policy validation
- Test action preview

**File Paths Touched:**
- `zephix-backend/src/modules/ai/...`

---

## Guardrail Checklist

- [ ] Tenancy: Context includes organizationId and workspaceId
- [ ] RBAC: Policy matrix enforces role-based permissions
- [ ] Workspace header: Context validates workspace access
- [ ] API consistency: Services follow existing patterns
- [ ] DTO validation: Action parameters validated
- [ ] Audit trail: Action registry logs all actions

---

**Status:** Ready to implement. Use Cursor task template for each commit.
