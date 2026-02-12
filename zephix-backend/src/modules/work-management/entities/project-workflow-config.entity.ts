import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Per-project workflow configuration. Stores WIP limits and future
 * flow-control settings. One row per project (unique on project_id).
 */
@Entity('project_workflow_configs')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['organizationId', 'workspaceId', 'projectId'])
@Index(['projectId'], { unique: true })
export class ProjectWorkflowConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  /** Global WIP limit applied to any non-terminal status without a per-status override. Null = unlimited. */
  @Column({ type: 'int', name: 'default_wip_limit', nullable: true })
  defaultWipLimit: number | null;

  /** Per-status WIP overrides, e.g. { "IN_REVIEW": 1, "IN_PROGRESS": 3 }. Null = no overrides. */
  @Column({ type: 'jsonb', name: 'status_wip_limits', nullable: true })
  statusWipLimits: Record<string, number> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
