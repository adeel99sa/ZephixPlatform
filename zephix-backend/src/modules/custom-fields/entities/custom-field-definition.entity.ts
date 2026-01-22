import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CustomFieldType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'dropdown'
  | 'people'
  | 'email'
  | 'phone'
  | 'url'
  | 'location'
  | 'rating';

@Entity({ name: 'custom_field_definitions' })
@Index(['workspaceId', 'key'], { unique: true })
export class CustomFieldDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'varchar', length: 80 })
  key!: string;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ type: 'varchar', length: 40 })
  type!: CustomFieldType;

  @Column({ type: 'boolean', default: false })
  isRequired!: boolean;

  @Column({ type: 'jsonb', default: {} })
  options!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
