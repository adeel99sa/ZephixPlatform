# Template Center v1 - Migration Plan & Entity Diffs

## Current State Mapping

### Template Entity (`templates` table)
**File:** `zephix-backend/src/modules/templates/entities/template.entity.ts`

**Current Fields:**
- ✅ `id` (UUID, PK)
- ✅ `name` (VARCHAR(100))
- ✅ `description` (TEXT, nullable)
- ✅ `category` (VARCHAR(50), nullable)
- ✅ `kind` (enum: 'project' | 'board' | 'mixed')
- ✅ `icon` (VARCHAR(50), nullable)
- ✅ `isActive` (boolean, default true)
- ✅ `isSystem` (boolean, default false)
- ✅ `organizationId` (nullable) - **EXISTS but nullable, needs to be required**
- ✅ `metadata` (JSONB, nullable)
- ✅ `methodology` (VARCHAR(50), nullable) - legacy
- ✅ `structure` (JSONB, nullable) - legacy
- ✅ `metrics` (JSONB, default [])
- ✅ `version` (int, default 1) - **EXISTS**
- ✅ `createdAt` (timestamp)
- ✅ `updatedAt` (timestamp)

**Missing for v1:**
- ❌ `isDefault` (boolean, default false)
- ❌ `lockState` (VARCHAR: 'UNLOCKED' | 'LOCKED', default 'UNLOCKED')
- ❌ `createdById` (UUID, nullable)
- ❌ `updatedById` (UUID, nullable)
- ❌ `publishedAt` (timestamp, nullable)
- ❌ `archivedAt` (timestamp, nullable)

### ProjectTemplate Entity (`project_templates` table)
**File:** `zephix-backend/src/modules/templates/entities/project-template.entity.ts`

**Decision:** Keep as backward-compatible bridge. Do NOT add v1 fields here. Use Template as master.

### LegoBlock Entity (`lego_blocks` table)
**File:** `zephix-backend/src/modules/templates/entities/lego-block.entity.ts`

**Current Fields:**
- ✅ `id` (UUID, PK)
- ✅ `name` (string)
- ✅ `type` (enum: 'kpi' | 'phase' | 'view' | 'field' | 'automation')
- ✅ `category` (string, nullable) - **EXISTS**
- ✅ `description` (TEXT, nullable)
- ✅ `configuration` (JSONB)
- ✅ `compatibleMethodologies` (JSONB, default [])
- ✅ `requirements` (JSONB, default [])
- ✅ `isSystem` (boolean, default true) - **EXISTS**
- ✅ `organizationId` (nullable)
- ✅ `createdAt` (timestamp)
- ✅ `updatedAt` (timestamp)

**Missing for v1:**
- ❌ `key` (string, unique) - Example: 'kpi.burnup', 'kpi.resource_heatmap'
- ❌ `surface` (JSONB) - Declares what it adds: { dashboards: [], fields: [], automations: [], reports: [] }
- ❌ `isActive` (boolean, default true)
- ❌ `minRoleToAttach` (string) - Example: 'PM', 'ADMIN'

### TemplateBlock Entity (`template_blocks` table)
**Status:** Exists in SQL migration but NO entity file exists

**Current SQL (from migration):**
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
- ❌ `id` (UUID, PK) - Currently composite PK, need single PK
- ❌ `organizationId` (UUID, required)
- ❌ `enabled` (boolean, default true)
- ❌ `displayOrder` (int, default 0) - May map to existing `position`
- ❌ `config` (JSONB, default {}) - May map to existing `configuration_override`
  - Needs: thresholds, fieldMappings, visibilityRules, layout hints
- ❌ `locked` (boolean, default false)

**Note:** Foreign key references `project_templates(id)` but should reference `templates(id)` for v1.

### Project Entity (`projects` table)
**File:** `zephix-backend/src/modules/projects/entities/project.entity.ts`

**Current Fields (from search):**
- ✅ `id` (UUID, PK)
- ✅ `templateId` (UUID, nullable) - **EXISTS**
- ✅ `organizationId` (UUID)
- ✅ `name` (VARCHAR(255))
- ✅ `status` (enum)
- ✅ `createdAt`, `updatedAt`

**Missing for v1:**
- ❌ `templateVersion` (int, nullable)
- ❌ `templateLocked` (boolean, default false)
- ❌ `templateSnapshot` (JSONB, nullable)

---

## Migration Plan

### Phase 0: Pre-check
✅ Ensure baseline migrations exist for:
- `organizations` table
- `users` table
- `workspaces` table
- `projects` table

### Phase 1: Data Model Migrations

#### Migration 1: Add Template v1 fields
**File:** `zephix-backend/src/migrations/XXXXXX-AddTemplateV1Fields.ts`

