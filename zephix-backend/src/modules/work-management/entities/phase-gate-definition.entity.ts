import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { WorkPhase } from './work-phase.entity';

export enum GateDefinitionStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export interface RequiredDocumentsConfig {
  requiredCount?: number | null;
  requiredTags?: string[] | null;
}

export interface RequiredChecklistConfig {
  items: string[];
}

@Entity('phase_gate_definitions')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['phaseId'])
@Unique(['phaseId']) // one active definition per phase for MVP
export class PhaseGateDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'phase_id' })
  phaseId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 120, name: 'gate_key', nullable: true })
  gateKey: string | null;

  @Column({
    type: 'enum',
    enum: GateDefinitionStatus,
    default: GateDefinitionStatus.ACTIVE,
  })
  status: GateDefinitionStatus;

  @Column({ type: 'jsonb', name: 'reviewers_role_policy', nullable: true })
  reviewersRolePolicy: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'required_documents', nullable: true })
  requiredDocuments: RequiredDocumentsConfig | null;

  @Column({ type: 'jsonb', name: 'required_checklist', nullable: true })
  requiredChecklist: RequiredChecklistConfig | null;

  @Column({ type: 'jsonb', nullable: true })
  thresholds: Record<string, unknown> | null;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId: string;

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

  @ManyToOne(() => WorkPhase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phase_id' })
  phase: WorkPhase;
}
