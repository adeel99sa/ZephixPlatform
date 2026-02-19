import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Task } from './task.entity';
// import { ProjectPhase } from './project-phase.entity';
// import { ProjectAssignment } from './project-assignment.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceScoped } from '../../tenancy/workspace-scoped.decorator';
import { Program } from '../../programs/entities/program.entity';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on-hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectState {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum ProjectHealth {
  HEALTHY = 'HEALTHY',
  AT_RISK = 'AT_RISK',
  BLOCKED = 'BLOCKED',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ProjectRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@WorkspaceScoped()
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({
    type: 'varchar',
    default: ProjectPriority.MEDIUM,
  })
  priority: ProjectPriority;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ name: 'estimated_end_date', type: 'timestamp', nullable: true })
  estimatedEndDate: Date;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'project_manager_id', type: 'uuid', nullable: true })
  projectManagerId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({
    name: 'actual_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  actualCost: number;

  // ── Budget & Cost Lite ─────────────────────────────────────────────
  @Column({ type: 'varchar', length: 3, default: 'USD', nullable: true })
  currency: string;

  @Column({
    name: 'labor_rate_mode',
    type: 'varchar',
    length: 20,
    default: 'flatRate',
    nullable: true,
  })
  laborRateMode: string;

  @Column({
    name: 'flat_labor_rate_per_hour',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  flatLaborRatePerHour: number | null;

  @Column({
    name: 'cost_tracking_enabled',
    type: 'boolean',
    default: false,
  })
  costTrackingEnabled: boolean;

  // ── Phase 2B: Waterfall governance fields ───────────────────────────
  @Column({ name: 'waterfall_enabled', type: 'boolean', default: true })
  waterfallEnabled: boolean;

  @Column({ name: 'baselines_enabled', type: 'boolean', default: true })
  baselinesEnabled: boolean;

  @Column({ name: 'earned_value_enabled', type: 'boolean', default: false })
  earnedValueEnabled: boolean;

  // ── Phase 2E: Resource Capacity governance ──────────────────────────
  @Column({ name: 'capacity_enabled', type: 'boolean', default: false })
  capacityEnabled: boolean;

  @Column({ name: 'capacity_mode', type: 'varchar', length: 20, default: 'both' })
  capacityMode: string;

  @Column({
    name: 'risk_level',
    type: 'varchar',
    default: ProjectRiskLevel.MEDIUM,
  })
  riskLevel: ProjectRiskLevel;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Workspace, { nullable: true })
  @JoinColumn({ name: 'workspace_id' })
  workspace?: Workspace;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdByUser: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'project_manager_id' })
  projectManager: User;

  // PHASE 6: Portfolio and Program assignment
  // Project can link to portfolio and/or program
  // If programId provided, portfolioId can be derived from program.portfolioId
  // Both must belong to same workspace as project
  @Column({ name: 'portfolio_id', type: 'uuid', nullable: true })
  portfolioId: string;

  @Column({ name: 'program_id', type: 'uuid', nullable: true })
  programId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  size: string;

  @Column({ type: 'varchar', length: 50, default: 'agile', nullable: true })
  methodology: string;

  // Missing relations that other entities expect
  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  // @OneToMany(() => ProjectPhase, phase => phase.project)
  // phases: ProjectPhase[];

  // @OneToMany(() => ProjectAssignment, assignment => assignment.project)
  // assignments: ProjectAssignment[];

  @ManyToOne(() => Organization, (organization) => organization.projects)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // PHASE 6: Portfolio and Program relations
  @ManyToOne(() => Portfolio, { nullable: true })
  @JoinColumn({ name: 'portfolio_id' })
  portfolio?: Portfolio;

  @ManyToOne(() => Program, (program) => program.projects, { nullable: true })
  @JoinColumn({ name: 'program_id' })
  program?: Program;

  // Template Center v1 fields
  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId?: string;

  @Column({ name: 'template_version', type: 'integer', nullable: true })
  templateVersion?: number;

  @Column({ name: 'template_locked', type: 'boolean', default: false })
  templateLocked: boolean;

  @Column({ name: 'template_snapshot', type: 'jsonb', nullable: true })
  templateSnapshot?: {
    templateId: string;
    templateVersion: number;
    locked: boolean;
    blocks: Array<{
      blockId: string;
      enabled: boolean;
      displayOrder: number;
      config: any;
      locked: boolean;
    }>;
  };

  // Sprint 2: Work state and structure locking
  @Column({
    type: 'varchar',
    length: 50,
    default: ProjectState.DRAFT,
    nullable: true,
  })
  state: ProjectState;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'structure_locked', type: 'boolean', default: false })
  structureLocked: boolean;

  @Column({ name: 'structure_snapshot', type: 'jsonb', nullable: true })
  structureSnapshot: {
    containerType: 'PROJECT' | 'PROGRAM';
    containerId: string;
    templateId: string | null;
    templateVersion: number | null;
    phases: Array<{
      phaseId: string;
      reportingKey: string;
      name: string;
      sortOrder: number;
    }>;
    lockedAt: string;
    lockedByUserId: string;
  } | null;

  // Sprint 3: Health tracking
  @Column({
    type: 'varchar',
    length: 50,
    default: ProjectHealth.HEALTHY,
    nullable: true,
  })
  health: ProjectHealth;

  @Column({ name: 'behind_target_days', type: 'integer', nullable: true })
  behindTargetDays: number | null;

  @Column({ name: 'health_updated_at', type: 'timestamp', nullable: true })
  healthUpdatedAt: Date | null;

  // Sprint 6: Delivery owner for work management
  @Column({ name: 'delivery_owner_user_id', type: 'uuid', nullable: true })
  deliveryOwnerUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'delivery_owner_user_id' })
  deliveryOwner?: User;

  // Phase 7.5: KPI activation state - array of KPI IDs that are active for this project
  @Column({ name: 'active_kpi_ids', type: 'text', array: true, default: [] })
  activeKpiIds: string[];

  // ── Wave 4A: Change Management governance ─────────────────────────
  @Column({ name: 'change_management_enabled', type: 'boolean', default: false })
  changeManagementEnabled: boolean;

  // ── Template Enforcement / Governance ─────────────────────────────
  @Column({ name: 'iterations_enabled', type: 'boolean', default: false })
  iterationsEnabled: boolean;

  // ── Wave 8: Governance source tracking ─────────────────────────────
  @Column({ name: 'governance_source', type: 'text', nullable: true })
  governanceSource: string | null; // USER | TEMPLATE | PORTFOLIO | LEGACY

  @Column({
    name: 'estimation_mode',
    type: 'varchar',
    length: 20,
    default: 'both',
    nullable: true,
  })
  estimationMode: string;

  @Column({
    name: 'default_iteration_length_days',
    type: 'integer',
    nullable: true,
  })
  defaultIterationLengthDays: number | null;

  /** Project-level Definition of Done: ordered list of short strings. */
  @Column({ type: 'jsonb', name: 'definition_of_done', nullable: true })
  definitionOfDone: string[] | null;

  /**
   * Methodology configuration — drives all methodology-specific behavior.
   * Populated at template-apply time; backfilled for existing projects.
   * Service code reads fields like sprint.enabled, phases.gateRequired, etc.
   */
  @Column({ type: 'jsonb', name: 'methodology_config', nullable: true })
  methodologyConfig: Record<string, any> | null;

  // Project clone lineage tracking
  @Column({ type: 'uuid', name: 'source_project_id', nullable: true })
  sourceProjectId: string | null;

  @Column({ type: 'int', name: 'clone_depth', default: 0 })
  cloneDepth: number;

  @Column({ type: 'timestamptz', name: 'cloned_at', nullable: true })
  clonedAt: Date | null;

  @Column({ type: 'uuid', name: 'cloned_by', nullable: true })
  clonedBy: string | null;
}