```typescript
// Add columns to templates table
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS lock_state VARCHAR(20) DEFAULT 'UNLOCKED' CHECK (lock_state IN ('UNLOCKED', 'LOCKED')),
  ADD COLUMN IF NOT EXISTS created_by_id UUID,
  ADD COLUMN IF NOT EXISTS updated_by_id UUID,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

// Make organizationId required (after backfill)
ALTER TABLE templates
  ALTER COLUMN organization_id SET NOT NULL;

// Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_org_default
  ON templates(organization_id)
  WHERE is_default = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_org_name
  ON templates(organization_id, name)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_templates_lock_state
  ON templates(lock_state);

CREATE INDEX IF NOT EXISTS idx_templates_created_by
  ON templates(created_by_id);
```

#### Migration 2: Add LegoBlock v1 fields
**File:** `zephix-backend/src/migrations/XXXXXX-AddLegoBlockV1Fields.ts`

```typescript
// Add columns to lego_blocks table
ALTER TABLE lego_blocks
  ADD COLUMN IF NOT EXISTS key VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS surface JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS min_role_to_attach VARCHAR(50);

// Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_lego_blocks_key
  ON lego_blocks(key)
  WHERE key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lego_blocks_category
  ON lego_blocks(category);

CREATE INDEX IF NOT EXISTS idx_lego_blocks_is_active
  ON lego_blocks(is_active);
```

#### Migration 3: Create/Update TemplateBlocks table
**File:** `zephix-backend/src/migrations/XXXXXX-CreateTemplateBlocksV1.ts`

```typescript
// Drop existing table if it exists (will recreate)
DROP TABLE IF EXISTS template_blocks CASCADE;

// Create new template_blocks table
CREATE TABLE template_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES lego_blocks(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_template_blocks_org_template_block
    UNIQUE (organization_id, template_id, block_id)
);

// Add indexes
CREATE INDEX idx_template_blocks_org_template
  ON template_blocks(organization_id, template_id);

CREATE INDEX idx_template_blocks_org_block
  ON template_blocks(organization_id, block_id);

CREATE INDEX idx_template_blocks_template
  ON template_blocks(template_id);

CREATE INDEX idx_template_blocks_block
  ON template_blocks(block_id);
```

#### Migration 4: Add Project template snapshot fields
**File:** `zephix-backend/src/migrations/XXXXXX-AddProjectTemplateSnapshot.ts`

```typescript
// Add columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS template_version INTEGER,
  ADD COLUMN IF NOT EXISTS template_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_snapshot JSONB;

// Add indexes
CREATE INDEX IF NOT EXISTS idx_projects_template_id
  ON projects(template_id)
  WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_template_locked
  ON projects(template_locked);
```

### Phase 2: Backfill Migration

#### Migration 5: Backfill Template v1 fields
**File:** `zephix-backend/src/migrations/XXXXXX-BackfillTemplateV1Fields.ts`

```typescript
// Backfill organizationId from ProjectTemplate if Template.organizationId is null
UPDATE templates t
SET organization_id = pt.organization_id
FROM project_templates pt
WHERE t.id = pt.id
  AND t.organization_id IS NULL
  AND pt.organization_id IS NOT NULL;

// For remaining null organizationId, set to a default or handle separately
// (This depends on your data - may need manual intervention)

// Backfill isDefault from ProjectTemplate
UPDATE templates t
SET is_default = pt.is_default
FROM project_templates pt
WHERE t.id = pt.id
  AND pt.is_default = true;

// Ensure only one default per org
WITH ranked_defaults AS (
  SELECT
    id,
    organization_id,
    ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at) as rn
  FROM templates
  WHERE is_default = true
)
UPDATE templates
SET is_default = false
WHERE id IN (
  SELECT id FROM ranked_defaults WHERE rn > 1
);

// Set all templates to UNLOCKED initially
UPDATE templates
SET lock_state = 'UNLOCKED'
WHERE lock_state IS NULL;

// Set version to 1 for all templates
UPDATE templates
SET version = 1
WHERE version IS NULL OR version = 0;

// Backfill createdById from ProjectTemplate if available
UPDATE templates t
SET created_by_id = pt.created_by_id
FROM project_templates pt
WHERE t.id = pt.id
  AND t.created_by_id IS NULL
  AND pt.created_by_id IS NOT NULL;
```

#### Migration 6: Backfill TemplateBlocks organizationId
**File:** `zephix-backend/src/migrations/XXXXXX-BackfillTemplateBlocksOrgId.ts`

```typescript
// If template_blocks exists with old structure, migrate it
-- This assumes old table structure exists
-- If not, skip this migration

-- Add organizationId column if migrating from old structure
ALTER TABLE template_blocks
  ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Backfill organizationId from templates
UPDATE template_blocks tb
SET organization_id = t.organization_id
FROM templates t
WHERE tb.template_id = t.id
  AND tb.organization_id IS NULL;

-- Migrate position to displayOrder if needed
ALTER TABLE template_blocks
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

UPDATE template_blocks
SET display_order = position
WHERE display_order = 0 AND position IS NOT NULL;

-- Migrate configuration_override to config
ALTER TABLE template_blocks
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

UPDATE template_blocks
SET config = configuration_override
WHERE config = '{}' AND configuration_override IS NOT NULL;

-- Add enabled column
ALTER TABLE template_blocks
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

-- Add locked column
ALTER TABLE template_blocks
  ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;
```

