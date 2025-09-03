import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { TemplatePhase } from './template-phase.entity';
import { Organization } from '../../../core/modules/organizations/entities/organization.entity';

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['waterfall', 'scrum', 'agile', 'kanban']
  })
  methodology: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  structure: any;

  @Column({ type: 'jsonb', default: [] })
  metrics: any;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: true })
  is_system: boolean;

  @Column({ type: 'uuid', nullable: true })
  organization_id: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relationships
  @OneToMany(() => TemplatePhase, phase => phase.template)
  phases: TemplatePhase[];

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
