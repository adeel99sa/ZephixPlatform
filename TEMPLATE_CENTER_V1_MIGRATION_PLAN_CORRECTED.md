# Template Center v1 - Corrected Migration Plan

## Current State (From TEMPLATE_ENTITIES_AND_ROUTES.md)

### Template Entity (`templates` table)
**File:** `zephix-backend/src/modules/templates/entities/template.entity.ts`

**Current Fields:**
- `id` (UUID, PK)
- `name` (VARCHAR(100))
- `description` (TEXT, nullable)
- `category` (VARCHAR(50), nullable)
- `kind` (enum: 'project' | 'board' | 'mixed')
- `icon` (VARCHAR(50), nullable)
- `isActive` (boolean, default true) - maps to `is_active`
- `isSystem` (boolean, default false) - maps to `is_system`
- `organizationId` (nullable) - maps to `organization_id` - **NEEDS TO BE REQUIRED AFTER BACKFILL**
- `metadata` (JSONB, nullable)
- `methodology` (VARCHAR(50), nullable) - legacy
- `structure` (JSONB, nullable) - legacy
- `metrics` (JSONB, default [])
- `version` (int, default 1) - **EXISTS**
- `createdAt` (timestamp) - maps to `created_at`
- `updatedAt` (timestamp) - maps to `updated_at`

**Missing for v1:**
- `isDefault` → `is_default` (boolean, default false)
- `lockState` → `lock_state` (VARCHAR: 'UNLOCKED' | 'LOCKED', default 'UNLOCKED')
- `createdById` → `created_by_id` (UUID, nullable)
- `updatedById` → `updated_by_id` (UUID, nullable)
- `publishedAt` → `published_at` (timestamp, nullable)
- `archivedAt` → `archived_at` (timestamp, nullable)

### ProjectTemplate Entity (`project_templates` table)
**File:** `zephix-backend/src/modules/templates/entities/project-template.entity.ts`

**Current Fields:**
- `id` (UUID, PK)
- `name` (VARCHAR(255))
- `description` (TEXT, nullable)
- `methodology` (enum)
- `phases` (JSONB)
- `taskTemplates` (JSONB)
- `availableKPIs` (JSONB)
- `defaultEnabledKPIs` (TEXT[])
- `scope` (enum)
- `teamId` → `team_id` (UUID, nullable)
- `organizationId` → `organization_id` (UUID, nullable) - **HAS THIS**
- `createdById` → `created_by_id` (UUID, nullable) - **HAS THIS**
- `isDefault` → `is_default` (boolean) - **HAS THIS**
- `isSystem` → `is_system` (boolean)
- `isActive` → `is_active` (boolean)
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`

**Relationship to Template:**
- **CRITICAL:** `templates.id` does NOT equal `project_templates.id` in general
- Need explicit mapping strategy (see backfill migration)

### LegoBlock Entity (`lego_blocks` table)
**File:** `zephix-backend/src/modules/templates/entities/lego-block.entity.ts`

**Current Fields:**
- `id` (UUID, PK)
- `name` (string)
- `type` (enum: 'kpi' | 'phase' | 'view' | 'field' | 'automation')
- `category` (string, nullable) - **EXISTS**
- `description` (TEXT, nullable)
- `configuration` (JSONB)
- `compatibleMethodologies` → `compatible_methodologies` (JSONB)
- `requirements` (JSONB)
- `isSystem` → `is_system` (boolean, default true) - **EXISTS**
- `organizationId` → `organization_id` (nullable) - **KEEP NULLABLE for system blocks**
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`

**Missing for v1:**
- `key` → `key` (string, unique) - Example: 'kpi.burnup'
- `surface` → `surface` (JSONB, default {}) - { dashboards: [], fields: [], automations: [], reports: [] }
- `isActive` → `is_active` (boolean, default true)
- `minRoleToAttach` → `min_role_to_attach` (string, nullable) - Example: 'PM', 'ADMIN'

### TemplateBlocks Table (Legacy)
**File:** `zephix-backend/src/migrations/20240102-create-template-system.sql`

**Current SQL:**
```sql
CREATE TABLE template_blocks (
  template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
  block_id UUID REFERENCES lego_blocks(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  configuration_override JSONB,
  PRIMARY KEY (template_id, block_id)
);
```

