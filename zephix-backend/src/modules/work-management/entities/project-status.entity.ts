import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Per-project status definition.
 *
 * Replaces the global `TaskStatus` enum as the source of truth for which
 * statuses exist on a given project, their display labels, colors, ordering,
 * and lifecycle bucket. The `status_key` matches the legacy enum values
 * (BACKLOG / TODO / IN_PROGRESS / BLOCKED / IN_REVIEW / DONE / CANCELED) so
 * application-level string comparisons keep working unchanged.
 *
 * Buckets are `open` / `done` / `cancelled` — the new semantic set used by
 * the rewritten `status-bucket.helper`. Legacy bucket names
 * (`not_started`/`active`/`closed`) are not used in this table.
 */
@Entity('project_statuses')
@Unique('UX_project_statuses_project_key', ['projectId', 'statusKey'])
@Index('IDX_project_statuses_project_id', ['projectId'])
@Index('IDX_project_statuses_org_id', ['organizationId'])
export class ProjectStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  /** Internal key matching legacy enum values (e.g. 'IN_PROGRESS', 'DONE'). */
  @Column({ type: 'varchar', length: 50, name: 'status_key' })
  statusKey: string;

  /** Human-readable label (e.g. 'In Progress', 'Done'). */
  @Column({ type: 'varchar', length: 100, name: 'display_name' })
  displayName: string;

  /** Hex color for UI rendering. */
  @Column({ type: 'varchar', length: 7, default: '#888780' })
  color: string;

  /** Sort order within the project's status list. */
  @Column({ type: 'int', default: 0 })
  order: number;

  /** Lifecycle bucket — drives governance + rollup logic. */
  @Column({ type: 'varchar', length: 20, default: 'open' })
  bucket: string;

  /** The status assigned to new tasks created on this project. */
  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
