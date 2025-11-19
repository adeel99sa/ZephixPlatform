export enum WorkItemType {
  TASK = 'task',
  BUG = 'bug',
  STORY = 'story',
  EPIC = 'epic',
}

export enum WorkItemStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export interface WorkItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  type: WorkItemType;
  status: WorkItemStatus;
  title: string;
  description?: string;
  assigneeId?: string;
  points?: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface WorkItemCompletionStats {
  completed: number;
  total: number;
  ratio: number;
}

