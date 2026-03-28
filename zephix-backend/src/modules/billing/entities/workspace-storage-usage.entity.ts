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
 * Phase 3A: Tracks total storage used per workspace for quota enforcement.
 * Updated atomically on attachment upload completion and deletion.
 */
@Entity('workspace_storage_usage')
@Unique(['organizationId', 'workspaceId'])
@Index(['organizationId'])
export class WorkspaceStorageUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'bigint', name: 'used_bytes', default: 0 })
  usedBytes: number;

  @Column({ type: 'bigint', name: 'reserved_bytes', default: 0 })
  reservedBytes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
