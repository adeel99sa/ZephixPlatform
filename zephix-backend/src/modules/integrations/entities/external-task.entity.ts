import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Resource } from '../../resources/entities/resource.entity';
import { Organization } from '../../../organizations/entities/organization.entity';

@Entity('external_tasks')
@Index(['organizationId', 'externalSystem', 'externalId'], { unique: true })
@Index(['organizationId', 'resourceId', 'dueDate'])
export class ExternalTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId?: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string;

  @Column({ name: 'external_system', type: 'varchar', length: 50 })
  externalSystem: 'jira' | 'linear' | 'github';

  @Column({ name: 'external_id', type: 'varchar', length: 255 })
  externalId: string;

  @Column({
    name: 'external_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  externalUrl?: string;

  @Column({
    name: 'assignee_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  assigneeEmail?: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: Date;

  @Column({
    name: 'estimate_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  estimateHours?: number;

  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload?: any;

  @Column({ name: 'last_synced_at', type: 'timestamp' })
  lastSyncedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Resource, { nullable: true })
  @JoinColumn({ name: 'resource_id' })
  resource?: Resource;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
