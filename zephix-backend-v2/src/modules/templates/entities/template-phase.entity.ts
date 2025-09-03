import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Template } from './template.entity';

@Entity('template_phases')
export class TemplatePhase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int' })
  order_index: number;

  @Column({ type: 'jsonb', default: [] })
  gate_requirements: any;

  @Column({ type: 'int', nullable: true })
  duration_days: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Template, template => template.phases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: Template;
}
