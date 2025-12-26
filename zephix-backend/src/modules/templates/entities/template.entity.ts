import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

@Entity('templates')
@Index('idx_templates_org', ['organizationId'])
@Index('idx_templates_org_default', ['organizationId'], {
  where: 'is_default = true',
  unique: true,
})
@Index('idx_templates_org_name', ['organizationId', 'name'], {
  where: 'archived_at IS NULL',
  unique: true,
})
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  // Phase 4: Extended fields
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 50, nullable: true })
  category?: string;

  @Column({
    type: 'enum',
    enum: ['project', 'board', 'mixed'],
    default: 'project',
  })
  kind: 'project' | 'board' | 'mixed';

  @Column({ length: 50, nullable: true })
  icon?: string; // Icon name or color key

  @Column({ name: 'isActive', default: true })
  isActive: boolean;

  @Column({ name: 'isSystem', default: false })
  isSystem: boolean;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string;

  // Template Center v1 fields
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({
    name: 'lock_state',
    type: 'varchar',
    length: 20,
    default: 'UNLOCKED',
  })
  lockState: 'UNLOCKED' | 'LOCKED';

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById?: string;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt?: Date;

  // Phase 4: Metadata for future extensions
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Legacy fields (kept for backward compatibility)
  @Column({
    length: 50,
    type: 'varchar',
    nullable: true,
  })
  methodology?: 'waterfall' | 'scrum' | 'agile' | 'kanban' | 'hybrid';

  @Column({ type: 'jsonb', nullable: true })
  structure?: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  metrics: string[];

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
