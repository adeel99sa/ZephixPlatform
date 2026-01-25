import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'custom_field_values' })
@Index(['workItemId', 'fieldDefinitionId'], { unique: true })
export class CustomFieldValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({ type: 'uuid' })
  workItemId!: string;

  @Column({ type: 'uuid' })
  fieldDefinitionId!: string;

  @Column({ type: 'jsonb' })
  value!: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
