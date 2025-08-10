import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('status_reports')
export class StatusReport {
  @PrimaryGeneratedColumn('uuid') id: string
  
  @Column('uuid', { name: 'project_id' }) projectId: string
  
  @Column('uuid', { name: 'organization_id', nullable: true }) organizationId?: string
  
  // REMOVED Project relationship to prevent circular dependency
  // @ManyToOne(() => Project, p => p.statusReports, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'project_id' }) project: Project
  
  @Column('date', { name: 'report_date' }) reportDate: Date
  
  @Column('date', { name: 'reporting_period_start' }) reportingPeriodStart: Date
  
  @Column('date', { name: 'reporting_period_end' }) reportingPeriodEnd: Date
  
  @Column('varchar', { name: 'overall_status' }) overallStatus: string
  
  @Column('decimal', { precision: 5, scale: 2, name: 'overall_health_score' }) overallHealthScore: number
  
  @Column('varchar', { name: 'stakeholder_audience' }) stakeholderAudience: string
  
  @Column('varchar', { name: 'report_format' }) reportFormat: string
  
  @Column('jsonb', { name: 'report_data', nullable: true }) reportData?: any
  
  @Column('decimal', { precision: 5, scale: 2, name: 'schedule_variance', nullable: true }) scheduleVariance?: number
  
  @Column('decimal', { precision: 5, scale: 2, name: 'budget_variance', nullable: true }) budgetVariance?: number
  
  @Column('decimal', { precision: 5, scale: 2, name: 'scope_completion', nullable: true }) scopeCompletion?: number
  
  @Column('int', { name: 'active_risks', nullable: true }) activeRisks?: number
  
  @Column('int', { name: 'critical_risks', nullable: true }) criticalRisks?: number
  
  @Column('decimal', { precision: 5, scale: 2, name: 'cost_performance_index', nullable: true }) costPerformanceIndex?: number
  
  @Column('decimal', { precision: 5, scale: 2, name: 'schedule_performance_index', nullable: true }) schedulePerformanceIndex?: number
  
  @Column('uuid', { name: 'created_by', nullable: true }) createdBy?: string
  
  @Column('text', { name: 'summary' }) summary: string
  
  @Column('text', { name: 'accomplishments' }) accomplishments: string
  
  @Column('text', { name: 'challenges' }) challenges: string
  
  @Column('text', { name: 'next_steps' }) nextSteps: string
  
  @Column('text', { name: 'risks_issues' }) risksIssues: string
  
  @Column('decimal', { precision: 5, scale: 2, name: 'schedule_performance' }) schedulePerformance: number
  
  @Column('decimal', { precision: 5, scale: 2, name: 'budget_performance' }) budgetPerformance: number
  
  @Column('decimal', { precision: 5, scale: 2, name: 'scope_performance' }) scopePerformance: number
  
  @Column('decimal', { precision: 5, scale: 2, name: 'quality_performance' }) qualityPerformance: number
  
  @Column('decimal', { precision: 5, scale: 2, name: 'resource_performance' }) resourcePerformance: number
  
  @Column('decimal', { precision: 5, scale: 2, name: 'stakeholder_satisfaction' }) stakeholderSatisfaction: number
  
  @Column('decimal', { precision: 5, scale: 2, name: 'team_satisfaction' }) teamSatisfaction: number
  
  @Column('text', { name: 'notes' }) notes: string
  
  @Column('uuid', { name: 'reported_by_id' }) reportedById: string
  
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}
