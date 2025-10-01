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
import { Risk } from './risk.entity';

export enum ImpactType {
  SCHEDULE = 'schedule',
  BUDGET = 'budget',
  QUALITY = 'quality',
  SCOPE = 'scope',
  RESOURCE = 'resource',
  REPUTATION = 'reputation',
  COMPLIANCE = 'compliance',
}

export enum ImpactSeverity {
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  SEVERE = 'severe',
}

@Entity('risk_impacts')
@Index('idx_impacts_risk', ['riskId'])
@Index('idx_impacts_type', ['type'])
export class RiskImpact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'risk_id', type: 'uuid' })
  riskId: string;

  @Column({ type: 'varchar', length: 50 })
  type: ImpactType;

  @Column({ type: 'varchar', length: 20 })
  severity: ImpactSeverity;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'estimated_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ name: 'estimated_delay_days', type: 'integer', nullable: true })
  estimatedDelayDays: number;

  @Column({ name: 'probability', type: 'decimal', precision: 3, scale: 2, default: 0.5 })
  probability: number; // 0.0 to 1.0

  @Column({ name: 'impact_score', type: 'integer', default: 5 })
  impactScore: number; // 1 to 10

  @Column({ name: 'is_actual', type: 'boolean', default: false })
  isActual: boolean; // True if this impact has actually occurred

  @Column({ name: 'occurred_at', type: 'timestamp', nullable: true })
  occurredAt: Date;

  @Column({ name: 'actual_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  actualCost: number;

  @Column({ name: 'actual_delay_days', type: 'integer', nullable: true })
  actualDelayDays: number;

  @Column({ name: 'mitigation_applied', type: 'text', nullable: true })
  mitigationApplied: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Risk, risk => risk.impacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'risk_id' })
  risk: Risk;

  // Computed properties
  get isHighImpact(): boolean {
    return this.severity === ImpactSeverity.HIGH || this.severity === ImpactSeverity.SEVERE;
  }

  get isRealized(): boolean {
    return this.isActual && this.occurredAt !== null;
  }

  get costVariance(): number {
    if (!this.estimatedCost || !this.actualCost) return 0;
    return this.actualCost - this.estimatedCost;
  }

  get delayVariance(): number {
    if (!this.estimatedDelayDays || !this.actualDelayDays) return 0;
    return this.actualDelayDays - this.estimatedDelayDays;
  }

  // Business logic methods
  markAsActual(occurredAt: Date, actualCost?: number, actualDelayDays?: number): void {
    this.isActual = true;
    this.occurredAt = occurredAt;
    if (actualCost !== undefined) this.actualCost = actualCost;
    if (actualDelayDays !== undefined) this.actualDelayDays = actualDelayDays;
  }

  calculateImpactScore(): number {
    // Base score from severity
    const severityScores = {
      [ImpactSeverity.MINIMAL]: 1,
      [ImpactSeverity.LOW]: 3,
      [ImpactSeverity.MODERATE]: 5,
      [ImpactSeverity.HIGH]: 8,
      [ImpactSeverity.SEVERE]: 10,
    };

    let baseScore = severityScores[this.severity] || 5;

    // Adjust for probability
    this.impactScore = Math.round(baseScore * this.probability);
    return this.impactScore;
  }

  getImpactDescription(): string {
    const costText = this.estimatedCost ? `$${this.estimatedCost.toLocaleString()}` : 'Unknown cost';
    const delayText = this.estimatedDelayDays ? `${this.estimatedDelayDays} days` : 'Unknown delay';
    return `${this.severity} ${this.type} impact: ${costText}, ${delayText}`;
  }
}



