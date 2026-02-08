import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SprintStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('sprints')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['projectId', 'status'])
export class Sprint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  goal: string | null;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: SprintStatus,
    default: SprintStatus.PLANNING,
  })
  status: SprintStatus;

  /**
   * Frozen at the moment of COMPLETED transition.
   * Null while sprint is not yet completed.
   */
  @Column({ type: 'int', name: 'committed_points', nullable: true })
  committedPoints: number | null;

  @Column({ type: 'int', name: 'completed_points', nullable: true })
  completedPoints: number | null;

  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
