// ─────────────────────────────────────────────────────────────────────────────
// Task Detail API — Phase 4.4
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from '@/lib/api/client';

export type TaskLifecycle = 'PLANNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';

export interface TaskDetailDto {
  task: {
    id: string;
    title: string;
    description?: string;
    status: string;
    type: string;
    priority: string;
    assigneeUserId?: string;
    reporterUserId?: string;
    projectId: string;
    phaseId?: string;
    parentTaskId?: string;
    startDate?: string;
    dueDate?: string;
    completedAt?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    blockedReason?: string;
    tags?: string[];
    acceptanceCriteria?: Array<{ text: string; done: boolean }>;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    sprintId?: string;
    // Estimation fields
    estimatePoints?: number | null;
    estimateHours?: number | null;
    remainingHours?: number | null;
    actualHours?: number | null;
    iterationId?: string | null;
    committed?: boolean;
  };
  /** System-derived lifecycle (Step 13) */
  lifecycle: TaskLifecycle;
  isBlockedByDependencies: boolean;
  blockingTaskCount: number;
  /** Schedule variance & forecast (Step 14) */
  schedule?: {
    plannedDurationDays: number | null;
    actualDurationDays: number | null;
    startVarianceDays: number | null;
    endVarianceDays: number | null;
    forecastEndDate: string | null;
    status: string;
  };
  comments: Array<{
    id: string;
    taskId: string;
    body: string;
    createdByUserId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  /** Step 28 C2: Map of userId → display info for comment authors */
  commentAuthors?: Record<string, {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  }>;
  dependencies: {
    blocking: Array<{
      id: string;
      predecessorTaskId: string;
      successorTaskId: string;
      type: string;
    }>;
    blockedBy: Array<{
      id: string;
      predecessorTaskId: string;
      successorTaskId: string;
      type: string;
    }>;
  };
  documents: Array<{
    id: string;
    title: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }>;
  risks: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
  }>;
  changeRequests: Array<{
    id: string;
    changeRequestId: string;
    title: string;
    status: string;
    type: string;
  }>;
  activity: Array<{
    id: string;
    activityType: string;
    metadata?: Record<string, any>;
    createdByUserId?: string;
    createdAt: string;
  }>;
  /** Sprint 2: Subtasks list */
  subtasks: Array<{
    id: string;
    title: string;
    status: string;
    assigneeUserId: string | null;
    dueDate: string | null;
  }>;
  subtaskCount: number;
  subtaskDoneCount: number;
}

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res;
}

export async function getTaskDetail(
  workspaceId: string,
  taskId: string,
): Promise<TaskDetailDto> {
  const res = await apiClient.get(`/work/tasks/${taskId}/detail`, {
    headers: { 'x-workspace-id': workspaceId },
  });
  return unwrap<TaskDetailDto>(res);
}

export async function moveTask(
  workspaceId: string,
  taskId: string,
  dto: {
    targetProjectId?: string;
    targetPhaseId?: string;
    targetStatus?: string;
    confirmWarnings?: boolean;
  },
): Promise<any> {
  const res = await apiClient.post(`/work/tasks/${taskId}/move`, dto, {
    headers: { 'x-workspace-id': workspaceId },
  });
  return unwrap(res);
}

export async function uploadDocumentForTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  file: File,
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('taskId', taskId);
  const res = await apiClient.post(
    `/work/projects/${projectId}/documents`,
    formData,
    {
      headers: {
        'x-workspace-id': workspaceId,
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return unwrap(res);
}

export async function addComment(
  workspaceId: string,
  taskId: string,
  body: string,
): Promise<any> {
  const res = await apiClient.post(
    `/work/tasks/${taskId}/comments`,
    { body },
    { headers: { 'x-workspace-id': workspaceId } },
  );
  return unwrap(res);
}
