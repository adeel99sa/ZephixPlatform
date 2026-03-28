import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ScheduleBaseline } from './schedule-baseline.entity';

@Entity('schedule_baseline_items')
@Index(['baselineId'])
@Unique(['baselineId', 'taskId'])
export class ScheduleBaselineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'baseline_id' })
  baselineId: string;

  @Column({ type: 'uuid', name: 'task_id' })
  taskId: string;

  @Column({ type: 'timestamptz', name: 'planned_start_at', nullable: true })
  plannedStartAt: Date | null;

  @Column({ type: 'timestamptz', name: 'planned_end_at', nullable: true })
  plannedEndAt: Date | null;

  @Column({ type: 'integer', name: 'duration_minutes', nullable: true })
  durationMinutes: number | null;

  @Column({ type: 'boolean', name: 'critical_path', default: false })
  criticalPath: boolean;

  @Column({ type: 'integer', name: 'total_float_minutes', nullable: true })
  totalFloatMinutes: number | null;

  @Column({ type: 'timestamptz', name: 'captured_at', default: () => 'now()' })
  capturedAt: Date;

  @ManyToOne(() => ScheduleBaseline, (b) => b.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'baseline_id' })
  baseline: ScheduleBaseline;
}
