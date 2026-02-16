import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { KpiDefinitionEntity } from './kpi-definition.entity';

@Entity('project_kpi_values')
@Index(['workspaceId', 'projectId', 'kpiDefinitionId', 'asOfDate'], {
  unique: true,
})
@Index(['workspaceId', 'projectId', 'asOfDate'])
export class ProjectKpiValueEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @Column({ type: 'uuid', name: 'kpi_definition_id' })
  kpiDefinitionId!: string;

  @Column({ type: 'date', name: 'as_of_date' })
  asOfDate!: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, name: 'value_numeric', nullable: true })
  valueNumeric!: string | null;

  @Column({ type: 'text', name: 'value_text', nullable: true })
  valueText!: string | null;

  @Column({ type: 'jsonb', name: 'value_json', nullable: true })
  valueJson!: Record<string, any> | null;

  @Column({ type: 'integer', name: 'sample_size', nullable: true })
  sampleSize!: number | null;

  @Column({
    type: 'timestamptz',
    name: 'computed_at',
    default: () => 'now()',
  })
  computedAt!: Date;

  // Relations
  @ManyToOne(() => KpiDefinitionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kpi_definition_id' })
  kpiDefinition?: KpiDefinitionEntity;
}
