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
import { Organization } from '../../../organizations/entities/organization.entity';

/**
 * Resource Daily Load Entity
 * Read model for fast timeline and heatmap views
 * Pre-computed daily load metrics per resource
 */
export type LoadClassification = 'NONE' | 'WARNING' | 'CRITICAL';

@Entity('resource_daily_load')
@Index('idx_rdl_org_resource_date', ['organizationId', 'resourceId', 'date'])
@Index('idx_rdl_org_date', ['organizationId', 'date'])
export class ResourceDailyLoad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'date', type: 'date' })
  date: Date;

  @Column({
    name: 'capacity_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 100,
  })
  capacityPercent: number;

  @Column({
    name: 'hard_load_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  hardLoadPercent: number;

  @Column({
    name: 'soft_load_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  softLoadPercent: number;

  @Column({
    name: 'warning_threshold',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  warningThreshold: number;

  @Column({
    name: 'critical_threshold',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  criticalThreshold: number;

  @Column({
    name: 'hard_cap',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  hardCap: number;

  @Column({
    type: 'enum',
    enum: ['NONE', 'WARNING', 'CRITICAL'],
    default: 'NONE',
  })
  classification: LoadClassification;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Resource)
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
