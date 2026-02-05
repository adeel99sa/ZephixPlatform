# Template Center v1 - Data Model & API Planning

## Current Template Entity

```typescript
@Entity('templates')
export class Template {
  id: string;                    // UUID
  name: string;                  // VARCHAR(100)
  description?: string;           // TEXT, nullable
  category?: string;             // VARCHAR(50), nullable
  kind: 'project' | 'board' | 'mixed';  // enum, default 'project'
  icon?: string;                 // VARCHAR(50), nullable
  isActive: boolean;             // default true
  isSystem: boolean;             // default false
  organizationId: string;        // nullable (system templates have null)
  metadata?: Record<string, any>; // JSONB, nullable
  methodology?: string;          // legacy field
  structure?: Record<string, any>; // JSONB, nullable (legacy)
  metrics: string[];            // JSONB, default []
  version: number;               // default 1
  createdAt: Date;
  updatedAt: Date;
}
```

## Current Template Routes

### TemplatesController (`/api/templates`)

**GET /api/templates**
- List templates with filters (scope, category, kind, search, isActive, methodology)
- Returns: `{ data: Template[] }`
- Never throws 500 - returns empty array on error

**GET /api/templates/:id**
- Get single template by ID
- Returns: `{ data: TemplateDetail | null }`
- Never throws 500 - returns null for not found

**POST /api/templates**
- Create new template
- Body: `CreateTemplateDto`
- Returns: Created template

**PUT /api/templates/:id**
- Update template
- Body: `UpdateTemplateDto`
- Returns: Updated template

**DELETE /api/templates/:id**
- Delete template
- Returns: Deletion confirmation

**POST /api/templates/:id/apply**
- Apply template to project
- Body: `ApplyTemplateDto`
- Returns: Applied template details

### AdminTemplatesController (`/admin/templates`)

**GET /admin/templates**
- List templates for admin (requires ADMIN role)
- Returns: Template list

**GET /admin/templates/:id**
- Get template by ID (admin)
- Returns: Template details

**POST /admin/templates**
- Create template (admin)
- Returns: Created template

**PUT /admin/templates/:id**
- Update template (admin)
- Returns: Updated template

**DELETE /admin/templates/:id**
- Delete template (admin)
- Returns: Deletion confirmation

## Template Center v1 Requirements

### 1. Prebuilt Templates with Locked KPIs
- System templates (`isSystem: true`) should have locked KPIs
- Locked KPIs cannot be modified when template is applied
- Need `lockedKPIs: string[]` field in Template entity

### 2. Admin Default Template per Org
- Each organization should have a default template
- Admin can set default template
- Need `isDefault: boolean` field in Template entity
- Need `defaultTemplateId` in Organization entity (or separate table)

### 3. Lock Mode
- Templates can be in "lock mode" where KPIs are immutable
- Need `lockMode: boolean` field in Template entity
- When `lockMode: true`, KPIs cannot be modified after project creation

### 4. Project Creation Flows from Template
- Already have `POST /api/templates/:id/apply` endpoint
- Need to ensure it respects lock mode and locked KPIs

### 5. KPI Lego System
- KPI modules attachable to templates
- Need `kpiModules: KPIModule[]` field in Template entity
- Each KPI module should have:
  - `id: string`
  - `name: string`
  - `type: string` (e.g., 'budget', 'timeline', 'quality')
  - `configuration: Record<string, any>`
  - `locked: boolean`

### 6. cmd+K to Add KPI Modules
- Frontend feature, but needs API support
- Need `POST /api/templates/:id/kpi-modules` endpoint
- Need `DELETE /api/templates/:id/kpi-modules/:moduleId` endpoint

### 7. Versioned Templates
- Already have `version: number` field
- Need version history tracking
- Need `templateVersions` table or array in metadata
- Need `GET /api/templates/:id/versions` endpoint
- Need `POST /api/templates/:id/versions` to create new version

## Proposed Data Model Changes

### Template Entity Additions

```typescript
@Entity('templates')
export class Template {
  // ... existing fields ...

  // NEW: Template Center v1 fields
  @Column({ name: 'isDefault', default: false })
  isDefault: boolean;            // Is this the org's default template?

  @Column({ name: 'lockMode', default: false })
  lockMode: boolean;            // Lock KPIs from modification

  @Column({ type: 'jsonb', default: [] })
  lockedKPIs: string[];        // List of KPI IDs that are locked

  @Column({ type: 'jsonb', default: [] })
  kpiModules: KPIModule[];      // Attached KPI modules

  @Column({ type: 'jsonb', nullable: true })
  versionHistory?: TemplateVersion[]; // Version history
}
```

### New Entities Needed

```typescript
// KPI Module entity (or embedded in Template)
interface KPIModule {
  id: string;
  name: string;
  type: 'budget' | 'timeline' | 'quality' | 'resource' | 'custom';
  configuration: Record<string, any>;
  locked: boolean;
  position: number;
}

// Template Version (or embedded in Template.metadata)
interface TemplateVersion {
  version: number;
  createdAt: Date;
  createdBy: string;
  changes: string[];
  snapshot: Partial<Template>;
}
```

### Organization Entity Addition

```typescript
@Entity('organizations')
export class Organization {
  // ... existing fields ...

  @Column({ name: 'defaultTemplateId', nullable: true })
  defaultTemplateId?: string;   // Reference to default template
}
```

## Proposed API Endpoints

### Template Management

**GET /api/templates/default**
- Get organization's default template
- Returns: `{ data: Template | null }`

**POST /api/templates/:id/set-default**
- Set template as organization default (admin only)
- Returns: Updated template

**POST /api/templates/:id/unset-default**
- Unset template as default (admin only)
- Returns: Updated template

**PATCH /api/templates/:id/lock-mode**
- Toggle lock mode (admin only)
- Body: `{ lockMode: boolean }`
- Returns: Updated template

### KPI Module Management

**GET /api/templates/:id/kpi-modules**
- Get all KPI modules for template
- Returns: `{ data: KPIModule[] }`

**POST /api/templates/:id/kpi-modules**
- Add KPI module to template
- Body: `{ module: KPIModule }`
- Returns: Updated template

**DELETE /api/templates/:id/kpi-modules/:moduleId**
- Remove KPI module from template
- Returns: Updated template

**PATCH /api/templates/:id/kpi-modules/:moduleId/lock**
- Lock/unlock a KPI module
- Body: `{ locked: boolean }`
- Returns: Updated template

### Version Management

**GET /api/templates/:id/versions**
- Get version history
- Returns: `{ data: TemplateVersion[] }`

**POST /api/templates/:id/versions**
- Create new version
- Body: `{ changes: string[] }`
- Returns: New version template

**GET /api/templates/:id/versions/:version**
- Get specific version
- Returns: `{ data: Template }`

## Next Steps

1. Review current Template entity and routes
2. Design KPI module structure
3. Plan version history implementation
4. Design lock mode enforcement
5. Plan default template selection UI
6. Design cmd+K integration points




