import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Phase structure for templates
export interface Phase {
  name: string;
  description: string;
  order: number;
  estimatedDurationDays: number;
}

// Task template structure
export interface TaskTemplate {
  name: string;
  description: string;
  estimatedHours: number;
  phaseOrder: number; // Which phase this task belongs to
  assigneeRole?: string; // Optional role requirement
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// KPI definition structure
export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  methodology: 'agile' | 'waterfall' | 'kanban' | 'hybrid' | 'custom';
  calculationMethod?: string;
  unit?: string;
}

/**
 * LEGACY ENTITY - FROZEN
 *
 * This entity is deprecated. Use Template entity instead.
 *
 * Migration path:
 * - Template entity is now the single authoritative template model
 * - instantiate-v5_1 now uses Template entity
 * - This table remains for backward compatibility
 * - Do not add new features to this entity
 * - Future migration will archive or drop this table
 */
@Entity('project_templates')
@Index('idx_templates_org', ['organizationId'])
@Index('idx_templates_methodology', ['methodology'])
@Index('idx_templates_scope', ['scope'])
export class ProjectTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string; // "Agile Sprint", "Waterfall Project"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['agile', 'waterfall', 'kanban', 'hybrid', 'custom'],
    default: 'custom',
  })
  methodology: 'agile' | 'waterfall' | 'kanban' | 'hybrid' | 'custom';

  @Column({ name: 'phases', type: 'jsonb', default: [] })
  phases: Phase[]; // Pre-configured phases

  @Column({ name: 'task_templates', type: 'jsonb', default: [] })
  taskTemplates: TaskTemplate[]; // Pre-configured tasks

  @Column({ name: 'available_kpis', type: 'jsonb', default: [] })
  availableKPIs: KPIDefinition[]; // All KPIs for this methodology

  @Column({
    name: 'default_enabled_kpis',
    type: 'text',
    array: true,
    default: [],
  })
  defaultEnabledKPIs: string[]; // KPI IDs enabled by default

  @Column({
    type: 'enum',
    enum: ['organization', 'team', 'personal'],
    default: 'organization',
  })
  scope: 'organization' | 'team' | 'personal';

  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId?: string; // If team-specific

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean; // Org-wide default

  @Column({ name: 'is_system', default: false })
  isSystem: boolean; // System template, can't delete

  @Column({ name: 'is_active', default: true })
  isActive: boolean; // For soft archiving

  // Phase 4: Default workspace visibility (optional)
  @Column({ name: 'default_workspace_visibility', length: 20, nullable: true })
  defaultWorkspaceVisibility?: 'public' | 'private';

  // Phase 4: Simplified structure for Phase 4 (phases and tasks)
  // This replaces the complex phases/taskTemplates structure for now
  @Column({ name: 'structure', type: 'jsonb', nullable: true })
  structure?: {
    phases: Array<{
      name: string;
      description?: string;
      order: number;
      tasks: Array<{
        name: string;
        description?: string;
        estimatedHours?: number;
      }>;
    }>;
  };

  // Phase 5: Risk presets
  @Column({ name: 'risk_presets', type: 'jsonb', default: [] })
  riskPresets: Array<{
    id: string; // Template local id
    title: string;
    description?: string;
    category?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    probability?: number; // 0-100 or discrete value
    ownerRoleHint?: string; // Optional role hint for risk owner
    tags?: string[];
  }>;

  // Phase 5: KPI presets
  @Column({ name: 'kpi_presets', type: 'jsonb', default: [] })
  kpiPresets: Array<{
    id: string; // Template local id
    name: string;
    description?: string;
    metricType: string;
    unit: string;
    targetValue?: number | string;
    direction: 'higher_is_better' | 'lower_is_better';
  }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
