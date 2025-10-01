import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { Project } from '../../projects/entities/project.entity';
import { RiskMitigation } from './risk-mitigation.entity';
import { RiskImpact } from './risk-impact.entity';
import { RiskTrigger } from './risk-trigger.entity';

export enum RiskType {
  SCHEDULE = 'schedule',
  BUDGET = 'budget',
  RESOURCE = 'resource',
  TECHNICAL = 'technical',
  BUSINESS = 'business',
  EXTERNAL = 'external',
}

export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RiskStatus {
  IDENTIFIED = 'identified',
  ASSESSED = 'assessed',
  MITIGATED = 'mitigated',
  ACCEPTED = 'accepted',
  CLOSED = 'closed',
}

@Entity('risks')
@Index('idx_risks_org', ['organizationId'])
@Index('idx_risks_project', ['projectId'])
@Index('idx_risks_severity', ['severity'])
@Index('idx_risks_status', ['status'])
export class Risk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 100 })
  type: RiskType;

  @Column({ type: 'varchar', length: 20 })
  severity: RiskSeverity;

  @Column({ type: 'varchar', length: 50, default: RiskStatus.IDENTIFIED })
  status: RiskStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'mitigation_plan', type: 'text', nullable: true })
  mitigationPlan: string;

  @Column({ 
    name: 'probability', 
    type: 'decimal', 
    precision: 5, 
    scale: 4, 
    default: 0,
    comment: 'Probability as decimal (0.0000 to 1.0000)'
  })
  probability: number; // 0.0 to 1.0

  @Column({ name: 'impact_score', type: 'integer', default: 5 })
  impactScore: number; // 1 to 10

  @Column({ name: 'risk_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  private _riskScore: number; // Calculated: probability * impact_score

  @Column({ name: 'identified_by', type: 'uuid', nullable: true })
  identifiedBy: string;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => RiskMitigation, mitigation => mitigation.risk)
  mitigations: RiskMitigation[];

  @OneToMany(() => RiskImpact, impact => impact.risk)
  impacts: RiskImpact[];

  @OneToMany(() => RiskTrigger, trigger => trigger.risk)
  triggers: RiskTrigger[];

  // Computed properties
  get isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && this.status !== RiskStatus.CLOSED;
  }

  get daysUntilDue(): number {
    if (!this.dueDate) return 0;
    const now = new Date();
    const diffTime = this.dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Business logic methods
  calculateRiskScore(): number {
    this._riskScore = this.probability * this.impactScore;
    return this._riskScore;
  }

  // Getter for calculated risk score
  get riskScore(): number {
    return this._riskScore || (this.probability * (this.impactScore || 0));
  }

  // Getter for probability as percentage
  get probabilityPercentage(): number {
    return this.probability * 100;
  }

  // Helper method for display
  getDisplayProbability(): string {
    return `${(this.probability * 100).toFixed(1)}%`;
  }

  updateStatus(newStatus: RiskStatus): void {
    this.status = newStatus;
    if (newStatus === RiskStatus.CLOSED) {
      this.resolvedAt = new Date();
    }
  }

  isHighPriority(): boolean {
    return this.severity === RiskSeverity.HIGH || this.severity === RiskSeverity.CRITICAL;
  }

  needsAttention(): boolean {
    return this.isOverdue || (this.daysUntilDue <= 3 && this.status !== RiskStatus.CLOSED);
  }
}