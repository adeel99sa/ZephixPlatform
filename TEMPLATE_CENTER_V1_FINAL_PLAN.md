# Template Center v1 - Final Migration Plan

## ✅ All Fixes Applied

### 1. Template Entity Column Name Fixed
- ✅ Changed `@Column({ name: 'organizationId' })` → `@Column({ name: 'organization_id' })`
- ✅ After Migration E, remove `nullable: true` from organizationId

### 2. Migration A CHECK Constraint Idempotent
- ✅ Uses `DO $$ BEGIN IF NOT EXISTS ... END $$;` pattern
- ✅ Checks `pg_constraint` before adding constraint

### 3. Migration C Safe Rename
- ✅ Checks `information_schema.tables` before renaming
- ✅ Only renames if `template_blocks` exists

### 4. Project Entity templateId
- ✅ Migration D checks if `template_id` exists before adding
- ✅ Entity diff only adds if missing (currently missing, so add it)

### 5. Deterministic Mapping Strategy
- ✅ Migration E0: Add `template_id` to `project_templates`
- ✅ Migration E1: Create templates from project_templates (deterministic)
- ✅ Migration E1: Create templates and link project_templates (deterministic, single migration)
- ✅ Migration E: Backfill templates (all have org_id from E1)
- ✅ Migration F: Migrate template_blocks using deterministic path

## Migration Order (Final)

1. **Migration A:** Add Template v1 columns (no NOT NULL yet)
2. **Migration B:** Add LegoBlock v1 columns
3. **Migration C:** Create TemplateBlocks v1 (rename legacy if exists)
4. **Migration D:** Add Project template snapshot columns
5. **Migration E0:** Add `template_id` to `project_templates`
6. **Migration E1:** Create Templates from ProjectTemplates (deterministic)
7. **Migration E1:** Create Templates from ProjectTemplates and Link (deterministic, replaces old E1+E2)
8. **Migration E:** Backfill Templates v1 fields + make org_id NOT NULL
9. **Migration F:** Backfill TemplateBlocks v1 from Legacy

## Entity Diffs (Ready to Apply)

### Template Entity
```typescript
// Add these fields:
@Column({ name: 'is_default', default: false })
isDefault: boolean;

@Column({ name: 'lock_state', type: 'varchar', length: 20, default: 'UNLOCKED' })
lockState: 'UNLOCKED' | 'LOCKED';

@Column({ name: 'created_by_id', type: 'uuid', nullable: true })
createdById?: string;

@Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
updatedById?: string;

@Column({ name: 'published_at', type: 'timestamp', nullable: true })
publishedAt?: Date;

@Column({ name: 'archived_at', type: 'timestamp', nullable: true })
archivedAt?: Date;

// Change organizationId (after Migration E):
@Column({ name: 'organization_id' })  // Remove nullable: true
organizationId: string;

// Add indexes:
@Index('idx_templates_org_default', ['organizationId'], {
  where: 'is_default = true', unique: true
})
@Index('idx_templates_org_name', ['organizationId', 'name'], {
  where: 'archived_at IS NULL', unique: true
})
```

### ProjectTemplate Entity
```typescript
// Add this field:
@Column({ name: 'template_id', type: 'uuid', nullable: true })
templateId?: string;
```

### LegoBlock Entity
```typescript
// Add these fields:
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

// Add index:
@Index('idx_lego_blocks_key', ['key'], { unique: true, where: 'key IS NOT NULL' })
```

### TemplateBlock Entity (NEW FILE)
**File:** `zephix-backend/src/modules/templates/entities/template-block.entity.ts`

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

### Project Entity
```typescript
// Add these fields:
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

## Next Steps

1. ✅ All migrations corrected and ready
2. ✅ All entity diffs documented
3. ⏭️ **Run migrations on fresh DB first** (enforce migration-first rule)
4. ⏭️ Apply entity diffs after migrations pass
5. ⏭️ Add routes and services
6. ⏭️ Add tests

## Safety Features

- ✅ No data loss: Legacy table renamed, not dropped
- ✅ Deterministic mapping: Creates templates from project_templates
- ✅ Fail-fast: Verifies no null org_ids before NOT NULL constraint
- ✅ Idempotent: All migrations can be run multiple times safely
- ✅ Tenancy-safe: All queries use organization_id scoping

