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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
