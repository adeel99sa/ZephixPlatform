// src/projects/entities/project.entity.ts
// ENTERPRISE UPDATE: Made organizationId required and added proper indexing

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

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

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum Methodology {
  Waterfall = 'Waterfall',
  Agile = 'Agile',
  Scrum = 'Scrum',
}

@Entity('projects')
@Index('IDX_PROJECT_ORGANIZATION', ['organizationId'])
@Index('IDX_PROJECT_STATUS', ['status'])
@Index('IDX_PROJECT_PRIORITY', ['priority'])
@Index('IDX_PROJECT_MANAGER', ['projectManagerId'])
@Index('IDX_PROJECT_CREATED_BY', ['createdById'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: Methodology,
    default: Methodology.Waterfall,
  })
  methodology: Methodology;

  @Column({ type: 'json', nullable: true })
  stages: string[];

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: ProjectPriority,
    default: ProjectPriority.MEDIUM,
  })
  priority: ProjectPriority;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ name: 'estimated_end_date', type: 'timestamp', nullable: true })
  estimatedEndDate: Date;

  // ENTERPRISE UPDATE: organizationId is now REQUIRED for multi-tenancy
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'project_manager_id', type: 'uuid', nullable: true })
  projectManagerId: string;

  // Budget tracking (PM essential)
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

  // Risk level (you'll want this for PM)
  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.MEDIUM,
  })
  riskLevel: RiskLevel;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToOne(() => Team, (team) => team.project, { cascade: true })
  team: Team;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  // ENTERPRISE UPDATE: Add organization relationship for proper joins
  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
