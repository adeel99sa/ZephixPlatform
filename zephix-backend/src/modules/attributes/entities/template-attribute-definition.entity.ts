import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Template } from '../../templates/entities/template.entity';
import { AttributeDefinition } from './attribute-definition.entity';

@Entity('template_attribute_definitions')
@Unique('uq_tad_template_def', ['templateId', 'attributeDefinitionId'])
@Index('idx_tad_template', ['templateId'])
@Index('idx_tad_definition', ['attributeDefinitionId'])
export class TemplateAttributeDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string;

  @Column({ name: 'attribute_definition_id', type: 'uuid' })
  attributeDefinitionId!: string;

  @Column({ type: 'boolean', default: false })
  locked!: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  // DRIFT REGISTER WC-002: consumes deprecated modules/templates entity per Track A FK ruling.
  // FK points to templates(id); re-point to template_definitions(id) when AD-029 closes (Engine 4).
  @ManyToOne(() => Template, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template!: Template;

  @ManyToOne(() => AttributeDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_definition_id' })
  attributeDefinition!: AttributeDefinition;
}