**Issues:**
- References `project_templates(id)` - must change to `templates(id)` in v1
- No `organization_id` column
- No `id` (surrogate PK) - currently composite PK
- Missing: `enabled`, `display_order` (may map from `position`), `config` (may map from `configuration_override`), `locked`

### Project Entity (`projects` table)
**File:** `zephix-backend/src/modules/projects/entities/project.entity.ts`

**Current Fields:**
- `id` (UUID, PK)
- `name` (VARCHAR(255))
- `description` (TEXT, nullable)
- `status` (enum)
- `workspaceId` → `workspace_id` (UUID, nullable)
- `organizationId` → `organization_id` (UUID)
- `createdById` → `created_by_id` (UUID, nullable)
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`

**Missing for v1:**
- `templateId` → `template_id` (UUID, nullable) - **CHECK IF EXISTS**
- `templateVersion` → `template_version` (int, nullable)
- `templateLocked` → `template_locked` (boolean, default false)
- `templateSnapshot` → `template_snapshot` (JSONB, nullable)

---

## Corrected Migration Plan

### Migration A: Add Template v1 Columns (No NOT NULL Yet)
**File:** `zephix-backend/src/migrations/XXXXXX-AddTemplateV1Columns.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateV1ColumnsXXXXXX implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns (all nullable initially, will be backfilled)
    await queryRunner.query(`
      ALTER TABLE templates
        ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS lock_state VARCHAR(20) DEFAULT 'UNLOCKED',
        ADD COLUMN IF NOT EXISTS created_by_id UUID,
        ADD COLUMN IF NOT EXISTS updated_by_id UUID,
        ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
    `);

    // Add CHECK constraint for lock_state (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_templates_lock_state'
        ) THEN
          ALTER TABLE templates
          ADD CONSTRAINT chk_templates_lock_state
          CHECK (lock_state IN ('UNLOCKED', 'LOCKED'));
        END IF;
      END $$;
    `);

    // Add indexes (partial unique indexes)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_org_default
        ON templates(organization_id)
        WHERE is_default = true;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_org_name
        ON templates(organization_id, name)
        WHERE archived_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_lock_state
        ON templates(lock_state);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_created_by
        ON templates(created_by_id)
        WHERE created_by_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_created_by;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_lock_state;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_org_name;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_org_default;`);
    await queryRunner.query(`ALTER TABLE templates DROP CONSTRAINT IF EXISTS chk_templates_lock_state;`);
    await queryRunner.query(`
      ALTER TABLE templates
        DROP COLUMN IF EXISTS archived_at,
        DROP COLUMN IF EXISTS published_at,
        DROP COLUMN IF EXISTS updated_by_id,
        DROP COLUMN IF EXISTS created_by_id,
        DROP COLUMN IF EXISTS lock_state,
        DROP COLUMN IF EXISTS is_default;
    `);
  }
}
```

### Migration B: Add LegoBlock v1 Columns
**File:** `zephix-backend/src/migrations/XXXXXX-AddLegoBlockV1Columns.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLegoBlockV1ColumnsXXXXXX implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns
    await queryRunner.query(`
      ALTER TABLE lego_blocks
        ADD COLUMN IF NOT EXISTS key VARCHAR(255),
        ADD COLUMN IF NOT EXISTS surface JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS min_role_to_attach VARCHAR(50);
    `);

    // Add unique index on key (nullable allowed, but unique when set)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_lego_blocks_key
        ON lego_blocks(key)
        WHERE key IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lego_blocks_category
        ON lego_blocks(category)
        WHERE category IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lego_blocks_is_active
        ON lego_blocks(is_active);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lego_blocks_is_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lego_blocks_category;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lego_blocks_key;`);
    await queryRunner.query(`
      ALTER TABLE lego_blocks
        DROP COLUMN IF EXISTS min_role_to_attach,
        DROP COLUMN IF EXISTS is_active,
        DROP COLUMN IF EXISTS surface,
        DROP COLUMN IF EXISTS key;
    `);
  }
}
```

