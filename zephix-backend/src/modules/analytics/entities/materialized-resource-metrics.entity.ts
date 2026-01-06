import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../modules/users/entities/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';

/**
 * Phase 8: Materialized Resource Metrics Entity
 * Stores pre-calculated resource capacity and workload metrics
 */
@Entity('materialized_resource_metrics')
@Index(['userId'])
@Index(['organizationId'])
@Index(['overloadFlag'])
export class MaterializedResourceMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'capacity_hours',
  })
  capacityHours: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'assigned_hours',
  })
  assignedHours: number;

  @Column({ type: 'boolean', default: false, name: 'overload_flag' })
  overloadFlag: boolean;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'upcoming_load',
  })
  upcomingLoad: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

