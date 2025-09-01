import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Check } from 'typeorm';

@Entity('resourceAllocations')
@Index('idx_allocations_org_user_dates', ['organizationId', 'userId', 'startDate', 'endDate'])
@Check('"startDate" <= "endDate"')
@Check('"allocationPercentage" BETWEEN 1 AND 100')
export class ResourceAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organizationId' })
  organizationId: string;

  @Column({ name: 'userId' })
  userId: string;

  @Column({ name: 'projectId' })
  projectId: string;

  @Column({ name: 'workItemId', nullable: true })
  workItemId: string;

  @Column({ name: 'startDate', type: 'date' })
  startDate: Date;

  @Column({ name: 'endDate', type: 'date' })
  endDate: Date;

  @Column({ name: 'allocationPercentage' })
  allocationPercentage: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