### Migration C: Create TemplateBlocks v1 (Alongside Legacy)
**File:** `zephix-backend/src/migrations/XXXXXX-CreateTemplateBlocksV1.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplateBlocksV1XXXXXX implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if template_blocks exists, then rename to legacy
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'template_blocks'
      );
    `);

    if (tableExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE template_blocks
        RENAME TO template_blocks_legacy;
      `);
    }

    // Create new template_blocks v1 table
    await queryRunner.query(`
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
    `);

    // Add indexes
    await queryRunner.query(`
      CREATE INDEX idx_template_blocks_org_template
        ON template_blocks(organization_id, template_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_template_blocks_org_block
        ON template_blocks(organization_id, block_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_template_blocks_template
        ON template_blocks(template_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_template_blocks_block
        ON template_blocks(block_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS template_blocks CASCADE;`);

    // Check if legacy table exists before renaming
    const legacyExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'template_blocks_legacy'
      );
    `);

    if (legacyExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE template_blocks_legacy
        RENAME TO template_blocks;
      `);
    }
  }
}
```

### Migration D: Add Project Template Snapshot Columns
**File:** `zephix-backend/src/migrations/XXXXXX-AddProjectTemplateSnapshot.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTemplateSnapshotXXXXXX implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if template_id exists first
    const hasTemplateId = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'projects'
        AND column_name = 'template_id';
    `);

    // Add template_id if it doesn't exist
    if (hasTemplateId.length === 0) {
      await queryRunner.query(`
        ALTER TABLE projects
          ADD COLUMN template_id UUID REFERENCES templates(id) ON DELETE SET NULL;
      `);

      // Add index for template_id
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_projects_template_id
          ON projects(template_id)
          WHERE template_id IS NOT NULL;
      `);
    }

    // Add new snapshot columns
    await queryRunner.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS template_version INTEGER,
        ADD COLUMN IF NOT EXISTS template_locked BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS template_snapshot JSONB;
    `);

    // Add index for template_locked
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_template_locked
        ON projects(template_locked);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_template_locked;`);
    // Only drop template_id index if we created it
    const hasTemplateId = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'projects'
        AND column_name = 'template_id';
    `);
    if (hasTemplateId.length > 0) {
      await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_template_id;`);
    }
    await queryRunner.query(`
      ALTER TABLE projects
        DROP COLUMN IF EXISTS template_snapshot,
        DROP COLUMN IF EXISTS template_locked,
        DROP COLUMN IF EXISTS template_version;
    `);
  }
}
```

### Migration E0: Add Template Mapping to ProjectTemplates
**File:** `zephix-backend/src/migrations/XXXXXX-AddTemplateIdToProjectTemplates.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateIdToProjectTemplatesXXXXXX implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add template_id column to project_templates
    await queryRunner.query(`
      ALTER TABLE project_templates
        ADD COLUMN IF NOT EXISTS template_id UUID;
    `);

    // Add index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_templates_template_id
        ON project_templates(template_id)
        WHERE template_id IS NOT NULL;
    `);

    // Add foreign key (deferrable to allow backfill)
    const fkExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_project_templates_template_id'
      );
    `);

    if (!fkExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE project_templates
          ADD CONSTRAINT fk_project_templates_template_id
          FOREIGN KEY (template_id)
          REFERENCES templates(id)
          ON DELETE SET NULL
          DEFERRABLE INITIALLY DEFERRED;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE project_templates
        DROP CONSTRAINT IF EXISTS fk_project_templates_template_id;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_templates_template_id;`);
    await queryRunner.query(`
      ALTER TABLE project_templates
        DROP COLUMN IF EXISTS template_id;
    `);
  }
}
```

### Migration E1: Create Templates from ProjectTemplates and Link (Deterministic)
**File:** `zephix-backend/src/migrations/XXXXXX-CreateAndLinkTemplatesFromProjectTemplates.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAndLinkTemplatesFromProjectTemplatesXXXXXX implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Deterministic mapping: Use temp table to store pt_id -> template_id mapping
    // This ensures every project_template gets a unique template_id with no string matching

    // Step 1: Create temp mapping table
    await queryRunner.query(`
      CREATE TEMP TABLE tmp_pt_template_map (
        pt_id UUID PRIMARY KEY,
        template_id UUID NOT NULL
      ) ON COMMIT DROP;
    `);

    // Step 2: Populate mapping table with generated UUIDs
    await queryRunner.query(`
      INSERT INTO tmp_pt_template_map (pt_id, template_id)
      SELECT
        pt.id AS pt_id,
        gen_random_uuid() AS template_id
      FROM project_templates pt
      WHERE pt.template_id IS NULL
        AND pt.organization_id IS NOT NULL;
    `);

    // Step 3: Insert templates using the mapping
    await queryRunner.query(`
      INSERT INTO templates (
        id,
        name,
        description,
        kind,
        organization_id,
        created_by_id,
        is_active,
        is_system,
        version,
        created_at,
        updated_at,
        is_default,
        lock_state,
        methodology,
        metadata
      )
      SELECT
        m.template_id,
        pt.name,
        pt.description,
        'project' as kind,
        pt.organization_id,
        pt.created_by_id,
        pt.is_active,
        pt.is_system,
        1 as version,
        pt.created_at,
        pt.updated_at,
        pt.is_default,
        'UNLOCKED' as lock_state,
        CASE
          WHEN pt.methodology = 'agile' THEN 'agile'
          WHEN pt.methodology = 'waterfall' THEN 'waterfall'
          WHEN pt.methodology = 'kanban' THEN 'kanban'
          WHEN pt.methodology = 'hybrid' THEN 'hybrid'
          ELSE 'agile'
        END::text as methodology,
        COALESCE(pt.metadata, '{}'::jsonb) || jsonb_build_object('source', 'project_templates_migration_e1') as metadata
      FROM tmp_pt_template_map m
      INNER JOIN project_templates pt ON pt.id = m.pt_id;
    `);

    // Step 4: Update project_templates using only pt_id join (deterministic)
    await queryRunner.query(`
      UPDATE project_templates pt
      SET template_id = m.template_id
      FROM tmp_pt_template_map m
      WHERE pt.id = m.pt_id
        AND pt.template_id IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only revert rows created by this migration (marked in metadata)
    await queryRunner.query(`
      UPDATE project_templates
      SET template_id = NULL
      WHERE template_id IN (
        SELECT id FROM templates
        WHERE metadata->>'source' = 'project_templates_migration_e1'
      );
    `);

    // Optionally delete the templates created by this migration
    // Uncomment if you want full rollback:
    /*
    await queryRunner.query(`
      DELETE FROM templates
      WHERE metadata->>'source' = 'project_templates_migration_e1';
    `);
    */
  }
}
```

**Note:** This migration uses a temp mapping table for fully deterministic linking:
- Creates temp table `tmp_pt_template_map(pt_id PRIMARY KEY, template_id NOT NULL)`
- Inserts mapping rows for project_templates where template_id is null and organization_id is not null
- Inserts templates by joining project_templates to tmp map on pt_id
- Updates project_templates.template_id by joining tmp map on pt_id
- **Links by pt_id only using tmp_pt_template_map. No string matching. No created_at matching.**
- Supports duplicate names within same org
- Down method only touches templates with metadata source marker and clears matching project_templates.template_id values only for those template ids

**Prerequisites:**
- Ensure `pgcrypto` extension exists for `gen_random_uuid()` (or use `uuid-ossp` with `uuid_generate_v4()`)
- Ensure `templates.metadata` is JSONB and nullable (or defaults to `{}`)

### Migration E: Backfill Templates organization_id and Defaults
**File:** `zephix-backend/src/migrations/XXXXXX-BackfillTemplatesV1Fields.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillTemplatesV1FieldsXXXXXX implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // STEP 1: Verify non-system templates have organization_id
    // System templates may legitimately have null organization_id
    const nullOrgs = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM templates
      WHERE organization_id IS NULL
        AND (is_system = false OR is_system IS NULL);
    `);

    if (nullOrgs[0].count > 0) {
      throw new Error(
        `Cannot proceed: ${nullOrgs[0].count} non-system templates have null organization_id. ` +
        `All non-system templates must have organization_id. ` +
        `Check Migration E1 to ensure templates were created correctly.`
      );
    }

    // STEP 2: Ensure only one default per org
    await queryRunner.query(`
      WITH ranked_defaults AS (
        SELECT
          id,
          organization_id,
          ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at) as rn
        FROM templates
        WHERE is_default = true
          AND organization_id IS NOT NULL
      )
      UPDATE templates
      SET is_default = false
      WHERE id IN (
        SELECT id FROM ranked_defaults WHERE rn > 1
      );
    `);

    // STEP 3: Set lock_state to UNLOCKED for all templates (if null)
    await queryRunner.query(`
      UPDATE templates
      SET lock_state = 'UNLOCKED'
      WHERE lock_state IS NULL;
    `);

    // STEP 4: Add CHECK constraint instead of NOT NULL
    // This allows system templates to have null organization_id
    const constraintExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_templates_org_id_for_non_system'
      );
    `);

    if (!constraintExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE templates
          ADD CONSTRAINT chk_templates_org_id_for_non_system
          CHECK (is_system = true OR organization_id IS NOT NULL);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE templates
        DROP CONSTRAINT IF EXISTS chk_templates_org_id_for_non_system;
    `);
  }
}
```

### Migration F: Backfill TemplateBlocks v1 from Legacy
**File:** `zephix-backend/src/migrations/XXXXXX-BackfillTemplateBlocksV1.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillTemplateBlocksV1XXXXXX implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if legacy table exists
    const legacyExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'template_blocks_legacy'
      );
    `);

    if (!legacyExists[0].exists) {
      // No legacy data to migrate
      return;
    }

    // Migrate rows from legacy to v1 using deterministic mapping
    // Path: template_blocks_legacy.template_id -> project_templates.id
    //       -> project_templates.template_id -> templates.id
    await queryRunner.query(`
      INSERT INTO template_blocks (
        organization_id,
        template_id,
        block_id,
        enabled,
        display_order,
        config,
        locked,
        created_at,
        updated_at
      )
      SELECT
        t.organization_id,
        t.id as template_id,
        tbleg.block_id,
        true as enabled,
        COALESCE(tbleg.position, 0) as display_order,
        COALESCE(tbleg.configuration_override, '{}'::jsonb) as config,
        false as locked,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at
      FROM template_blocks_legacy tbleg
      INNER JOIN project_templates pt ON pt.id = tbleg.template_id
      INNER JOIN templates t ON pt.template_id = t.id
      WHERE t.organization_id IS NOT NULL
        AND pt.template_id IS NOT NULL
      ON CONFLICT (organization_id, template_id, block_id) DO NOTHING;
    `);

    // Log any unmapped rows
    const unmapped = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM template_blocks_legacy tbleg
      LEFT JOIN project_templates pt ON pt.id = tbleg.template_id
      LEFT JOIN templates t ON pt.template_id = t.id
      WHERE t.id IS NULL;
    `);

    if (unmapped[0].count > 0) {
      console.warn(
        `Warning: ${unmapped[0].count} template_blocks_legacy rows could not be migrated ` +
        `because their project_templates do not have a template_id mapping.`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Migration is one-way - data stays in template_blocks v1
    // Legacy table can be dropped in a later migration after verification
  }
}
```

---

## Entity File Diffs (Corrected)

### 1. Template Entity
**File:** `zephix-backend/src/modules/templates/entities/template.entity.ts`

**Add these properties with explicit snake_case column names:**
```typescript
@Column({ name: 'is_default', default: false })
isDefault: boolean;

