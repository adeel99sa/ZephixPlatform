// src/projects/entities/project.entity.ts
// TEMPORARY FIX: Keep PM structure, remove problematic relationships

import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';

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

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ 
    type: 'enum', 
    enum: ProjectStatus, 
    default: ProjectStatus.PLANNING 
  })
  status: ProjectStatus;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ name: 'estimated_end_date', type: 'timestamp', nullable: true })
  estimatedEndDate: Date;

  // PM-specific fields you'll need
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ name: 'project_manager_id', type: 'uuid', nullable: true })
  projectManagerId: string;

  // Budget tracking (PM essential)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({ name: 'actual_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualCost: number;

  // Risk level (you'll want this for PM)
  @Column({ 
    name: 'risk_level',
    type: 'enum', 
    enum: RiskLevel, 
    default: RiskLevel.MEDIUM 
  })
  riskLevel: RiskLevel;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // TODO: Add back when entities are implemented
  // @OneToMany(() => StatusReport, statusReport => statusReport.project)
  // statusReports: StatusReport[];

  // @OneToMany(() => Task, task => task.project)  
  // tasks: Task[];

  // @OneToMany(() => Risk, risk => risk.project)
  // risks: Risk[];

  // @OneToMany(() => Milestone, milestone => milestone.project)
  // milestones: Milestone[];
}
