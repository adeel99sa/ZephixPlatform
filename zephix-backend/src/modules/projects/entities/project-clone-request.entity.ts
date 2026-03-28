import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import {
  ProjectCloneMode,
  ProjectCloneRequestStatus,
} from '../enums/project-clone.enums';

@Entity('project_clone_requests')
@Index(
  'IDX_clone_requests_idempotency',
  ['sourceProjectId', 'targetWorkspaceId', 'mode', 'requestedBy'],
  { unique: true, where: `"status" = 'in_progress'` },
)
@Index('IDX_clone_requests_source', ['sourceProjectId'])
@Index('IDX_clone_requests_status', ['status'])
export class ProjectCloneRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'source_project_id' })
  sourceProjectId: string;

  @Column({ type: 'uuid', name: 'target_workspace_id' })
  targetWorkspaceId: string;

  @Column({ type: 'varchar', length: 30 })
  mode: ProjectCloneMode;

  @Column({ type: 'uuid', name: 'requested_by' })
  requestedBy: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: ProjectCloneRequestStatus.IN_PROGRESS,
  })
  status: ProjectCloneRequestStatus;

  @Column({ type: 'uuid', name: 'new_project_id', nullable: true })
  newProjectId: string | null;

  @Column({ type: 'text', name: 'failure_reason', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;
}
