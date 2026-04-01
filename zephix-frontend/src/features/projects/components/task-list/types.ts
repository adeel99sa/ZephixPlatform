import type { TaskComment, TaskDependency, TaskActivityItem, WorkTask, WorkTaskStatus } from '@/features/work-management/workTasks.api';

export type WorkspaceMember = {
  id: string;
  userId: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
};

export type BulkActionType = 'status' | 'assign' | 'dueDate' | 'clearDueDate' | 'unassign' | 'delete' | null;

export type { TaskComment, TaskDependency, TaskActivityItem, WorkTask, WorkTaskStatus };