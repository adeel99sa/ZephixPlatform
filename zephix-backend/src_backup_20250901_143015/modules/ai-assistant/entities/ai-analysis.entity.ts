import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { User } from '../../modules/users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

export enum AnalysisStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum AnalysisType {
  BRD_ANALYSIS = 'brd_analysis',
  REQUIREMENT_EXTRACTION = 'requirement_extraction',
  RISK_ASSESSMENT = 'risk_assessment',
  DEPENDENCY_MAPPING = 'dependency_mapping',
  COST_ESTIMATION = 'cost_estimation',
  TIMELINE_ANALYSIS = 'timeline_analysis',
}

export enum ConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

@Entity('ai_analyses')
@Index('IDX_AI_ANALYSIS_ORGANIZATION', ['organizationId'])
@Index('IDX_AI_ANALYSIS_USER', ['userId'])
@Index('IDX_AI_ANALYSIS_STATUS', ['status'])
@Index('IDX_AI_ANALYSIS_TYPE', ['type'])
@Index('IDX_AI_ANALYSIS_CREATED_AT', ['createdAt'])
@Index('IDX_AI_ANALYSIS_DOCUMENT_HASH', ['documentHash'])
@Index('IDX_AI_ANALYSIS_COMPOSITE', ['organizationId', 'status', 'type'])
export class AIAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  documentName: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  documentHash: string;

  @Column({ type: 'varchar', length: 100 })
  documentType: string;

  @Column({ type: 'bigint' })
  documentSize: number;

  @Column({
    type: 'enum',
    enum: AnalysisType,
    default: AnalysisType.BRD_ANALYSIS,
  })
  type: AnalysisType;

  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    default: AnalysisStatus.PENDING,
  })
  status: AnalysisStatus;

  @Column({
    type: 'enum',
    enum: ConfidenceLevel,
    nullable: true,
  })
  confidenceLevel: ConfidenceLevel;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number;

  @Column({ type: 'int', nullable: true })
  processingTimeMs: number;

  @Column({ type: 'jsonb', default: {} })
  analysisResult: {
    extractedRequirements?: Array<{
      id: string;
      text: string;
      category: string;
      priority: string;
      complexity: string;
      estimatedEffort: number;
      dependencies: string[];
    }>;
    identifiedRisks?: Array<{
      id: string;
      description: string;
      probability: string;
      impact: string;
      mitigation: string;
      owner: string;
    }>;
    timelineEstimates?: {
      optimistic: number;
      realistic: number;
      pessimistic: number;
      unit: string;
      confidence: number;
    };
    costEstimates?: {
      development: number;
      testing: number;
      deployment: number;
      maintenance: number;
      total: number;
      currency: string;
    };
    stakeholderMapping?: Array<{
      name: string;
      role: string;
      influence: string;
      requirements: string[];
      concerns: string[];
    }>;
    technicalSpecifications?: {
      architecture: string;
      technologies: string[];
      integrations: string[];
      constraints: string[];
      assumptions: string[];
    };
  };

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    modelVersion: string;
    processingSteps: string[];
    qualityMetrics: Record<string, any>;
    externalServiceCalls: Array<{
      service: string;
      timestamp: Date;
      duration: number;
      success: boolean;
      cost: number;
    }>;
    errorDetails?: {
      code: string;
      message: string;
      stack?: string;
      retryCount: number;
      lastRetryAt?: Date;
    };
  };

  @Column({ type: 'jsonb', default: {} })
  processingOptions: {
    analysisDepth: string;
    extractFields: string[];
    includeMetadata: boolean;
    generateInsights: boolean;
    costLimit: number;
    timeoutSeconds: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  totalCost: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  costCurrency: string;

  @Column({ type: 'jsonb', default: {} })
  auditTrail: Array<{
    action: string;
    timestamp: Date;
    userId: string;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relations
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Lifecycle hooks
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  updateTimestamps() {
    if (this.status === AnalysisStatus.PROCESSING && !this.startedAt) {
      this.startedAt = new Date();
    }

    if (this.status === AnalysisStatus.COMPLETED && !this.completedAt) {
      this.completedAt = new Date();
      this.processingTimeMs = this.startedAt
        ? Date.now() - this.startedAt.getTime()
        : 0;
    }

    if (this.status === AnalysisStatus.FAILED && !this.failedAt) {
      this.failedAt = new Date();
    }
  }

  // Business logic methods
  isActive(): boolean {
    return (
      this.status === AnalysisStatus.PENDING ||
      this.status === AnalysisStatus.PROCESSING
    );
  }

  canRetry(): boolean {
    return (
      this.status === AnalysisStatus.FAILED &&
      this.retryCount < 3 &&
      (!this.nextRetryAt || this.nextRetryAt <= new Date())
    );
  }

  isCompleted(): boolean {
    return this.status === AnalysisStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === AnalysisStatus.FAILED;
  }

  getProgress(): number {
    if (this.status === AnalysisStatus.PENDING) return 0;
    if (this.status === AnalysisStatus.PROCESSING) return 50;
    if (this.status === AnalysisStatus.COMPLETED) return 100;
    if (this.status === AnalysisStatus.FAILED) return 0;
    return 0;
  }

  getEstimatedCompletion(): Date | null {
    if (this.status !== AnalysisStatus.PROCESSING || !this.startedAt) {
      return null;
    }

    // Estimate based on document size and type
    const baseTimeMs = this.documentSize > 1024 * 1024 ? 30000 : 15000; // 30s for large files, 15s for small
    const estimatedEnd = new Date(this.startedAt.getTime() + baseTimeMs);

    return estimatedEnd;
  }

  addAuditEntry(
    action: string,
    userId: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    this.auditTrail.push({
      action,
      timestamp: new Date(),
      userId,
      details,
      ipAddress,
      userAgent,
    });
  }

  updateStatus(
    newStatus: AnalysisStatus,
    userId: string,
    details?: Record<string, any>,
  ): void {
    const oldStatus = this.status;
    this.status = newStatus;

    this.addAuditEntry('status_changed', userId, {
      oldStatus,
      newStatus,
      ...details,
    });
  }

  incrementRetryCount(): void {
    this.retryCount += 1;
    this.nextRetryAt = new Date(
      Date.now() + Math.pow(2, this.retryCount) * 60000,
    ); // Exponential backoff
  }

  addExternalServiceCall(
    service: string,
    duration: number,
    success: boolean,
    cost: number,
  ): void {
    this.metadata.externalServiceCalls.push({
      service,
      timestamp: new Date(),
      duration,
      success,
      cost,
    });

    if (cost > 0) {
      this.totalCost += cost;
    }
  }

  setError(error: Error, userId: string): void {
    this.status = AnalysisStatus.FAILED;
    this.metadata.errorDetails = {
      code: error.name || 'UnknownError',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      retryCount: this.retryCount,
      lastRetryAt: new Date(),
    };

    this.addAuditEntry('error_occurred', userId, {
      error: error.message,
      code: error.name,
    });
  }

  getCostInCurrency(targetCurrency: string): number {
    if (targetCurrency === this.costCurrency) {
      return this.totalCost;
    }

    // TODO: Implement currency conversion service
    // For now, return original cost
    return this.totalCost;
  }

  getAnalysisSummary(): {
    totalRequirements: number;
    totalRisks: number;
    averageConfidence: number;
    estimatedTimeline: number;
    estimatedCost: number;
  } {
    const requirements = this.analysisResult.extractedRequirements?.length || 0;
    const risks = this.analysisResult.identifiedRisks?.length || 0;
    const confidence = this.confidenceScore || 0;
    const timeline = this.analysisResult.timelineEstimates?.realistic || 0;
    const cost = this.analysisResult.costEstimates?.total || 0;

    return {
      totalRequirements: requirements,
      totalRisks: risks,
      averageConfidence: confidence,
      estimatedTimeline: timeline,
      estimatedCost: cost,
    };
  }
}
