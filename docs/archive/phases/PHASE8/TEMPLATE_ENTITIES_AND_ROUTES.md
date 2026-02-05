# Template Entities and Routes - Current State

## Entities

### 1. Template Entity (`templates` table)
**File:** `zephix-backend/src/modules/templates/entities/template.entity.ts`

```typescript
@Entity('templates')
@Index('idx_templates_org', ['organizationId'])
export class Template {
  id: string;                    // UUID, primary key
  name: string;                  // VARCHAR(100)
  description?: string;          // TEXT, nullable
  category?: string;             // VARCHAR(50), nullable
  kind: 'project' | 'board' | 'mixed';  // enum, default 'project'
  icon?: string;                 // VARCHAR(50), nullable
  isActive: boolean;             // default true
  isSystem: boolean;             // default false
  organizationId: string;        // nullable
  metadata?: Record<string, any>; // JSONB, nullable
  methodology?: string;          // legacy: 'waterfall' | 'scrum' | 'agile' | 'kanban' | 'hybrid'
  structure?: Record<string, any>; // JSONB, nullable (legacy)
  metrics: string[];            // JSONB, default []
  version: number;               // default 1
  createdAt: Date;
  updatedAt: Date;
}
```

**Missing for v1:**
- `isDefault: boolean`
- `lockState: 'unlocked' | 'locked'`
- `createdById: string`
- `updatedById: string`
- `status: string` (active/draft/archived)

### 2. ProjectTemplate Entity (`project_templates` table)
**File:** `zephix-backend/src/modules/templates/entities/project-template.entity.ts`

```typescript
@Entity('project_templates')
@Index('idx_templates_org', ['organizationId'])
@Index('idx_templates_methodology', ['methodology'])
@Index('idx_templates_scope', ['scope'])
export class ProjectTemplate {
  id: string;                    // UUID
  name: string;                  // VARCHAR(255)
  description: string;            // TEXT, nullable
  methodology: 'agile' | 'waterfall' | 'kanban' | 'hybrid' | 'custom'; // enum, default 'custom'
  phases: Phase[];               // JSONB, default []
  taskTemplates: TaskTemplate[]; // JSONB, default []
  availableKPIs: KPIDefinition[]; // JSONB, default []
  defaultEnabledKPIs: string[];  // TEXT[], default []
  scope: 'organization' | 'team' | 'personal'; // enum, default 'organization'
  teamId?: string;               // UUID, nullable
  organizationId: string | null; // UUID, nullable
  createdById: string | null;   // UUID, nullable ✅ HAS THIS
  isDefault: boolean;            // ✅ HAS THIS
  isSystem: boolean;             // default false
  isActive: boolean;             // default true
  defaultWorkspaceVisibility?: 'public' | 'private';
  structure?: { phases: Array<...> }; // JSONB, nullable
  riskPresets: Array<{...}>;    // JSONB, default []
  kpiPresets: Array<{...}>;     // JSONB, default []
  createdAt: Date;
  updatedAt: Date;
}
```

**Missing for v1:**
- `lockState: 'unlocked' | 'locked'`
- `updatedById: string`
- `status: string`

### 3. LegoBlock Entity (`lego_blocks` table)
**File:** `zephix-backend/src/modules/templates/entities/lego-block.entity.ts`

```typescript
@Entity('lego_blocks')
export class LegoBlock {
  id: string;                    // UUID
  name: string;
  type: 'kpi' | 'phase' | 'view' | 'field' | 'automation';
  category: string;              // nullable
  description: string;           // TEXT, nullable
  configuration: Record<string, any>; // JSONB
  compatibleMethodologies: string[]; // JSONB, default []
  requirements: string[];        // JSONB, default []
  isSystem: boolean;             // default true
  organizationId: string;        // nullable
  createdAt: Date;
  updatedAt: Date;
}
```

**Note:** This exists but may need to be renamed to `KPIModule` or `TemplateModule` for v1.

## Routes/Controllers

