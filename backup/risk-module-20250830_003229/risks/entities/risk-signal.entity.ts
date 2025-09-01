import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from '../../../projects/entities/project.entity';
import { WorkItem } from '../../work-items/entities/work-item.entity';

@Entity('risk_signals')
@Index('idx_risk_signals_project', ['projectId'])
@Index('idx_risk_signals_status', ['status'])
export class RiskSignal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  projectId: string;

  @Column({ nullable: true })
  workItemId: string;

  @Column({ 
    length: 50,
    type: 'varchar'
  })
  signalType: 'OVERALLOCATION' | 'DEADLINE_SLIP';

  @Column({ 
    length: 10,
    type: 'varchar'
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'jsonb' })
  details: Record<string, any>;

  @Column({ 
    length: 15,
    default: 'unack',
    type: 'varchar'
  })
  status: 'unack' | 'ack' | 'resolved';

  @Column({ nullable: true })
  acknowledgedBy: string;

  @Column({ nullable: true })
  acknowledgedAt: Date;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @ManyToOne(() => WorkItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workItemId' })
  workItem: WorkItem;
}
