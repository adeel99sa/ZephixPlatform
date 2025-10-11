import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, Check, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../../auth/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';

@Entity('resource_allocations')
@Index('idx_allocations_project', ['projectId'])
@Check('"startDate" <= "endDate"')
@Check('"allocationPercentage" > 0 AND "allocationPercentage" <= 100')
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

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @Column({ name: 'workItemId', nullable: true })
  workItemId: string;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'updated_at', nullable: true })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'resourceId' })
  resource: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
