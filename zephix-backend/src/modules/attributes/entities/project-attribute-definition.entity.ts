import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { AttributeDefinition } from './attribute-definition.entity';

@Entity('project_attribute_definitions')
@Unique('uq_pad_project_def', ['projectId', 'attributeDefinitionId'])
@Index('idx_pad_project', ['projectId'])
@Index('idx_pad_definition', ['attributeDefinitionId'])
@Index('idx_pad_org', ['organizationId'])
@Index('idx_pad_workspace', ['workspaceId'])
export class ProjectAttributeDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'attribute_definition_id', type: 'uuid' })
  attributeDefinitionId!: string;

  @Column({ type: 'boolean', default: false })
  locked!: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  // Bare UUID columns — no FK, matching work_tasks / attribute_definitions convention.
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => AttributeDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_definition_id' })
  attributeDefinition!: AttributeDefinition;
}
