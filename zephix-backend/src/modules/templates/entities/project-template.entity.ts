import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { LegoBlock } from './lego-block.entity';

@Entity('project_templates')
export class ProjectTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  methodology: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'default_phases', type: 'jsonb', default: [] })
  defaultPhases: any[];

  @Column({ name: 'default_kpis', type: 'jsonb', default: [] })
  defaultKpis: any[];

  @Column({ name: 'default_views', type: 'jsonb', default: [] })
  defaultViews: string[];

  @Column({ name: 'default_fields', type: 'jsonb', default: [] })
  defaultFields: any[];

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @ManyToMany(() => LegoBlock)
  @JoinTable({
    name: 'template_blocks',
    joinColumn: { name: 'template_id' },
    inverseJoinColumn: { name: 'block_id' }
  })
  blocks: LegoBlock[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}



