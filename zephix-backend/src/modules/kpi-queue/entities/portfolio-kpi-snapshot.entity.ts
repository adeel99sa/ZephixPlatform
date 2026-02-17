import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('portfolio_kpi_snapshots')
@Index(['workspaceId', 'portfolioId', 'asOfDate', 'kpiCode'], { unique: true })
@Index(['workspaceId', 'portfolioId', 'asOfDate'])
@Index(['workspaceId', 'asOfDate'])
export class PortfolioKpiSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @Column({ type: 'uuid', name: 'portfolio_id' })
  portfolioId!: string;

  @Column({ type: 'date', name: 'as_of_date' })
  asOfDate!: string;

  @Column({ type: 'text', name: 'kpi_code' })
  kpiCode!: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, name: 'value_numeric', nullable: true })
  valueNumeric!: string | null;

  @Column({ type: 'jsonb', name: 'value_json', nullable: true })
  valueJson!: Record<string, any> | null;

  @Column({ type: 'text', name: 'input_hash', nullable: true })
  inputHash!: string | null;

  @Column({ type: 'text', name: 'engine_version', default: '1.0.0' })
  engineVersion!: string;

  @Column({ type: 'timestamptz', name: 'computed_at', default: () => 'now()' })
  computedAt!: Date;
}
