import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Resource } from './resource.entity';

@Entity('resource_allocations')
export class ResourceAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resourceId' })
  resourceId: string;

  @Column({ name: 'projectId' })
  projectId: string;

  @Column({ name: 'taskId', nullable: true })
  taskId: string;

  @Column({ name: 'startDate', type: 'date' })
  startDate: Date;

  @Column({ name: 'endDate', type: 'date' })
  endDate: Date;

  @Column({ name: 'allocationPercentage', type: 'numeric', precision: 5, scale: 2 })
  allocationPercentage: number;

  @Column({ name: 'hoursPerDay', default: 8 })
  hoursPerDay: number;

  @Column({ name: 'organization_id', nullable: true })
  organization_id: string;

  @ManyToOne(() => Resource)
  @JoinColumn({ name: 'resourceId' })
  resource: Resource;

  @CreateDateColumn()
  created_at: Date;

  @Column({ name: 'updated_at', nullable: true })
  updated_at: Date;
}