@Column({
  name: 'lock_state',
  type: 'varchar',
  length: 20,
  default: 'UNLOCKED'
})
lockState: 'UNLOCKED' | 'LOCKED';

@Column({ name: 'created_by_id', type: 'uuid', nullable: true })
createdById?: string;

@Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
updatedById?: string;

@Column({ name: 'published_at', type: 'timestamp', nullable: true })
publishedAt?: Date;

@Column({ name: 'archived_at', type: 'timestamp', nullable: true })
archivedAt?: Date;
```

**Keep organizationId nullable (CHECK constraint enforces non-system requirement):**
```typescript
// Keep nullable: true - CHECK constraint in Migration E enforces non-system requirement
@Column({ name: 'organization_id', nullable: true })
organizationId?: string;
```

**Add indexes:**
```typescript
@Index('idx_templates_org_default', ['organizationId'], {
  where: 'is_default = true',
  unique: true
})
@Index('idx_templates_org_name', ['organizationId', 'name'], {
  where: 'archived_at IS NULL',
  unique: true
})
```

### 2. LegoBlock Entity
**File:** `zephix-backend/src/modules/templates/entities/lego-block.entity.ts`

**Add these properties:**
```typescript
@Column({ unique: true, nullable: true })
key?: string;

@Column({ type: 'jsonb', default: {} })
surface: {
  dashboards?: any[];
  fields?: any[];
  automations?: any[];
  reports?: any[];
};

