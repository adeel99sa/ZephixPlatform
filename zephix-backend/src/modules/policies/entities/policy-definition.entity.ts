import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

export enum PolicyCategory {
  GOVERNANCE = 'GOVERNANCE',
  QUALITY = 'QUALITY',
  RESOURCES = 'RESOURCES',
  BUDGET = 'BUDGET',
  SCHEDULE = 'SCHEDULE',
  RISK = 'RISK',
  NOTIFICATIONS = 'NOTIFICATIONS',
  CONFLICT = 'CONFLICT',
  PROGRAM = 'PROGRAM',
}

export enum PolicyValueType {
  BOOLEAN = 'BOOLEAN',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  JSON = 'JSON',
}

@Entity('policy_definitions')
@Unique(['key'])
@Index(['category'])
export class PolicyDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 30 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 10, name: 'value_type' })
  valueType: string;

  @Column({ type: 'jsonb', name: 'default_value' })
  defaultValue: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
