import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Resource } from './resource.entity';

@Entity('resource_conflicts')
@Index(['resourceId', 'conflictDate'])
@Index(['severity'])
@Index('idx_conflicts_org_resource_date', ['organizationId', 'resourceId', 'conflictDate'])
export class ResourceConflict {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @ManyToOne(() => Resource, { nullable: true })
  @JoinColumn({ name: 'resource_id' })
  resource?: Resource;

  @Column({ name: 'conflict_date', type: 'date' })
  conflictDate: Date;

  @Column({ name: 'total_allocation', type: 'decimal', precision: 5, scale: 2 })
  totalAllocation: number; // Will be >100 if overallocated

  @Column({ name: 'affected_projects', type: 'jsonb' })
  affectedProjects: {
    projectId: string;
    projectName: string;
    taskId?: string;
    taskName?: string;
    allocation: number;
  }[];

  @Column()
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column({ default: false })
  resolved: boolean;

  @Column({ name: 'detected_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  detectedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolved_by_user_id', type: 'uuid', nullable: true })
  resolvedByUserId: string | null;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string | null;
}
