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

export enum TriggerType {
  THRESHOLD = 'threshold',
  EVENT = 'event',
  CONDITION = 'condition',
  SCHEDULE = 'schedule',
  EXTERNAL = 'external',
}

export enum TriggerStatus {
  ACTIVE = 'active',
  TRIGGERED = 'triggered',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
}

@Entity('risk_triggers')
@Index('idx_triggers_risk', ['riskId'])
@Index('idx_triggers_status', ['status'])
export class RiskTrigger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'risk_id', type: 'uuid' })
  riskId: string;

  @Column({ type: 'varchar', length: 50 })
  type: TriggerType;

  @Column({ type: 'varchar', length: 20, default: TriggerStatus.ACTIVE })
  status: TriggerStatus;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  condition: string; // JSON string or SQL condition

  @Column({ name: 'threshold_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  thresholdValue: number;

  @Column({ name: 'current_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentValue: number;

  @Column({ name: 'triggered_at', type: 'timestamp', nullable: true })
  triggeredAt: Date;

  @Column({ name: 'triggered_by', type: 'uuid', nullable: true })
  triggeredBy: string;

  @Column({ name: 'trigger_data', type: 'jsonb', nullable: true })
  triggerData: any; // Additional data when triggered

  @Column({ name: 'is_automatic', type: 'boolean', default: false })
  isAutomatic: boolean;

  @Column({ name: 'check_frequency', type: 'varchar', length: 20, default: 'daily' })
  checkFrequency: string; // daily, weekly, monthly, real-time

  @Column({ name: 'last_checked', type: 'timestamp', nullable: true })
  lastChecked: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Risk, risk => risk.triggers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'risk_id' })
  risk: Risk;

  // Computed properties
  get isTriggered(): boolean {
    return this.status === TriggerStatus.TRIGGERED && this.triggeredAt !== null;
  }

  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  get needsCheck(): boolean {
    if (!this.isActive || this.isTriggered || this.isExpired) return false;
    
    const now = new Date();
    const lastCheck = this.lastChecked || this.createdAt;
    
    switch (this.checkFrequency) {
      case 'real-time':
        return true;
      case 'daily':
        return (now.getTime() - lastCheck.getTime()) > (24 * 60 * 60 * 1000);
      case 'weekly':
        return (now.getTime() - lastCheck.getTime()) > (7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return (now.getTime() - lastCheck.getTime()) > (30 * 24 * 60 * 60 * 1000);
      default:
        return false;
    }
  }

  get thresholdReached(): boolean {
    if (!this.thresholdValue || !this.currentValue) return false;
    return this.currentValue >= this.thresholdValue;
  }

  // Business logic methods
  trigger(triggeredBy?: string, triggerData?: any): void {
    this.status = TriggerStatus.TRIGGERED;
    this.triggeredAt = new Date();
    if (triggeredBy) this.triggeredBy = triggeredBy;
    if (triggerData) this.triggerData = triggerData;
  }

  reset(): void {
    this.status = TriggerStatus.ACTIVE;
    this.triggeredAt = null;
    this.triggeredBy = null;
    this.triggerData = null;
  }

  updateCurrentValue(value: number): void {
    this.currentValue = value;
    this.lastChecked = new Date();
    
    if (this.thresholdReached && this.isActive) {
      this.trigger();
    }
  }

  disable(): void {
    this.status = TriggerStatus.DISABLED;
    this.isActive = false;
  }

  enable(): void {
    this.status = TriggerStatus.ACTIVE;
    this.isActive = true;
  }

  getStatusDescription(): string {
    switch (this.status) {
      case TriggerStatus.ACTIVE:
        return `Monitoring (${this.checkFrequency})`;
      case TriggerStatus.TRIGGERED:
        return `Triggered on ${this.triggeredAt?.toLocaleDateString()}`;
      case TriggerStatus.DISABLED:
        return 'Disabled';
      case TriggerStatus.EXPIRED:
        return 'Expired';
      default:
        return 'Unknown';
    }
  }
}









