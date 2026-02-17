import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Wave 4A KPI Definition entity.
 *
 * Maps to the existing `kpi_definitions` table (shared with Template Center).
 * Property `code` maps to the existing `kpi_key` column to avoid column rename.
 */
@Entity('kpi_definitions')
@Index(['code'], { unique: true })
export class KpiDefinitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Unique short code, maps to existing kpi_key column. */
  @Column({ type: 'text', name: 'kpi_key' })
  code!: string;

  /** Backward-compatible alias for Template Center code that references kpiKey. */
  get kpiKey(): string {
    return this.code;
  }

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  category!: string;

  @Column({ type: 'text' })
  unit!: string;

  // ── Existing Template Center columns (mapped for completeness) ─────
  @Column({ type: 'text', nullable: true })
  direction!: string | null;

  @Column({ type: 'text', name: 'rollup_method', nullable: true })
  rollupMethod!: string | null;

  @Column({ type: 'text', name: 'weight_field', nullable: true })
  weightField!: string | null;

  @Column({ type: 'text', name: 'time_window', nullable: true })
  timeWindow!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  formula!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  thresholds!: Record<string, any> | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  // ── Wave 4A new columns ────────────────────────────────────────────
  @Column({ type: 'text', name: 'lifecycle_phase', default: 'EXECUTION' })
  lifecyclePhase!: string;

  @Column({ type: 'text', name: 'formula_type', default: 'SIMPLE' })
  formulaType!: string;

  @Column({ type: 'jsonb', name: 'data_sources', default: '[]' })
  dataSources!: string[];

  @Column({ type: 'text', name: 'required_governance_flag', nullable: true })
  requiredGovernanceFlag!: string | null;

  @Column({ type: 'boolean', name: 'is_leading', default: false })
  isLeading!: boolean;

  @Column({ type: 'boolean', name: 'is_lagging', default: true })
  isLagging!: boolean;

  @Column({ type: 'boolean', name: 'default_enabled', default: false })
  defaultEnabled!: boolean;

  @Column({ type: 'text', name: 'calculation_strategy', default: 'manual' })
  calculationStrategy!: string;

  /** true = system/global KPI, false = custom org-level KPI. */
  @Column({ type: 'boolean', name: 'is_system', default: true })
  isSystem!: boolean;

  /** null for system KPIs, set for org-custom KPIs. */
  @Column({ type: 'uuid', name: 'organization_id', nullable: true })
  organizationId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
