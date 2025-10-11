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

export enum MitigationStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum MitigationType {
  PREVENTIVE = 'preventive',
  CONTINGENT = 'contingent',
  ACCEPTANCE = 'acceptance',
  TRANSFER = 'transfer',
}

@Entity('risk_mitigations')
@Index('idx_mitigations_risk', ['riskId'])
@Index('idx_mitigations_status', ['status'])
export class RiskMitigation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'risk_id', type: 'uuid' })
  riskId: string;

  @Column({ type: 'varchar', length: 50 })
  type: MitigationType;

  @Column({ type: 'varchar', length: 50, default: MitigationStatus.PLANNED })
  status: MitigationStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'completion_notes', type: 'text', nullable: true })
  completionNotes: string;

  @Column({ name: 'effectiveness_rating', type: 'integer', nullable: true })
  effectivenessRating: number; // 1 to 5

  @Column({ name: 'cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: number;

  @Column({ name: 'effort_hours', type: 'decimal', precision: 8, scale: 2, nullable: true })
  effortHours: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Risk, risk => risk.mitigations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'risk_id' })
  risk: Risk;

  // Computed properties
  get isOverdue(): boolean {
    if (!this.dueDate || this.status === MitigationStatus.COMPLETED) return false;
    return new Date() > this.dueDate;
  }

  get daysUntilDue(): number {
    if (!this.dueDate) return 0;
    const now = new Date();
    const diffTime = this.dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Business logic methods
  markCompleted(notes?: string, effectivenessRating?: number): void {
    this.status = MitigationStatus.COMPLETED;
    this.completedAt = new Date();
    if (notes) this.completionNotes = notes;
    if (effectivenessRating) this.effectivenessRating = effectivenessRating;
  }

  isEffective(): boolean {
    return this.effectivenessRating ? this.effectivenessRating >= 4 : false;
  }

  getProgressPercentage(): number {
    switch (this.status) {
      case MitigationStatus.PLANNED:
        return 0;
      case MitigationStatus.IN_PROGRESS:
        return 50;
      case MitigationStatus.COMPLETED:
        return 100;
      case MitigationStatus.CANCELLED:
        return 0;
      default:
        return 0;
    }
  }
}









