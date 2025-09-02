import { Entity, Column, Index, Check } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('resource_allocations')
@Index('idx_allocations_org_user_dates', [
  'organizationId',
  'userId',
  'startDate',
  'endDate',
])
@Index('idx_allocations_project', ['projectId'])
@Check('"start_date" <= "end_date"')
@Check('"allocation_percentage" > 0 AND "allocation_percentage" <= 100')
export class ResourceAllocation extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'work_item_id', type: 'uuid', nullable: true })
  workItemId?: string;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId?: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({
    name: 'allocation_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
  })
  allocationPercentage: number;

  @Column({ name: 'hours_per_day', type: 'int', default: 8 })
  hoursPerDay: number;
}
