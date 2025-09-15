import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('risks')
export class Risk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column()
  type: string;

  @Column()
  severity: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  evidence: any;

  @Column({ default: 'open' })
  status: string;

  @Column({ name: 'detected_at' })
  detectedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  mitigation: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