---

## Entity File Diffs

### 1. Template Entity - Minimal Diff
**File:** `zephix-backend/src/modules/templates/entities/template.entity.ts`

**Add these fields:**
```typescript
@Column({ name: 'isDefault', default: false })
isDefault: boolean;

@Column({
  name: 'lockState',
  type: 'varchar',
  length: 20,
  default: 'UNLOCKED'
})
lockState: 'UNLOCKED' | 'LOCKED';

@Column({ name: 'createdById', type: 'uuid', nullable: true })
createdById?: string;

@Column({ name: 'updatedById', type: 'uuid', nullable: true })
updatedById?: string;

@Column({ name: 'publishedAt', type: 'timestamp', nullable: true })
publishedAt?: Date;

@Column({ name: 'archivedAt', type: 'timestamp', nullable: true })
archivedAt?: Date;
```

**Change this:**
```typescript
// Change from nullable to required
@Column({ name: 'organizationId' })  // Remove nullable: true
organizationId: string;
```

**Add these indexes:**
```typescript
@Index('idx_templates_org_default', ['organizationId'], {
  where: 'isDefault = true',
  unique: true
})
@Index('idx_templates_org_name', ['organizationId', 'name'], {
  where: 'archivedAt IS NULL',
  unique: true
})
```

### 2. LegoBlock Entity - Minimal Diff
**File:** `zephix-backend/src/modules/templates/entities/lego-block.entity.ts`

**Add these fields:**
```typescript
@Column({ unique: true, nullable: true })
key?: string;  // Example: 'kpi.burnup'

@Column({ type: 'jsonb', default: {} })
surface: {
  dashboards?: any[];
  fields?: any[];
  automations?: any[];
  reports?: any[];
};

@Column({ name: 'isActive', default: true })
isActive: boolean;

@Column({ name: 'minRoleToAttach', length: 50, nullable: true })
minRoleToAttach?: string;  // Example: 'PM', 'ADMIN'
```

**Add this index:**
```typescript
@Index('idx_lego_blocks_key', ['key'], { unique: true, where: 'key IS NOT NULL' })
```

### 3. TemplateBlock Entity - NEW FILE
**File:** `zephix-backend/src/modules/templates/entities/template-block.entity.ts`

**Create new entity:**
```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Template } from './template.entity';
import { LegoBlock } from './lego-block.entity';

@Entity('template_blocks')
@Index('idx_template_blocks_org_template', ['organizationId', 'templateId'])
@Index('idx_template_blocks_org_block', ['organizationId', 'blockId'])
@Index('uq_template_blocks_org_template_block', ['organizationId', 'templateId', 'blockId'], { unique: true })
export class TemplateBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @Column({ name: 'block_id' })
  blockId: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ type: 'jsonb', default: {} })
  config: {
    thresholds?: any;
    fieldMappings?: any;
    visibilityRules?: any;
    layoutHints?: any;
  };

  @Column({ default: false })
  locked: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Template)
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @ManyToOne(() => LegoBlock)
  @JoinColumn({ name: 'block_id' })
  block: LegoBlock;
}
```

### 4. Project Entity - Minimal Diff
**File:** `zephix-backend/src/modules/projects/entities/project.entity.ts`

**Add these fields:**
```typescript
@Column({ name: 'templateVersion', type: 'int', nullable: true })
templateVersion?: number;

@Column({ name: 'templateLocked', default: false })
templateLocked: boolean;

@Column({ name: 'templateSnapshot', type: 'jsonb', nullable: true })
templateSnapshot?: {
  templateId: string;
  templateVersion: number;
  blocks: Array<{
    blockId: string;
    enabled: boolean;
    displayOrder: number;
    config: any;
  }>;
  locked: boolean;
};
```

---

## Summary

### Files to Modify:
1. ✅ `template.entity.ts` - Add 6 fields, make organizationId required
2. ✅ `lego-block.entity.ts` - Add 4 fields
3. ✅ `template-block.entity.ts` - **CREATE NEW FILE**
4. ✅ `project.entity.ts` - Add 3 fields

### Migrations to Create:
1. ✅ Add Template v1 fields
2. ✅ Add LegoBlock v1 fields
3. ✅ Create/Update TemplateBlocks table
4. ✅ Add Project template snapshot fields
5. ✅ Backfill Template v1 fields
6. ✅ Backfill TemplateBlocks organizationId

### Routes to Add (separate task):
- See endpoint contract list in user's requirements

---

**Next Step:** Review this plan, then create the migration files and entity diffs.




