import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity({ name: 'project_phases' })
export class ProjectPhase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid', { name: 'project_id' })
  projectId!: string;

  @Column('uuid', { name: 'organization_id', nullable: true })
  organizationId: string | null;

  @Column('uuid', { name: 'workspace_id', nullable: true })
  workspaceId: string | null;

  @Column('text')
  name!: string;

  @Column('text')
  status!: 'not-started' | 'in-progress' | 'blocked' | 'done';

  // reserved word → must be mapped with name
  @Column('int', { name: 'order' })
  order!: number;

  @Column('date', { name: 'start_date', nullable: true })
  startDate: Date | null;

  @Column('date', { name: 'end_date', nullable: true })
  endDate: Date | null;

  @Column('uuid', { name: 'owner_user_id', nullable: true })
  ownerUserId: string | null;

  @Column('timestamptz', { name: 'created_at', default: () => 'now()' })
  createdAt!: Date;

  @Column('timestamptz', { name: 'updated_at', default: () => 'now()' })
  updatedAt!: Date;
}
