import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

/**
 * Work Resource Allocation Entity
 *
 * Simple per-project allocation model for MVP.
 * Does not couple to ResourceAvailabilityEngine or complex capacity math.
 */
@Entity('work_resource_allocations')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['workspaceId', 'projectId', 'updatedAt'])
@Unique(['workspaceId', 'projectId', 'userId']) // One allocation per user per project
export class WorkResourceAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'integer', name: 'allocation_percent', default: 100 })
  allocationPercent: number;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate: Date | null;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
