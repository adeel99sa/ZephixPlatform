import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type GovernanceReportStatus = 'GREEN' | 'AMBER' | 'RED';

@Entity('project_governance_reports')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['projectId', 'reportingPeriodStart'])
export class ProjectGovernanceReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 240 })
  title: string;

  @Column({ type: 'date', name: 'reporting_period_start', nullable: true })
  reportingPeriodStart: Date | null;

  @Column({ type: 'date', name: 'reporting_period_end', nullable: true })
  reportingPeriodEnd: Date | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  phase: string | null;

  @Column({ type: 'varchar', length: 16, name: 'overall_status', default: 'AMBER' })
  overallStatus: GovernanceReportStatus;

  @Column({ type: 'varchar', length: 16, name: 'schedule_status', default: 'AMBER' })
  scheduleStatus: GovernanceReportStatus;

  @Column({ type: 'varchar', length: 16, name: 'resource_status', default: 'AMBER' })
  resourceStatus: GovernanceReportStatus;

  @Column({ type: 'text', name: 'executive_summary', nullable: true })
  executiveSummary: string | null;

  @Column({ type: 'text', name: 'current_activities', nullable: true })
  currentActivities: string | null;

  @Column({ type: 'text', name: 'next_week_activities', nullable: true })
  nextWeekActivities: string | null;

  @Column({ type: 'text', name: 'help_needed', nullable: true })
  helpNeeded: string | null;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId: string;

  @Column({ type: 'uuid', name: 'updated_by_user_id', nullable: true })
  updatedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
