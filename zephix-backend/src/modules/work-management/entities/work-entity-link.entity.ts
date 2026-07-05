import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
  Check,
} from 'typeorm';

export enum WorkEntityType {
  TASK = 'TASK',
  RISK = 'RISK',
  // ARTIFACT resolves to project_artifact_items (not project_artifacts envelope).
  // Mirror: entity-relation.service.ts GC_ENDPOINT_TABLES
  ARTIFACT = 'ARTIFACT',
}

export enum WorkRelationType {
  RELATES_TO = 'RELATES_TO',
  // MITIGATES is always stored TASK→RISK (source=TASK, target=RISK).
  // Reversed submissions are silently flipped at the sole-writer seam.
  // Mirror: entity-relation.service.ts normalizeEndpoints()
  MITIGATES = 'MITIGATES',
}

@Entity('work_entity_links')
@Index('idx_wel_source', ['sourceEntityType', 'sourceEntityId'])
@Index('idx_wel_target', ['targetEntityType', 'targetEntityId'])
@Index('idx_wel_workspace', ['workspaceId'])
@Unique('uq_wel_endpoints', [
  'sourceEntityType',
  'sourceEntityId',
  'targetEntityType',
  'targetEntityId',
  'relationType',
])
@Check(
  'chk_no_task_task',
  `NOT (source_entity_type = 'TASK' AND target_entity_type = 'TASK')`,
)
export class WorkEntityLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({
    type: 'enum',
    enum: WorkEntityType,
    name: 'source_entity_type',
    enumName: 'work_entity_type_enum',
  })
  sourceEntityType: WorkEntityType;

  @Column({ type: 'uuid', name: 'source_entity_id' })
  sourceEntityId: string;

  @Column({
    type: 'enum',
    enum: WorkEntityType,
    name: 'target_entity_type',
    enumName: 'work_entity_type_enum',
  })
  targetEntityType: WorkEntityType;

  @Column({ type: 'uuid', name: 'target_entity_id' })
  targetEntityId: string;

  @Column({
    type: 'enum',
    enum: WorkRelationType,
    name: 'relation_type',
    enumName: 'work_relation_type_enum',
  })
  relationType: WorkRelationType;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
