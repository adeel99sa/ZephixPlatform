import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('lego_blocks')
@Index('idx_lego_blocks_key', ['key'], {
  unique: true,
  where: 'key IS NOT NULL',
})
export class LegoBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: 'kpi' | 'phase' | 'view' | 'field' | 'automation';

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  configuration: Record<string, any>;

  @Column({ name: 'compatible_methodologies', type: 'jsonb', default: [] })
  compatibleMethodologies: string[];

  @Column({ type: 'jsonb', default: [] })
  requirements: string[];

  @Column({ name: 'is_system', default: true })
  isSystem: boolean;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string;

  // Template Center v1 fields
  @Column({ unique: true, nullable: true })
  key?: string;

  @Column({ type: 'jsonb', default: {} })
  surface: {
    dashboards?: any[];
    fields?: any[];
    automations?: any[];
    reports?: any[];
  };

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'min_role_to_attach', length: 50, nullable: true })
  minRoleToAttach?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
