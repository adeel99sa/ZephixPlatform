import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
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

  @Column({ name: 'cost_per_hour', type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPerHour: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'resource_type', type: 'varchar', length: 50, default: 'human' })
  resourceType: string;

  @Column({ name: 'invitation_status', type: 'varchar', length: 20, default: 'pending' })
  invitationStatus: string;

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy: string;

  @Column({ name: 'invited_at', type: 'timestamp', nullable: true })
  invitedAt: Date;

  @Column({ name: 'requires_account', type: 'boolean', default: false })
  requiresAccount: boolean;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ name: 'allocation_threshold', type: 'int', default: 100 })
  allocationThreshold: number;

  @Column({ name: 'requires_justification', type: 'boolean', default: false })
  requiresJustification: boolean;

  @Column({ name: 'requires_approval', type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ name: 'approval_required_by', type: 'jsonb', nullable: true })
  approvalRequiredBy: string[];

  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId: string;

  @Column({ name: 'current_allocation', type: 'int', default: 0 })
  currentAllocation: number;

  @Column({ name: 'is_overallocated', type: 'boolean', default: false })
  isOverallocated: boolean;

  @Column({ name: 'warning_threshold', type: 'integer', default: 80 })
  warningThreshold: number;

  @Column({ name: 'critical_threshold', type: 'integer', default: 100 })
  criticalThreshold: number;

  @Column({ name: 'max_threshold', type: 'integer', default: 120 })
  maxThreshold: number;

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

  // Soft delete columns
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy?: string;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deleted_by' })
  deletedByUser?: User;

  @OneToMany(() => ResourceAllocation, allocation => allocation.resource)
  allocations: ResourceAllocation[];

  // Computed properties
  get allocated(): number {
    if (!this.allocations) return 0;
    return this.allocations.reduce((sum, allocation) => sum + allocation.allocationPercentage, 0);
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
