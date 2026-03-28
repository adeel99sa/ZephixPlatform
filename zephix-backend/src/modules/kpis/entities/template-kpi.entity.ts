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

/**
 * Wave 4B: Template ↔ KPI binding.
 *
 * Links a template to a KPI definition. When a project is instantiated
 * from a template, these bindings auto-create project_kpi_configs.
 */
@Entity('template_kpis')
@Index(['templateId', 'kpiDefinitionId'], { unique: true })
@Index(['templateId'])
export class TemplateKpiEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'template_id' })
  templateId!: string;

  @Column({ type: 'uuid', name: 'kpi_definition_id' })
  kpiDefinitionId!: string;

  @Column({ type: 'boolean', name: 'is_required', default: false })
  isRequired!: boolean;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 4,
    name: 'default_target',
    nullable: true,
  })
  defaultTarget!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => KpiDefinitionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kpi_definition_id' })
  kpiDefinition?: KpiDefinitionEntity;
}
