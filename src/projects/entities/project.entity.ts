import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Check, OneToMany } from 'typeorm';
import { ProjectStatus, ProjectPriority, Methodology } from '../../shared/enums/project.enums';
import { ProjectAssignment } from './project-assignment.entity';

@Entity('projects')
@Index('idx_projects_org', ['organizationId'])
@Index('idx_projects_status', ['status'])
@Check(`status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')`)
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

  // Team relationship removed - team entity doesn't exist
  // @OneToOne(() => Team, (team) => team.project, { onDelete: 'CASCADE' })
  // team: Team;

  // Project assignments relationship
  @OneToMany(() => ProjectAssignment, (assignment) => assignment.project)
  assignments: ProjectAssignment[];
}
