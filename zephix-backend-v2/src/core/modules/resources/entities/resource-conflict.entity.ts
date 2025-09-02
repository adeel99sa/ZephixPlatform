import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('resource_conflicts')
@Index(['resourceId', 'conflictDate'])
@Index(['severity'])
export class ResourceConflict {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resourceId: string;

  @Column({ type: 'date' })
  conflictDate: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  totalAllocation: number;

  @Column({ type: 'jsonb' })
  affectedProjects: {
    projectId: string;
    projectName: string;
    taskId?: string;
    taskName?: string;
    allocation: number;
  }[];

  @Column()
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column({ default: false })
  resolved: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  detectedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;
}