### 1. TemplatesController (`/api/templates`)
**File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts`

**Read Paths (PMs):**
- `GET /api/templates` - List templates (filters: scope, category, kind, search, isActive, methodology)
- `GET /api/templates/:id` - Get single template by ID

**Write Paths (Admin):**
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `PATCH /api/templates/:id` - Update template (alternative)
- `DELETE /api/templates/:id` - Archive template (soft delete)

**Project Creation:**
- `POST /api/templates/:id/instantiate` - Create project from template

**Missing for v1:**
- `GET /api/templates/default` - Get org default template
- `POST /api/templates/:id/set-default` - Set as default
- `POST /api/templates/:id/unset-default` - Unset default
- `POST /api/templates/:id/clone` - Clone template
- `POST /api/templates/:id/lock` - Lock template
- `POST /api/templates/:id/unlock` - Unlock template

### 2. AdminTemplatesController (`/admin/templates`)
**File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts` (same file)

**Admin-only paths:**
- `GET /admin/templates` - List templates (admin)
- `GET /admin/templates/:id` - Get template (admin)
- `POST /admin/templates` - Create template (admin)
- `PATCH /admin/templates/:id` - Update template (admin)
- `POST /admin/templates/:id/apply` - Apply template to create project (admin)
- `DELETE /admin/templates/:id` - Archive template (admin)

### 3. TemplateController (`/templates`) - Legacy
**File:** `zephix-backend/src/modules/templates/controllers/template.controller.ts`

**Legacy routes:**
- `GET /templates` - Get all templates
- `GET /templates/:id` - Get template by ID
- `GET /templates/blocks/all` - Get all blocks
- `GET /templates/blocks/type/:type` - Get blocks by type
- `POST /templates/create-project` - Create project from template
- `POST /templates/projects/:projectId/blocks/:blockId` - Add block to project

**Note:** This appears to be a legacy controller. May need to consolidate with TemplatesController.

## Join Tables (from SQL migration)

### template_blocks (exists in SQL, may not have entity)
**File:** `zephix-backend/src/migrations/20240102-create-template-system.sql`

```sql
CREATE TABLE template_blocks (
  template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
  block_id UUID REFERENCES lego_blocks(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  configuration_override JSONB,
  PRIMARY KEY (template_id, block_id)
);
```

**Missing for v1:**
- `enabled: boolean`
- `displayOrder: number` (may be same as position)
- `thresholds: JSONB`
- `field_mappings: JSONB`
- `visibility_rules: JSONB`

## Summary of What Exists vs What's Needed

### ✅ Already Exists:
- `ProjectTemplate` has `isDefault`, `createdById`, `organizationId`
- `LegoBlock` entity exists (may need rename to KPIModule)
- `template_blocks` join table exists in SQL
- Basic CRUD routes exist
- Admin routes exist

### ❌ Missing for v1:
1. **Template Entity:**
   - `isDefault: boolean`
   - `lockState: 'unlocked' | 'locked'`
   - `createdById: string`
   - `updatedById: string`
   - `status: string`

2. **ProjectTemplate Entity:**
   - `lockState: 'unlocked' | 'locked'`
   - `updatedById: string`
   - `status: string`

3. **Join Table (template_blocks):**
   - `enabled: boolean`
   - `thresholds: JSONB`
   - `field_mappings: JSONB`
   - `visibility_rules: JSONB`

4. **Routes:**
   - `GET /api/templates/default`
   - `POST /api/templates/:id/set-default`
   - `POST /api/templates/:id/clone`
   - `POST /api/templates/:id/lock`
   - `POST /api/templates/:id/unlock`
   - `GET /api/kpi-modules` (catalog)
   - `POST /api/templates/:id/kpi-modules` (attach)
   - `PATCH /api/templates/:id/kpi-modules/:moduleId` (config)
   - `DELETE /api/templates/:id/kpi-modules/:moduleId` (detach)

5. **KPI Module Catalog:**
   - Need entity or service for KPI module catalog
   - Need search/discovery endpoint

## Files Ready for Review

1. `zephix-backend/src/modules/templates/entities/template.entity.ts`
2. `zephix-backend/src/modules/templates/entities/project-template.entity.ts`
3. `zephix-backend/src/modules/templates/entities/lego-block.entity.ts`
4. `zephix-backend/src/modules/templates/controllers/templates.controller.ts`
5. `zephix-backend/src/modules/templates/controllers/template.controller.ts`
6. `zephix-backend/src/migrations/20240102-create-template-system.sql`




