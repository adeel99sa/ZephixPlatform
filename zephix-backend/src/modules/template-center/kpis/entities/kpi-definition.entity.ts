import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('kpi_definitions')
@Index(['kpiKey'], { unique: true })
export class KpiDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'kpi_key' })
  kpiKey: string;

  @Column({ type: 'text', name: 'name' })
  name: string;

  @Column({ type: 'text', name: 'category' })
  category: string; // schedule, cost, quality, scope, risk, resource, stakeholder, agile

  @Column({ type: 'text', name: 'unit' })
  unit: string; // ratio, percent, currency, count, days, points

  @Column({ type: 'text', name: 'direction' })
  direction: string; // higher_better, lower_better, target_best

  @Column({ type: 'text', name: 'rollup_method' })
  rollupMethod: string; // avg, weighted_avg, sum, min, max, p50, p90, last, count

  @Column({ type: 'text', name: 'weight_field', nullable: true })
  weightField: string | null;

  @Column({ type: 'text', name: 'time_window' })
  timeWindow: string; // current, trailing_7d, trailing_14d, trailing_30d, by_phase, by_sprint, project_lifetime

  @Column({ type: 'jsonb', name: 'formula', nullable: true })
  formula: Record<string, any> | null;

  @Column({ type: 'jsonb', name: 'thresholds', nullable: true })
  thresholds: Record<string, any> | null; // warn, critical

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
