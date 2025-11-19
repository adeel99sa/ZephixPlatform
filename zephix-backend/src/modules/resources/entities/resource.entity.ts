import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../../modules/users/entities/user.entity';
import { ResourceAllocation } from './resource-allocation.entity';

@Entity('resources')
@Index('idx_resources_org', ['organizationId'])
@Index('idx_resources_user', ['userId'])
@Index('idx_resources_active', ['isActive'])
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'name', nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  role: string;

  @Column({ type: 'jsonb', default: [] })
  skills: string[];

  @Column({ name: 'capacity_hours_per_week', type: 'integer', default: 40 })
  capacityHoursPerWeek: number;

  @Column({
    name: 'cost_per_hour',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  costPerHour: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    maxAllocation: number;
    preferredProjects: string[];
    unavailableDates: string[];
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => ResourceAllocation, (allocation) => allocation.resource)
  allocations: ResourceAllocation[];

  // Computed properties
  get allocated(): number {
    if (!this.allocations) return 0;
    return this.allocations.reduce(
      (sum, allocation) => sum + allocation.allocationPercentage,
      0,
    );
  }

  get available(): number {
    return Math.max(0, 100 - this.allocated);
  }

  // Business logic methods
  calculateAvailable(): number {
    return Math.max(0, 100 - this.allocated);
  }

  updateAllocation(): void {
    // This will be called when allocations change
    // The getter will automatically calculate the new values
  }
}
