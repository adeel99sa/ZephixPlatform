import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, Index, Check } from 'typeorm';
import { Team } from './team.entity';

// Enums for backward compatibility
export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on-hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum Methodology {
  Waterfall = 'Waterfall',
  Scrum = 'Scrum',
  Agile = 'Agile'
}

@Entity('projects')
@Index('idx_projects_org', ['organizationId'])
@Index('idx_projects_status', ['status'])
@Check(`status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')`)
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true })
  description: string;

  // @Column({ name: 'templateId', type: 'uuid', nullable: true })
  // templateId: string;

  @Column({ name: 'current_phase', length: 100, nullable: true })
  currentPhase: string;

  @Column({ 
    length: 20,
    default: 'planning',
    type: 'varchar'
  })
  status: ProjectStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'created_by' })
  created_by: string;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @Column({ name: 'priority', default: 'medium' })
  priority: ProjectPriority;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships temporarily commented out to resolve circular dependency
  // @ManyToOne('Template', 'projects')
  // @JoinColumn({ name: 'templateId' })
  // template: any;

  // @OneToMany('WorkItem', 'project')
  // workItems: any[];

  @OneToOne(() => Team, (team) => team.project, { onDelete: 'CASCADE' })
  team: Team;
}