@Column({ name: 'is_active', default: true })
isActive: boolean;

@Column({ name: 'min_role_to_attach', length: 50, nullable: true })
minRoleToAttach?: string;
```

**Add index:**
```typescript
@Index('idx_lego_blocks_key', ['key'], { unique: true, where: 'key IS NOT NULL' })
```

### 3. TemplateBlock Entity (NEW FILE)
**File:** `zephix-backend/src/modules/templates/entities/template-block.entity.ts`

**Create new entity with snake_case column names:**
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

### 4. Project Entity
**File:** `zephix-backend/src/modules/projects/entities/project.entity.ts`

**Current state:** Project entity does NOT have `templateId` field (verified - no templateId property exists).

**Add these properties:**
```typescript
@Column({ name: 'template_id', type: 'uuid', nullable: true })
templateId?: string;

@Column({ name: 'template_version', type: 'int', nullable: true })
templateVersion?: number;

@Column({ name: 'template_locked', default: false })
templateLocked: boolean;

@Column({ name: 'template_snapshot', type: 'jsonb', nullable: true })
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

## Final Migration Order Summary

### Phase 0: Pre-check
✅ Ensure baseline migrations exist for organizations, users, workspaces, projects

### Phase 1: Data Model Migrations

1. **Migration A:** Add Template v1 columns (no NOT NULL yet)
   - Adds: `is_default`, `lock_state`, `created_by_id`, `updated_by_id`, `published_at`, `archived_at`
   - Adds indexes and CHECK constraint (idempotent)

