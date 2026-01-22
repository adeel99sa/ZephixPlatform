import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkItem } from './work-item.entity';
import { User } from '../../users/entities/user.entity';
import { WorkspaceScoped } from '../../tenancy/workspace-scoped.decorator';

/**
 * PHASE 7 MODULE 7.1: WorkItem Activity Entity
 * Simple append-only activity log for WorkItems
 */
export enum WorkItemActivityType {
  CREATED = 'created',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  DUE_DATE_CHANGED = 'due_date_changed',
  COMMENT_ADDED = 'comment_added',
  UPDATED = 'updated',
}

@WorkspaceScoped()
@Entity('work_item_activities')
export class WorkItemActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'work_item_id', type: 'uuid' })
  workItemId: string;

  @Column({
    type: 'varchar',
    enum: WorkItemActivityType,
  })
  type: WorkItemActivityType;

  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => WorkItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_item_id' })
  workItem?: WorkItem;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_user_id' })
  actorUser?: User;
}
