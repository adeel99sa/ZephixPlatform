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
import { Task } from '../../tasks/entities/task.entity';
import { ProjectPhase } from './project-phase.entity';
import { ProjectAssignment } from './project-assignment.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { ResourceAllocation } from '../../resources/entities/resource-allocation.entity';

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on-hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
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
    default: ProjectPriority.MEDIUM
  })
  priority: ProjectPriority;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ name: 'estimated_end_date', type: 'timestamp', nullable: true })
  estimatedEndDate: Date;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string;

  @Column({ name: 'hierarchy_type', type: 'varchar', length: 50, default: 'project' })
  hierarchyType: string;

  @Column({ name: 'hierarchy_path', type: 'text', nullable: true })
  hierarchyPath: string;

  @Column({ name: 'project_manager_id', type: 'uuid', nullable: true })
  projectManagerId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({ name: 'actual_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualCost: number;

  @Column({ 
    name: 'risk_level',
    type: 'varchar',
    default: ProjectRiskLevel.MEDIUM
  })
  riskLevel: ProjectRiskLevel;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdByUser: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'project_manager_id' })
  projectManager: User;

  @ManyToOne(() => Workspace, { nullable: true })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  // Missing database columns
  @Column({ name: 'program_id', type: 'uuid', nullable: true })
  programId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  size: string;

  @Column({ type: 'varchar', length: 50, default: 'agile', nullable: true })
  methodology: string;

  // Missing relations that other entities expect
  @OneToMany(() => Task, task => task.project, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  tasks: Task[];

  @OneToMany(() => ProjectPhase, phase => phase.project, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  phases: ProjectPhase[];

  @OneToMany(() => ProjectAssignment, assignment => assignment.project, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  assignments: ProjectAssignment[];

  @OneToMany(() => ResourceAllocation, allocation => allocation.project, {
    cascade: true,
    onDelete: 'CASCADE'
  })
  resourceAllocations: ResourceAllocation[];

  @ManyToOne(() => Organization, organization => organization.projects)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}