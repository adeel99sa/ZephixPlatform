import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity({ name: 'project_phases' })
@Unique('uq_phase_project_order', ['projectId', 'order'])
export class ProjectPhase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  projectId: string;

  @Index()
  @Column('uuid')
  organizationId: string;

  @Index()
  @Column('uuid', { nullable: true })
  workspaceId: string | null;

  @Column('text')
  name: string;

  @Column('text')
  status: string;

  @Column('int', { name: 'order' })
  order: number;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column('uuid', { nullable: true })
  ownerUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
