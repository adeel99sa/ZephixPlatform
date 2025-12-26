import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('external_task_events')
@Index(['idempotencyKey'], { unique: true })
@Index(['organizationId'])
@Index(['processedAt'])
export class ExternalTaskEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 500,
    unique: true,
  })
  idempotencyKey: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'external_system', type: 'varchar', length: 50 })
  externalSystem: 'jira' | 'linear' | 'github';

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @Column({
    name: 'processed_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  processedAt: Date;

  @Column({ type: 'varchar', length: 50, default: 'processed' })
  status: 'processed' | 'failed' | 'quarantined';

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;
}
