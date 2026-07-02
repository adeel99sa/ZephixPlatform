import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AttributeScope {
  SYSTEM = 'SYSTEM',
  ORG = 'ORG',
  WORKSPACE = 'WORKSPACE',
}

export enum AttributeDataType {
  TEXT = 'text',
  LONG_TEXT = 'long_text',
  NUMBER = 'number',
  INTEGER = 'integer',
  DECIMAL = 'decimal',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  DATE = 'date',
  DATETIME = 'datetime',
  DURATION = 'duration',
  BOOLEAN = 'boolean',
  SINGLE_SELECT = 'single_select',
  MULTI_SELECT = 'multi_select',
  PEOPLE = 'people',
  RELATIONSHIP = 'relationship',
  URL = 'url',
  EMAIL = 'email',
  FILE_REFERENCE = 'file_reference',
  COMPUTED = 'computed',
  RATING = 'rating',
}

@Entity('attribute_definitions')
@Index('idx_attr_def_org', ['organizationId'], {
  where: '"organization_id" IS NOT NULL',
})
@Index('idx_attr_def_workspace', ['workspaceId'], {
  where: '"workspace_id" IS NOT NULL',
})
@Index('idx_attr_def_scope', ['scope'])
@Index('idx_attr_def_data_type', ['dataType'])
export class AttributeDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Bare UUID column — no FK in DB (matches work_tasks convention).
  // SET NULL semantics would violate chk_attr_def_scope_columns CHECK if a FK materialized.
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId!: string | null;

  @Column({
    type: 'enum',
    enum: AttributeScope,
    enumName: 'attribute_scope_enum',
  })
  scope!: AttributeScope;

  // Bare UUID column — no FK in DB (same rationale as organizationId above).
  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId!: string | null;

  @Column({ type: 'varchar', length: 80 })
  key!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({
    name: 'data_type',
    type: 'enum',
    enum: AttributeDataType,
    enumName: 'attribute_data_type_enum',
  })
  dataType!: AttributeDataType;

  @Column({ type: 'boolean', default: false })
  locked!: boolean;

  @Column({ type: 'boolean', default: false })
  required!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'default_value', type: 'text', nullable: true })
  defaultValue!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  options!: Record<string, unknown> | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
