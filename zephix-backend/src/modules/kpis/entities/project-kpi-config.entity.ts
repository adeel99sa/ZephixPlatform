import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { KpiDefinitionEntity } from './kpi-definition.entity';

@Entity('project_kpi_configs')
@Index(['workspaceId', 'projectId', 'kpiDefinitionId'], { unique: true })
@Index(['workspaceId', 'projectId'])
export class ProjectKpiConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @Column({ type: 'uuid', name: 'kpi_definition_id' })
  kpiDefinitionId!: string;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @Column({ type: 'jsonb', name: 'threshold_warning', nullable: true })
  thresholdWarning!: Record<string, any> | null;

  @Column({ type: 'jsonb', name: 'threshold_critical', nullable: true })
  thresholdCritical!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  target!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => KpiDefinitionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kpi_definition_id' })
  kpiDefinition?: KpiDefinitionEntity;
}
