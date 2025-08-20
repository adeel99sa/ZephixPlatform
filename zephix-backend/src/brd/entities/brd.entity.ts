import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { BRDAnalysis } from './brd-analysis.entity';

export enum BRDStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
}

@Entity('brds')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'project_id'])
@Index('brds_payload_gin', { synchronize: false }) // GIN index created by migration
@Index('brds_search_idx', { synchronize: false }) // Full-text search index created by migration
export class BRD {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  project_id: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({
    type: 'enum',
    enum: BRDStatus,
    default: BRDStatus.DRAFT,
  })
  @Index()
  status: BRDStatus;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'tsvector', nullable: true, select: false })
  search_vector: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => BRDAnalysis, (analysis) => analysis.brd)
  analyses: BRDAnalysis[];

  // Helper methods to extract data from payload
  getTitle(): string {
    return this.payload?.metadata?.title || 'Untitled BRD';
  }

  getSummary(): string {
    return this.payload?.metadata?.summary || '';
  }

  getIndustry(): string {
    return this.payload?.metadata?.industry || '';
  }

  getDepartment(): string {
    return this.payload?.metadata?.department || '';
  }

  getPriority(): string {
    return this.payload?.metadata?.priority || 'Medium';
  }

  // Status transition methods
  canTransitionTo(newStatus: BRDStatus): boolean {
    const transitions: Record<BRDStatus, BRDStatus[]> = {
      [BRDStatus.DRAFT]: [BRDStatus.IN_REVIEW],
      [BRDStatus.IN_REVIEW]: [BRDStatus.DRAFT, BRDStatus.APPROVED],
      [BRDStatus.APPROVED]: [BRDStatus.PUBLISHED, BRDStatus.DRAFT],
      [BRDStatus.PUBLISHED]: [],
    };

    return transitions[this.status]?.includes(newStatus) || false;
  }

  // Validation helpers
  isComplete(): boolean {
    const metadata = this.payload?.metadata;
    const businessContext = this.payload?.businessContext;

    return !!(
      metadata?.title &&
      metadata?.summary &&
      businessContext?.problemStatement &&
      businessContext?.businessObjective
    );
  }

  isEditable(): boolean {
    return (
      this.status === BRDStatus.DRAFT || this.status === BRDStatus.IN_REVIEW
    );
  }

  hasRequiredSections(): boolean {
    return !!(
      this.payload?.metadata &&
      this.payload?.businessContext &&
      this.payload?.functionalRequirements
    );
  }

  getCompletionPercentage(): number {
    let completedSections = 0;
    const totalSections = 5; // metadata, businessContext, functionalRequirements, etc.

    if (this.payload?.metadata?.title) completedSections++;
    if (this.payload?.businessContext?.problemStatement) completedSections++;
    if (this.payload?.businessContext?.businessObjective) completedSections++;
    if (this.payload?.functionalRequirements?.length > 0) completedSections++;
    if (this.payload?.nonFunctionalRequirements) completedSections++;

    return Math.round((completedSections / totalSections) * 100);
  }

  // Search-related methods
  updateSearchVector(): void {
    const searchableText = [
      this.getTitle(),
      this.getSummary(),
      this.payload?.businessContext?.problemStatement,
      this.payload?.businessContext?.businessObjective,
      this.getIndustry(),
      this.getDepartment(),
    ]
      .filter(Boolean)
      .join(' ');

    // This would typically be handled by a database trigger or search service
    // For now, we'll leave this as a placeholder
  }
}
