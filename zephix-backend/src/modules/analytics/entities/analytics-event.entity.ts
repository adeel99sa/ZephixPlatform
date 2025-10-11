import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics_events')
@Index(['organizationId', 'eventName'])
@Index(['timestamp'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_name' })
  eventName: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'jsonb', nullable: true })
  properties?: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}





