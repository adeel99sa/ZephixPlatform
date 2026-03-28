import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { KpiDefinitionEntity as KpiDefinition } from '../../../kpis/entities/kpi-definition.entity';
import { KpiValue } from './kpi-value.entity';

@Entity('project_kpis')
@Index(['projectId', 'kpiDefinitionId'], { unique: true })
export class ProjectKpi {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'kpi_definition_id' })
  kpiDefinitionId: string;

  @Column({ type: 'boolean', name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ type: 'text', name: 'source', default: 'manual' })
  source: string; // manual | computed

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => KpiDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kpi_definition_id' })
  kpiDefinition?: KpiDefinition;

  @OneToMany(() => KpiValue, (v) => v.projectKpi)
  values?: KpiValue[];
}
