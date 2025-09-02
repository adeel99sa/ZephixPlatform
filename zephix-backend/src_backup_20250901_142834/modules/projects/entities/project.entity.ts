import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

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
export class Project extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'status',
    type: 'varchar',
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({
    name: 'priority',
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

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'project_manager_id', type: 'uuid', nullable: true })
  projectManagerId: string;

  @Column({
    name: 'budget',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  budget: number;

  @Column({
    name: 'actual_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  actualCost: number;

  @Column({
    name: 'risk_level',
    type: 'varchar',
    default: ProjectRiskLevel.MEDIUM,
  })
  riskLevel: ProjectRiskLevel;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdByUser: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'project_manager_id' })
  projectManager: User;
}
