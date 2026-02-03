import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProjectKpi } from './project-kpi.entity';

@Entity('kpi_values')
@Index(['projectKpiId', 'recordedAt'])
export class KpiValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_kpi_id' })
  projectKpiId: string;

  @Column({ type: 'timestamptz', name: 'recorded_at', default: () => 'now()' })
  recordedAt: Date;

  @Column({ type: 'decimal', precision: 20, scale: 6, name: 'value', nullable: true })
  value: number | null;

  @Column({ type: 'text', name: 'value_text', nullable: true })
  valueText: string | null;

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata: Record<string, any> | null;

  @ManyToOne(() => ProjectKpi, (pk) => pk.values, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_kpi_id' })
  projectKpi?: ProjectKpi;
}
