import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * @deprecated Use WorkRisk entity (work_risks table) for all new risk operations.
 * This entity maps to the legacy `risks` table which has 0 rows on staging.
 * Canonical risk data lives in `work_risks` (24 rows).
 * Retained only because 9 services still inject this repository.
 * Migration to WorkRisk tracked in PR 2D follow-up.
 */
@Entity('risks')
export class Risk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column()
  type: string;

  @Column()
  severity: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  evidence: any;

  @Column({ default: 'open' })
  status: string;

  @Column({ name: 'detected_at' })
  detectedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  mitigation: any;

  // Phase 5: Source of risk (e.g., 'template_preset', 'detected', 'manual')
  @Column({ nullable: true })
  source?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
