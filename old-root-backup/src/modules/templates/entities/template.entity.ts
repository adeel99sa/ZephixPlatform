import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';

@Entity('templates')
@Index('idx_templates_org', ['organizationId'])
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ 
    length: 50,
    type: 'varchar'
  })
  methodology: 'waterfall' | 'scrum';

  @Column({ type: 'jsonb' })
  structure: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  metrics: string[];

  @Column({ name: 'isActive', default: true })
  isActive: boolean;

  @Column({ name: 'isSystem', default: true })
  isSystem: boolean;

  @Column({ name: 'organizationId', nullable: true })
  organizationId: string;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relationships
  @OneToMany('Project', 'template')
  projects: any[];
}
