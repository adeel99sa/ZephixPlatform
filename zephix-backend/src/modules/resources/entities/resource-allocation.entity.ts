import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Resource } from './resource.entity';
import { Task } from '../../tasks/entities/task.entity';
import { AllocationType } from '../enums/allocation-type.enum';
import { BookingSource } from '../enums/booking-source.enum';

@Entity('resource_allocations')
@Index('idx_ra_dates', ['startDate', 'endDate'])
@Index('idx_ra_org_resource', ['organizationId', 'resourceId'])
export class ResourceAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'allocation_percentage', type: 'integer', nullable: true })
  allocationPercentage: number;

  @Column({ name: 'task_id', nullable: true })
  taskId: string;

  @Column({ name: 'hours_per_week', type: 'decimal', nullable: true })
  hoursPerWeek: number;

  @Column({
    type: 'enum',
    enum: AllocationType,
    name: 'type',
    nullable: false,
    default: AllocationType.HARD, // Database default for migration backfill
  })
  type: AllocationType;

  @Column({
    type: 'enum',
    enum: BookingSource,
    name: 'booking_source',
    nullable: false,
    default: BookingSource.MANUAL,
  })
  bookingSource: BookingSource;

  @Column({ type: 'text', nullable: true, name: 'justification' })
  justification: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Resource, (resource) => resource.allocations)
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Task;
}
