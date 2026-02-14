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
 * Phase 2E: Workspace Member Capacity
 *
 * Per-user daily capacity calendar. One row = one user's available hours
 * on one day in one workspace. Default 8 hours when no override exists.
 */
@Entity('workspace_member_capacity')
@Unique('UQ_wmc_org_ws_user_date', [
  'organizationId',
  'workspaceId',
  'userId',
  'date',
])
@Index('IDX_wmc_org_ws_date', ['organizationId', 'workspaceId', 'date'])
@Index('IDX_wmc_org_ws_user_date', [
  'organizationId',
  'workspaceId',
  'userId',
  'date',
])
export class WorkspaceMemberCapacity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    name: 'capacity_hours',
    default: 8,
  })
  capacityHours: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
