import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { AttributeDefinition } from './attribute-definition.entity';

@Entity('workspace_enabled_attributes')
@Unique('uq_wea_workspace_def', ['workspaceId', 'attributeDefinitionId'])
@Index('idx_wea_workspace', ['workspaceId'])
export class WorkspaceEnabledAttribute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @Column({ name: 'attribute_definition_id', type: 'uuid' })
  attributeDefinitionId!: string;

  @Column({ name: 'is_visible_by_default', type: 'boolean', default: true })
  isVisibleByDefault!: boolean;

  @Column({ name: 'enabled_at', type: 'timestamptz', default: () => 'NOW()' })
  enabledAt!: Date;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: Workspace;

  @ManyToOne(() => AttributeDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_definition_id' })
  attributeDefinition!: AttributeDefinition;
}
