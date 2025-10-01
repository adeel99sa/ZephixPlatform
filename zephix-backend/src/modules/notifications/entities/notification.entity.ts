import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  // Resource allocation notifications
  RESOURCE_OVERALLOCATION = 'resource.overallocation',
  RESOURCE_ALLOCATION_APPROVAL = 'resource.allocation.approval',
  RESOURCE_ALLOCATION_REJECTED = 'resource.allocation.rejected',
  RESOURCE_ALLOCATION_REQUEST = 'resource.allocation.request',
  
  // Task notifications
  TASK_ASSIGNED = 'task.assigned',
  TASK_DUE_SOON = 'task.due.soon',
  TASK_OVERDUE = 'task.overdue',
  TASK_COMPLETED = 'task.completed',
  TASK_BLOCKED = 'task.blocked',
  
  // Project notifications
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_COMPLETED = 'project.completed',
  PROJECT_AT_RISK = 'project.at.risk',
  
  // Team notifications
  TEAM_MEMBER_ADDED = 'team.member.added',
  TEAM_MEMBER_REMOVED = 'team.member.removed',
  TEAM_CREATED = 'team.created',
  TEAM_UPDATED = 'team.updated',
  
  // Workspace notifications
  WORKSPACE_INVITED = 'workspace.invited',
  WORKSPACE_ACCESS_GRANTED = 'workspace.access.granted',
  WORKSPACE_ACCESS_REVOKED = 'workspace.access.revoked',
  
  // System notifications
  SYSTEM_MAINTENANCE = 'system.maintenance',
  SYSTEM_UPDATE = 'system.update',
  SYSTEM_ERROR = 'system.error',
  
  // General notifications
  WELCOME = 'welcome',
  REMINDER = 'reminder',
  ALERT = 'alert',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface NotificationData {
  // Resource allocation data
  resourceId?: string;
  resourceName?: string;
  allocationPercentage?: number;
  threshold?: number;
  
  // Task data
  taskId?: string;
  taskTitle?: string;
  dueDate?: Date;
  assigneeId?: string;
  
  // Project data
  projectId?: string;
  projectName?: string;
  projectStatus?: string;
  
  // Team data
  teamId?: string;
  teamName?: string;
  memberId?: string;
  memberName?: string;
  
  // Workspace data
  workspaceId?: string;
  workspaceName?: string;
  
  // General data
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
  
  // System data
  maintenanceTime?: Date;
  duration?: string;
}

@Entity('notifications')
@Index(['userId'])
@Index(['type'])
@Index(['isRead'])
@Index(['priority'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: NotificationData;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  isUrgent(): boolean {
    return this.priority === NotificationPriority.URGENT;
  }

  isHighPriority(): boolean {
    return [NotificationPriority.HIGH, NotificationPriority.URGENT].includes(this.priority);
  }

  hasAction(): boolean {
    return !!(this.data?.actionUrl && this.data?.actionText);
  }

  getActionUrl(): string | null {
    return this.data?.actionUrl || null;
  }

  getActionText(): string | null {
    return this.data?.actionText || null;
  }

  // Static factory methods
  static createResourceOverallocation(
    userId: string,
    resourceName: string,
    allocationPercentage: number,
    threshold: number,
  ): Partial<Notification> {
    return {
      userId,
      type: NotificationType.RESOURCE_OVERALLOCATION,
      title: 'Resource Overallocation Alert',
      message: `${resourceName} is overallocated at ${allocationPercentage}% (threshold: ${threshold}%)`,
      priority: NotificationPriority.HIGH,
      data: {
        resourceName,
        allocationPercentage,
        threshold,
        actionUrl: '/resources',
        actionText: 'View Resources',
      },
    };
  }

  static createTaskAssigned(
    userId: string,
    taskTitle: string,
    dueDate: Date,
    projectName: string,
  ): Partial<Notification> {
    return {
      userId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'New Task Assigned',
      message: `You have been assigned to "${taskTitle}" in ${projectName}`,
      priority: NotificationPriority.MEDIUM,
      data: {
        taskTitle,
        dueDate,
        actionUrl: '/tasks',
        actionText: 'View Task',
      },
    };
  }

  static createTaskDueSoon(
    userId: string,
    taskTitle: string,
    dueDate: Date,
  ): Partial<Notification> {
    return {
      userId,
      type: NotificationType.TASK_DUE_SOON,
      title: 'Task Due Soon',
      message: `"${taskTitle}" is due in 24 hours`,
      priority: NotificationPriority.HIGH,
      data: {
        taskTitle,
        dueDate,
        actionUrl: '/tasks',
        actionText: 'View Task',
      },
    };
  }

  static createTaskOverdue(
    userId: string,
    taskTitle: string,
    dueDate: Date,
  ): Partial<Notification> {
    return {
      userId,
      type: NotificationType.TASK_OVERDUE,
      title: 'Task Overdue',
      message: `"${taskTitle}" is overdue`,
      priority: NotificationPriority.URGENT,
      data: {
        taskTitle,
        dueDate,
        actionUrl: '/tasks',
        actionText: 'View Task',
      },
    };
  }

  static createProjectAtRisk(
    userId: string,
    projectName: string,
    riskReason: string,
  ): Partial<Notification> {
    return {
      userId,
      type: NotificationType.PROJECT_AT_RISK,
      title: 'Project At Risk',
      message: `"${projectName}" is at risk: ${riskReason}`,
      priority: NotificationPriority.HIGH,
      data: {
        projectName,
        actionUrl: '/projects',
        actionText: 'View Project',
      },
    };
  }

  static createWorkspaceInvited(
    userId: string,
    workspaceName: string,
    inviterName: string,
  ): Partial<Notification> {
    return {
      userId,
      type: NotificationType.WORKSPACE_INVITED,
      title: 'Workspace Invitation',
      message: `${inviterName} has invited you to join "${workspaceName}"`,
      priority: NotificationPriority.MEDIUM,
      data: {
        workspaceName,
        actionUrl: '/workspaces',
        actionText: 'View Invitation',
      },
    };
  }

  static createSystemMaintenance(
    userId: string,
    maintenanceTime: Date,
    duration: string,
  ): Partial<Notification> {
    return {
      userId,
      type: NotificationType.SYSTEM_MAINTENANCE,
      title: 'Scheduled Maintenance',
      message: `System maintenance scheduled for ${maintenanceTime.toLocaleString()} (${duration})`,
      priority: NotificationPriority.MEDIUM,
      data: {
        maintenanceTime,
        duration,
      },
    };
  }
}
