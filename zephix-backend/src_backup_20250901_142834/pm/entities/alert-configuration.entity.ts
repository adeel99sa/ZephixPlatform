import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../modules/projects/entities/project.entity';

@Entity('alert_configurations')
@Index(['projectId'])
export class AlertConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('varchar', { length: 100 })
  alertType: string; // 'schedule_variance', 'budget_variance', 'risk_threshold', etc.

  @Column('decimal', { precision: 5, scale: 2 })
  threshold: number;

  @Column('varchar', { length: 20 })
  operator: string; // 'greater_than', 'less_than', 'equals'

  @Column('varchar', { length: 20 })
  severity: string; // 'info', 'warning', 'critical'

  @Column('jsonb')
  notificationChannels: {
    email: boolean;
    slack: boolean;
    teams: boolean;
    dashboard: boolean;
    sms: boolean;
  };

  @Column('jsonb')
  recipients: {
    users: string[];
    roles: string[];
    stakeholderTypes: string[];
  };

  @Column('text', { nullable: true })
  customMessage: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('uuid')
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
