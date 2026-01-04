import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum MetricUnit {
  COUNT = 'COUNT',
  PERCENT = 'PERCENT',
  HOURS = 'HOURS',
  CURRENCY = 'CURRENCY',
  DAYS = 'DAYS',
}

export enum MetricGrain {
  ORG = 'ORG',
  WORKSPACE = 'WORKSPACE',
  PORTFOLIO = 'PORTFOLIO',
  PROGRAM = 'PROGRAM',
  PROJECT = 'PROJECT',
  RESOURCE = 'RESOURCE',
  WEEK = 'WEEK',
  DAY = 'DAY',
}

@Entity('metric_definitions')
@Unique(['organizationId', 'key'])
@Index(['organizationId', 'workspaceId'])
@Index(['organizationId', 'key'])
export class MetricDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id', nullable: true })
  workspaceId: string | null;

  @Column({ type: 'varchar', length: 120 })
  key: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: MetricUnit,
  })
  unit: MetricUnit;

  @Column({
    type: 'enum',
    enum: MetricGrain,
  })
  grain: MetricGrain;

  @Column({ type: 'jsonb' })
  formula: Record<string, any>;

  @Column({ type: 'jsonb', name: 'default_filters', nullable: true })
  defaultFilters: Record<string, any> | null;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

