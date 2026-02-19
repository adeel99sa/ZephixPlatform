import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  Check,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { WorkTask } from './work-task.entity';

// Forward reference for Program to avoid circular dependency
// Program entity will be imported at runtime if needed

@Entity('work_phases')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['programId'])
@Index(['sortOrder'])
@Index(['workspaceId', 'projectId', 'sortOrder'], {
  where: '"project_id" IS NOT NULL',
})
@Index(['workspaceId', 'programId', 'sortOrder'], {
  where: '"program_id" IS NOT NULL',
})
@Check(
  `("project_id" IS NOT NULL AND "program_id" IS NULL) OR ("project_id" IS NULL AND "program_id" IS NOT NULL)`,
)
export class WorkPhase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ type: 'uuid', name: 'program_id', nullable: true })
  programId: string | null;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'int', name: 'sort_order' })
  sortOrder: number;

  @Column({ type: 'text', name: 'reporting_key' })
  reportingKey: string;

  @Column({ type: 'boolean', name: 'is_milestone', default: false })
  isMilestone: boolean;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate: Date | null;

  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'uuid', name: 'source_template_phase_id', nullable: true })
  sourceTemplatePhaseId: string | null;

  @Column({ type: 'boolean', name: 'is_locked', default: false })
  isLocked: boolean;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'active' })
  status: string; // 'active' | 'completed'

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'uuid', name: 'deleted_by_user_id', nullable: true })
  deletedByUserId: string | null;

  // Relations
  @ManyToOne(() => Project, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  // Program relation - using string to avoid circular dependency
  // Will be properly typed when Program entity is available
  @ManyToOne('Program', { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program: any | null;

  @OneToMany(() => WorkTask, (task) => task.phase)
  tasks: WorkTask[];
}
