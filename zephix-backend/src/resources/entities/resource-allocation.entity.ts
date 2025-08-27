import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('resource_allocations')
@Index(['resourceId', 'startDate', 'endDate'])
@Index(['projectId'])
export class ResourceAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resourceId: string;

  @Column()
  projectId: string;

  @Column({ nullable: true })
  taskId: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  allocationPercentage: number; // 0-100

  @Column({ default: 8 })
  hoursPerDay: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Project, { eager: false })
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
