import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ChangeRequestImpactScope,
  ChangeRequestStatus,
} from '../types/change-request.enums';

@Entity({ name: 'change_requests' })
@Index(['workspaceId', 'projectId'])
@Index(['projectId', 'status'])
export class ChangeRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'enum', enum: ChangeRequestImpactScope, name: 'impact_scope' })
  impactScope!: ChangeRequestImpactScope;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, name: 'impact_cost' })
  impactCost!: string | null;

  @Column({ type: 'int', nullable: true, name: 'impact_days' })
  impactDays!: number | null;

  @Column({
    type: 'enum',
    enum: ChangeRequestStatus,
    default: ChangeRequestStatus.DRAFT,
  })
  status!: ChangeRequestStatus;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId!: string;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by_user_id' })
  approvedByUserId!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'approved_at' })
  approvedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'rejected_by_user_id' })
  rejectedByUserId!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'rejected_at' })
  rejectedAt!: Date | null;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'implemented_by_user_id' })
  implementedByUserId!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'implemented_at' })
  implementedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
