import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  Unique,
} from 'typeorm';

@Entity('earned_value_snapshots')
@Index(['projectId', 'asOfDate'])
@Unique(['projectId', 'asOfDate'])
export class EarnedValueSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'baseline_id', nullable: true })
  baselineId: string | null;

  @Column({ type: 'date', name: 'as_of_date' })
  asOfDate: string;

  @Column({ type: 'numeric', nullable: true })
  pv: number | null;

  @Column({ type: 'numeric', nullable: true })
  ev: number | null;

  @Column({ type: 'numeric', nullable: true })
  ac: number | null;

  @Column({ type: 'numeric', nullable: true })
  cpi: number | null;

  @Column({ type: 'numeric', nullable: true })
  spi: number | null;

  @Column({ type: 'numeric', nullable: true })
  eac: number | null;

  @Column({ type: 'numeric', nullable: true })
  etc: number | null;

  @Column({ type: 'numeric', nullable: true })
  vac: number | null;

  @Column({ type: 'numeric', nullable: true })
  bac: number | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt: Date;
}
