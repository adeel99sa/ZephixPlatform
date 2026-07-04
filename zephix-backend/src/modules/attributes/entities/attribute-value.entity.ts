import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { AttributeDefinition } from './attribute-definition.entity';

@Entity('attribute_values')
@Unique('uq_attr_value_task_def', ['workTaskId', 'attributeDefinitionId'])
@Index('idx_attr_val_task', ['workTaskId'])
@Index('idx_attr_val_definition', ['attributeDefinitionId'])
@Index('idx_attr_val_org', ['organizationId'])
@Index('idx_attr_val_workspace', ['workspaceId'])
@Index('idx_attr_val_number', ['attributeDefinitionId', 'valueNumber'], {
  where: '"value_number" IS NOT NULL',
})
@Index('idx_attr_val_text', ['attributeDefinitionId', 'valueText'], {
  where: '"value_text" IS NOT NULL',
})
export class AttributeValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'attribute_definition_id', type: 'uuid' })
  attributeDefinitionId!: string;

  @Column({ name: 'work_task_id', type: 'uuid' })
  workTaskId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText!: string | null;

  @Column({ name: 'value_number', type: 'numeric', nullable: true })
  valueNumber!: number | null;

  @Column({ name: 'value_boolean', type: 'boolean', nullable: true })
  valueBoolean!: boolean | null;

  @Column({ name: 'value_date', type: 'date', nullable: true })
  valueDate!: string | null;

  @Column({ name: 'value_datetime', type: 'timestamptz', nullable: true })
  valueDatetime!: Date | null;

  @Column({ name: 'value_json', type: 'jsonb', nullable: true })
  valueJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => AttributeDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_definition_id' })
  attributeDefinition!: AttributeDefinition;

  @ManyToOne(() => WorkTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_task_id' })
  workTask!: WorkTask;
}
