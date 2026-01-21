import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { WorkItem } from './work-item.entity';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

@Entity('work_item_dependencies')
@Index('idx_wid_workspace', ['workspaceId'])
@Index('idx_wid_predecessor', ['workspaceId', 'predecessorId'])
@Index('idx_wid_successor', ['workspaceId', 'successorId'])
@Index('uq_wid_ws_pred_succ_type', ['workspaceId', 'predecessorId', 'successorId', 'type'], { unique: true })
export class WorkItemDependency {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId!: string | null;

  @Column({ name: 'predecessor_id', type: 'uuid' })
  predecessorId!: string;

  @Column({ name: 'successor_id', type: 'uuid' })
  successorId!: string;

  @Column({ name: 'dependency_type', type: 'varchar', length: 2, default: 'FS' })
  type!: DependencyType;

  @Column({ name: 'lag_days', type: 'int', default: 0 })
  lagDays!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => WorkItem, (wi) => wi.blockingDependencies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'predecessor_id' })
  predecessor?: WorkItem;

  @ManyToOne(() => WorkItem, (wi) => wi.blockedByDependencies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'successor_id' })
  successor?: WorkItem;
}
