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
import { Project } from '../../projects/entities/project.entity';

export enum RiskSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RiskStatus {
  OPEN = 'OPEN',
  MITIGATED = 'MITIGATED',
  ACCEPTED = 'ACCEPTED',
  CLOSED = 'CLOSED',
}

@Entity('work_risks')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['workspaceId', 'projectId', 'updatedAt'])
@Index('IDX_work_risks_exposure', ['projectId', 'exposure'])
@Index('IDX_work_risks_status_filter', ['workspaceId', 'projectId', 'status'])
export class WorkRisk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: RiskSeverity,
    default: RiskSeverity.MEDIUM,
  })
  severity: RiskSeverity;

  @Column({
    type: 'enum',
    enum: RiskStatus,
    default: RiskStatus.OPEN,
  })
  status: RiskStatus;

  @Column({ type: 'integer', default: 3 })
  probability: number;

  @Column({ type: 'integer', default: 3 })
  impact: number;

  /** Computed column: probability * impact. Read-only in TypeORM. */
  @Column({
    type: 'integer',
    insert: false,
    update: false,
    nullable: true,
  })
  exposure: number;

  @Column({ type: 'text', name: 'mitigation_plan', nullable: true })
  mitigationPlan: string | null;

  @Column({ type: 'uuid', name: 'owner_user_id', nullable: true })
  ownerUserId: string | null;

  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
