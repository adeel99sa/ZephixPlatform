import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'textarea';
export type CustomFieldScope = 'project' | 'task' | 'workspace' | 'all';

@Entity('custom_fields')
@Index(['organizationId', 'name'], { unique: true })
export class CustomField {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { name: 'organization_id' })
  organizationId!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 255 })
  label!: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type!: CustomFieldType;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired!: boolean;

  @Column({ name: 'default_value', type: 'text', nullable: true })
  defaultValue?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  options?: string[] | null; // For select/multiselect

  @Column({ type: 'text', nullable: true })
  placeholder?: string | null;

  @Column({ name: 'help_text', type: 'text', nullable: true })
  helpText?: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'all',
  })
  scope!: CustomFieldScope;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column('uuid', { name: 'created_by' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
