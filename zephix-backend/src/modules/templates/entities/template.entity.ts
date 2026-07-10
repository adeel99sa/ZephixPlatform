import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

@Entity('templates')
@Index('idx_templates_org', ['organizationId'])
@Index('idx_templates_org_default', ['organizationId'], {
  where: 'is_default = true',
  unique: true,
})
@Index('idx_templates_org_name', ['organizationId', 'name'], {
  where: 'archived_at IS NULL',
  unique: true,
})
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'template_code', type: 'varchar', length: 100, nullable: true })
  templateCode?: string;

  // Phase 4: Extended fields
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 50, nullable: true })
  category?: string;

  @Column({
    type: 'enum',
    enum: ['project', 'board', 'mixed', 'document', 'form'],
    default: 'project',
  })
  kind: 'project' | 'board' | 'mixed' | 'document' | 'form';

  @Column({ length: 50, nullable: true })
  icon?: string; // Icon name or color key

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string | null;

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

  // Template Center v1 fields
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({
    name: 'lock_state',
    type: 'varchar',
    length: 20,
    default: 'UNLOCKED',
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

  // Phase 4: Metadata for future extensions
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Legacy fields (kept for backward compatibility)
  @Column({
    length: 50,
    type: 'varchar',
    nullable: true,
  })
  methodology?: 'waterfall' | 'scrum' | 'agile' | 'kanban' | 'hybrid';

  @Column({ type: 'jsonb', nullable: true })
  structure?: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  metrics: string[];

  @Column({ default: 1 })
  version: number;

  // TC-B1: catalog "preferred" flag — admin-curated highlight in the Template Center.
  @Column({ name: 'is_preferred', type: 'boolean', default: false })
  isPreferred: boolean;

  // TC-B1: incremented atomically inside instantiate-v5_1 on each successful
  // project creation from this template.
  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  usageCount: number;

  // KPI defaults for template instantiation
  @Column({
    name: 'default_enabled_kpis',
    type: 'text',
    array: true,
    default: [],
  })
  defaultEnabledKPIs: string[]; // KPI IDs enabled by default

  // Sprint 4: Template recommendation fields
  @Column({ name: 'work_type_tags', type: 'text', array: true, default: [] })
  workTypeTags: string[];

  @Column({ name: 'scope_tags', type: 'text', array: true, default: [] })
  scopeTags: string[];

  @Column({
    name: 'complexity_bucket',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  complexityBucket?: string;

  @Column({ name: 'duration_min_days', type: 'integer', nullable: true })
  durationMinDays?: number;

  @Column({ name: 'duration_max_days', type: 'integer', nullable: true })
  durationMaxDays?: number;

  @Column({
    name: 'setup_time_bucket',
    type: 'varchar',
    length: 20,
    default: 'SHORT',
  })
  setupTimeBucket: string;

  @Column({ name: 'structure_summary', type: 'jsonb', nullable: true })
  structureSummary?: Record<string, any>;

  @Column({ name: 'lock_policy', type: 'jsonb', nullable: true })
  lockPolicy?: Record<string, any>;

  // ── Wave 6: Unified template fields (from project_templates) ──────

  @Column({ name: 'delivery_method', type: 'text', nullable: true })
  deliveryMethod?: string; // SCRUM, KANBAN, WATERFALL, HYBRID

  @Column({ name: 'default_tabs', type: 'jsonb', nullable: true })
  defaultTabs?: string[];

  @Column({ name: 'default_governance_flags', type: 'jsonb', nullable: true })
  defaultGovernanceFlags?: Record<string, boolean>;

  /**
   * P-2: Tier 2 column defaults per methodology. Copied to project at creation.
   *
   * A8b widens the inner value to `boolean | string[]` so the same JSONB
   * blob can also carry `visibleTabs: string[]` from the template's
   * defaultTabs. No DB migration — the column is already JSONB.
   */
  @Column({ name: 'column_config', type: 'jsonb', nullable: true })
  columnConfig?: Record<string, boolean | string[]> | null;

  @Column({ name: 'phases', type: 'jsonb', nullable: true })
  phases?: Array<{
    name: string;
    description?: string;
    order: number;
    estimatedDurationDays?: number;
  }>;

  @Column({ name: 'task_templates', type: 'jsonb', nullable: true })
  taskTemplates?: Array<{
    name: string;
    description?: string;
    estimatedHours?: number;
    phaseOrder?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }>;

  @Column({ name: 'risk_presets', type: 'jsonb', default: [] })
  riskPresets?: Array<{
    id: string;
    title: string;
    description?: string;
    category?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;

  @Column({ name: 'is_published', type: 'boolean', default: true })
  isPublished: boolean;

  // ── Wave 1 Track C: Methodology capability toggles ─────────────────
  @Column({ name: 'capabilities', type: 'jsonb', nullable: false, default: () => "'{}'::jsonb" })
  capabilities: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
