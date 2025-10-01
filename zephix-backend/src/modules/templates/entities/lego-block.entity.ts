import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('lego_blocks')
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}