2. **Migration B:** Add LegoBlock v1 columns
   - Adds: `key`, `surface`, `is_active`, `min_role_to_attach`
   - Adds indexes

3. **Migration C:** Create TemplateBlocks v1 (alongside legacy)
   - Renames `template_blocks` → `template_blocks_legacy` (if exists, with existence check)
   - Creates new `template_blocks` table with v1 structure
   - Down path checks existence before renaming back

4. **Migration D:** Add Project template snapshot columns
   - Adds: `template_id` (if missing), `template_version`, `template_locked`, `template_snapshot`
   - Adds indexes

### Phase 2: Mapping and Backfill

5. **Migration E0:** Add `template_id` to `project_templates`
   - Adds mapping column and foreign key (deferrable)

6. **Migration E1:** Create Templates from ProjectTemplates and Link (Deterministic)
   - Single CTE-based migration that creates templates and links project_templates in one statement
   - Uses `gen_random_uuid()` per project_template and captures the mapping
   - No name matching - fully deterministic
   - **Replaces old E1 and E2** (E2 deleted - all references removed)

7. **Migration E:** Backfill Templates v1 fields
   - Verifies non-system templates have `organization_id`
   - Sets defaults, lock_state
   - Adds CHECK constraint: `is_system = true OR organization_id IS NOT NULL`
   - **Does NOT make organization_id NOT NULL** (allows system templates with null org)

8. **Migration F:** Backfill TemplateBlocks v1 from Legacy
   - Migrates rows using deterministic mapping path
   - `template_blocks_legacy` → `project_templates` → `templates`

### Phase 3: Code Rollout
- Add entities with correct snake_case column names
- Add repositories using TenantAwareRepository
- Add routes
- Add tests

## Entity Diffs Summary

### Template Entity
- ✅ Fixed: `organizationId` column name → `organization_id`
- Add: `isDefault` → `is_default`
- Add: `lockState` → `lock_state`
- Add: `createdById` → `created_by_id`
- Add: `updatedById` → `updated_by_id`
- Add: `publishedAt` → `published_at`
- Add: `archivedAt` → `archived_at`
- After Migration E: Remove `nullable: true` from `organizationId`

### ProjectTemplate Entity
**File:** `zephix-backend/src/modules/templates/entities/project-template.entity.ts`

**Add this property:**
```typescript
@Column({ name: 'template_id', type: 'uuid', nullable: true })
templateId?: string;
```

**Note:** This field is added in Migration E0 and populated in Migration E1.

### LegoBlock Entity
- Add: `key` → `key`
- Add: `surface` → `surface`
- Add: `isActive` → `is_active`
- Add: `minRoleToAttach` → `min_role_to_attach`

### TemplateBlock Entity (NEW FILE)
- Create new entity with all v1 fields
- Use snake_case column names throughout

### Project Entity
- Add: `templateId` → `template_id` (if missing)
- Add: `templateVersion` → `template_version`
- Add: `templateLocked` → `template_locked`
- Add: `templateSnapshot` → `template_snapshot`

