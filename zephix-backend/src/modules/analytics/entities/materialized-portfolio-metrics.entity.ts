import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';

/**
 * Phase 8: Materialized Portfolio Metrics Entity
 * Stores pre-calculated portfolio-level health metrics
 */
@Entity('materialized_portfolio_metrics')
@Unique(['organizationId'])
@Index(['organizationId'])
export class MaterializedPortfolioMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id', unique: true })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'integer', default: 0, name: 'green_projects' })
  greenProjects: number;

  @Column({ type: 'integer', default: 0, name: 'yellow_projects' })
  yellowProjects: number;

  @Column({ type: 'integer', default: 0, name: 'red_projects' })
  redProjects: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'total_risk_exposure',
  })
  totalRiskExposure: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

